export interface VerifiedAssetMetadata {
  symbol: string;
  name: string;
  iconUrl: string;
}

// Keep this manifest limited to verified local assets. It is intentionally empty
// until YELTRA ships and verifies its own token artwork.
export const verifiedAssetMetadata: Readonly<Record<string, VerifiedAssetMetadata>> = {};

export function getVerifiedAssetMetadata(symbol: string): VerifiedAssetMetadata | undefined {
  return verifiedAssetMetadata[symbol.toUpperCase()];
}
