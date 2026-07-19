
-- Allow admins to upload/manage files in product-images bucket
CREATE POLICY "Admins can upload product images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update product images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete product images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));

-- Anyone can read (needed since bucket is private but we generate signed URLs)
CREATE POLICY "Anyone can read product images"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'product-images');
