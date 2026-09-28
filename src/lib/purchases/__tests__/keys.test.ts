import { usableKey } from '..';

jest.mock('react-native-purchases', () => ({}));

describe('RevenueCat keys', () => {
  it('uses real store keys in every build', () => {
    expect(usableKey('appl_abc', false)).toBe('appl_abc');
    expect(usableKey('goog_abc', true)).toBe('goog_abc');
  });

  it('uses Test Store keys only in development builds', () => {
    expect(usableKey('test_abc', true)).toBe('test_abc');
    expect(usableKey('test_abc', false)).toBeUndefined();
  });

  it('treats a missing or empty key as not configured', () => {
    expect(usableKey(undefined, true)).toBeUndefined();
    expect(usableKey('', false)).toBeUndefined();
  });
});
