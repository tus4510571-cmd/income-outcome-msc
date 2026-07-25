import { NextResponse } from "next/server";
import { getSetting } from "@/lib/actions";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new NextResponse("Missing id", { status: 400 });
  }

  try {
    // If it's a settings key instead of direct ID, fetch it
    let driveId = id;
    if (id === "signature_payer" || id === "signature_approver") {
      const key = id === "signature_payer" ? "signature_payer_drive_id" : "signature_approver_drive_id";
      const settingId = await getSetting(key);
      if (!settingId) {
        // Return transparent 1x1 pixel if no signature
        const transparentGif = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
        return new NextResponse(transparentGif, {
          headers: { "Content-Type": "image/gif" },
        });
      }
      driveId = settingId;
    }

    const webAppUrl = await getSetting("google_apps_script_url");
    if (!webAppUrl) {
      throw new Error("Google Drive Web App URL is not configured");
    }

    const response = await fetch(`${webAppUrl}?action=download&fileId=${driveId}`);
    
    if (!response.ok) {
      throw new Error("Failed to fetch from GAS");
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || "GAS returned success: false");
    }

    const buffer = Buffer.from(data.base64, "base64");

    const headers = new Headers();
    headers.set("Content-Type", data.mimeType || "image/png");
    headers.set("Cache-Control", "public, max-age=3600");
    // Enable CORS for html2canvas
    headers.set("Access-Control-Allow-Origin", "*");

    return new NextResponse(buffer, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Error proxying image:", error);
    return new NextResponse("Error fetching image", { status: 500 });
  }
}
