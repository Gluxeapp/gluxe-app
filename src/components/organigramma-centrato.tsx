"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Contenitore scorrevole dell'organigramma: all'apertura porta al centro la persona in cima (utile sul telefono). */
export function OrganigrammaCentrato({ children }: { children: ReactNode }) {
  const contenitore = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = contenitore.current;
    if (el && el.scrollWidth > el.clientWidth) el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
  }, []);
  return (
    <div ref={contenitore} className="overflow-x-auto pb-2">
      {children}
    </div>
  );
}
