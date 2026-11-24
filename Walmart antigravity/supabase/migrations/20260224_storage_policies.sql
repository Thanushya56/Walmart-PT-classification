-- ====================================================================
-- STORAGE BUCKETS AND POLICIES FOR PRODUCT IMAGES
-- ====================================================================

-- Create storage bucket if not already present
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies for product-images bucket
CREATE POLICY "Public read access for product images"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated members can upload images"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'product-images'
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Admins can delete images"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'product-images'
        AND auth.role() = 'authenticated'
    );
