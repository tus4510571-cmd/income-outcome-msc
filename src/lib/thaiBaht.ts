/**
 * แปลงตัวเลขเป็นคำอ่านภาษาไทย (Thai Baht Text)
 */
export function thaiBahtText(amount: number): string {
  if (amount === 0) return "ศูนย์บาทถ้วน";
  
  const textNumber = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
  const textUnit = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน"];

  const processInteger = (numStr: string): string => {
    let result = "";
    const len = numStr.length;
    for (let i = 0; i < len; i++) {
      const n = parseInt(numStr[i]);
      const unit = len - i - 1;
      
      if (n !== 0) {
        if (unit === 1 && n === 1) {
          result += textUnit[unit];
        } else if (unit === 1 && n === 2) {
          result += "ยี่" + textUnit[unit];
        } else if (unit === 0 && n === 1 && len > 1 && numStr[i - 1] !== "0") {
          result += "เอ็ด";
        } else {
          result += textNumber[n] + textUnit[unit];
        }
      }
    }
    return result;
  };

  const amountStr = amount.toFixed(2);
  const [bahtStr, satangStr] = amountStr.split(".");

  let result = "";

  if (bahtStr !== "0") {
    // Handle millions
    if (bahtStr.length > 6) {
      const millions = bahtStr.substring(0, bahtStr.length - 6);
      const rest = bahtStr.substring(bahtStr.length - 6);
      result += processInteger(millions) + "ล้าน" + processInteger(rest);
    } else {
      result += processInteger(bahtStr);
    }
    result += "บาท";
  }

  if (satangStr === "00") {
    result += "ถ้วน";
  } else {
    result += processInteger(satangStr) + "สตางค์";
  }

  return result;
}
