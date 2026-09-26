import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { renderScreen } from '@/test/render';

import { loadRecentLogs, logFood } from '../api';
import { BarcodeError, isValidBarcode, lookupBarcode } from '../barcode';
import { LogFoodScreen } from '../LogFoodScreen';

jest.mock('../api', () => ({
  ...jest.requireActual('../api'),
  loadRecentLogs: jest.fn(),
  logFood: jest.fn(),
}));
jest.mock('../barcode', () => ({ ...jest.requireActual('../barcode'), lookupBarcode: jest.fn() }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: jest.fn(() => ({ slot: 'snack', date: undefined })),
}));

const nutella = {
  ref: 'off:3017620422003',
  name: 'Nutella',
  brand: 'Ferrero',
  per100g: { kcal: 539, proteinG: 6.3, carbsG: 57.5, fatG: 30.9, fiberG: 0 },
  servings: [{ label: '1 serving (15 g)', grams: 15 }],
};
const scan = (data: string) =>
  act(() => (globalThis as unknown as { __scanBarcode: (d: string) => void }).__scanBarcode(data));

beforeEach(() => {
  jest.clearAllMocks();
  (loadRecentLogs as jest.Mock).mockResolvedValue([]);
  (logFood as jest.Mock).mockResolvedValue(undefined);
});

describe('barcode logging', () => {
  it('scans a pack, shows Open Food Facts numbers and logs a serving', async () => {
    (lookupBarcode as jest.Mock).mockResolvedValue(nutella);
    await renderScreen(<LogFoodScreen />);
    await fireEvent.press(screen.getByRole('button', { name: /Scan barcode/ }));
    await scan('3017620422003');
    expect(await screen.findByText('Nutella')).toBeOnTheScreen();
    expect(lookupBarcode).toHaveBeenCalledWith('3017620422003');
    expect(screen.getByText(/Open Food Facts/)).toBeOnTheScreen();
    expect(screen.getByText('81')).toBeOnTheScreen(); // 15 g × 539 kcal/100 g
    await fireEvent.press(screen.getByRole('button', { name: 'Add to Snack' }));
    await waitFor(() => expect(logFood).toHaveBeenCalled());
    expect((logFood as jest.Mock).mock.calls[0][1]).toMatchObject({
      name: 'Nutella',
      foodRef: 'off:3017620422003',
      slot: 'snack',
      macros: { kcal: 81 },
    });
  });

  it('explains an unknown product and accepts a typed barcode', async () => {
    (lookupBarcode as jest.Mock).mockRejectedValueOnce(new BarcodeError('not_found'));
    await renderScreen(<LogFoodScreen />);
    await fireEvent.press(screen.getByRole('button', { name: /Scan barcode/ }));
    await fireEvent.changeText(
      screen.getByLabelText('Or type the barcode number'),
      '3017620422003',
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Look up' }));
    expect(await screen.findByText(/don’t know this product yet/)).toBeOnTheScreen();
  });

  it('rejects barcodes with a wrong check digit without calling the server', async () => {
    await renderScreen(<LogFoodScreen />);
    await fireEvent.press(screen.getByRole('button', { name: /Scan barcode/ }));
    await scan('3017620422004');
    expect(await screen.findByText(/doesn’t look like a valid barcode/)).toBeOnTheScreen();
    expect(lookupBarcode).not.toHaveBeenCalled();
    expect(isValidBarcode('96385074')).toBe(true);
  });
});
