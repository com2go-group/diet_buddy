import { MIN_AGE_YEARS } from './constants';

/** Whole years between birthDate and `on`. */
export function ageOn(birthDate: Date, on: Date = new Date()): number {
  let age = on.getFullYear() - birthDate.getFullYear();
  const beforeBirthday =
    on.getMonth() < birthDate.getMonth() ||
    (on.getMonth() === birthDate.getMonth() && on.getDate() < birthDate.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

/** Age gate: 18+ at signup (CLAUDE.md §9). */
export function isAdult(birthDate: Date, on: Date = new Date()): boolean {
  return ageOn(birthDate, on) >= MIN_AGE_YEARS;
}
