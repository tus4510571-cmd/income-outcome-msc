"use server";

import { createClient } from "@/lib/supabase/server";

async function getAuthUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("ไม่พบผู้ใช้ กรุณาเข้าสู่ระบบใหม่");
  return user;
}

export async function signIn(email: string, password: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  if (!data.session) throw new Error("เข้าสู่ระบบไม่สำเร็จ");
  return { success: true };
}

export async function signUp(email: string, password: string, fullName: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

export async function createTransaction(formData: {
  type: "income" | "outcome";
  category: string;
  description: string;
  amount: number;
  currency: string;
  transaction_date: string;
  shop_name?: string;
  shop_address?: string;
  shop_tax_id?: string;
  employee_name?: string;
  customer_name?: string;
  source?: string;
  payment_gateway?: string;
  invoice_ref?: string;
  deposit_info?: string;
  branch_name?: string;
}) {
  const user = await getAuthUser();
  const supabase = await createClient();

  const { data: transaction, error: txError } = await supabase
    .from("transactions")
    .insert({
      user_id: user.id,
      type: formData.type,
      category: formData.category,
      description: formData.description || null,
      amount: formData.amount,
      currency: formData.currency,
      transaction_date: formData.transaction_date,
    })
    .select()
    .single();

  if (txError) throw new Error(txError.message);

  if (formData.type === "outcome") {
    await supabase.from("expense_details").insert({
      transaction_id: transaction.id,
      shop_name: formData.shop_name || null,
      shop_address: formData.shop_address || null,
      shop_tax_id: formData.shop_tax_id || null,
      employee_name: formData.employee_name || null,
    });
  } else {
    await supabase.from("income_details").insert({
      transaction_id: transaction.id,
      source: formData.source || "chat_direct",
      customer_name: formData.customer_name || null,
      payment_gateway: formData.payment_gateway || null,
      invoice_ref: formData.invoice_ref || null,
      deposit_info: formData.deposit_info || null,
      branch_name: formData.branch_name || null,
    });
  }

  return transaction;
}

export async function addReceiptItems(transactionId: string, items: {
  product_name: string;
  quantity: number;
  unit_price: number;
  currency: string;
}[]) {
  await getAuthUser();
  const supabase = await createClient();

  const receiptItems = items.map((item) => ({
    transaction_id: transactionId,
    product_name: item.product_name,
    quantity: item.quantity,
    unit_price: item.unit_price,
    currency: item.currency || "THB",
  }));

  await supabase.from("receipt_items").insert(receiptItems);

  const totalAmount = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
  await supabase
    .from("transactions")
    .update({ amount: totalAmount })
    .eq("id", transactionId);

  return { success: true };
}

export async function uploadFile(
  transactionId: string,
  fileType: string,
  transactionDate: string,
  type: "income" | "outcome",
  fileName: string,
  fileBase64: string
) {
  const user = await getAuthUser();
  const supabase = await createClient();

  const ext = fileName.split(".").pop() || "jpg";
  const d = new Date(transactionDate);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const filePath = `${type}/${year}/${month}/${transactionId}/${fileType}.${ext}`;

  const base64Data = fileBase64.split(",")[1];
  const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
  const blob = new Blob([binaryData]);

  // ลบไฟล์เดิมใน Storage (ถ้ามี) เพื่อหลีกเลี่ยง error จาก upsert ที่ไม่มี UPDATE policy
  await supabase.storage.from("transaction-files").remove([filePath]);

  // ลบข้อมูลไฟล์เดิมในตาราง (ถ้ามี) เพื่อไม่ให้ซ้ำซ้อน
  await supabase.from("transaction_files").delete().match({
    transaction_id: transactionId,
    file_type: fileType,
  });

  const { error: uploadError } = await supabase.storage
    .from("transaction-files")
    .upload(filePath, blob);

  if (uploadError) throw new Error(uploadError.message);

  const { error: dbError } = await supabase.from("transaction_files").insert({
    transaction_id: transactionId,
    file_type: fileType,
    file_path: filePath,
    file_name: fileName,
    file_size: blob.size,
  });
  
  if (dbError) throw new Error(dbError.message);

  return { filePath, fileName };
}

export async function getTransactions(category?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase
    .from("transactions")
    .select(`
      *,
      expense_detail:expense_details(*),
      income_detail:income_details(*),
      receipt_items:receipt_items(*),
      files:transaction_files(*)
    `)
    .eq("user_id", user.id)
    .order("transaction_date", { ascending: false });

  if (category) {
    query = query.eq("category", category);
  }

  const { data } = await query;
  return data || [];
}

export async function getTransactionById(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("transactions")
    .select(`
      *,
      expense_detail:expense_details(*),
      income_detail:income_details(*),
      receipt_items:receipt_items(*),
      files:transaction_files(*)
    `)
    .eq("id", id)
    .single();

  return data;
}

export async function getOutcomeSummary() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("transactions")
    .select(`
      *,
      expense_detail:expense_details(*),
      files:transaction_files(*)
    `)
    .eq("user_id", user.id)
    .eq("type", "outcome")
    .order("transaction_date", { ascending: false });

  return data || [];
}

export async function getSignedUrl(filePath: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.storage
    .from("transaction-files")
    .createSignedUrl(filePath, 3600); // 1 hour

  return data?.signedUrl || null;
}

export async function deleteTransaction(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("ไม่พบผู้ใช้");

  const { data: files } = await supabase
    .from("transaction_files")
    .select("file_path")
    .eq("transaction_id", id);

  if (files && files.length > 0) {
    const paths = files.map((f) => f.file_path);
    await supabase.storage.from("transaction-files").remove(paths);
  }

  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  return { success: true };
}

export async function updateTransaction(
  id: string,
  formData: {
    amount: number;
    currency: string;
    transaction_date: string;
    description: string;
    shop_name?: string;
    shop_address?: string;
    shop_tax_id?: string;
    employee_name?: string;
    customer_name?: string;
    source?: string;
    payment_gateway?: string;
    invoice_ref?: string;
    deposit_info?: string;
    branch_name?: string;
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("ไม่พบผู้ใช้");

  const { error: txError } = await supabase
    .from("transactions")
    .update({
      amount: formData.amount,
      currency: formData.currency,
      transaction_date: formData.transaction_date,
      description: formData.description || null,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (txError) throw new Error(txError.message);

  const { data: tx } = await supabase.from("transactions").select("type").eq("id", id).single();
  
  if (tx?.type === "outcome") {
    await supabase
      .from("expense_details")
      .update({
        shop_name: formData.shop_name || null,
        shop_address: formData.shop_address || null,
        shop_tax_id: formData.shop_tax_id || null,
        employee_name: formData.employee_name || null,
      })
      .eq("transaction_id", id);
  } else if (tx?.type === "income") {
    await supabase
      .from("income_details")
      .update({
        customer_name: formData.customer_name || null,
        source: formData.source || undefined,
        payment_gateway: formData.payment_gateway || null,
        invoice_ref: formData.invoice_ref || null,
        deposit_info: formData.deposit_info || null,
        branch_name: formData.branch_name || null,
      })
      .eq("transaction_id", id);
  }

  return { success: true };
}

export async function updateReceiptItems(
  transactionId: string,
  items: {
    product_name: string;
    quantity: number;
    unit_price: number;
    currency: string;
  }[]
) {
  const supabase = await createClient();
  await supabase.from("receipt_items").delete().eq("transaction_id", transactionId);

  if (items.length > 0) {
    const receiptItems = items.map((item) => ({
      transaction_id: transactionId,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      currency: item.currency || "THB",
    }));

    await supabase.from("receipt_items").insert(receiptItems);

    const totalAmount = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
    await supabase
      .from("transactions")
      .update({ amount: totalAmount })
      .eq("id", transactionId);
  }
  return { success: true };
}

export async function getSetting(key: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("key", key)
    .eq("user_id", user.id)
    .single();

  return data?.value || null;
}

export async function setSetting(key: string, value: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("ไม่พบผู้ใช้");

  const { error } = await supabase
    .from("settings")
    .upsert(
      { user_id: user.id, key, value, updated_at: new Date().toISOString() },
      { onConflict: "user_id,key" }
    );

  if (error) throw new Error(error.message);
  return { success: true };
}

export async function saveGoogleDriveFileLink(
  transactionId: string,
  fileType: string,
  fileUrl: string,
  fileName: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("ไม่พบผู้ใช้");
  
  const { error } = await supabase.from("transaction_files").insert({
    transaction_id: transactionId,
    file_type: fileType,
    file_path: fileUrl,
    file_name: fileName,
  });
  
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function getNextDailySequence(dateString: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "001";

  // dateString should be YYYY-MM-DD
  const { count } = await supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("transaction_date", dateString);

  const nextSeq = (count || 0) + 1;
  return String(nextSeq).padStart(3, "0");
}

export async function getNextMonthlySequence(dateString: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "0001";

  // Match all transactions in the same YYYY-MM
  const prefix = dateString.substring(0, 7); // "YYYY-MM"
  const { count } = await supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .like("transaction_date", `${prefix}%`);

  const nextSeq = (count || 0) + 1;
  return String(nextSeq).padStart(4, "0");
}
