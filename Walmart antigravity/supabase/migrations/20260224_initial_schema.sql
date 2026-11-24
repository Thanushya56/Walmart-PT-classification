-- ====================================================================
-- WALMART PT CLASSIFICATION LIBRARY: ENTERPRISE RBAC SCHEMA
-- Version: 2.0.0
-- Roles: admin, editor, viewer
-- Features: Workspace Isolation, RLS Policies, Invitation Security, 
--           Audit Logs, Taxonomy & Classification Engine
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. PROFILES TABLE (Mirrors auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. WORKSPACES TABLE
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    settings JSONB DEFAULT '{
        "allow_viewer_export": false,
        "storage_limit_mb": 5120,
        "auto_create_pt_groups": true,
        "invitation_expiry_days": 7
    }'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. WORKSPACE MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    last_active_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE (workspace_id, user_id)
);

-- 4. WORKSPACE INVITATIONS TABLE
CREATE TABLE IF NOT EXISTS public.workspace_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    assigned_role TEXT NOT NULL CHECK (assigned_role IN ('editor', 'viewer')),
    invitation_token_hash TEXT NOT NULL,
    invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_invitations_workspace_email ON public.workspace_invitations(workspace_id, email);
CREATE INDEX IF NOT EXISTS idx_invitations_token_hash ON public.workspace_invitations(invitation_token_hash);

-- 5. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE (workspace_id, name)
);

-- 6. PRODUCT TYPES (PT) TABLE
CREATE TABLE IF NOT EXISTS public.product_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    pt_key TEXT NOT NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    category_name TEXT,
    family TEXT,
    pt_path TEXT,
    description TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE (workspace_id, pt_key)
);

CREATE INDEX IF NOT EXISTS idx_product_types_workspace ON public.product_types(workspace_id);
CREATE INDEX IF NOT EXISTS idx_product_types_name ON public.product_types(name);

-- 7. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    pt_id UUID REFERENCES public.product_types(id) ON DELETE SET NULL,
    pt_name TEXT NOT NULL,
    category_name TEXT,
    classification_notes TEXT,
    status TEXT NOT NULL DEFAULT 'classified' CHECK (status IN ('classified', 'pending_review', 'flagged')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_workspace ON public.products(workspace_id);
CREATE INDEX IF NOT EXISTS idx_products_pt_name ON public.products(pt_name);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products(created_at DESC);

-- 8. PRODUCT IMAGES TABLE
CREATE TABLE IF NOT EXISTS public.product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    image_hash TEXT,
    file_name TEXT,
    file_size BIGINT,
    width INTEGER,
    height INTEGER,
    mime_type TEXT,
    uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_product_images_product ON public.product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_hash ON public.product_images(image_hash);

-- 9. CLASSIFICATION HISTORY TABLE
CREATE TABLE IF NOT EXISTS public.classification_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    previous_pt_id UUID,
    previous_pt_name TEXT,
    new_pt_id UUID,
    new_pt_name TEXT NOT NULL,
    changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    changed_by_name TEXT,
    change_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_history_workspace ON public.classification_history(workspace_id);
CREATE INDEX IF NOT EXISTS idx_history_product ON public.classification_history(product_id);

-- 10. ACTIVITY LOGS TABLE (Audit trail)
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    actor_name TEXT,
    actor_email TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    details JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_workspace ON public.activity_logs(workspace_id, created_at DESC);

-- ====================================================================
-- SECURITY HELPER FUNCTIONS
-- ====================================================================

-- Get caller's role in a workspace
CREATE OR REPLACE FUNCTION public.get_workspace_role(ws_id UUID)
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role
    FROM public.workspace_members
    WHERE workspace_id = ws_id
      AND user_id = auth.uid()
      AND status = 'active';
    RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if caller is workspace Admin
CREATE OR REPLACE FUNCTION public.is_workspace_admin(ws_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN public.get_workspace_role(ws_id) = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if caller is Editor or Admin
CREATE OR REPLACE FUNCTION public.is_workspace_editor_or_admin(ws_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN public.get_workspace_role(ws_id) IN ('admin', 'editor');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if caller is active member of workspace
CREATE OR REPLACE FUNCTION public.is_workspace_member(ws_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN public.get_workspace_role(ws_id) IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Trigger: Prevent deleting or demoting the last workspace admin
CREATE OR REPLACE FUNCTION public.prevent_last_admin_removal()
RETURNS TRIGGER AS $$
DECLARE
    admin_count INT;
BEGIN
    IF (TG_OP = 'DELETE' AND OLD.role = 'admin') OR 
       (TG_OP = 'UPDATE' AND OLD.role = 'admin' AND NEW.role <> 'admin') OR
       (TG_OP = 'UPDATE' AND OLD.role = 'admin' AND NEW.status <> 'active') THEN
        
        SELECT COUNT(*) INTO admin_count
        FROM public.workspace_members
        WHERE workspace_id = OLD.workspace_id
          AND role = 'admin'
          AND status = 'active'
          AND id <> OLD.id;

        IF admin_count = 0 THEN
            RAISE EXCEPTION 'Action blocked: A workspace must have at least one active Admin. You cannot remove or demote the only Admin.';
        END IF;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_last_admin_removal ON public.workspace_members;
CREATE TRIGGER trg_prevent_last_admin_removal
    BEFORE UPDATE OR DELETE ON public.workspace_members
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_last_admin_removal();

-- Trigger: Automatically create public.profile on auth.users sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classification_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- 1. PROFILES RLS
CREATE POLICY "Profiles viewable by authenticated users"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid());

-- 2. WORKSPACES RLS
CREATE POLICY "Members can view workspaces they belong to"
    ON public.workspaces FOR SELECT
    TO authenticated
    USING (
        id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND status = 'active')
        OR owner_id = auth.uid()
    );

CREATE POLICY "Only admins can update workspace settings"
    ON public.workspaces FOR UPDATE
    TO authenticated
    USING (public.is_workspace_admin(id))
    WITH CHECK (public.is_workspace_admin(id));

-- 3. WORKSPACE MEMBERS RLS
CREATE POLICY "Members can view workspace member list"
    ON public.workspace_members FOR SELECT
    TO authenticated
    USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Only admins can add workspace members"
    ON public.workspace_members FOR INSERT
    TO authenticated
    WITH CHECK (public.is_workspace_admin(workspace_id));

CREATE POLICY "Only admins can update member roles"
    ON public.workspace_members FOR UPDATE
    TO authenticated
    USING (public.is_workspace_admin(workspace_id))
    WITH CHECK (public.is_workspace_admin(workspace_id));

CREATE POLICY "Only admins can remove members"
    ON public.workspace_members FOR DELETE
    TO authenticated
    USING (public.is_workspace_admin(workspace_id));

-- 4. WORKSPACE INVITATIONS RLS
CREATE POLICY "Only admins can view invitations"
    ON public.workspace_invitations FOR SELECT
    TO authenticated
    USING (public.is_workspace_admin(workspace_id));

CREATE POLICY "Only admins can create invitations"
    ON public.workspace_invitations FOR INSERT
    TO authenticated
    WITH CHECK (public.is_workspace_admin(workspace_id));

CREATE POLICY "Only admins can update invitations"
    ON public.workspace_invitations FOR UPDATE
    TO authenticated
    USING (public.is_workspace_admin(workspace_id))
    WITH CHECK (public.is_workspace_admin(workspace_id));

CREATE POLICY "Only admins can delete/cancel invitations"
    ON public.workspace_invitations FOR DELETE
    TO authenticated
    USING (public.is_workspace_admin(workspace_id));

-- 5. CATEGORIES RLS
CREATE POLICY "Members can view categories"
    ON public.categories FOR SELECT
    TO authenticated
    USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Editors and Admins can create categories"
    ON public.categories FOR INSERT
    TO authenticated
    WITH CHECK (public.is_workspace_editor_or_admin(workspace_id));

CREATE POLICY "Editors and Admins can update categories"
    ON public.categories FOR UPDATE
    TO authenticated
    USING (public.is_workspace_editor_or_admin(workspace_id))
    WITH CHECK (public.is_workspace_editor_or_admin(workspace_id));

CREATE POLICY "Only Admins can delete categories"
    ON public.categories FOR DELETE
    TO authenticated
    USING (public.is_workspace_admin(workspace_id));

-- 6. PRODUCT TYPES RLS
CREATE POLICY "Members can view product types"
    ON public.product_types FOR SELECT
    TO authenticated
    USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Editors and Admins can insert product types"
    ON public.product_types FOR INSERT
    TO authenticated
    WITH CHECK (public.is_workspace_editor_or_admin(workspace_id));

CREATE POLICY "Editors and Admins can update product types"
    ON public.product_types FOR UPDATE
    TO authenticated
    USING (public.is_workspace_editor_or_admin(workspace_id))
    WITH CHECK (public.is_workspace_editor_or_admin(workspace_id));

CREATE POLICY "Only Admins can delete product types"
    ON public.product_types FOR DELETE
    TO authenticated
    USING (public.is_workspace_admin(workspace_id));

-- 7. PRODUCTS RLS
CREATE POLICY "Members can view products"
    ON public.products FOR SELECT
    TO authenticated
    USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Editors and Admins can insert products"
    ON public.products FOR INSERT
    TO authenticated
    WITH CHECK (public.is_workspace_editor_or_admin(workspace_id));

CREATE POLICY "Editors and Admins can update products"
    ON public.products FOR UPDATE
    TO authenticated
    USING (public.is_workspace_editor_or_admin(workspace_id))
    WITH CHECK (public.is_workspace_editor_or_admin(workspace_id));

CREATE POLICY "Only Admins can delete products"
    ON public.products FOR DELETE
    TO authenticated
    USING (public.is_workspace_admin(workspace_id));

-- 8. PRODUCT IMAGES RLS
CREATE POLICY "Members can view product images"
    ON public.product_images FOR SELECT
    TO authenticated
    USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Editors and Admins can upload product images"
    ON public.product_images FOR INSERT
    TO authenticated
    WITH CHECK (public.is_workspace_editor_or_admin(workspace_id));

CREATE POLICY "Only Admins can delete product images"
    ON public.product_images FOR DELETE
    TO authenticated
    USING (public.is_workspace_admin(workspace_id));

-- 9. CLASSIFICATION HISTORY RLS
CREATE POLICY "Members can view classification history"
    ON public.classification_history FOR SELECT
    TO authenticated
    USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Editors and Admins can record classification changes"
    ON public.classification_history FOR INSERT
    TO authenticated
    WITH CHECK (public.is_workspace_editor_or_admin(workspace_id));

-- 10. ACTIVITY LOGS RLS
CREATE POLICY "Only Admins can view activity logs"
    ON public.activity_logs FOR SELECT
    TO authenticated
    USING (public.is_workspace_admin(workspace_id));

CREATE POLICY "System and Admins can insert activity logs"
    ON public.activity_logs FOR INSERT
    TO authenticated
    WITH CHECK (public.is_workspace_member(workspace_id));
