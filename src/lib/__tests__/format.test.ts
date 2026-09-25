import { formatDuration, formatHeight, formatWeight, toIsoDateLocal } from '../format';

describe('format', () => {
  it('formats weight in either unit system', () => {
    expect(formatWeight(72.46, 'metric')).toBe('72.5 kg');
    expect(formatWeight(72.46, 'imperial')).toBe('159.7 lb');
    expect(formatWeight(80, 'metric', 0)).toBe('80 kg');
    expect(formatWeight(1234.5, 'metric')).toBe('1,234.5 kg');
  });

  it('formats height', () => {
    expect(formatHeight(177.8, 'metric')).toBe('178 cm');
    expect(formatHeight(177.8, 'imperial')).toBe('5′ 10″');
  });

  it('shows short durations in weeks and longer ones in months', () => {
    expect(formatDuration(13)).toBe('13 weeks');
    expect(formatDuration(20)).toBe('5 months');
    expect(formatDuration(52)).toBe('12 months');
  });

  it('builds local ISO dates', () => {
    expect(toIsoDateLocal(new Date(2027, 0, 5))).toBe('2027-01-05');
  });
});
