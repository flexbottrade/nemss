/**
 * Utilities for handling multiple payment proof URLs.
 * Payment proofs are stored as JSON arrays in the payment_proof_url column.
 * Backward compatible with old single-URL strings.
 */

export function parseProofUrls(proofUrl: string | null | undefined): string[] {
  if (!proofUrl) return [];
  try {
    const parsed = JSON.parse(proofUrl);
    if (Array.isArray(parsed)) return parsed.filter(Boolean);
    return [proofUrl];
  } catch {
    return [proofUrl];
  }
}

export function serializeProofUrls(urls: string[]): string {
  return JSON.stringify(urls);
}

export const MAX_PROOF_FILES = 5;
