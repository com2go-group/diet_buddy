import { explainPlan } from '../planExplainer';

describe('explainPlan', () => {
  it('explains a deficit from the user’s own numbers', () => {
    const text = explainPlan({ calories: 1850, proteinG: 130, waterMl: 2500, tdee: 2400 });
    expect(text).toContain('about 2,400 kcal a day');
    expect(text).toContain('1,850 kcal is 550 kcal less');
    expect(text).toContain('130 g of protein');
    expect(text).toContain('2.5 L of water');
  });

  it('explains a surplus and maintenance', () => {
    expect(explainPlan({ calories: 2650, proteinG: 160, waterMl: 3000, tdee: 2400 })).toContain(
      '250 kcal more',
    );
    expect(explainPlan({ calories: 2420, proteinG: 120, waterMl: 2500, tdee: 2400 })).toContain(
      'matches it',
    );
  });

  it('still explains the target without a TDEE', () => {
    expect(explainPlan({ calories: 1900, proteinG: 120, waterMl: 2000, tdee: null })).toContain(
      'Your daily target is 1,900 kcal.',
    );
  });
});
