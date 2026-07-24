"use client";

import { useEffect } from "react";

export default function PrintHelper() {
  useEffect(() => {
    // Wait for images to load, then trigger print
    const timer = setTimeout(() => {
      window.print();
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return null;
}
