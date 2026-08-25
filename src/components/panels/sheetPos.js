// A reader/detail card docks bottom (near-fullscreen sheet) on mobile, right-centered on desktop.
export const sheetPos = (isMobile, desktop) => isMobile
  ? { position: 'absolute', left: '0', right: '0', bottom: '0', top: 'auto', transform: 'none', width: '100%', maxHeight: '80vh', borderRadius: '22px 22px 0 0' }
  : desktop;

export const closeBtn = { cursor: 'pointer', width: '26px', height: '26px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.75)', fontSize: '13px', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' };
