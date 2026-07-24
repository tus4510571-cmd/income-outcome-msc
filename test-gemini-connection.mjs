import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testGemini() {
  console.log("1. Fetching API Key from Supabase...");
  const { data: setting, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'gemini_api_key')
    .single();

  if (error || !setting) {
    console.error("❌ Failed to fetch API key:", error);
    return;
  }

  const apiKey = setting.value;
  console.log("✅ API Key fetched successfully.");

  console.log("2. Fetching available models...");
  try {
    const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const listData = await listRes.json();
    
    if (listData.error) {
      console.error("❌ Error fetching models:", listData.error.message);
      return;
    }
    
    const flashModels = listData.models
      .map(m => m.name)
      .filter(name => name.includes("flash"));
      
    console.log("✅ Available Flash models:");
    console.log(flashModels.join("\n"));
    
    if (flashModels.length === 0) {
      console.log("❌ No Flash models found.");
      return;
    }
    
    const targetModel = flashModels[0].replace('models/', '');
    console.log(`\n3. Testing generation with model: ${targetModel}...`);
    
    const generateRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Hello, say 'API is working!'" }] }]
      })
    });
    
    const generateData = await generateRes.json();
    
    if (generateData.error) {
      console.error("❌ Generation failed:", generateData.error.message);
    } else {
      console.log("✅ Generation successful! AI Response:");
      console.log(generateData.candidates[0].content.parts[0].text);
    }
    
  } catch (err) {
    console.error("❌ Fetch error:", err);
  }
}

testGemini();
