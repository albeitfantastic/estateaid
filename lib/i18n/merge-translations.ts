/** Deep-merge locale overrides (e.g. only `language`) onto the full English catalog. */
export function deepMergeTranslations(
  base: Record<string, unknown>,
  override: unknown
): Record<string, unknown> {
  if (override === null || typeof override !== 'object' || Array.isArray(override)) {
    return { ...base };
  }
  const o = override as Record<string, unknown>;
  const out: Record<string, unknown> = { ...base };
  for (const key of Object.keys(o)) {
    const bv = o[key];
    const av = out[key];
    if (
      bv !== undefined &&
      bv !== null &&
      typeof bv === 'object' &&
      !Array.isArray(bv) &&
      av !== null &&
      typeof av === 'object' &&
      !Array.isArray(av)
    ) {
      out[key] = deepMergeTranslations(av as Record<string, unknown>, bv);
    } else if (bv !== undefined) {
      out[key] = bv;
    }
  }
  return out;
}
