// Openingsuren + klok — gedeeld door header, onthaal, wachtdienst en sluitingen.
import React from "react";

export const HOURS = [
  { day: "Maandag",   open: "08:30", close: "12:00", open2: "14:00", close2: "19:00" },
  { day: "Dinsdag",   open: "08:30", close: "12:00", open2: "14:00", close2: "19:00" },
  { day: "Woensdag",  open: "08:30", close: "12:00", open2: null,    close2: null    },
  { day: "Donderdag", open: "08:30", close: "12:00", open2: "14:00", close2: "19:00" },
  { day: "Vrijdag",   open: "08:30", close: "12:00", open2: "14:00", close2: "19:00" },
  { day: "Zaterdag",  open: "08:30", close: "12:00", open2: null,    close2: null    },
  { day: "Zondag",    open: null,    close: null,    open2: null,    close2: null    },
];

// Tijdens het bouwen (vooraf genereren van de HTML) is er geen "nu": toon dan
// niets dat van het uur afhangt. De browser vult het meteen live in.
export const IS_SERVER = typeof window === "undefined";

export const todayIndex = (d = new Date()) => (d.getDay() + 6) % 7; // Mon=0

export const useNow = () => {
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
};

export const toMinutes = (hhmm) => {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

export const hhmm = (mins) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};
