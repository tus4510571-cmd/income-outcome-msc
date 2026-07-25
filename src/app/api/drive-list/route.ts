import { NextResponse } from "next/server";
import { getSetting } from "@/lib/actions";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const folderId = searchParams.get("folderId");

  if (!folderId) {
    return new NextResponse(JSON.stringify({ error: "Missing folderId" }), { status: 400 });
  }

  try {
    const webAppUrl = await getSetting("google_apps_script_url");
    if (!webAppUrl) {
      return new NextResponse(JSON.stringify({ error: "Web App URL not configured" }), { status: 500 });
    }

    const response = await fetch(`${webAppUrl}?action=list_files&folderId=${folderId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch from GAS: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || "GAS returned success: false");
    }

    return new NextResponse(JSON.stringify({ files: data.files }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error listing files from drive:", error);
    return new NextResponse(JSON.stringify({ error: error.message || "Error fetching file list" }), { status: 500 });
  }
}
