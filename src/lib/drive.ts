"use server";

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
        "Content-Type": "application/json",
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
    
    if (!result.success) {
      throw new Error(result.error || "Failed to upload to Google Drive via GAS");
    }

    return { success: true, fileId: result.fileId, link: result.link };
  } catch (error) {
    console.error("Google Drive GAS Upload Error:", error);
    return { success: false, error: (error as Error).message || "Failed to upload to Google Drive" };
  }
}
