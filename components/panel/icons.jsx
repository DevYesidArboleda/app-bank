// Iconos propios: trazo 1.6, caja 16×16, mismo lenguaje de línea que la carta.
function Svg({ size = 16, children, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconTide = (p) => (
  <Svg {...p}>
    <path d="M1.5 10c2 0 2.5-4 4.5-4s2.5 4 4.5 4 2.5-3 4-3" />
    <path d="M1.5 13.5h13" />
  </Svg>
);

export const IconRows = (p) => (
  <Svg {...p}>
    <rect x="2" y="2.5" width="12" height="11" rx="1.5" />
    <path d="M2 6.2h12M2 9.8h12M6 2.5v11" />
  </Svg>
);

export const IconBank = (p) => (
  <Svg {...p}>
    <path d="M2 6 8 2.5 14 6" />
    <path d="M3.5 6.5v5M6.5 6.5v5M9.5 6.5v5M12.5 6.5v5M2 13.5h12" />
  </Svg>
);

export const IconRefresh = (p) => (
  <Svg {...p}>
    <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9" />
    <path d="M13.5 2.5v3h-3" />
  </Svg>
);

export const IconPencil = (p) => (
  <Svg {...p}>
    <path d="m10.5 3 2.5 2.5L6 12.5H3.5V10z" />
  </Svg>
);

export const IconCheck = (p) => (
  <Svg {...p}>
    <path d="m3 8.5 3 3 7-7" />
  </Svg>
);

export const IconClose = (p) => (
  <Svg {...p}>
    <path d="m4 4 8 8M12 4l-8 8" />
  </Svg>
);

export const IconAlert = (p) => (
  <Svg {...p}>
    <path d="M8 2 14.5 13.5h-13z" />
    <path d="M8 6.5v3M8 11.6v.1" />
  </Svg>
);

export const IconPlus = (p) => (
  <Svg {...p}>
    <path d="M8 3v10M3 8h10" />
  </Svg>
);

export const IconInfo = (p) => (
  <Svg {...p}>
    <circle cx="8" cy="8" r="6" />
    <path d="M8 7.2v4M8 4.8v.1" />
  </Svg>
);

// Marca: curva de marea sobre el nivel cero, con el punto predicho.
export function BrandMark({ className }) {
  return (
    <svg className={className} viewBox="0 0 28 28" aria-hidden="true" focusable="false">
      <rect width="28" height="28" rx="6" fill="#14202b" />
      <path d="M5 19.5h18" stroke="#e9d9a8" strokeWidth="1" opacity="0.6" />
      <path
        d="M5 15.5c2.6 0 3.2-6 6-6s3.4 6 6 6"
        fill="none"
        stroke="#f7f5ee"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M17 15.5c1.6 0 2.4-3 4-3.6"
        fill="none"
        stroke="#e46aaf"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeDasharray="1.6 2.2"
      />
      <circle cx="22" cy="11.6" r="1.7" fill="#e46aaf" />
    </svg>
  );
}

export const IconDownload = (p) => (
  <Svg {...p}>
    <path d="M8 2.5v8M4.5 7 8 10.5 11.5 7" />
    <path d="M2.5 13.5h11" />
  </Svg>
);
