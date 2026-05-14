// Target: 18 September 2026, 06:55 hora Chile.
//
// Chilean DST (CLST, UTC-03:00) begins the first Saturday of September.
// In 2026 that is 2026-09-05, so by 2026-09-18 the country is in CLST.
// 06:55 -03:00 == 09:55 UTC.
//
// If this assumption changes (DST law revised, target date moved), update
// TARGET_UTC_ISO and the constants below. Source for DST rule:
// Chilean Ministerio de Energía, "Cambio de hora oficial".
export const TARGET_UTC_ISO = "2026-09-18T09:55:00Z";
export const TARGET_MS = Date.parse(TARGET_UTC_ISO);

export const TARGET_LABEL = "CDMX → SCL · 18 · 09 · 26";
