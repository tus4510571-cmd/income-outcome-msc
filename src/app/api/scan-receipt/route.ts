import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getSetting } from "@/lib/actions";

export async function POST(req: NextRequest) {
  try {
    // 1. Get Gemini API Key from settings
    const apiKey = await getSetting("gemini_api_key");
    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API Key is missing. Please set it in Settings." },
        { status: 400 }
      );
    }

    // 2. Parse form data (the image file)
    const formData = await req.formData();
    const file = formData.get("receipt") as File | null;
    
    if (!file) {
      return NextResponse.json(
        { error: "No receipt image uploaded." },
        { status: 400 }
      );
    }

    // 3. Convert file to base64 for Gemini
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Data = buffer.toString("base64");
    
    // 4. Initialize Gemini SDK
    const ai = new GoogleGenAI({ apiKey: apiKey });

    // 5. Create prompt and call Gemini 1.5 Flash
    const prompt = `
      คุณคือผู้เชี่ยวชาญด้านบัญชี นี่คือรูปภาพบิลหรือใบเสร็จรับเงิน
      จงดึงข้อมูลออกมาให้อยู่ในรูปแบบ JSON เท่านั้น โดยมีโครงสร้างดังนี้:
      {
        "shopName": "ชื่อร้านค้า (ถ้าไม่มีให้ใส่ 'ไม่ระบุชื่อร้าน')",
        "date": "วันที่บนบิล (แปลงให้อยู่ในรูปแบบ YYYY-MM-DD เช่น 2026-03-04) กฎการแปลง: 1. ชุดแรก=วัน, ชุดสอง=เดือน 2. กรณีปีเป็นเลข 2 หลัก ถ้าน้อยกว่า 50 (เช่น 24, 25, 26, 27) ให้ถือเป็น ค.ศ. 20xx (เช่น 26 = 2026) แต่ถ้ามากกว่าหรือเท่ากับ 50 (เช่น 67, 68, 69) ให้ถือเป็น พ.ศ. ย่อ ให้บวก 2500 แล้วลบ 543 (เช่น 69 = 2569 = 2026) 3. กรณี พ.ศ. 4 หลักให้ลบ 543 4. ถ้าหาไม่เจอให้ใส่ค่าว่าง",
        "items": [
          {
            "name": "ชื่อสินค้าหรือบริการ",
            "quantity": 1,
            "price": 100.50 // สำคัญมาก: ตรงนี้คือ "ราคาต่อหน่วย" (Unit Price) เท่านั้น ห้ามเอา "จำนวนเงินรวมของสินค้านั้น" มาใส่เด็ดขาด
          }
        ],
        "totalAmount": 100.50
      }
      
      คำแนะนำเพิ่มเติมที่สำคัญ:
      1. แยกแยะระหว่าง "ราคาต่อหน่วย" และ "จำนวนเงินรวม" ของสินค้าแต่ละรายการให้ดี หากบิลมีคอลัมน์ราคาต่อหน่วย ให้ดึงเฉพาะราคานั้นมาใส่ใน price
      2. หากราคาในบิลไม่มีการระบุจำนวนชิ้น (quantity) ให้บังคับใส่ quantity เป็น 1
      3. ตรวจสอบให้แน่ใจว่าผลลัพธ์เป็น JSON ล้วนๆ ห้ามมี markdown (เช่น \`\`\`json) หรือคำบรรยายใดๆ ปนมา
    `;

    try {
      // 1. First fetch available models to guarantee we use a working one
      const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      const listData = await listRes.json();
      const flashModels = listData.models
        ?.map((m: any) => m.name.replace('models/', ''))
        .filter((name: string) => name.includes("flash")) || [];
        
      // 2. Loop through flash models and test them
      let workingModel = null;
      let lastApiError = null;
      let finalResultText = null;

      for (const model of flashModels) {
        try {
          const response = await ai.models.generateContent({
            model: model,
            contents: [
              {
                role: 'user',
                parts: [
                  { text: prompt },
                  {
                    inlineData: {
                      data: base64Data,
                      mimeType: file.type,
                    },
                  },
                ],
              }
            ],
            config: {
              responseMimeType: "application/json",
              temperature: 0.1,
            }
          });

          finalResultText = response.text;
          
          if (finalResultText) {
            workingModel = model;
            break; // Found working model!
          }
        } catch (apiError: any) {
          lastApiError = apiError;
          // Continue to next model
        }
      }

      if (!workingModel || !finalResultText) {
        throw lastApiError || new Error("All models failed or returned empty.");
      }

      const extractedData = JSON.parse(finalResultText);
      return NextResponse.json(extractedData);
    } catch (apiError: any) {
      console.error("Gemini API Error:", apiError);
      
      // If it's a model not found error, try to fetch the list of models
      try {
        const fetchRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const modelsData = await fetchRes.json();
        const availableModels = modelsData.models?.map((m: any) => m.name).join(", ");
        return NextResponse.json(
          { 
            error: "Model not found or error. Available models: " + availableModels, 
            details: apiError.message 
          },
          { status: 500 }
        );
      } catch (listError) {
        throw apiError; // Throw original error if listing fails
      }
    }

  } catch (error) {
    console.error("Error scanning receipt:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
