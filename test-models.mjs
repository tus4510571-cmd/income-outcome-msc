import fetch from "node-fetch";

async function run() {
  const apiKey = process.argv[2];
  if (!apiKey) {
    console.log("Provide API Key");
    return;
  }
  
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
  const data = await res.json();
  console.log(data.models?.map((m) => m.name).join("\n"));
}
run();
