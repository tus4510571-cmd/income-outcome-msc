-- Migration for Customer Refund & Goods Return (Non-VAT)
ALTER TABLE income_details 
ADD COLUMN IF NOT EXISTS is_refunded BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS refund_date DATE,
ADD COLUMN IF NOT EXISTS refund_reason TEXT,
ADD COLUMN IF NOT EXISTS return_note_number TEXT,
ADD COLUMN IF NOT EXISTS payment_voucher_number TEXT,
ADD COLUMN IF NOT EXISTS refund_slip_path TEXT,
ADD COLUMN IF NOT EXISTS refund_chat_proof_path TEXT,
ADD COLUMN IF NOT EXISTS refund_no_chat_reason TEXT,
ADD COLUMN IF NOT EXISTS refund_product_photo_path TEXT,
ADD COLUMN IF NOT EXISTS customer_account_info TEXT;
