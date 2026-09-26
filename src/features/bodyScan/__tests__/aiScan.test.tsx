import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';

import { renderScreen } from '@/test/render';

import { EMPTY_DRAFT } from '../../onboarding/draft';
import { useStorePremium } from '../../subscriptions/usePremium';
import {
  analyzeBodyScan,
  BodyScanError,
  hasBodyPhotoConsent,
  setBodyPhotoConsent,
} from '../aiScan';
import { saveBodyCheck } from '../api';
import { BodyScan } from '../BodyScanScreen';

jest.mock('../aiScan', () => ({
  ...jest.requireActual('../aiScan'),
  hasBodyPhotoConsent: jest.fn(),
  setBodyPhotoConsent: jest.fn(),
  analyzeBodyScan: jest.fn(),
}));
jest.mock('../api', () => ({ ...jest.requireActual('../api'), saveBodyCheck: jest.fn() }));
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));
jest.mock('@/lib/supabase', () => {
  const chain = {
    select: () => chain,
    eq: () => chain,
    single: async () => ({ data: { is_premium: false }, error: null }),
  };
  return { ...jest.requireActual('@/lib/supabase'), supabase: { from: () => chain } };
});
jest.mock('expo-router', () => ({ router: { replace: jest.fn(), back: jest.fn() } }));

const JPEG = btoa('\xff\xd8\xff\xdb\x00\x04qq\xff\xda\x00\x02data');
const state = {
  draft: {
    ...EMPTY_DRAFT,
    name: 'Sam',
    birthDate: { day: '12', month: '4', year: '1990' },
    sex: 'male' as const,
    heightCm: 180,
    weightKg: 84,
    activity: 'active' as const,
  },
  step: 'aiPlan' as const,
  goalId: null,
};
const picker = ImagePicker as jest.Mocked<typeof ImagePicker>;

beforeEach(() => {
  jest.clearAllMocks();
  useStorePremium.setState({ premium: true });
  (hasBodyPhotoConsent as jest.Mock).mockResolvedValue(false);
  (setBodyPhotoConsent as jest.Mock).mockResolvedValue(undefined);
  (saveBodyCheck as jest.Mock).mockResolvedValue(undefined);
  picker.launchCameraAsync.mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file://p.jpg', base64: JPEG }],
  } as never);
});

async function toPhotos() {
  await fireEvent.press(await screen.findByRole('button', { name: /AI Camera Scan/ }));
  // Separate consent first.
  expect(await screen.findByText(/Before your first scan/)).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Agree and continue' })).toBeDisabled();
  await fireEvent.press(screen.getByRole('checkbox'));
  await fireEvent.press(screen.getByRole('button', { name: 'Agree and continue' }));
  await waitFor(() => expect(setBodyPhotoConsent).toHaveBeenCalledWith(true));
  await fireEvent.press(await screen.findByRole('button', { name: 'Take front photo' }));
  await fireEvent.press(await screen.findByRole('button', { name: 'Take side photo' }));
}

describe('AI body scan', () => {
  it('asks for consent, takes two photos and fills the Navy estimate, saved as a scan', async () => {
    (analyzeBodyScan as jest.Mock).mockResolvedValue({
      waistCm: 88,
      hipCm: 100,
      neckCm: 39,
      confidence: 'medium',
    });
    const onSaved = jest.fn();
    await renderScreen(<BodyScan initial={state} context="check" onSaved={onSaved} />);
    await toPhotos();
    await fireEvent.press(await screen.findByRole('button', { name: 'Estimate my measurements' }));
    expect(await screen.findByText(/Estimated from AI-measured waist/)).toBeOnTheScreen();
    expect(screen.getByText(/medium confidence/)).toBeOnTheScreen();
    expect(analyzeBodyScan).toHaveBeenCalledWith(JPEG, JPEG);
    await fireEvent.press(screen.getByRole('button', { name: 'Save & Continue' }));
    await waitFor(() => expect(saveBodyCheck).toHaveBeenCalled());
    const [, inputs, , fromAi] = (saveBodyCheck as jest.Mock).mock.calls[0];
    expect(inputs).toMatchObject({ waistCm: 88, hipCm: 100, neckCm: 39 });
    expect(fromAi).toBe(true);
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
  });

  it('explains a refused photo with a face', async () => {
    (hasBodyPhotoConsent as jest.Mock).mockResolvedValue(true);
    (analyzeBodyScan as jest.Mock).mockRejectedValue(new BodyScanError('face_visible'));
    await renderScreen(<BodyScan initial={state} context="check" />);
    await fireEvent.press(await screen.findByRole('button', { name: /AI Camera Scan/ }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Take front photo' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Take side photo' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Estimate my measurements' }));
    expect(await screen.findByText(/We could see a face/)).toBeOnTheScreen();
  });

  it('keeps the AI scan for Premium', async () => {
    useStorePremium.setState({ premium: false });
    await renderScreen(<BodyScan initial={state} context="check" />);
    expect(await screen.findByRole('button', { name: /Available with Premium/ })).toBeDisabled();
  });
});
