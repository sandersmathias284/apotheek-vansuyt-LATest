// Icon set — line glyphs for the pharmacy. No emoji.
import React from "react";
export const Icon = ({ name, className = "icon-svg" }) => {
  const paths = {
    leaf: <><path d="M4 20c0-9 7-16 16-16v3c0 8-6 14-14 14H4zM4 20s2-6 8-9" /></>,
    syrup: <><path d="M7 3h10v3l-1 2v10a3 3 0 01-3 3h-2a3 3 0 01-3-3V8L7 6V3z" /><path d="M9 12h6" /></>,
    pill: <><rect x="3" y="9" width="18" height="6" rx="3" /><path d="M12 9v6" /></>,
    cross: <><path d="M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7V3z" /></>,
    moon: <><path d="M20 14a8 8 0 11-10-10 6 6 0 0010 10z" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M5 12H3M21 12h-2M5.6 5.6L4.2 4.2M19.8 19.8l-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4" /></>,
    home: <><path d="M3 11l9-8 9 8" /><path d="M5 9v12h14V9" /></>,
    pin: <><path d="M12 22s8-7.5 8-13a8 8 0 10-16 0c0 5.5 8 13 8 13z" /><circle cx="12" cy="9" r="3" /></>,
    phone: <><path d="M5 4h4l2 5-3 2a12 12 0 005 5l2-3 5 2v4a2 2 0 01-2 2A17 17 0 013 6a2 2 0 012-2z" /></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="1" /><path d="M3 7l9 7 9-7" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    upload: <><path d="M12 16V4M7 9l5-5 5 5M4 20h16" /></>,
    check: <><path d="M5 12l4 4 10-10" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    bike: <><circle cx="6" cy="17" r="3" /><circle cx="18" cy="17" r="3" /><path d="M6 17l3-9h4l4 9M9 8h4" /></>,
    box: <><path d="M3 7l9-4 9 4-9 4-9-4z" /><path d="M3 7v10l9 4 9-4V7M12 11v10" /></>,
    baby: <><circle cx="12" cy="8" r="4" /><path d="M5 21v-1a7 7 0 0114 0v1" /></>,
    droplet: <><path d="M12 3s7 7 7 12a7 7 0 11-14 0c0-5 7-12 7-12z" /></>,
    heart: <><path d="M12 21s-7-4.5-7-11a4 4 0 017-2.5A4 4 0 0119 10c0 6.5-7 11-7 11z" /></>,
    book: <><path d="M4 5a2 2 0 012-2h12v18H6a2 2 0 01-2-2V5z" /><path d="M4 19a2 2 0 012-2h12" /></>,
    syringe: <><path d="M18 2l4 4M17 7l3-3M19 9l-8.7 8.7a2 2 0 01-2.8 0l-2.2-2.2a2 2 0 010-2.8L14 4M9 11l4 4M5 19l-3 3" /></>,
    plant: <><path d="M12 22V10" /><path d="M12 10c0-4-3-7-7-7 0 4 3 7 7 7zM12 14c0-3 2-5 5-5 0 3-2 5-5 5z" /></>,
  };
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {paths[name] || paths.cross}
    </svg>
  );
};


