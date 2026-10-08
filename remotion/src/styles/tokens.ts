import { loadFont as loadGeist } from "@remotion/google-fonts/Geist";
import { loadFont as loadGeistMono } from "@remotion/google-fonts/GeistMono";
import { loadFont as loadCaveat } from "@remotion/google-fonts/Caveat";

// The same stack the YELTRA site uses (Geist + Geist Mono). Caveat is the handwritten voice for the
// "sketchbook" annotations only; it never carries a headline.
const geist = loadGeist("normal", { weights: ["300", "400", "500", "600"], subsets: ["latin"] });
const geistMono = loadGeistMono("normal", { weights: ["400", "500"], subsets: ["latin"] });
const caveat = loadCaveat("normal", { weights: ["500"], subsets: ["latin"] });

export const W = 1920;
export const H = 1080;
export const FPS = 30;
export const DURATION = 900; // 30 s

/** YELTRA brand tokens, copied from tailwind.config.ts of the web app. */
export const C = {
  bg: "#030304",
  fg: "#ECEDEA",
  muted: "#B9BDBA",
  mutedDark: "#8E9390",
  faint: "#6F7471",
  surface: "#0B0B0D",
  surfaceRaised: "#121215",
  ice: "#3B86FF", // Fixed Yield
  cyan: "#67D4FF", // cool technical accent for the Fixed Yield scene only
  amber: "#EF5F22", // Trading Yield, CTAs
  amberPrimary: "#F07A2B", // the planet / logo orange
  amberLight: "#FFE9D2",
  line: "rgba(236,237,234,0.16)",
  lineSoft: "rgba(236,237,234,0.08)",
} as const;

export const FONT = {
  sans: `${geist.fontFamily}, Helvetica, Arial, sans-serif`,
  mono: `${geistMono.fontFamily}, ui-monospace, Menlo, monospace`,
  hand: `${caveat.fontFamily}, "Bradley Hand", cursive`,
} as const;

/**
 * Scene boundaries (frames at 30 fps). Scenes overlap by `LEAD` frames on each side of a boundary so that
 * every cut is a camera move through shared geometry, never a hard edit.
 */
export const B = {
  interrupt: 0,
  reveal: 90,
  markets: 180,
  fixed: 330,
  trading: 480,
  dividend: 630,
  system: 750,
  end: 900,
} as const;
export const LEAD = 8;

/**
 * Real YELTRA Mainnet (chain 4663) contract addresses, copied from lib/contracts/project-deployments.ts.
 * They are used as technical texture only; nothing here is invented.
 */
export const REAL_CONTRACTS = [
  { name: "YeltraRegistry", address: "0x98ad9f5a69ae5b6400847f98181b4d917d9c32b9" },
  { name: "YeltraAccessManager", address: "0xb12c7112446bfe88d6e82b516f5df90449fa3dc4" },
  { name: "YeltraRiskGuard", address: "0x0b40937337dd65bae64c260164e303c6c8184a48" },
  { name: "YeltraLens", address: "0x37a1aa4ce1ab0c05d033ac13d3e51e5f72dfeb82" },
] as const;

export const shortAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;
