import { PDFDocument } from "pdf-lib";

export async function compressImageBase64(base64Str: string, mimeType: string, maxWidth = 1600, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject("Canvas not supported");
      
      // White background for PNG to JPEG conversion
      if (mimeType !== "image/png") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      
      // Always output JPEG for compression (unless it's a PNG that needs transparency, but PDF doesn't strictly need it here)
      // We'll stick to jpeg for best size reduction
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = reject;
    img.src = base64Str.startsWith('data:') ? base64Str : `data:${mimeType};base64,${base64Str}`;
  });
}

export async function convertImageToPdfBase64(base64Image: string, mimeType: string): Promise<string> {
  if (mimeType === "application/pdf") {
    return base64Image;
  }

  // Compress image to ensure it fits within Vercel's 4.5MB Server Action limit
  let workingBase64 = base64Image;
  let workingMimeType = mimeType;
  
  if (mimeType.startsWith("image/")) {
    workingBase64 = await compressImageBase64(base64Image, mimeType, 1600, 0.8);
    workingMimeType = "image/jpeg";
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

export async function mergePdfBase64(base64Pdfs: string[]): Promise<string> {
  const mergedPdf = await PDFDocument.create();

  for (const base64 of base64Pdfs) {
    if (!base64) continue;
    const pdfData = base64.split(',')[1] || base64;
    const uint8Array = Uint8Array.from(atob(pdfData), c => c.charCodeAt(0));
    const pdfDoc = await PDFDocument.load(uint8Array);
    const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  return await mergedPdf.saveAsBase64({ dataUri: true });
}
