import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { getSetting } from '@/lib/actions';

export async function GET() {
  try {
    const apiKey = await getSetting("gemini_api_key");
    if (!apiKey) {
      return NextResponse.json({ success: false, message: "No API Key found" }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: 'hi',
        config: { maxOutputTokens: 5 }
    });

    if (response) {
      return NextResponse.json({ success: true, message: "always ready" });
    } else {
      throw new Error("No response from Gemini");
    }

  } catch (error: any) {
    console.error("Gemini Test Error:", error);
    return NextResponse.json({ success: false, message: error.message || "Failed to connect to Gemini API" }, { status: 500 });
  }
}
