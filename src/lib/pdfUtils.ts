import { PDFDocument } from "pdf-lib";

export async function convertImageToPdfBase64(base64Image: string, mimeType: string): Promise<string> {
  if (mimeType === "application/pdf") {
    return base64Image;
  }

  let workingBase64 = base64Image;
  let workingMimeType = mimeType;
  
  if (mimeType === "image/webp") {
    workingBase64 = await convertWebpToPng(base64Image);
    workingMimeType = "image/png";
  }

  const pdfDoc = await PDFDocument.create();
  let image;
  
  const imgData = workingBase64.split(',')[1] || workingBase64;
  const uint8Array = Uint8Array.from(atob(imgData), c => c.charCodeAt(0));

  if (workingMimeType === "image/jpeg") {
    image = await pdfDoc.embedJpg(uint8Array);
  } else if (workingMimeType === "image/png") {
    image = await pdfDoc.embedPng(uint8Array);
  } else {
    throw new Error(`Unsupported image type for PDF conversion: ${workingMimeType}`);
  }

  const page = pdfDoc.addPage([image.width, image.height]);
  page.drawImage(image, {
    x: 0,
    y: 0,
    width: image.width,
    height: image.height,
  });

  const pdfBytes = await pdfDoc.saveAsBase64({ dataUri: true });
  return pdfBytes;
}

function convertWebpToPng(webpBase64: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject("Canvas not supported");
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = webpBase64.startsWith('data:') ? webpBase64 : `data:image/webp;base64,${webpBase64}`;
  });
}
