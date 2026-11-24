// supabase/functions/accept-invitation/index.ts
// Secure Acceptance of Workspace Invitations

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authentication required to accept invitation" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid user session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { rawToken, email, workspaceId } = await req.json();

    if (!rawToken || !email || !workspaceId) {
      return new Response(JSON.stringify({ error: "rawToken, email, and workspaceId are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authenticated user's email MUST match the invitation email
    if (user.email?.toLowerCase() !== email.toLowerCase()) {
      return new Response(JSON.stringify({
        error: `Invitation was sent to ${email}, but you are signed in as ${user.email}. Please sign in with the invited email.`,
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Compute token hash
    const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawToken));
    const tokenHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");

    // Look up invitation
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from("workspace_invitations")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("email", email.toLowerCase())
      .eq("invitation_token_hash", tokenHash)
      .eq("status", "pending")
      .maybeSingle();

    if (inviteError || !invitation) {
      return new Response(JSON.stringify({ error: "Invalid, expired, or already accepted invitation" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check expiration
    if (new Date(invitation.expires_at).getTime() < Date.now()) {
      await supabaseAdmin
        .from("workspace_invitations")
        .update({ status: "expired" })
        .eq("id", invitation.id);

      return new Response(JSON.stringify({ error: "This invitation has expired. Please ask the Admin for a new invitation." }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ensure user profile exists
    await supabaseAdmin
      .from("profiles")
      .upsert({
        id: user.id,
        email: user.email.toLowerCase(),
        full_name: user.user_metadata?.full_name || user.email.split("@")[0],
        avatar_url: user.user_metadata?.avatar_url,
      });

    // Add user to workspace_members with the assigned role
    const { data: member, error: memberError } = await supabaseAdmin
      .from("workspace_members")
      .upsert({
        workspace_id: workspaceId,
        user_id: user.id,
        role: invitation.assigned_role,
        status: "active",
        joined_at: new Date().toISOString(),
        last_active_at: new Date().toISOString(),
      }, { onConflict: "workspace_id,user_id" })
      .select()
      .single();

    if (memberError) {
      return new Response(JSON.stringify({ error: memberError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark invitation as accepted
    await supabaseAdmin
      .from("workspace_invitations")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", invitation.id);

    // Record activity log
    await supabaseAdmin.from("activity_logs").insert({
      workspace_id: workspaceId,
      actor_id: user.id,
      actor_name: user.user_metadata?.full_name || user.email,
      actor_email: user.email,
      action: "invitation_accepted",
      entity_type: "member",
      entity_id: member.id,
      details: {
        assigned_role: invitation.assigned_role,
        invitation_id: invitation.id,
      },
    });

    return new Response(JSON.stringify({
      success: true,
      message: "Invitation successfully accepted",
      workspaceId,
      role: invitation.assigned_role,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
