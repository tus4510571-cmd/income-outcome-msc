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

    // 2. Parse form data (the image files)
    const formData = await req.formData();
    const files = formData.getAll("receipt") as File[];
    
    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No receipt images uploaded." },
        { status: 400 }
      );
    }

    // 3. Convert files to base64 parts for Gemini
    const imageParts = await Promise.all(
      files.map(async (f) => {
        const bytes = await f.arrayBuffer();
        let mimeType = f.type;
        if (!mimeType || mimeType === "application/octet-stream") {
          const lower = (f.name || "").toLowerCase();
          if (lower.endsWith(".pdf")) mimeType = "application/pdf";
          else if (lower.endsWith(".png")) mimeType = "image/png";
          else if (lower.endsWith(".webp")) mimeType = "image/webp";
          else mimeType = "image/jpeg";
        }
        return {
          inlineData: {
            data: Buffer.from(bytes).toString("base64"),
            mimeType: mimeType,
          },
        };
      })
    );
    
    // 4. Initialize Gemini SDK
    const ai = new GoogleGenAI({ apiKey: apiKey });

    // 5. Create prompt
    const prompt = `
      คุณคือผู้เชี่ยวชาญด้านบัญชี นี่คือรูปภาพบิลหรือใบเสร็จรับเงิน
      จงดึงข้อมูลออกมาให้อยู่ในรูปแบบ JSON เท่านั้น โดยมีโครงสร้างดังนี้:
      {
        "shopName": "ชื่อร้านค้า หรือชื่อบริษัท (ถ้าหาไม่เจอให้ปล่อยเป็นค่าว่างไว้เลย)",
        "address": "ที่อยู่ร้านค้า หรือที่อยู่บริษัท (ถ้าหาไม่เจอให้ปล่อยเป็นค่าว่างไว้เลย ห้ามตอบว่าไม่มีที่อยู่)",
        "taxId": "เลขประจำตัวผู้เสียภาษี หรือ Tax ID (ถ้าไม่มีให้ใส่ค่าว่าง)",
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
      3. **สำคัญมากเรื่องส่วนลด/ค่าจัดส่ง/ค่าธรรมเนียม**: หากในบิลมีรายการเช่น "ส่วนลด", "ใช้โค้ด", "ส่วนลด Bundle Deals", "ค่าจัดส่ง (Shipping)", "ค่าธรรมเนียม", "Vat" ฯลฯ ที่อยู่ท้ายบิลและทำให้ยอดรวมสินค้าไม่เท่ากับยอดที่จ่ายจริง ให้คุณ **ดึงรายการเหล่านั้นมาเป็น item ด้วย** โดยให้ quantity เป็น 1 เสมอ และถ้าเป็น "ส่วนลด" ให้ใส่ค่า price เป็น **ตัวเลขติดลบ** (เช่น -290) และถ้าเป็นค่าใช้จ่ายเพิ่มให้ใส่เป็นบวก เพื่อให้เมื่อนำรายการทั้งหมดมาบวกกันแล้ว จะได้ผลลัพธ์เท่ากับ totalAmount พอดี ทางบัญชีจะได้เห็นที่มาของส่วนลดชัดเจน
      4. **กรณีบิลที่เป็นสรุปคำสั่งซื้อจากแอป (เช่น Shopee, Grab)** ให้ดึงข้อความตามที่ปรากฏเป๊ะๆ เช่น "รวมค่าสินค้า", "ค่าจัดส่ง", "ส่วนลด..." มาเป็น item ได้เลย ไม่ต้องพยายามแยกสินค้าย่อยหากในภาพมีแต่ยอดสรุป
      5. ตรวจสอบให้แน่ใจว่าผลลัพธ์เป็น JSON ล้วนๆ ห้ามมี markdown (เช่น \`\`\`json) หรือคำบรรยายใดๆ ปนมา
    `;

    try {
      // 1. Try fast preferred candidate models first
      const preferredModels = [
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-1.5-flash",
        "gemini-1.5-flash-8b",
      ];

      let workingModel = null;
      let lastApiError = null;
      let finalResultText = null;

      for (const model of preferredModels) {
        try {
          const response = await ai.models.generateContent({
            model: model,
            contents: [
              {
                role: 'user',
                parts: [
                  { text: prompt },
                  ...imageParts,
                ],
              }
            ],
            config: {
              responseMimeType: "application/json",
              temperature: 0.1,
            }
          });

          finalResultText = response?.text;
          
          if (finalResultText) {
            workingModel = model;
            break; // Found working model!
          }
        } catch (apiError: any) {
          lastApiError = apiError;
          console.warn(`Model ${model} failed, trying next model:`, apiError?.message || apiError);
        }
      }

      // 2. Fallback: query available models if all direct candidates failed
      if (!workingModel || !finalResultText) {
        try {
          const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
          const listData = await listRes.json();
          const availableFlashModels = listData.models
            ?.map((m: any) => m.name.replace('models/', ''))
            .filter((name: string) => name.includes("flash") && !preferredModels.includes(name)) || [];

          for (const model of availableFlashModels.slice(0, 3)) {
            try {
              const response = await ai.models.generateContent({
                model: model,
                contents: [
                  {
                    role: 'user',
                    parts: [
                      { text: prompt },
                      ...imageParts,
                    ],
                  }
                ],
                config: {
                  responseMimeType: "application/json",
                  temperature: 0.1,
                }
              });

              finalResultText = response?.text;
              if (finalResultText) {
                workingModel = model;
                break;
              }
            } catch (e: any) {
              lastApiError = e;
            }
          }
        } catch (fallbackErr) {
          console.warn("Fallback model list error:", fallbackErr);
        }
      }

      if (!workingModel || !finalResultText) {
        throw lastApiError || new Error("All models failed or returned empty.");
      }

      let cleanedText = finalResultText.trim();
      if (cleanedText.startsWith("```json")) {
        cleanedText = cleanedText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (cleanedText.startsWith("```")) {
        cleanedText = cleanedText.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }

      const extractedData = JSON.parse(cleanedText);
      
      // Auto-balancing logic to ensure items sum exactly to totalAmount
      if (extractedData.items && Array.isArray(extractedData.items) && typeof extractedData.totalAmount === 'number') {
        const currentSum = extractedData.items.reduce((sum: number, item: any) => {
          const qty = item.quantity || 1;
          const price = item.price || 0;
          return sum + (qty * price);
        }, 0);
        
        // If there's a discrepancy (allowing 0.01 for floating point rounding)
        if (Math.abs(currentSum - extractedData.totalAmount) > 0.01) {
          const difference = extractedData.totalAmount - currentSum;
          extractedData.items.push({
            name: difference > 0 ? "ค่าสินค้า/บริการ (ยอดเพิ่มเติมให้ตรงบิล)" : "ส่วนลด/หักลบ (เพื่อให้ตรงบิล)",
            quantity: 1,
            price: Number(difference.toFixed(2))
          });
        }
      }

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
