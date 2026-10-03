"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";

type IconSize = "xs" | "sm" | "md" | "lg";

const sizeClasses: Record<IconSize, string> = {
  xs: "w-5 h-5 text-[8px]",
  sm: "w-8 h-8 text-[9px]",
  md: "w-10 h-10 text-[10px]",
  lg: "w-12 h-12 text-[12px]",
};

function initials(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "?";
}

function isVerifiedIconUrl(iconUrl?: string): boolean {
  return Boolean(
    iconUrl &&
      ((iconUrl.startsWith("/") && !iconUrl.startsWith("//")) ||
        iconUrl.startsWith("https://storage.googleapis.com/prod-pendle-bucket-a/")),
  );
}

export function AssetIcon({
  symbol,
  name,
  iconUrl,
  size = "md",
  protocol = false,
}: {
  symbol: string;
  name?: string;
  iconUrl?: string;
  size?: IconSize;
  protocol?: boolean;
}) {
  const [hasError, setHasError] = useState(false);
  const accessibleName = name || symbol;
  const fallback = protocol ? initials(accessibleName) : symbol.slice(0, 4).toUpperCase();
  const hasVerifiedIcon = isVerifiedIconUrl(iconUrl);

  return (
    <span
      role="img"
      aria-label={accessibleName}
      className={`${sizeClasses[size]} shrink-0 rounded-full border ${
        protocol
          ? "border-amber/30 bg-amber/10 text-amber"
          : "border-ice/30 bg-ice/10 text-ice"
      } mono flex items-center justify-center overflow-hidden font-medium tracking-tight`}
    >
      {hasVerifiedIcon && !hasError ? (
        <img
          src={iconUrl}
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover"
          onError={() => setHasError(true)}
        />
      ) : (
        <span aria-hidden="true">{fallback}</span>
      )}
    </span>
  );
}

export function ProtocolIcon({
  name,
  iconUrl,
  size = "sm",
}: {
  name: string;
  iconUrl?: string;
  size?: IconSize;
}) {
  return (
    <AssetIcon
      symbol={name}
      name={name}
      iconUrl={iconUrl}
      size={size}
      protocol
    />
  );
}
