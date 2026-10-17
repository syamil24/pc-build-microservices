const paths: Record<string, JSX.Element> = {
  CPU: (
    <>
      <rect x="5" y="5" width="14" height="14" rx="2" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
      <path d="M8 2v3M12 2v3M16 2v3M8 19v3M12 19v3M16 19v3M2 8h3M2 12h3M2 16h3M19 8h3M19 12h3M19 16h3" />
    </>
  ),
  MOTHERBOARD: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <rect x="7" y="7" width="6" height="6" rx="1" />
      <path d="M16 7v6M16 17h-6M7 17v-2" />
    </>
  ),
  RAM: (
    <>
      <rect x="4" y="7" width="16" height="8" rx="1.5" />
      <path d="M7 15v2M11 15v2M15 15v2M7 10h2M11 10h2M15 10h2" />
    </>
  ),
  GPU: (
    <>
      <rect x="3" y="8" width="18" height="9" rx="2" />
      <circle cx="9" cy="12.5" r="2.5" />
      <path d="M14 11h4M14 14h4M5 17v3M19 17v3" />
    </>
  ),
  STORAGE: (
    <>
      <rect x="4" y="9" width="16" height="7" rx="1.5" />
      <path d="M7 12h4M17 12h.01" />
      <path d="M6 16v2M18 16v2" />
    </>
  ),
  PSU: (
    <>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <circle cx="10" cy="12" r="4" />
      <path d="M10 9.5v5M7.5 12h5M17 8v3" />
    </>
  ),
  CASE: (
    <>
      <rect x="6" y="3" width="12" height="18" rx="2" />
      <rect x="9" y="6" width="6" height="8" rx="1" />
      <path d="M15 17.5h.01" />
    </>
  ),
  COOLING: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="1.6" />
      <path d="M12 10.4c1-2.2 3.2-3 5-2.4M13.6 12c2.2 1 3 3.2 2.4 5M12 13.6c-1 2.2-3.2 3-5 2.4M10.4 12c-2.2-1-3-3.2-2.4-5" />
    </>
  )
};

export default function SlotIcon({ code }: { code: string }) {
  return (
    <svg className="slot-icon" viewBox="0 0 24 24" width="20" height="20" fill="none"
         stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[code] ?? paths.CASE}
    </svg>
  );
}
