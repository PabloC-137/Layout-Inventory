/**
 * Utilities for barcode and scanner tolerance.
 * Certain barcode scanners configured with English (US) layouts or legacy CODE128 mappings
 * replace 'Ñ' with '$' and '-' with '\''.
 */

export function normalizeScannerCode(input: string): {
  normalized: string;
  hasDollarToEnye: boolean;
  hasQuoteToDash: boolean;
} {
  if (!input) {
    return { normalized: '', hasDollarToEnye: false, hasQuoteToDash: false };
  }

  const hasDollarToEnye = input.includes('$');
  const hasQuoteToDash = input.includes("'") || input.includes('’') || input.includes('`');

  // Replace $ with Ñ and quotes with -
  let normalized = input
    .replace(/\$/g, 'Ñ')
    .replace(/['’`]/g, '-');

  return {
    normalized: normalized.trim().toUpperCase(),
    hasDollarToEnye,
    hasQuoteToDash,
  };
}

/**
 * Compare code taking scanner variations into account
 */
export function matchesLocationCode(candidateCode: string, searchInput: string): boolean {
  if (!candidateCode || !searchInput) return false;

  const candidateNorm = candidateCode.trim().toUpperCase();
  const searchNorm = normalizeScannerCode(searchInput).normalized;

  if (candidateNorm === searchNorm) return true;
  if (candidateNorm.includes(searchNorm)) return true;

  // Also match raw without replacements just in case
  const rawUpper = searchInput.trim().toUpperCase();
  return candidateNorm.includes(rawUpper);
}
