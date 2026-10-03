export function ApplicationBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 h-[360px] overflow-hidden opacity-70"
    >
      <svg
        viewBox="0 0 1440 360"
        preserveAspectRatio="none"
        className="h-full w-full"
        fill="none"
      >
        <path
          d="M-80 270C210 40 470 45 720 190S1220 310 1530 55"
          stroke="rgba(59,134,255,0.13)"
          strokeWidth="1"
          strokeDasharray="2 14"
        />
        <path
          d="M-100 320C210 105 505 92 760 235S1220 350 1510 120"
          stroke="rgba(239,95,34,0.08)"
          strokeWidth="1"
        />
        <circle cx="1120" cy="88" r="3" fill="#3B86FF" opacity="0.55" />
        <circle cx="1120" cy="88" r="22" stroke="#3B86FF" opacity="0.12" />
        <circle cx="1120" cy="88" r="44" stroke="#3B86FF" opacity="0.06" />
      </svg>
    </div>
  );
}
