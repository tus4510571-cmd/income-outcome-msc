# Data Model

Supabase Postgres. Schema lives as **plain SQL files** in `/supabase/`
(applied manually in the Supabase SQL Editor — see §7). All tables have RLS
enabled and every policy scopes rows to `auth.uid()`. There is no
service-role access anywhere in the app.

## 1. Tables

### `profiles`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, FK -> auth.users(id) ON DELETE CASCADE | same id as auth user |
| full_name | text | NOT NULL default '' | set at signup via metadata |
| created_at | timestamptz | NOT NULL default now() | |

Trigger `on_auth_user_created` -> `handle_new_user()` (SECURITY DEFINER):
inserts a profile row automatically on signup using
`raw_user_meta_data->>'full_name'`.

### `transactions` (main ledger)

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, default uuid_generate_v4() | |
| user_id | uuid | FK -> profiles(id) ON DELETE CASCADE, NOT NULL | owner |
| type | text | CHECK IN ('income','outcome'), NOT NULL | |
| category | text | NOT NULL | values in BUSINESS_RULES §1 |
| description | text | nullable | |
| amount | numeric(12,2) | NOT NULL default 0 | recomputed from receipt_items when items exist |
| currency | text | NOT NULL default 'THB' | THB/USD/EUR/CNY |
| transaction_date | date | NOT NULL default CURRENT_DATE | plain YYYY-MM-DD strings in code |
| created_at / updated_at | timestamptz | NOT NULL default now() | updated_at via trigger `update_transactions_updated_at` |

Indexes: `user_id`, `type`, `category`, `transaction_date`.

RLS: SELECT/INSERT/UPDATE/DELETE policies — `auth.uid() = user_id`.

### `expense_details` (1:1 extension for outcome transactions)

Base (schema.sql): id uuid PK; `transaction_id` uuid UNIQUE FK ->
transactions(id) CASCADE; shop_name, shop_address, shop_tax_id,
employee_name (all nullable text).

Added by `refund-migration.sql`:
is_refunded bool default false, refund_amount numeric(12,2) default 0,
refund_date date, refund_type text ('company_direct'|'via_personal', set by
code, no CHECK constraint), refund_reason text,
refund_slip_company_path, refund_slip_personal_path,
refund_chat_proof_path, refund_no_chat_reason (text).

Used by code but missing from SQL files (**schema drift**, see §7):
`receipt_number` text — stores PV numbers (e.g. PV69080001) for
shop_without_receipt transactions.

RLS: FOR ALL USING (owner of parent transaction via subquery).

### `income_details` (1:1 extension for income transactions)

Base: id uuid PK; `transaction_id` uuid UNIQUE FK CASCADE; source text
CHECK IN ('payment_link','chat_direct','branch_transfer') NOT NULL;
customer_name, payment_gateway, invoice_ref, branch_name (nullable text).

Added by `customer-refund-migration.sql`: is_refunded bool default false,
refund_amount numeric(12,2) default 0, refund_date date, refund_reason,
return_note_number (RN…), payment_voucher_number (PV…),
refund_slip_path, refund_chat_proof_path, refund_no_chat_reason,
refund_product_photo_path, customer_account_info (all text).

Used by code but missing from SQL files (**schema drift**, §7):
`deposit_info` text (inserted in createTransaction, shown in types).

RLS: same pattern as expense_details.

### `receipt_items` (line items)

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK | |
| transaction_id | uuid | FK -> transactions(id) CASCADE, NOT NULL | |
| product_name | text | NOT NULL | may hold discount lines (negative price) |
| quantity | integer | NOT NULL default 1 | |
| unit_price | numeric(12,2) | NOT NULL default 0 | unit price, never line total |
| currency | text | NOT NULL default 'THB' | |

Invariant: `sum(quantity * unit_price)` == `transactions.amount` whenever
items exist (enforced in app code, addReceiptItems/updateReceiptItems).

### `transaction_files` (evidence index)

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK | |
| transaction_id | uuid | FK -> transactions(id) CASCADE, NOT NULL | |
| file_type | text | NOT NULL | schema.sql has a stale CHECK (see §7); code inserts many more values |
| file_path | text | NOT NULL | Storage path OR full drive.google.com URL |
| file_name | text | NOT NULL | |
| file_size | integer | NOT NULL default 0 | 0 for Drive links |
| uploaded_at | timestamptz | NOT NULL default now() | |

One row per (transaction_id, file_type); re-uploads delete+insert.

### `employee_receipts` (undocumented until 2026-08-23 — see §7 drift)

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| employee_name / nickname | text | nickname used in Drive filenames |
| employee_address / employee_tax_id | text | optional |
| job_type / job_description | text | job_type from fixed radio list + "อื่นๆ" free text |
| amount_before_tax / amount_after_tax | numeric | withholding tax (3%/1%/0%/custom) computed client-side |
| start_date / end_date | date | employment period |
| date_text | text | Thai-formatted range rendered on document |
| status | text | 'PENDING' → 'COMPLETED' when its transaction is saved |
| created_at | timestamptz | |

Flow: `employee-labor/receipt/new` inserts a PENDING row (PDF printed via
browser print only — not stored). `employee-labor/new` lists PENDING rows
within a date range, and flips the chosen row to COMPLETED after saving the
transaction. No FK to transactions.

### `settings` (per-user key/value config)

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK | |
| user_id | uuid | FK -> auth.users(id) CASCADE, NOT NULL | note: auth.users, not profiles |
| key | text | NOT NULL | see key catalog in ENVIRONMENT.md §2 |
| value | text | NOT NULL | |
| created_at / updated_at | timestamptz | defaults now(); update trigger | |

UNIQUE(user_id, key). Upserted via `setSetting` onConflict "(user_id,key)".

## 2. Row Level Security summary

| Table | Policy shape |
|---|---|
| profiles | SELECT/INSERT/UPDATE own row (`auth.uid() = id`) |
| transactions | full CRUD own rows (`auth.uid() = user_id`) |
| expense_details / income_details / receipt_items / transaction_files | FOR ALL, owner resolved via subquery on parent transaction |
| settings | FOR ALL `auth.uid() = user_id` |

## 3. Relationships

```
auth.users 1--1 profiles 1--* transactions 1--1 expense_details
                                          1--1 income_details
                                          1--* receipt_items
                                          1--* transaction_files
auth.users 1--* settings
```

All child deletes cascade from `transactions`; deleting a user cascades
everything (hard deletes only, no soft-delete anywhere).

## 4. Migrations process (actual, non-standard)

- No supabase CLI migration history exists. Schema changes are written as
  standalone SQL files in `/supabase/` and pasted into the Supabase SQL
  Editor by hand.
- Existing files: `schema.sql` (base), `storage-policies.sql`,
  `refund-migration.sql` (expense refunds), `customer-refund-migration.sql`
  (income refunds), `seed.sql` (sample data; contains a hardcoded demo user
  UUID that must be replaced with a real auth user id).
- Rule for agents: new change => new `.sql` file in `/supabase/` + apply it
  + update this doc. Never assume the live DB matches the files blindly —
  check §7 drift list.

## 5. Supabase Storage

- Bucket: `transaction-files`, private.
- Path convention (from `uploadFile`):
  `{type}/{YYYY}/{MM}/{transactionId}/{file_type}.{ext}`
  e.g. `outcome/2026/08/a111…/transfer_slip.jpg`
- Policies (`storage-policies.sql`): SELECT (split into income/outcome
  policies), INSERT, DELETE — all verify
  `(storage.foldername(name))[4]` is a transaction owned by `auth.uid()`.
  There is deliberately **no UPDATE policy**; code works around this by
  remove()+upload() instead of upsert.
- Reading files server-side uses signed URLs (3600 s).

## 6. Data retention / deletion rules

- Deleting a transaction: Drive-hosted files (file_path contains
  drive.google.com) are moved by GAS to a deleted-items area under the
  configured folder (`moveFilesToDeleted`); Storage files are removed; the
  DB row delete cascades to details/items/files. Hard delete, no undo.
- Refund cancellation (`cancelRefund`/`cancelCustomerRefund`) nulls the
  refund fields but does not delete already-uploaded evidence files.

## 7. Known schema drift (live DB vs SQL files — fix when touching these areas)

| Item | Where used | Status |
|---|---|---|
| `expense_details.receipt_number` | types.ts, getNextPVNumber, updateTransaction | missing from all SQL files |
| `income_details.deposit_info` | types.ts, createTransaction | missing from all SQL files |
| `transaction_files.file_type` CHECK | schema.sql limits to 5 values | code inserts 'cash_bill', 'refund_slip_company', 'refund_slip_personal', 'refund_chat_proof', 'refund_slip', 'refund_product_photo' etc. — live CHECK must be looser/dropped; SQL files do not reflect it |
| Storage UPDATE policy absence | uploadFile workaround | intentional but undocumented in storage-policies.sql comments |
| `employee_receipts` table | employee-labor receipt/new + new pages | missing from all SQL files (documented §1 above) |
| `transaction_files.file_name` | employee-labor creation stored placeholder 'drive-file.pdf' | since 2026-08-23 stores the real Drive base filename; legacy rows keep the placeholder (late-merge falls back to date+nickname derivation) |
| `file_type` extra values in use | 'summary' (merged -sum PDF), 'cash_bill', 'attachment_N' | same stale CHECK issue as above |

If you alter any of these areas, write the corrective SQL and close the gap here.
