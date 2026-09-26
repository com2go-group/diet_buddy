import {
  coachMessage,
  energyTip,
  initialAnswers,
  isValidWeight,
  sleepTip,
  WEIGHT_MAX_KG,
  WEIGHT_MIN_KG,
} from '../logic';

describe('check-in logic', () => {
  it('starts from the prototype defaults and the latest weight', () => {
    expect(initialAnswers(72.4)).toEqual({
      mood: 'good',
      energy: 7,
      sleepHours: 7,
      hunger: 'normal',
      weightKg: 72.4,
    });
    expect(initialAnswers(null).weightKg).toBeNull();
  });

  it('accepts a skipped weight or one inside the database bounds', () => {
    expect(isValidWeight(null)).toBe(true);
    expect(isValidWeight(WEIGHT_MIN_KG)).toBe(true);
    expect(isValidWeight(WEIGHT_MAX_KG)).toBe(true);
    expect(isValidWeight(WEIGHT_MIN_KG - 0.1)).toBe(false);
    expect(isValidWeight(WEIGHT_MAX_KG + 0.1)).toBe(false);
  });

  it('picks energy and sleep tips at the prototype thresholds', () => {
    expect([energyTip(10), energyTip(8), energyTip(7), energyTip(5), energyTip(4)]).toEqual([
      'energyHigh',
      'energyHigh',
      'energyMid',
      'energyMid',
      'energyLow',
    ]);
    expect([sleepTip(9), sleepTip(8), sleepTip(6), sleepTip(5)]).toEqual([
      'sleepGood',
      'sleepGood',
      'sleepOk',
      'sleepLow',
    ]);
  });

  it('uses the supportive message for okay, low and tough moods', () => {
    expect(coachMessage('great')).toBe('messageGood');
    expect(coachMessage('good')).toBe('messageGood');
    expect(coachMessage('okay')).toBe('messageLow');
    expect(coachMessage('low')).toBe('messageLow');
    expect(coachMessage('tough')).toBe('messageLow');
  });
});
