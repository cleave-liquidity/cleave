export interface VerifiedProtocolMetadata {
  name: string;
  iconUrl: string;
}

// Keep this manifest limited to verified local assets. It is intentionally empty
// until CLEAVE has verified protocol marks available in the repository.
export const verifiedProtocolMetadata: Readonly<Record<string, VerifiedProtocolMetadata>> = {};

export function getVerifiedProtocolMetadata(name: string): VerifiedProtocolMetadata | undefined {
  return verifiedProtocolMetadata[name.toLowerCase()];
}
