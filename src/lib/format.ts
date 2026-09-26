import { cmToFeetInches, kgToLb, type UnitSystem } from '@/lib/nutrition';
import { t } from '@/i18n';

const locale = 'en-GB';

/** "72.5 kg" / "159.8 lb". */
export function formatWeight(kg: number, units: UnitSystem, decimals = 1): string {
  const value = units === 'imperial' ? kgToLb(kg) : kg;
  const rounded = Number(value.toFixed(decimals));
  return `${rounded.toLocaleString(locale, { maximumFractionDigits: decimals })} ${
    units === 'imperial' ? t('units.lb') : t('units.kg')
  }`;
}

/** "178 cm" / "5′ 10″". */
export function formatHeight(cm: number, units: UnitSystem): string {
  if (units === 'metric') return `${Math.round(cm)} ${t('units.cm')}`;
  const { feet, inches } = cmToFeetInches(cm);
  return `${feet}′ ${inches}″`;
}

export function formatNumber(value: number): string {
  return Math.round(value).toLocaleString(locale);
}

/** Up to `decimals` fraction digits, trailing zeros dropped: 1.5 → "1.5", 2 → "2". */
export function formatDecimal(value: number, decimals = 1): string {
  return value.toLocaleString(locale, { maximumFractionDigits: decimals });
}

/** "March 2027". */
export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}

/** "12 Sep". */
export function formatShortDate(date: Date): string {
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}

/** "25 September 2026". */
export function formatLongDate(date: Date): string {
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Up to 13 weeks in weeks, then in months (prototype weeksToMonths). */
export function formatDuration(weeks: number): string {
  if (weeks <= 13) return t('pace.weeks', { count: weeks });
  return t('pace.months', { count: Math.round(weeks / 4.345) });
}

/** ISO date (YYYY-MM-DD) in local time, for date columns. */
export function toIsoDateLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
