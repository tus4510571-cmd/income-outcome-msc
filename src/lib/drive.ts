import { getSetting } from "./actions";

export async function uploadToGoogleDrive(base64File: string, folderId: string, customFileName?: string, transactionDate?: string, subFolder?: string) {
  try {
    let gasUrl = await getSetting("google_apps_script_url");
    if (!gasUrl) {
      throw new Error("Google Apps Script URL not found. Please connect in Settings.");
    }
    
    // Auto-fix http to https to prevent 301/302 redirects which change POST to GET
    if (gasUrl.startsWith("http://")) {
      gasUrl = gasUrl.replace("http://", "https://");
    }

    // Extract mime type and base64 data
    const matches = base64File.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error("Invalid base64 string");
    }
    
    const mimeType = matches[1];
    const base64Data = matches[2];

    const now = new Date();
    const dateStr = now.toISOString().replace(/[:.]/g, "").replace("T", "_").substring(0, 15);
    const ext = mimeType.split("/")[1] === "jpeg" ? "jpg" : (mimeType.split("/")[1] || "file");
    const fileName = customFileName ? `${customFileName}.${ext}` : `${dateStr}_upload.${ext}`;

    const response = await fetch(gasUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify({
        folderId,
        fileName,
        mimeType,
        base64Data,
        transactionDate: transactionDate ? (transactionDate.includes("T") ? transactionDate : `${transactionDate}T12:00:00`) : undefined,
        subFolder,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseText = await response.text();
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      if (responseText.includes("IncomeOutcome GAS API is running")) {
        throw new Error("Google Apps Script URL ไม่ถูกต้อง หรือเป็น Short URL (ทำให้ถูกแปลง POST เป็น GET) กรุณาตรวจสอบ URL ในหน้าตั้งค่าให้เป็นลิงก์ตรงที่ขึ้นต้นด้วย https://script.google.com");
      }
      throw new Error(`การตอบกลับผิดพลาด: ${responseText.substring(0, 50)}...`);
    }
    
    if (!result.success || !result.fileId || !result.link) {
      throw new Error(result.error || "อัปโหลดผ่านระบบเครือข่ายสำเร็จ แต่ไม่ได้รับรหัสไฟล์กลับมา (อาจเกิดจากชื่อไฟล์ยาวเกินไป กรุณาตั้งชื่อร้านให้สั้นลง)");
    }

    return { success: true, fileId: result.fileId, link: result.link };
  } catch (error) {
    console.error("Google Drive GAS Upload Error:", error);
    return { success: false, error: (error as Error).message || "Failed to upload to Google Drive" };
  }
}

export async function moveFilesToDeleted(fileUrls: string[], folderId: string, transactionDate: string) {
  try {
    let gasUrl = await getSetting("google_apps_script_url");
    if (!gasUrl) {
      return { success: false, error: "Google Apps Script URL not found. Please connect in Settings." };
    }

    if (gasUrl.startsWith("http://")) {
      gasUrl = gasUrl.replace("http://", "https://");
    }

    const fileIds = fileUrls.map(url => {
      if (!url) return null;
      const dMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (dMatch && dMatch[1]) return dMatch[1];
      const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (idMatch && idMatch[1]) return idMatch[1];
      const genericMatch = url.match(/[-\w]{25,}/);
      return genericMatch ? genericMatch[0] : null;
    }).filter(Boolean);

    if (fileIds.length === 0) {
      return { success: true, movedCount: 0 };
    }

    const response = await fetch(gasUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify({
        action: "moveToDeleted",
        folderId,
        fileIds,
        transactionDate: transactionDate ? (transactionDate.includes("T") ? transactionDate : `${transactionDate}T12:00:00`) : undefined,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseText = await response.text();
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      if (responseText.includes("IncomeOutcome GAS API is running")) {
        return { success: false, error: "Google Apps Script URL ไม่ถูกต้อง หรือเป็น Short URL" };
      }
      return { success: false, error: `การตอบกลับผิดพลาด: ${responseText.substring(0, 50)}...` };
    }
    
    if (!result.success) {
      console.warn("GAS move failed:", result.error);
      return { success: false, error: result.error || "GAS moveToDeleted failed" };
    }

    return { success: true, movedCount: result.movedCount ?? fileIds.length };
  } catch (error) {
    console.error("Google Drive GAS Move Error:", error);
    return { success: false, error: (error as Error).message || "Failed to move files in Google Drive" };
  }
}

export async function overwriteInGoogleDrive(base64File: string, fileIdToTrash: string, folderId: string, customFileName: string, transactionDate: string, subFolder: string) {
  try {
    const gasUrl = await getSetting("google_apps_script_url");
    if (!gasUrl) {
      throw new Error("Google Apps Script URL not found. Please connect in Settings.");
    }

    const matches = base64File.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error("Invalid base64 string");
    }
    
    const mimeType = matches[1];
    const base64Data = matches[2];

    const ext = mimeType.split("/")[1] === "jpeg" ? "jpg" : (mimeType.split("/")[1] || "file");
    const fileName = customFileName.endsWith(`.${ext}`) ? customFileName : `${customFileName}.${ext}`;

    const response = await fetch(gasUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify({
        action: "overwrite",
        fileIdToTrash,
        folderId,
        fileName,
        mimeType,
        base64Data,
        transactionDate: transactionDate ? (transactionDate.includes("T") ? transactionDate : `${transactionDate}T12:00:00`) : undefined,
        subFolder,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.success || !result.fileId || !result.link) {
      throw new Error(result.error || "อัปโหลดทับไฟล์เดิมไม่สำเร็จ");
    }

    return { success: true, fileId: result.fileId, link: result.link };
  } catch (error) {
    console.error("Google Drive GAS Overwrite Error:", error);
    return { success: false, error: (error as Error).message || "Failed to overwrite in Google Drive" };
  }
}

export async function downloadFromGoogleDrive(fileId: string) {
  try {
    const gasUrl = await getSetting("google_apps_script_url");
    if (!gasUrl) {
      throw new Error("Google Apps Script URL not found.");
    }

    const url = `${gasUrl}?action=download&fileId=${encodeURIComponent(fileId)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("HTTP error");
    const result = await response.json();
    
    if (!result.success) throw new Error(result.error);
    
    return `data:${result.mimeType};base64,${result.base64}`;
  } catch (error) {
    console.error("GAS Download Error:", error);
    throw error;
  }
}

export async function downloadFromDirectUrl(url: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/jpeg";
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error("Direct URL Download Error:", error);
    throw error;
  }
}