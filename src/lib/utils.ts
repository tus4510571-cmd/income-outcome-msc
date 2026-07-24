export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function getStoragePath(
  type: string,
  date: string,
  transactionId: string,
  fileType: string,
  ext: string
): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${type}/${year}/${month}/${transactionId}/${fileType}.${ext}`;
}

export function getFileExt(fileName: string): string {
  return fileName.split(".").pop() || "jpg";
}
