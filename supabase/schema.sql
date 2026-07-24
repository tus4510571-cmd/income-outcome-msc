-- ============================================
-- ระบบรายรับ-รายจ่าย (Income-Outcome Tracker)
-- Database Schema for Supabase
-- ============================================

-- เปิดใช้ UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. ตาราง profiles (ข้อมูลผู้ใช้)
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- เปิด RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Trigger: สร้าง profile อัตโนมัติเมื่อสมัครสมาชิก
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 2. ตาราง transactions (รายการหลัก)
-- ============================================
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'outcome')),
  category TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'THB',
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
  ON transactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
  ON transactions FOR DELETE
  USING (auth.uid() = user_id);

-- Index สำหรับค้นหา
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_category ON transactions(category);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);

-- ============================================
-- 3. ตาราง expense_details (ข้อมูลเสริมรายจ่าย)
-- ============================================
CREATE TABLE expense_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL UNIQUE REFERENCES transactions(id) ON DELETE CASCADE,
  shop_name TEXT,
  employee_name TEXT
);

ALTER TABLE expense_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own expense details"
  ON expense_details FOR ALL
  USING (auth.uid() = (SELECT user_id FROM transactions WHERE id = transaction_id));

-- ============================================
-- 4. ตาราง income_details (ข้อมูลเสริมรายรับ)
-- ============================================
CREATE TABLE income_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL UNIQUE REFERENCES transactions(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('payment_link', 'chat_direct', 'branch_transfer')),
  customer_name TEXT,
  payment_gateway TEXT,
  invoice_ref TEXT,
  branch_name TEXT
);

ALTER TABLE income_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own income details"
  ON income_details FOR ALL
  USING (auth.uid() = (SELECT user_id FROM transactions WHERE id = transaction_id));

-- ============================================
-- 5. ตาราง receipt_items (รายการสินค้า)
-- ============================================
CREATE TABLE receipt_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'THB'
);

ALTER TABLE receipt_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own receipt items"
  ON receipt_items FOR ALL
  USING (auth.uid() = (SELECT user_id FROM transactions WHERE id = transaction_id));

CREATE INDEX idx_receipt_items_transaction ON receipt_items(transaction_id);

-- ============================================
-- 6. ตาราง transaction_files (ไฟล์ที่ upload)
-- ============================================
CREATE TABLE transaction_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  file_type TEXT NOT NULL CHECK (file_type IN ('transfer_slip', 'receipt', 'business_card', 'id_card_copy', 'employee_receipt')),
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE transaction_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own transaction files"
  ON transaction_files FOR ALL
  USING (auth.uid() = (SELECT user_id FROM transactions WHERE id = transaction_id));

CREATE INDEX idx_transaction_files_transaction ON transaction_files(transaction_id);

-- ============================================
-- Function: อัพเดท updated_at อัตโนมัติ
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. ตาราง settings (ตั้งค่าระบบ)
-- ============================================
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, key)
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own settings"
  ON settings FOR ALL
  USING (auth.uid() = user_id);

CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
