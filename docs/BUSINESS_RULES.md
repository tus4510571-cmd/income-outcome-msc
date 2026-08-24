# Business Rules

All rules below were verified against the code on 2026-08-23. If you change
behavior, change this file in the same PR.

## 1. Data ownership

- Strict single-owner model: a user sees and operates only on their own
  transactions (RLS `auth.uid() = user_id` + explicit `.eq("user_id", …)`).
- There are no teams, workspaces, roles, or sharing. No admin UI.

## 2. Categories & required evidence files

Income (`type = 'income'`):
| Category | Meaning | Required files |
|---|---|---|
| payment_link | sales via payment link | receipt |
| chat_direct | direct-chat customer orders | receipt |
| branch_transfer | money transferred from branch/event | receipt |

Outcome (`type = 'outcome'`):
| Category | Meaning | Required files |
|---|---|---|
| shop_with_receipt | vendor purchases with tax receipt | transfer_slip, receipt, summary |
| shop_without_receipt | vendors without receipts (cash bill generated) | receipt, summary (and transfer_slip if transfer) |
| employee_labor | daily wages | transfer_slip, id_card_copy, employee_receipt, summary |

Required-file maps live in `types.ts` (`REQUIRED_FILES`,
`REQUIRED_INCOME_FILES`) — single source of truth.

## 3. Amount & currency rules

- Line total = `quantity × unit_price`. When `receipt_items` exist, the
  transaction amount is always recomputed as their sum (add/update item
  actions do this); editing amount independently is not allowed by the flow.
- AI-scan discounts are stored as items with negative unit price so that
  items always sum to the paid total.
- Currencies: THB/USD/EUR/CNY only; display via `formatCurrency`
  (th-TH locale). Thai baht text for documents via `thaiBaht.ts`.

## 4. File storage rules

- Preferred sink: Google Drive (only if the user connected GAS + set the
  relevant folder id in Settings); otherwise Supabase Storage.
- Storage path pattern `{income|outcome}/{YYYY}/{MM}/{transactionId}/{file_type}.{ext}`;
  one file per (transaction, file_type) — re-upload replaces it
  (remove+reinsert workaround).
- Drive uploads name files with the transaction context (Thai names) and may
  use subfolders ("Refund" for expense refunds, "Customer_Refund" for income
  refunds). The returned drive URL is stored as `file_path`.
- Deleting a transaction opens an interactive confirmation modal (`DeleteTransactionModal`),
  moves all its Drive files to the "delete transaction" folder under that month's folder
  in Google Drive with live step progress, and removes Storage files; DB rows cascade-delete.
- Refund cancellation clears refund metadata but keeps uploaded evidence.

## 5. Document numbering

- Daily sequence: (# transactions of that user on that date) + 1,
  zero-padded to 3 digits (`getNextDailySequence`).
- Monthly sequence: count of user's transactions in YYYY-MM + 1, padded to
  4 digits (`getNextMonthlySequence`).
- Payment voucher (PV): prefix `PV{last2(พ.ศ. year)}{MM}` e.g. 2026-08 →
  `PV6908`, sequence = max existing seq from
  `expense_details.receipt_number LIKE 'PV6908%'`, fallback = count of that
  month's shop_without_receipt transactions; padded to 4 → `PV69080001`.
- Return note (RN): prefix `RN{last2(พ.ศ.)}{MM}` scanned over
  `income_details.return_note_number`; same max-sequence logic → `RN69080001`.
- A customer refund consumes BOTH an RN and a PV number (auto-generated if
  not supplied).

## 6. Refund rules

### Expense refund (รายจ่าย)
- `refund_type` ∈ {company_direct, via_personal}. via_personal additionally
  requires a shop→personal slip (`refund_slip_personal_path`).
- Chat proof optional; if absent, `refund_no_chat_reason` must explain why.
- Recording sets `expense_details.is_refunded/refund_amount/refund_date/
  refund_type/refund_reason` + evidence paths. Cancel resets all fields.

### Customer refund & goods return (รายรับ, Non-VAT)
- Generates RN (ใบส่งคืนสินค้า) + PV (ใบสำคัญจ่าย) numbers; evidence: refund
  slip, chat proof (or no-chat reason), product photo, customer account info.
- Stored on `income_details.refund_*`. Cancel resets all fields.

## 7. AI receipt scan rules (/api/scan-receipt)

- Requires per-user `gemini_api_key` setting; otherwise HTTP 400.
- Accepts multiple images/PDFs in one request. Image files are compressed client-side
  first (max width 1600, JPEG q≈0.8); PDF files bypass image canvas compression and are passed directly.
- Extraction contract: JSON {shopName, address, taxId, date(YYYY-MM-DD),
  items[{name, quantity, price=UNIT price}], totalAmount}.
- Date parsing handles Thai years: 2-digit year <50 → 20xx CE;
  ≥50 → พ.ศ. (convert by −543 after treating as 25xx); 4-digit พ.ศ. −543.
- Model selection prioritizes direct fast flash candidates (`gemini-2.5-flash`, `gemini-2.0-flash`, `gemini-1.5-flash`, `gemini-1.5-flash-8b`) before falling back to dynamic model listing.
- Auto-balancing: if Σ(quantity×price) deviates from totalAmount by >0.01,
  append one adjustment item (positive or negative) named
  "ค่าสินค้า/บริการ (ยอดเพิ่มเติมให้ตรงบิล)" or "ส่วนลด/หักลบ (เพื่อให้ตรงบิล)".
- Scan failure never blocks manual entry — the form stays editable.

## 8. Session & access rules

- Unauthenticated requests to any page except /login, /auth/*, /api/*,
  /forgot-password are redirected to /login (root middleware).
- Idle timeout 15 minutes enforced via `last-activity` cookie checked in
  middleware; missing/expired cookie ⇒ forced signOut + redirect.
  `SessionTimeout` client component refreshes activity.
- Signup passes full_name in metadata; DB trigger creates the profile.

## 9. Edge cases & known behaviors

- GAS URL must be the long `https://script.google.com/...` form; short URLs
  cause POST→GET degradation and are explicitly rejected with a Thai error.
- Long shop/file names can make GAS return success without fileId — surfaced
  as an error asking to shorten the shop name.
- Dates sent to GAS always carry `T12:00:00` to prevent timezone day-shift.
- Quotation pages render empty state only — creating a quotation is NOT
  possible yet despite the button existing.
- Shopify credentials (access token, store domain) can be saved in Settings
  but no feature currently reads them.

## 10. Rules intentionally NOT enforced yet

- Required-file validation is client-side only; employee_labor requires the
  slip at creation and allows the remaining documents to be uploaded later
  on the detail page — incrementally (ทยอย) is fine. Already-uploaded
  documents are read-only (no replace). Selections are previewed first and
  confirmed with one "Accept and save to drive" press showing per-step
  status; the `-sum` merge runs automatically once all three types exist.
  Other categories still require their full sets before submit.
- No duplicate-transaction detection; no rate limiting anywhere.
- No soft deletes / audit trail / edit history.
- No pagination on any list view.
