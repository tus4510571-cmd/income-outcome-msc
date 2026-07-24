-- ============================================
-- Supabase Storage Policies
-- สำหรับ bucket: transaction-files
-- ============================================

-- สร้าง bucket (ทำใน Supabase Dashboard หรือรัน SQL นี้)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('transaction-files', 'transaction-files', false);

-- Policy: Users สามารถอ่านไฟล์ของตัวเองได้
CREATE POLICY "Users can read own files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'transaction-files'
    AND (storage.foldername(name))[1] = 'income'
    AND EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.user_id = auth.uid()
      AND t.id::text = (storage.foldername(name))[4]
    )
  );

CREATE POLICY "Users can read own outcome files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'transaction-files'
    AND (storage.foldername(name))[1] = 'outcome'
    AND EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.user_id = auth.uid()
      AND t.id::text = (storage.foldername(name))[4]
    )
  );

-- Policy: Users สามารถ upload ไฟล์ของตัวเองได้
CREATE POLICY "Users can upload own files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'transaction-files'
    AND (storage.foldername(name))[1] IN ('income', 'outcome')
    AND EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.user_id = auth.uid()
      AND t.id::text = (storage.foldername(name))[4]
    )
  );

-- Policy: Users สามารถลบไฟล์ของตัวเองได้
CREATE POLICY "Users can delete own files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'transaction-files'
    AND EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.user_id = auth.uid()
      AND t.id::text = (storage.foldername(name))[4]
    )
  );
