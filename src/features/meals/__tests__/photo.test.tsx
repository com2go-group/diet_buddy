import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';

import { renderScreen } from '@/test/render';

import { analyzeFoodPhoto, FoodPhotoError, loadRecentLogs, logFood } from '../api';
import { LogFoodScreen } from '../LogFoodScreen';
import { MAX_PHOTO_BASE64, photoItemMacros } from '../photo';
import { photoWarningText } from '../photoWarnings';
import type { FoodPhotoResult, PhotoItem } from '../types';

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));
jest.mock('../api', () => ({
  ...jest.requireActual('../api'),
  loadRecentLogs: jest.fn(),
  analyzeFoodPhoto: jest.fn(),
  logFood: jest.fn(),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: jest.fn(() => ({ slot: 'dinner', date: undefined })),
}));

const { router } = jest.requireMock('expo-router') as {
  router: { push: jest.Mock; back: jest.Mock };
};
const picker = ImagePicker as jest.Mocked<typeof ImagePicker>;

const usda = (ref: string, name: string, kcal: number, proteinG: number) => ({
  ref,
  name,
  brand: null,
  per100g: { kcal, proteinG, carbsG: 10, fatG: 5, fiberG: 1 },
  servings: [],
});
const chicken: PhotoItem = {
  name: 'Grilled chicken',
  grams: 150,
  confidence: 'high',
  food: usda('usda:1', 'Chicken, breast, roasted', 165, 31),
  warnings: [],
};
const satay: PhotoItem = {
  name: 'Satay sauce',
  grams: 30,
  confidence: 'low',
  food: usda('usda:2', 'Sauce, peanut', 250, 8),
  warnings: ['allergy:peanuts'],
};
const stew: PhotoItem = {
  name: 'Mystery stew',
  grams: 300,
  confidence: 'low',
  food: null,
  warnings: [],
};
const result: FoodPhotoResult = { items: [chicken, satay, stew], plateWarnings: [], remaining: 2 };

beforeEach(() => {
  jest.clearAllMocks();
  (loadRecentLogs as jest.Mock).mockResolvedValue([]);
  (logFood as jest.Mock).mockResolvedValue(undefined);
  picker.requestCameraPermissionsAsync.mockResolvedValue({ granted: true } as never);
  picker.launchCameraAsync.mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file://x.jpg', base64: '/9j/abc' }],
  } as never);
});

const openPhotoTab = async () => {
  await renderScreen(<LogFoodScreen />);
  await fireEvent.press(screen.getByRole('tab', { name: 'Photo' }));
};

describe('food photo logging', () => {
  it('scans a plate, lets the user adjust it and logs the chosen items', async () => {
    (analyzeFoodPhoto as jest.Mock).mockResolvedValue(result);
    await openPhotoTab();
    expect(screen.getByText(/never stored/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Take photo' }));
    expect(await screen.findByText('What we found')).toBeOnTheScreen();
    expect(analyzeFoodPhoto).toHaveBeenCalledWith('/9j/abc');
    expect(picker.launchCameraAsync).toHaveBeenCalledWith(
      expect.objectContaining({ base64: true, exif: false }),
    );

    // Numbers are USDA × grams; the warning and uncertainty are shown.
    expect(screen.getByText('USDA: Chicken, breast, roasted')).toBeOnTheScreen();
    expect(screen.getByText('248 kcal')).toBeOnTheScreen();
    expect(
      screen.getByText('May contain peanuts, which you listed as an allergy'),
    ).toBeOnTheScreen();
    expect(screen.getByText(/Not sure about this one/)).toBeOnTheScreen();
    // Unmatched foods can't be logged from here.
    expect(screen.getByRole('checkbox', { name: 'Include Mystery stew' })).toBeDisabled();
    expect(screen.getByText(/2 free photo scans left today/)).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('checkbox', { name: 'Include Satay sauce' }));
    await fireEvent.changeText(screen.getByLabelText('Grams for Grilled chicken'), '200');
    expect(screen.getByText('Total: 330 kcal · 62g protein')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Log 1 item to Dinner' }));

    await waitFor(() => expect(logFood).toHaveBeenCalledTimes(1));
    expect((logFood as jest.Mock).mock.calls[0][1]).toMatchObject({
      slot: 'dinner',
      name: 'Grilled chicken',
      foodRef: 'usda:1',
      quantity: 200,
      unit: 'g',
      macros: { kcal: 330, proteinG: 62, carbsG: 20, fatG: 10 },
      source: 'photo',
    });
    await waitFor(() => expect(router.back).toHaveBeenCalled());
  });

  it('shows an empty state when no food is found', async () => {
    (analyzeFoodPhoto as jest.Mock).mockResolvedValue({
      items: [],
      plateWarnings: [],
      remaining: null,
    });
    await openPhotoTab();
    await fireEvent.press(screen.getByRole('button', { name: 'Take photo' }));
    expect(await screen.findByText('No food found')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Try another photo' }));
    expect(await screen.findByRole('button', { name: 'Take photo' })).toBeOnTheScreen();
  });

  it('offers Premium when the free scans are used up', async () => {
    (analyzeFoodPhoto as jest.Mock).mockRejectedValue(new FoodPhotoError('limit_reached'));
    await openPhotoTab();
    await fireEvent.press(screen.getByRole('button', { name: 'Take photo' }));
    expect(await screen.findByText(/used today’s free photo scans/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'See Premium' }));
    expect(router.push).toHaveBeenCalledWith('/paywall');
  });

  it('explains a denied camera and a photo that is too large', async () => {
    picker.requestCameraPermissionsAsync.mockResolvedValue({ granted: false } as never);
    await openPhotoTab();
    await fireEvent.press(screen.getByRole('button', { name: 'Take photo' }));
    expect(await screen.findByText(/Camera access is off/)).toBeOnTheScreen();
    expect(picker.launchCameraAsync).not.toHaveBeenCalled();

    picker.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://big.jpg', base64: 'A'.repeat(MAX_PHOTO_BASE64 + 1) }],
    } as never);
    await fireEvent.press(screen.getByRole('button', { name: 'Choose from library' }));
    expect(await screen.findByText(/too large/)).toBeOnTheScreen();
    expect(analyzeFoodPhoto).not.toHaveBeenCalled();
  });
});

describe('photo helpers', () => {
  it('computes macros from USDA per-100 g values', () => {
    expect(photoItemMacros(chicken, 50)).toEqual({
      kcal: 83,
      proteinG: 15.5,
      carbsG: 5,
      fatG: 2.5,
    });
    expect(photoItemMacros(stew, 100)).toBeNull();
  });

  it('describes every kind of diet warning', () => {
    expect(photoWarningText('allergy:tree_nuts')).toBe(
      'May contain tree nuts, which you listed as an allergy',
    );
    expect(photoWarningText('allergy:other')).toBe(
      'May contain something you listed as an allergy',
    );
    expect(photoWarningText('restriction:other')).toBe('May not fit your dietary restrictions');
    expect(photoWarningText('restriction:halal')).toBe('May not fit your Halal restriction');
    expect(photoWarningText('restriction:kosher_mixing')).toBe(
      'Meat and dairy on the same plate (kosher)',
    );
    expect(photoWarningText('diet:vegan')).toBe('May not fit your Vegan diet');
    expect(photoWarningText('avoid:pork')).toBe('Contains pork, which you avoid');
    expect(photoWarningText('avoid:brussels_sprouts')).toBe(
      'Contains brussels sprouts, which you avoid',
    );
  });
});
