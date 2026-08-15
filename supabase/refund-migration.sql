-- ============================================
-- Migration: เพิ่มฟิลด์รองรับระบบการคืนเงิน (Refund & Reversal)
-- รันคำสั่งนี้ใน Supabase SQL Editor
-- ============================================

ALTER TABLE expense_details 
ADD COLUMN IF NOT EXISTS is_refunded BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS refund_date DATE,
ADD COLUMN IF NOT EXISTS refund_type TEXT,
ADD COLUMN IF NOT EXISTS refund_reason TEXT,
ADD COLUMN IF NOT EXISTS refund_slip_company_path TEXT,
ADD COLUMN IF NOT EXISTS refund_slip_personal_path TEXT,
ADD COLUMN IF NOT EXISTS refund_chat_proof_path TEXT,
ADD COLUMN IF NOT EXISTS refund_no_chat_reason TEXT;
