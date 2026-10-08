// Renders a handful of still frames for review: node scripts/stills.mjs 40 120 300 ...
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const frames = process.argv.slice(2).map(Number);
const browserExecutable = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const serveUrl = await bundle({ entryPoint: path.join(root, "src/index.ts") });
const composition = await selectComposition({ serveUrl, id: "YeltraLaunchFilm", browserExecutable });
for (const frame of frames) {
  const output = path.join(root, "out", `f${String(frame).padStart(3, "0")}.png`);
  await renderStill({ composition, serveUrl, frame, output, browserExecutable, imageFormat: "png", scale: 0.5 });
  console.log("still", frame);
}
