"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { getSetting, setSetting } from "@/lib/actions";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  
  const [googleConnected, setGoogleConnected] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [gasUrl, setGasUrl] = useState("");
  
  const [incomePath, setIncomePath] = useState("");
  const [outcomePath, setOutcomePath] = useState("");
  const [quotationPath, setQuotationPath] = useState("");
  
  const [shopifyToken, setShopifyToken] = useState("");
  const [shopifyDomain, setShopifyDomain] = useState("");
  
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [pathsSaved, setPathsSaved] = useState(false);
  const [geminiSaved, setGeminiSaved] = useState(false);

  const [signaturePayerId, setSignaturePayerId] = useState("");
  const [signatureApproverId, setSignatureApproverId] = useState("");
  const [signatureFolderId, setSignatureFolderId] = useState("");
  const [signatureFiles, setSignatureFiles] = useState<{id: string, name: string}[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  
  // My Company Details (for Shop Without Receipt)
  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyTaxId, setCompanyTaxId] = useState("");
  
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  
  const [testingGemini, setTestingGemini] = useState(false);
  const [geminiTestStatus, setGeminiTestStatus] = useState<{success: boolean, message: string} | null>(null);

  useEffect(() => {
    setMounted(true);
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const url = await getSetting("google_apps_script_url");
      if (url) {
        setGoogleConnected(true);
        setGasUrl(url);
      } else {
        setGoogleConnected(false);
        setShowUrlInput(true);
      }
      
      const incPath = await getSetting("income_drive_folder_id");
      if (incPath) setIncomePath(incPath);
      
      const outPath = await getSetting("outcome_drive_folder_id");
      if (outPath) setOutcomePath(outPath);

      const qPath = await getSetting("quotation_drive_folder_id");
      if (qPath) setQuotationPath(qPath);

      const sToken = await getSetting("shopify_access_token");
      if (sToken) setShopifyToken(sToken);

      const sDomain = await getSetting("shopify_store_domain");
      if (sDomain) setShopifyDomain(sDomain);

      const geminiKey = await getSetting("gemini_api_key");
      if (geminiKey) {
        setGeminiApiKey(geminiKey);
        setGeminiSaved(true);
      }

      if (incPath || outPath || qPath) {
        setPathsSaved(true);
      }

      const payerId = await getSetting("signature_payer_drive_id");
      if (payerId) setSignaturePayerId(payerId);

      const approverId = await getSetting("signature_approver_drive_id");
      if (approverId) setSignatureApproverId(approverId);

      const sigFolderId = await getSetting("signature_folder_id");
      if (sigFolderId) {
        setSignatureFolderId(sigFolderId);
        fetchSignatureFiles(sigFolderId);
      }

      const cName = await getSetting("company_name");
      if (cName) setCompanyName(cName);
      
      const cAddress = await getSetting("company_address");
      if (cAddress) setCompanyAddress(cAddress);
      
      const cPhone = await getSetting("company_phone");
      if (cPhone) setCompanyPhone(cPhone);
      
      const cEmail = await getSetting("company_email");
      if (cEmail) setCompanyEmail(cEmail);
      
      const cTaxId = await getSetting("company_tax_id");
      if (cTaxId) setCompanyTaxId(cTaxId);

    } catch (err) {
      console.error(err);
    }
  };

  const fetchSignatureFiles = async (folderId: string) => {
    if (!folderId) return;
    setLoadingFiles(true);
    try {
      const res = await fetch(`/api/drive-list?folderId=${folderId}`);
      const data = await res.json();
      if (res.ok) {
        setSignatureFiles(data.files || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleSaveUrl = async () => {
    if (!gasUrl.trim()) return;
    if (!gasUrl.startsWith("https://script.google.com/")) {
      setMessage("Invalid URL. Must start with https://script.google.com/");
      return;
    }
    
    setSaving(true);
    setMessage("");
    try {
      await setSetting("google_apps_script_url", gasUrl);
      setGoogleConnected(true);
      setShowUrlInput(false);
      setMessage("Google Apps Script Connected Successfully!");
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleSavePaths = async () => {
    setSaving(true);
    setMessage("");
    try {
      if (incomePath) await setSetting("income_drive_folder_id", incomePath);
      if (outcomePath) await setSetting("outcome_drive_folder_id", outcomePath);
      if (quotationPath) await setSetting("quotation_drive_folder_id", quotationPath);
      setPathsSaved(true);
      setMessage("Paths saved successfully!");
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveShopify = async () => {
    setSaving(true);
    setMessage("");
    try {
      await setSetting("shopify_access_token", shopifyToken);
      await setSetting("shopify_store_domain", shopifyDomain);
      setMessage("Shopify settings saved successfully!");
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGemini = async () => {
    setSaving(true);
    setMessage("");
    setGeminiTestStatus(null);
    try {
      await setSetting("gemini_api_key", geminiApiKey);
      setGeminiSaved(true);
      setMessage("Gemini API Key saved successfully!");
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleTestGemini = async () => {
    setTestingGemini(true);
    setGeminiTestStatus(null);
    try {
      const res = await fetch("/api/test-gemini");
      const data = await res.json();
      setGeminiTestStatus({
        success: data.success,
        message: data.success ? "always ready" : data.message
      });
    } catch (err) {
      setGeminiTestStatus({ success: false, message: "Failed to connect to server" });
    } finally {
      setTestingGemini(false);
    }
  };

  const handleSaveSignatures = async () => {
    setSaving(true);
    setMessage("");
    try {
      await setSetting("signature_folder_id", signatureFolderId);
      await setSetting("signature_payer_drive_id", signaturePayerId);
      await setSetting("signature_approver_drive_id", signatureApproverId);
      setMessage("Signatures saved successfully!");
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMyCompany = async () => {
    setSaving(true);
    setMessage("");
    try {
      await setSetting("company_name", companyName);
      await setSetting("company_address", companyAddress);
      await setSetting("company_phone", companyPhone);
      await setSetting("company_email", companyEmail);
      await setSetting("company_tax_id", companyTaxId);
      setMessage("Company details saved successfully!");
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (!mounted) return null;

  return (
    <main className="min-h-screen p-4 md:p-8 bg-slate-50/50">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">ตั้งค่าระบบ (Settings)</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">จัดการการตั้งค่าและเชื่อมต่อระบบภายนอก</p>
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-xl font-medium mb-6 ${
            message.includes("Invalid") || message.includes("Error") 
              ? "bg-red-50 text-red-700 border border-red-200" 
              : "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
          }`}>
            {message}
          </div>
        )}

        {/* Horizontal Tabs */}
        <div className="flex space-x-1 border-b border-slate-200 dark:border-slate-700 mb-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab("general")}
            className={`py-3 px-6 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === "general"
                ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:hover:text-slate-300"
            }`}
          >
            General Setting
          </button>
          <button
            onClick={() => setActiveTab("with-receipt")}
            className={`py-3 px-6 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === "with-receipt"
                ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:hover:text-slate-300"
            }`}
          >
            ร้านค้ามีใบเสร็จ
          </button>
          <button
            onClick={() => setActiveTab("without-receipt")}
            className={`py-3 px-6 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === "without-receipt"
                ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:hover:text-slate-300"
            }`}
          >
            ร้านค้าไม่มีใบเสร็จ
          </button>
        </div>

        {/* Tab Content: General Setting */}
        {activeTab === "general" && (
          <div className="space-y-6">
            {/* Theme Section */}
            <div className="card">
              <h2 className="text-lg font-bold mb-4">หน้าตาแอปพลิเคชัน (Theme)</h2>
              <div className="flex gap-4">
                <button
                  onClick={() => setTheme("light")}
                  className={`px-4 py-2 rounded-xl font-medium border-2 transition-all ${
                    theme === "light"
                      ? "border-indigo-500 text-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-400"
                      : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-400"
                  }`}
                >
                  ☀️ สว่าง (Light)
                </button>
                <button
                  onClick={() => setTheme("dark")}
                  className={`px-4 py-2 rounded-xl font-medium border-2 transition-all ${
                    theme === "dark"
                      ? "border-indigo-500 text-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-400"
                      : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-400"
                  }`}
                >
                  🌙 มืด (Dark)
                </button>
              </div>
            </div>

            {/* Google API Section */}
            <div className="card border-t-4 border-indigo-500">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold">Google Drive (Apps Script)</h2>
                <div
                  className={`px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2 ${
                    googleConnected
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                      : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                  }`}
                >
                  {googleConnected ? "🟢 Connected" : "🔴 Not Connected"}
                </div>
              </div>

              {googleConnected && !showUrlInput ? (
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                  <p className="text-slate-600 dark:text-slate-400 text-sm mb-4 truncate">
                    URL ปัจจุบัน: {gasUrl}
                  </p>
                  <button
                    onClick={() => setShowUrlInput(true)}
                    className="btn-outline px-4 py-2 text-sm"
                  >
                    Change URL (เปลี่ยน Web App URL)
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="label">Web App URL (จาก Google Apps Script)</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="https://script.google.com/macros/s/.../exec"
                    value={gasUrl}
                    onChange={(e) => setGasUrl(e.target.value)}
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={handleSaveUrl}
                      disabled={saving || !gasUrl.trim()}
                      className="btn-primary flex-1"
                    >
                      {saving ? "กำลังบันทึก..." : "Connect"}
                    </button>
                    {googleConnected && (
                      <button
                        onClick={() => setShowUrlInput(false)}
                        className="btn-ghost"
                      >
                        ยกเลิก
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Paths Section */}
            <div className={`card ${!googleConnected ? "opacity-60 pointer-events-none" : ""}`}>
              <div className="flex justify-between items-center mb-1">
                <h2 className="text-lg font-bold">Google Drive Paths</h2>
                <div
                  className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 ${
                    pathsSaved
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                      : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                  }`}
                >
                  {pathsSaved ? "🟢 Connected" : "🔴 Not Connected"}
                </div>
              </div>
              <p className="text-sm text-slate-500 mb-4">
                กรอก Folder ID ของโฟลเดอร์ใน Google Drive ของฝ่ายบัญชี
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="label">Income Folder ID (รายรับ)</label>
                  <input
                    type="text"
                    value={incomePath}
                    onChange={(e) => setIncomePath(e.target.value)}
                    className="input-field"
                    placeholder="e.g. 1a2b3c4d5e6f7g8h9i0j..."
                    disabled={!googleConnected}
                  />
                </div>
                
                <div>
                  <label className="label">Outcome Folder ID (รายจ่าย)</label>
                  <input
                    type="text"
                    value={outcomePath}
                    onChange={(e) => setOutcomePath(e.target.value)}
                    className="input-field"
                    placeholder="e.g. 1a2b3c4d5e6f7g8h9i0j..."
                    disabled={!googleConnected}
                  />
                </div>
                
                <div>
                  <label className="label">Quotation Folder ID (ใบเสนอราคา)</label>
                  <input
                    type="text"
                    value={quotationPath}
                    onChange={(e) => setQuotationPath(e.target.value)}
                    className="input-field"
                    placeholder="e.g. 1a2b3c4d5e6f7g8h9i0j..."
                    disabled={!googleConnected}
                  />
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleSavePaths}
                    disabled={saving || !googleConnected || (!incomePath && !outcomePath)}
                    className="btn-secondary w-full"
                  >
                    {saving ? "กำลังบันทึก..." : "Save Paths"}
                  </button>
                </div>
              </div>
            </div>

            {/* Supabase Section */}
            <div className="card border-t-4 border-emerald-500">
              <h2 className="text-lg font-bold mb-1">Supabase Database</h2>
              <p className="text-sm text-slate-500 mb-4">
                ระบบจัดการฐานข้อมูล (Database)
              </p>
              
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-sm space-y-3">
                <p>
                  <strong>สถานะปัจจุบัน:</strong> <span className="text-emerald-600 font-bold">🟢 ทำงานปกติ</span> (คุณกำลังใช้งานแอปอยู่)
                </p>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg">
                  <strong>ℹ️ คำแนะนำสำหรับผู้ใช้ฟรี (Free Tier):</strong>
                  <ul className="list-disc pl-5 mt-1 space-y-1">
                    <li>Supabase จะ <strong className="text-red-500">หยุดการทำงาน (Pause)</strong> หากไม่ได้ใช้งานเกิน 7 วัน</li>
                    <li><strong>วิธีป้องกัน:</strong> การที่คุณเข้ามาใช้งานแอปนี้ (ล็อกอิน, บันทึกข้อมูล หรือเข้าหน้าเว็บ) ระบบจะนับว่ามีการ Active ทันที ช่วยป้องกันฐานข้อมูลโดน Pause ได้ครับ</li>
                    <li><strong>ถ้าโดน Pause ไปแล้ว:</strong> หน้าเว็บแอปนี้จะขึ้น Error โหลดข้อมูลไม่ได้ วิธีแก้ไขคือต้องกดปุ่มด้านล่างเพื่อไปหน้าจัดการของ Supabase แล้วกดปุ่ม Reactivate / Restore โปรเจกต์ด้วยตัวเองเท่านั้น (ไม่สามารถกดผ่านหน้านี้ได้ถ้าฐานข้อมูลดับไปแล้ว)</li>
                  </ul>
                </div>
                <div className="pt-2">
                  <a 
                    href="https://supabase.com/dashboard/projects" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-block btn-outline px-4 py-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 w-full text-center font-medium"
                  >
                    ไปที่หน้าจัดการ Supabase ↗
                  </a>
                </div>
              </div>
            </div>

            {/* Gemini AI Section */}
            <div className="card border-t-4 border-blue-500">
              <div className="flex justify-between items-center mb-1">
                <h2 className="text-lg font-bold">Gemini AI API Key</h2>
                <div
                  className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 ${
                    geminiSaved
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                      : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                  }`}
                >
                  {geminiSaved ? "🟢 Connected" : "🔴 Not Connected"}
                </div>
              </div>
              <p className="text-sm text-slate-500 mb-4">
                ใช้สำหรับสแกนใบเสร็จอัตโนมัติ (รับ API Key ฟรีได้ที่ Google AI Studio)
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="label">Gemini API Key</label>
                  <input
                    type="password"
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    className="input-field"
                    placeholder="AIzaSy..."
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    onClick={handleSaveGemini}
                    disabled={saving || !geminiApiKey}
                    className="btn-secondary flex-1 border-blue-200 text-blue-700 hover:bg-blue-50"
                  >
                    {saving ? "กำลังบันทึก..." : "Save Gemini API Key"}
                  </button>
                  {geminiSaved && (
                    <button
                      onClick={handleTestGemini}
                      disabled={testingGemini}
                      className="btn-outline whitespace-nowrap"
                    >
                      {testingGemini ? "กำลังทดสอบ..." : "ทดสอบการเชื่อมต่อ"}
                    </button>
                  )}
                </div>
                
                {geminiTestStatus && (
                  <div className={`mt-2 p-3 rounded-lg text-sm font-bold flex items-center gap-2 ${
                    geminiTestStatus.success 
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                      : 'bg-red-50 text-red-600 border border-red-200'
                  }`}>
                    {geminiTestStatus.success ? "🟢 " : "🔴 "} 
                    {geminiTestStatus.message}
                  </div>
                )}
              </div>
            </div>
            {/* My Company Section */}
            <div className="card border-t-4 border-amber-500">
              <h2 className="text-lg font-bold mb-1">ข้อมูลบริษัทของเรา (My Company)</h2>
              <p className="text-sm text-slate-500 mb-6">
                ข้อมูลส่วนนี้จะถูกนำไปใช้แสดงเป็น "ผู้ซื้อ" ในฟอร์มบิลเงินสดและใบรับรองแทนใบเสร็จรับเงิน
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="label">ชื่อบริษัท</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="input-field"
                    placeholder="เช่น บริษัท โฮมออฟคราฟ จำกัด"
                  />
                </div>
                <div>
                  <label className="label">ที่อยู่บริษัท</label>
                  <textarea
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                    className="input-field min-h-[80px]"
                    placeholder="บ้านเลขที่ ซอย ถนน ตำบล อำเภอ จังหวัด รหัสไปรษณีย์"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">เบอร์โทรศัพท์</label>
                    <input
                      type="text"
                      value={companyPhone}
                      onChange={(e) => setCompanyPhone(e.target.value)}
                      className="input-field"
                      placeholder="เช่น 02-xxx-xxxx"
                    />
                  </div>
                  <div>
                    <label className="label">อีเมล</label>
                    <input
                      type="email"
                      value={companyEmail}
                      onChange={(e) => setCompanyEmail(e.target.value)}
                      className="input-field"
                      placeholder="เช่น info@example.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="label">เลขประจำตัวผู้เสียภาษี (Tax ID)</label>
                  <input
                    type="text"
                    value={companyTaxId}
                    onChange={(e) => setCompanyTaxId(e.target.value)}
                    className="input-field"
                    placeholder="เลข 13 หลัก"
                  />
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 mt-4">
                  <button
                    onClick={handleSaveMyCompany}
                    disabled={saving}
                    className="btn-secondary w-full border-amber-200 text-amber-700 hover:bg-amber-50 mt-4"
                  >
                    {saving ? "กำลังบันทึก..." : "บันทึกข้อมูลบริษัท"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: ร้านค้ามีใบเสร็จ */}
        {activeTab === "with-receipt" && (
          <div className="space-y-6">
            {/* Shopify Section */}
            <div className="card border-t-4 border-green-500">
              <h2 className="text-lg font-bold mb-1">Shopify Integration</h2>
              <p className="text-sm text-slate-500 mb-4">
                เชื่อมต่อ Shopify Admin API เพื่อดึงรูปภาพและชื่อสินค้าแบบมีใบเสร็จ
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="label">Store Domain</label>
                  <input
                    type="text"
                    value={shopifyDomain}
                    onChange={(e) => setShopifyDomain(e.target.value)}
                    className="input-field"
                    placeholder="e.g. your-store.myshopify.com"
                  />
                </div>
                
                <div>
                  <label className="label">Admin API Access Token</label>
                  <input
                    type="password"
                    value={shopifyToken}
                    onChange={(e) => setShopifyToken(e.target.value)}
                    className="input-field"
                    placeholder="shpat_..."
                  />
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleSaveShopify}
                    disabled={saving || (!shopifyDomain && !shopifyToken)}
                    className="btn-secondary w-full border-green-200 text-green-700 hover:bg-green-50"
                  >
                    {saving ? "กำลังบันทึก..." : "Save Shopify Settings"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: ร้านค้าไม่มีใบเสร็จ */}
        {activeTab === "without-receipt" && (
          <div className="space-y-6">

            <div className="card border-t-4 border-amber-500">
              <h2 className="text-lg font-bold mb-1">การตั้งค่าใบรับรองแทนใบเสร็จรับเงิน</h2>
              <p className="text-sm text-slate-500 mb-6">
                ตั้งค่าลายเซ็นอัตโนมัติ สำหรับเอกสารใบรับรองแทนใบเสร็จรับเงิน โดยใส่ Google Drive File ID ของรูปภาพลายเซ็น (ควรเป็นพื้นหลังโปร่งใส .png)
              </p>
              
              <div className="space-y-5">
                <div>
                  <label className="label">Signature Folder ID (โฟลเดอร์เก็บลายเซ็นต์)</label>
                  <div className="text-xs text-slate-400 mb-1">นำ ID ของโฟลเดอร์ที่เก็บรูปลายเซ็นต์มาวาง (เช่น โฟลเดอร์ outcome/signature)</div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={signatureFolderId}
                      onChange={(e) => setSignatureFolderId(e.target.value)}
                      className="input-field flex-1"
                      placeholder="e.g. 1a2b3c4d5e6f7g8h9i0j..."
                    />
                    <button 
                      onClick={() => fetchSignatureFiles(signatureFolderId)}
                      disabled={!signatureFolderId || loadingFiles}
                      className="btn-outline whitespace-nowrap"
                    >
                      {loadingFiles ? "กำลังโหลด..." : "โหลดรายชื่อไฟล์"}
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <label className="label">เลือกลายเซ็นผู้จ่ายเงิน</label>
                  <select 
                    className="input-field"
                    value={signaturePayerId}
                    onChange={(e) => setSignaturePayerId(e.target.value)}
                  >
                    <option value="">-- เลือกลายเซ็น --</option>
                    {signatureFiles.map(file => (
                      <option key={file.id} value={file.id}>{file.name}</option>
                    ))}
                    {/* Fallback if currently selected ID isn't in list yet */}
                    {signaturePayerId && !signatureFiles.find(f => f.id === signaturePayerId) && (
                      <option value={signaturePayerId}>รหัสเดิม: {signaturePayerId.substring(0,8)}...</option>
                    )}
                  </select>
                </div>
                
                <div>
                  <label className="label">เลือกลายเซ็นผู้อนุมัติ</label>
                  <select 
                    className="input-field"
                    value={signatureApproverId}
                    onChange={(e) => setSignatureApproverId(e.target.value)}
                  >
                    <option value="">-- เลือกลายเซ็น --</option>
                    {signatureFiles.map(file => (
                      <option key={file.id} value={file.id}>{file.name}</option>
                    ))}
                    {/* Fallback if currently selected ID isn't in list yet */}
                    {signatureApproverId && !signatureFiles.find(f => f.id === signatureApproverId) && (
                      <option value={signatureApproverId}>รหัสเดิม: {signatureApproverId.substring(0,8)}...</option>
                    )}
                  </select>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={handleSaveSignatures}
                    disabled={saving}
                    className="btn-secondary w-full border-amber-200 text-amber-700 hover:bg-amber-50"
                  >
                    {saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่าลายเซ็น"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
