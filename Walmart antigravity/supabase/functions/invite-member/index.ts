// supabase/functions/invite-member/index.ts
// Secure Serverless Edge Function for Workspace Invitations

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
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const appUrl = Deno.env.get("APP_URL") ?? "http://localhost:5173";

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid user token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { workspaceId, email, role } = await req.json();

    if (!workspaceId || !email || !role) {
      return new Response(JSON.stringify({ error: "workspaceId, email, and role are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["editor", "viewer"].includes(role.toLowerCase())) {
      return new Response(JSON.stringify({ error: "Role must be 'editor' or 'viewer'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Verify caller is workspace Admin
    const { data: callerMember, error: roleError } = await supabaseAdmin
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (roleError || !callerMember || callerMember.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden: Only workspace Admins can invite teammates" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Check if user is already a member
    const { data: existingUser } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (existingUser) {
      const { data: existingMember } = await supabaseAdmin
        .from("workspace_members")
        .select("id, role")
        .eq("workspace_id", workspaceId)
        .eq("user_id", existingUser.id)
        .maybeSingle();

      if (existingMember) {
        return new Response(JSON.stringify({ error: `User is already a member of this workspace with role '${existingMember.role}'` }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // 3. Generate raw secret token and SHA-256 hash
    const rawTokenBytes = new Uint8Array(24);
    crypto.getRandomValues(rawTokenBytes);
    const rawToken = Array.from(rawTokenBytes).map(b => b.toString(16).padStart(2, "0")).join("");

    const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawToken));
    const tokenHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // 4. Cancel any previous pending invitations for this email in this workspace
    await supabaseAdmin
      .from("workspace_invitations")
      .update({ status: "cancelled" })
      .eq("workspace_id", workspaceId)
      .eq("email", email.toLowerCase())
      .eq("status", "pending");

    // 5. Insert secure invitation
    const { data: invitation, error: insertError } = await supabaseAdmin
      .from("workspace_invitations")
      .insert({
        workspace_id: workspaceId,
        email: email.toLowerCase(),
        assigned_role: role.toLowerCase(),
        invitation_token_hash: tokenHash,
        invited_by: user.id,
        expires_at: expiresAt,
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const inviteLink = `${appUrl}/accept-invitation?token=${rawToken}&email=${encodeURIComponent(email.toLowerCase())}&workspaceId=${workspaceId}`;

    // 6. Record activity log
    await supabaseAdmin.from("activity_logs").insert({
      workspace_id: workspaceId,
      actor_id: user.id,
      actor_name: user.user_metadata?.full_name || user.email,
      actor_email: user.email,
      action: "member_invited",
      entity_type: "invitation",
      entity_id: invitation.id,
      details: {
        recipient_email: email.toLowerCase(),
        assigned_role: role.toLowerCase(),
        expires_at: expiresAt,
      },
    });

    return new Response(JSON.stringify({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        assigned_role: invitation.assigned_role,
        expires_at: invitation.expires_at,
        status: invitation.status,
        inviteLink,
      },
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
