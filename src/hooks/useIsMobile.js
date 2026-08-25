import { useState, useEffect } from 'react';

// Track a mobile/narrow viewport so cards can become bottom sheets and the camera can frame
// the clicked cell above the sheet.
export default function useIsMobile() {
  const [m, setM] = useState(typeof window !== "undefined" && (window.innerWidth < 720 || window.innerHeight < 560));
  useEffect(() => {
    const on = () => setM(window.innerWidth < 720 || window.innerHeight < 560);
    window.addEventListener("resize", on);
    window.addEventListener("orientationchange", on);
    return () => { window.removeEventListener("resize", on); window.removeEventListener("orientationchange", on); };
  }, []);
  return m;
}
