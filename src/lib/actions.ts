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
  receipt_number?: string;
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
      receipt_number: formData.receipt_number || null,
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

  const { data: tx } = await supabase
    .from("transactions")
    .select("type, transaction_date")
    .eq("id", id)
    .single();

  const { data: files } = await supabase
    .from("transaction_files")
    .select("file_path")
    .eq("transaction_id", id);

  if (files && files.length > 0 && tx) {
    const fileUrls = files.map((f) => f.file_path).filter(p => p.includes("drive.google.com"));
    
    if (fileUrls.length > 0) {
      const folderKey = tx.type === "income" ? "income_drive_folder_id" : "outcome_drive_folder_id";
      const folderId = await getSetting(folderKey);
      
      if (folderId) {
        const { moveFilesToDeleted } = await import("./drive");
        await moveFilesToDeleted(fileUrls, folderId, tx.transaction_date);
      }
    }

    const paths = files.map((f) => f.file_path).filter(p => !p.includes("drive.google.com"));
    if (paths.length > 0) {
      await supabase.storage.from("transaction-files").remove(paths);
    }
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
    receipt_number?: string;
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
        receipt_number: formData.receipt_number || null,
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

export async function getNextPVNumber(dateString: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  const parts = dateString.split("-");
  const yyyy = parseInt(parts[0]) || new Date().getFullYear();
  const mm = (parseInt(parts[1]) || (new Date().getMonth() + 1)).toString().padStart(2, "0");
  const thaiYear2Digits = String(yyyy + 543).slice(-2);
  const prefix = `PV${thaiYear2Digits}${mm}`;

  if (!user) return `${prefix}0001`;

  // Query all expense_details with receipt_number starting with prefix
  const { data: existingRecords } = await supabase
    .from("expense_details")
    .select("receipt_number")
    .like("receipt_number", `${prefix}%`);

  let maxSeq = 0;
  if (existingRecords && existingRecords.length > 0) {
    for (const rec of existingRecords) {
      if (rec.receipt_number && rec.receipt_number.startsWith(prefix)) {
        const seqPart = rec.receipt_number.substring(prefix.length);
        const seqNum = parseInt(seqPart, 10);
        if (!isNaN(seqNum) && seqNum > maxSeq) {
          maxSeq = seqNum;
        }
      }
    }
  }

  // Fallback: also count shop_without_receipt transactions in that month
  if (maxSeq === 0) {
    const monthPrefix = `${parts[0]}-${mm}`;
    const { count } = await supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("category", "shop_without_receipt")
      .like("transaction_date", `${monthPrefix}%`);
    maxSeq = count || 0;
  }

  const nextSeq = maxSeq + 1;
  return `${prefix}${String(nextSeq).padStart(4, "0")}`;
}

export async function recordRefund(data: {
  transactionId: string;
  refundAmount: number;
  refundDate: string;
  refundType: "company_direct" | "via_personal";
  refundReason: string;
  refundSlipCompanyBase64?: string;
  refundSlipCompanyName?: string;
  refundSlipPersonalBase64?: string;
  refundSlipPersonalName?: string;
  refundChatProofBase64?: string;
  refundChatProofName?: string;
  refundNoChatReason?: string;
}) {
  const user = await getAuthUser();
  const supabase = await createClient();

  // 1. Get original transaction
  const { data: tx } = await supabase
    .from("transactions")
    .select("*, expense_detail:expense_details(*)")
    .eq("id", data.transactionId)
    .eq("user_id", user.id)
    .single();

  if (!tx) throw new Error("ไม่พบรายการธุรกรรม");

  const outcomeFolderId = await getSetting("outcome_drive_folder_id");
  let refundSlipCompanyPath = tx.expense_detail?.refund_slip_company_path || null;
  let refundSlipPersonalPath = tx.expense_detail?.refund_slip_personal_path || null;
  let refundChatProofPath = tx.expense_detail?.refund_chat_proof_path || null;

  // Upload Refund Slip Company
  if (data.refundSlipCompanyBase64) {
    if (outcomeFolderId) {
      try {
        const { uploadToGoogleDrive } = await import("./drive");
        const res = await uploadToGoogleDrive(
          data.refundSlipCompanyBase64,
          outcomeFolderId,
          `สลิปโอนคืนเข้าบริษัท_${data.transactionId.substring(0, 6)}`,
          data.refundDate,
          "Refund"
        );
        if (res?.link) refundSlipCompanyPath = res.link;
      } catch (err) {
        console.warn("Drive upload fallback:", err);
      }
    }
    if (!refundSlipCompanyPath || !refundSlipCompanyPath.includes("drive.google.com")) {
      const res = await uploadFile(
        data.transactionId,
        "refund_slip_company",
        data.refundDate,
        "outcome",
        data.refundSlipCompanyName || "refund_slip_company.jpg",
        data.refundSlipCompanyBase64
      );
      refundSlipCompanyPath = res.filePath;
    }
  }

  // Upload Refund Slip Personal (if via_personal)
  if (data.refundSlipPersonalBase64 && data.refundType === "via_personal") {
    if (outcomeFolderId) {
      try {
        const { uploadToGoogleDrive } = await import("./drive");
        const res = await uploadToGoogleDrive(
          data.refundSlipPersonalBase64,
          outcomeFolderId,
          `สลิปร้านค้าโอนคืนเข้าส่วนตัว_${data.transactionId.substring(0, 6)}`,
          data.refundDate,
          "Refund"
        );
        if (res?.link) refundSlipPersonalPath = res.link;
      } catch (err) {
        console.warn("Drive upload fallback:", err);
      }
    }
    if (!refundSlipPersonalPath || !refundSlipPersonalPath.includes("drive.google.com")) {
      const res = await uploadFile(
        data.transactionId,
        "refund_slip_personal",
        data.refundDate,
        "outcome",
        data.refundSlipPersonalName || "refund_slip_personal.jpg",
        data.refundSlipPersonalBase64
      );
      refundSlipPersonalPath = res.filePath;
    }
  }

  // Upload Chat Proof
  if (data.refundChatProofBase64) {
    if (outcomeFolderId) {
      try {
        const { uploadToGoogleDrive } = await import("./drive");
        const res = await uploadToGoogleDrive(
          data.refundChatProofBase64,
          outcomeFolderId,
          `หลักฐานแชทคืนเงิน_${data.transactionId.substring(0, 6)}`,
          data.refundDate,
          "Refund"
        );
        if (res?.link) refundChatProofPath = res.link;
      } catch (err) {
        console.warn("Drive upload fallback:", err);
      }
    }
    if (!refundChatProofPath || !refundChatProofPath.includes("drive.google.com")) {
      const res = await uploadFile(
        data.transactionId,
        "refund_chat_proof",
        data.refundDate,
        "outcome",
        data.refundChatProofName || "refund_chat_proof.jpg",
        data.refundChatProofBase64
      );
      refundChatProofPath = res.filePath;
    }
  }

  // Update expense_details
  const { error: updateError } = await supabase
    .from("expense_details")
    .update({
      is_refunded: true,
      refund_amount: Number(data.refundAmount),
      refund_date: data.refundDate,
      refund_type: data.refundType,
      refund_reason: data.refundReason,
      refund_slip_company_path: refundSlipCompanyPath,
      refund_slip_personal_path: refundSlipPersonalPath,
      refund_chat_proof_path: refundChatProofPath,
      refund_no_chat_reason: data.refundNoChatReason || null,
    })
    .eq("transaction_id", data.transactionId);

  if (updateError) throw new Error("ไม่สามารถบันทึกข้อมูลการคืนเงินได้: " + updateError.message);

  return { success: true };
}

export async function cancelRefund(transactionId: string) {
  const user = await getAuthUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("expense_details")
    .update({
      is_refunded: false,
      refund_amount: 0,
      refund_date: null,
      refund_type: null,
      refund_reason: null,
      refund_slip_company_path: null,
      refund_slip_personal_path: null,
      refund_chat_proof_path: null,
      refund_no_chat_reason: null,
    })
    .eq("transaction_id", transactionId);

  if (error) throw new Error("ไม่สามารถยกเลิกสถานะคืนเงินได้: " + error.message);

  return { success: true };
}

export async function getNextRNNumber(dateString: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  const parts = dateString.split("-");
  const yyyy = parseInt(parts[0]) || new Date().getFullYear();
  const mm = (parseInt(parts[1]) || (new Date().getMonth() + 1)).toString().padStart(2, "0");
  const thaiYear2Digits = String(yyyy + 543).slice(-2);
  const prefix = `RN${thaiYear2Digits}${mm}`;

  if (!user) return `${prefix}0001`;

  // Query all income_details with return_note_number starting with prefix
  const { data: existingRecords } = await supabase
    .from("income_details")
    .select("return_note_number")
    .like("return_note_number", `${prefix}%`);

  let maxSeq = 0;
  if (existingRecords && existingRecords.length > 0) {
    for (const rec of existingRecords) {
      if (rec.return_note_number && rec.return_note_number.startsWith(prefix)) {
        const seqPart = rec.return_note_number.substring(prefix.length);
        const seqNum = parseInt(seqPart, 10);
        if (!isNaN(seqNum) && seqNum > maxSeq) {
          maxSeq = seqNum;
        }
      }
    }
  }

  const nextSeq = maxSeq + 1;
  return `${prefix}${String(nextSeq).padStart(4, "0")}`;
}

export async function recordCustomerRefund(data: {
  transactionId: string;
  refundAmount: number;
  refundDate: string;
  refundReason: string;
  customerAccountInfo?: string;
  returnNoteNumber?: string;
  paymentVoucherNumber?: string;
  refundSlipBase64?: string;
  refundSlipName?: string;
  refundChatProofBase64?: string;
  refundChatProofName?: string;
  refundNoChatReason?: string;
  refundProductPhotoBase64?: string;
  refundProductPhotoName?: string;
}) {
  const user = await getAuthUser();
  const supabase = await createClient();

  const { data: tx } = await supabase
    .from("transactions")
    .select("*, income_detail:income_details(*)")
    .eq("id", data.transactionId)
    .eq("user_id", user.id)
    .single();

  if (!tx) throw new Error("ไม่พบรายการธุรกรรมรายรับ");

  const incomeFolderId = await getSetting("income_drive_folder_id") || await getSetting("outcome_drive_folder_id");
  let refundSlipPath = tx.income_detail?.refund_slip_path || null;
  let refundChatProofPath = tx.income_detail?.refund_chat_proof_path || null;
  let refundProductPhotoPath = tx.income_detail?.refund_product_photo_path || null;

  const returnNoteNo = data.returnNoteNumber || await getNextRNNumber(data.refundDate);
  const paymentVoucherNo = data.paymentVoucherNumber || await getNextPVNumber(data.refundDate);

  // Upload Refund Slip
  if (data.refundSlipBase64) {
    if (incomeFolderId) {
      try {
        const { uploadToGoogleDrive } = await import("./drive");
        const res = await uploadToGoogleDrive(
          data.refundSlipBase64,
          incomeFolderId,
          `สลิปโอนคืนลูกค้า_${returnNoteNo}_${data.transactionId.substring(0, 6)}`,
          data.refundDate,
          "Customer_Refund"
        );
        if (res?.link) refundSlipPath = res.link;
      } catch (err) {
        console.warn("Drive upload fallback:", err);
      }
    }
    if (!refundSlipPath || !refundSlipPath.includes("drive.google.com")) {
      const res = await uploadFile(
        data.transactionId,
        "refund_slip",
        data.refundDate,
        "income",
        data.refundSlipName || "refund_slip_customer.jpg",
        data.refundSlipBase64
      );
      refundSlipPath = res.filePath;
    }
  }

  // Upload Chat Proof
  if (data.refundChatProofBase64) {
    if (incomeFolderId) {
      try {
        const { uploadToGoogleDrive } = await import("./drive");
        const res = await uploadToGoogleDrive(
          data.refundChatProofBase64,
          incomeFolderId,
          `หลักฐานแชทขอคืนเงิน_${returnNoteNo}_${data.transactionId.substring(0, 6)}`,
          data.refundDate,
          "Customer_Refund"
        );
        if (res?.link) refundChatProofPath = res.link;
      } catch (err) {
        console.warn("Drive upload fallback:", err);
      }
    }
    if (!refundChatProofPath || !refundChatProofPath.includes("drive.google.com")) {
      const res = await uploadFile(
        data.transactionId,
        "refund_chat_proof",
        data.refundDate,
        "income",
        data.refundChatProofName || "refund_chat_customer.jpg",
        data.refundChatProofBase64
      );
      refundChatProofPath = res.filePath;
    }
  }

  // Upload Damaged Product Photo
  if (data.refundProductPhotoBase64) {
    if (incomeFolderId) {
      try {
        const { uploadToGoogleDrive } = await import("./drive");
        const res = await uploadToGoogleDrive(
          data.refundProductPhotoBase64,
          incomeFolderId,
          `รูปสินค้าที่รับคืน_${returnNoteNo}_${data.transactionId.substring(0, 6)}`,
          data.refundDate,
          "Customer_Refund"
        );
        if (res?.link) refundProductPhotoPath = res.link;
      } catch (err) {
        console.warn("Drive upload fallback:", err);
      }
    }
    if (!refundProductPhotoPath || !refundProductPhotoPath.includes("drive.google.com")) {
      const res = await uploadFile(
        data.transactionId,
        "refund_product_photo",
        data.refundDate,
        "income",
        data.refundProductPhotoName || "refund_product_damaged.jpg",
        data.refundProductPhotoBase64
      );
      refundProductPhotoPath = res.filePath;
    }
  }

  // Update income_details
  const { error: updateError } = await supabase
    .from("income_details")
    .update({
      is_refunded: true,
      refund_amount: Number(data.refundAmount),
      refund_date: data.refundDate,
      refund_reason: data.refundReason,
      return_note_number: returnNoteNo,
      payment_voucher_number: paymentVoucherNo,
      refund_slip_path: refundSlipPath,
      refund_chat_proof_path: refundChatProofPath,
      refund_no_chat_reason: data.refundNoChatReason || null,
      refund_product_photo_path: refundProductPhotoPath,
      customer_account_info: data.customerAccountInfo || null,
    })
    .eq("transaction_id", data.transactionId);

  if (updateError) throw new Error("ไม่สามารถบันทึกข้อมูลการคืนเงินลูกค้าได้: " + updateError.message);

  return { success: true, returnNoteNumber: returnNoteNo, paymentVoucherNumber: paymentVoucherNo };
}

export async function cancelCustomerRefund(transactionId: string) {
  const user = await getAuthUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("income_details")
    .update({
      is_refunded: false,
      refund_amount: 0,
      refund_date: null,
      refund_reason: null,
      return_note_number: null,
      payment_voucher_number: null,
      refund_slip_path: null,
      refund_chat_proof_path: null,
      refund_no_chat_reason: null,
      refund_product_photo_path: null,
      customer_account_info: null,
    })
    .eq("transaction_id", transactionId);

  if (error) throw new Error("ไม่สามารถยกเลิกสถานะคืนเงินลูกค้าได้: " + error.message);

  return { success: true };
}
