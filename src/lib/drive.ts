import { getSetting } from "./actions";

export async function uploadToGoogleDrive(base64File: string, folderId: string, customFileName?: string, transactionDate?: string, subFolder?: string) {
  try {
    const gasUrl = await getSetting("google_apps_script_url");
    if (!gasUrl) {
      throw new Error("Google Apps Script URL not found. Please connect in Settings.");
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
        transactionDate,
        subFolder,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
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
    const gasUrl = await getSetting("google_apps_script_url");
    if (!gasUrl) {
      throw new Error("Google Apps Script URL not found. Please connect in Settings.");
    }

    const fileIds = fileUrls.map(url => {
      const match = url.match(/[-\w]{25,}/);
      return match ? match[0] : null;
    }).filter(Boolean);

    const response = await fetch(gasUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify({
        action: "moveToDeleted",
        folderId,
        fileIds,
        transactionDate,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      console.warn("GAS move failed but continuing:", result.error);
    }

    return { success: true, movedCount: result.movedCount || 0 };
  } catch (error) {
    console.error("Google Drive GAS Move Error:", error);
    // Don't fail the whole transaction deletion if move fails
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
        transactionDate,
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