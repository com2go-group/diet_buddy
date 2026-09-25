import { ageOn, isAdult } from '../age';

describe('age gate', () => {
  const today = new Date(2026, 8, 25);

  it('counts whole years', () => {
    expect(ageOn(new Date(2000, 8, 25), today)).toBe(26);
    expect(ageOn(new Date(2000, 8, 26), today)).toBe(25);
  });

  it('allows 18 on the birthday and blocks the day before', () => {
    expect(isAdult(new Date(2008, 8, 25), today)).toBe(true);
    expect(isAdult(new Date(2008, 8, 26), today)).toBe(false);
  });
});
