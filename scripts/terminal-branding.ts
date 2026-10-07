export const TERMINAL_ANSI = {
  reset: "\u001b[0m",
  dim: "\u001b[2m",
  yeltraBlue: "\u001b[38;2;59;130;246m",
  ice: "\u001b[38;5;159m",
  green: "\u001b[38;5;120m",
  yellow: "\u001b[38;5;221m",
  red: "\u001b[38;5;203m",
  white: "\u001b[38;5;255m",
} as const;

export const YELTRA_BANNER_ROWS = [
  "   ██╗   ██╗███████╗██╗     ████████╗██████╗  █████╗ ",
  "   ╚██╗ ██╔╝██╔════╝██║     ╚══██╔══╝██╔══██╗██╔══██╗",
  "    ╚████╔╝ █████╗  ██║        ██║   ██████╔╝███████║",
  "     ╚██╔╝  ██╔══╝  ██║        ██║   ██╔══██╗██╔══██║",
  "      ██║   ███████╗███████╗   ██║   ██║  ██║██║  ██║",
  "      ╚═╝   ╚══════╝╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝",
] as const;

export const YELTRA_BANNER_WIDTH = Math.max(
  ...YELTRA_BANNER_ROWS.map((row) => [...row].length),
);

type Rgb = [number, number, number];

const mixRgb = (from: Rgb, to: Rgb, t: number): Rgb =>
  from.map((value, index) => Math.round(value + (to[index] - value) * t)) as Rgb;

const truecolor = ([r, g, b]: Rgb): string =>
  `\u001b[38;2;${r};${g};${b}m`;

export type TerminalColor = keyof typeof TERMINAL_ANSI;

export function terminalPaint(
  value: string,
  color: TerminalColor,
  useColor = Boolean(process.stdout.isTTY),
): string {
  return useColor
    ? `${TERMINAL_ANSI[color]}${value}${TERMINAL_ANSI.reset}`
    : value;
}

export function renderYeltraLogo(
  useColor = Boolean(process.stdout.isTTY),
): string[] {
  return YELTRA_BANNER_ROWS.map((row, index) => {
    if (!useColor) return row;

    const t = YELTRA_BANNER_ROWS.length > 1
      ? index / (YELTRA_BANNER_ROWS.length - 1)
      : 0;
    const fill = `${truecolor(mixRgb([147, 197, 253], [59, 130, 246], t))}\u001b[1m`;
    const edge = `${truecolor(mixRgb([59, 100, 200], [30, 58, 138], t))}\u001b[22m`;
    let output = "";

    for (const character of row.padEnd(YELTRA_BANNER_WIDTH, " ")) {
      output += character === " "
        ? character
        : `${character === "█" ? fill : edge}${character}`;
    }

    return `${output}${TERMINAL_ANSI.reset}`;
  });
}

export function centerYeltraText(value: string): string {
  return `${" ".repeat(Math.floor((YELTRA_BANNER_WIDTH - value.length) / 2))}${value}`;
}

export function renderTerminalDivider(width = 66, useColor = Boolean(process.stdout.isTTY)): string {
  return terminalPaint("─".repeat(width), "dim", useColor);
}

export async function cinematicPause(
  milliseconds: number,
  enabled: boolean,
): Promise<void> {
  if (!enabled || process.env.YELTRA_TERMINAL_NO_DELAY === "true") return;
  await new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}
