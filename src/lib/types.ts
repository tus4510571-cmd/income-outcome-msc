export interface Profile {
  id: string;
  full_name: string;
  created_at: string;
}

export type TransactionType = "income" | "outcome";

export type OutcomeCategory =
  | "shop_with_receipt"
  | "shop_without_receipt"
  | "employee_labor";

export type IncomeCategory =
  | "payment_link"
  | "chat_direct"
  | "branch_transfer";

export type FileType =
  | "transfer_slip"
  | "receipt"
  | "business_card"
  | "id_card_copy"
  | "employee_receipt";

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  category: OutcomeCategory | IncomeCategory;
  description: string | null;
  amount: number;
  currency: string;
  transaction_date: string;
  created_at: string;
  updated_at: string;
}

export interface ExpenseDetail {
  id: string;
  transaction_id: string;
  shop_name: string | null;
  shop_address: string | null;
  shop_tax_id: string | null;
  employee_name: string | null;
}

export interface IncomeDetail {
  id: string;
  transaction_id: string;
  source: IncomeCategory;
  customer_name: string | null;
  payment_gateway?: string | null;
  invoice_ref?: string | null;
  deposit_info?: string | null;
  branch_name?: string | null;
}

export interface ReceiptItem {
  id: string;
  transaction_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  currency: string;
}

export interface TransactionFile {
  id: string;
  transaction_id: string;
  file_type: FileType;
  file_path: string;
  file_name: string;
  file_size: number;
  uploaded_at: string;
}

export interface TransactionWithDetails extends Transaction {
  expense_detail?: ExpenseDetail | null;
  income_detail?: IncomeDetail | null;
  receipt_items?: ReceiptItem[];
  files?: TransactionFile[];
}

export const CURRENCY_SYMBOLS: Record<string, string> = {
  THB: "฿",
  USD: "$",
  EUR: "€",
  CNY: "¥",
};

export const CURRENCY_OPTIONS = [
  { value: "THB", label: "฿ THB" },
  { value: "USD", label: "$ USD" },
  { value: "EUR", label: "€ EUR" },
  { value: "CNY", label: "¥ CNY" },
];

export const REQUIRED_FILES: Record<OutcomeCategory, FileType[]> = {
  shop_with_receipt: ["transfer_slip", "receipt"],
  shop_without_receipt: ["transfer_slip", "receipt"],
  employee_labor: ["transfer_slip", "id_card_copy", "employee_receipt"],
};

export const REQUIRED_INCOME_FILES: Record<IncomeCategory, FileType[]> = {
  payment_link: ["receipt"],
  chat_direct: ["receipt"],
  branch_transfer: ["receipt"],
};

export function formatCurrency(amount: number, currency: string = "THB"): string {
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  return `${symbol}${amount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
