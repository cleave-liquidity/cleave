import { connection } from "next/server";

/**
 * Interactive Dividend Demo is server-gated to Vercel Preview and local dev.
 * The private flag is intentionally not a NEXT_PUBLIC_ variable.
 */
export async function isDividendDemoStagingEnabled(): Promise<boolean> {
  await connection();
  if (process.env.YELTRA_DIVIDEND_DEMO_STAGING_ENABLED !== "1") return false;
  if (process.env.VERCEL_ENV !== "preview" && process.env.NODE_ENV !== "development") {
    return false;
  }
  return true;
}
