import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';

import { renderScreen } from '@/test/render';

import { useStorePremium } from '../../subscriptions/usePremium';
import { addPhoto, deletePhoto, loadPhotos, type ProgressPhoto } from '../photos/api';
import { compare, weightNear } from '../photos/compare';
import { PhotosSection } from '../photos/PhotosSection';
import type { MetricRow } from '../stats';

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));
jest.mock('../photos/api', () => ({
  ...jest.requireActual('../photos/api'),
  loadPhotos: jest.fn(),
  addPhoto: jest.fn(),
  deletePhoto: jest.fn(),
}));
// The server premium flag is false; tests set the device entitlement instead.
jest.mock('@/lib/supabase', () => {
  const chain = {
    select: () => chain,
    eq: () => chain,
    single: async () => ({ data: { is_premium: false }, error: null }),
  };
  return { ...jest.requireActual('@/lib/supabase'), supabase: { from: () => chain } };
});
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const { router } = jest.requireMock('expo-router') as { router: { push: jest.Mock } };
const picker = ImagePicker as jest.Mocked<typeof ImagePicker>;
// SOI, an EXIF segment with a location, a quantisation segment, start of scan.
const JPEG = btoa('\xff\xd8\xff\xe1\x00\x08GPS51N\xff\xdb\x00\x04qq\xff\xda\x00\x02data\xff\xd9');

const metric = (at: string, kg: number | null): MetricRow => ({
  measured_at: at,
  weight_kg: kg,
  bmi: null,
  waist_cm: null,
  body_fat_pct: null,
});
const metrics = [
  metric('2026-08-01T08:00:00Z', 84),
  metric('2026-08-20T08:00:00Z', 82.6),
  metric('2026-09-24T08:00:00Z', 80.2),
];
const photo = (id: string, takenAt: string): ProgressPhoto => ({
  id,
  takenAt,
  path: `user-1/${id}.jpg`,
  url: `https://signed/${id}`,
});
const photos = [
  photo('p1', '2026-08-02T09:00:00Z'),
  photo('p2', '2026-08-20T09:00:00Z'),
  photo('p3', '2026-09-25T09:00:00Z'),
];

beforeEach(() => {
  jest.clearAllMocks();
  useStorePremium.setState({ premium: false });
  (loadPhotos as jest.Mock).mockResolvedValue(photos);
  (addPhoto as jest.Mock).mockResolvedValue(undefined);
  (deletePhoto as jest.Mock).mockResolvedValue(undefined);
  picker.launchImageLibraryAsync.mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file://me.jpg', base64: JPEG }],
  } as never);
});

describe('PhotosSection', () => {
  it('lists photos newest first and uploads a new one without its location data', async () => {
    await renderScreen(<PhotosSection metrics={metrics} units="metric" />);
    const thumbs = await screen.findAllByRole('button', { name: /Open progress photo/ });
    expect(thumbs).toHaveLength(3);
    expect(thumbs[0]).toHaveAccessibleName(/25 Sept?/);
    await fireEvent.press(screen.getByRole('button', { name: 'Choose from library' }));
    await waitFor(() => expect(addPhoto).toHaveBeenCalled());
    const sent = (addPhoto as jest.Mock).mock.calls[0][1];
    expect(sent.mediaType).toBe('image/jpeg');
    expect(atob(sent.base64)).not.toContain('GPS');
    expect(atob(sent.base64)).toContain('data');
    await waitFor(() => expect(loadPhotos).toHaveBeenCalledTimes(2));
  });

  it('shows an empty state and explains unsupported photos', async () => {
    (loadPhotos as jest.Mock).mockResolvedValue([]);
    picker.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://x.heic', base64: 'AAAAGGZ0eXBoZWljAAAAAG1pZjE=' }],
    } as never);
    await renderScreen(<PhotosSection metrics={metrics} units="metric" />);
    expect(await screen.findByText('No photos yet')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Choose from library' }));
    expect(await screen.findByText(/Use a JPEG, PNG or WebP photo/)).toBeOnTheScreen();
    expect(addPhoto).not.toHaveBeenCalled();
  });

  it('opens a photo with the weight around then and deletes it after confirming', async () => {
    await renderScreen(<PhotosSection metrics={metrics} units="metric" />);
    const thumbs = await screen.findAllByRole('button', { name: /Open progress photo/ });
    await fireEvent.press(thumbs[0]!);
    expect(await screen.findByText('Weight around then: 80.2 kg')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Delete photo' }));
    expect(deletePhoto).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Tap again to delete for good' }));
    await waitFor(() => expect(deletePhoto).toHaveBeenCalledWith(photos[2]));
  });

  it('keeps before/after for Premium', async () => {
    await renderScreen(<PhotosSection metrics={metrics} units="metric" />);
    await fireEvent.press(await screen.findByRole('button', { name: 'See Premium' }));
    expect(router.push).toHaveBeenCalledWith('/paywall');
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
  });

  it('compares the first and latest photo for Premium, and any two chosen', async () => {
    useStorePremium.setState({ premium: true });
    await renderScreen(<PhotosSection metrics={metrics} units="metric" />);
    expect(await screen.findByText('54 days apart · −3.8 kg in weight')).toBeOnTheScreen();
    const options = screen.getAllByRole('radio');
    // Before strip: p1 p2 p3; after strip: p1 p2 p3. Choose p2 as before.
    expect(options).toHaveLength(6);
    expect(options[0]).toBeChecked();
    expect(options[5]).toBeChecked();
    await fireEvent.press(options[1]!);
    expect(await screen.findByText('36 days apart · −2.4 kg in weight')).toBeOnTheScreen();
  });

  it('shows an error state', async () => {
    (loadPhotos as jest.Mock).mockRejectedValue(new Error('down'));
    await renderScreen(<PhotosSection metrics={metrics} units="metric" />);
    expect(await screen.findByText('We couldn’t load your photos.')).toBeOnTheScreen();
  });
});

describe('photo comparison helpers', () => {
  it('uses the closest weigh-in within three days', () => {
    expect(weightNear(metrics, '2026-08-03T08:00:00Z')).toBe(84);
    expect(weightNear(metrics, '2026-08-10T08:00:00Z')).toBeNull();
    expect(weightNear([metric('2026-08-01T08:00:00Z', null)], '2026-08-01T09:00:00Z')).toBeNull();
  });

  it('reports days apart and weight change when both have a weigh-in', () => {
    expect(compare(metrics, photos[0]!.takenAt, photos[2]!.takenAt)).toEqual({
      days: 54,
      weightChangeKg: -3.8,
    });
    expect(compare(metrics, '2026-08-10T08:00:00Z', photos[2]!.takenAt).weightChangeKg).toBeNull();
  });
});
