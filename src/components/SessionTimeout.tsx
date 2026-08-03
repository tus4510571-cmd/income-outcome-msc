"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

export default function SessionTimeout() {
  const router = useRouter();

  useEffect(() => {
    let activityTimer: NodeJS.Timeout;
    
    // Create Supabase client
    const supabase = createClient();

    // Set cookie that expires in 15 minutes
    const updateActivityCookie = () => {
      document.cookie = `last-activity=${Date.now()}; path=/; max-age=900; SameSite=Lax`;
    };

    const handleTimeout = async () => {
      // Clear cookie first
      document.cookie = "last-activity=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      
      // Sign out
      await supabase.auth.signOut();
      
      alert("เซสชันของคุณหมดอายุเนื่องจากไม่มีการใช้งานเกิน 15 นาที ระบบจะนำคุณไปหน้าเข้าสู่ระบบใหม่");
      router.push("/login");
    };

    const resetTimer = () => {
      clearTimeout(activityTimer);
      activityTimer = setTimeout(handleTimeout, TIMEOUT_MS);
    };

    // Initialize
    resetTimer();
    updateActivityCookie();
    
    let lastCookieUpdate = Date.now();
    
    const handleActivity = () => {
      resetTimer();
      
      const now = Date.now();
      // Update cookie at most once per minute (60000ms) to avoid excessive cookie writes
      if (now - lastCookieUpdate > 60000) {
        updateActivityCookie();
        lastCookieUpdate = now;
      }
    };

    const events = ["mousemove", "keydown", "scroll", "click", "touchstart"];
    events.forEach(event => window.addEventListener(event, handleActivity, { passive: true }));

    return () => {
      clearTimeout(activityTimer);
      events.forEach(event => window.removeEventListener(event, handleActivity));
    };
  }, [router]);

  return null;
}
