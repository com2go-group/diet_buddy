import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { renderScreen } from '@/test/render';

import {
  deleteAccount,
  exportData,
  loadConsents,
  loadOverview,
  savePlanVersion,
  setConsent,
  setUnits,
  type ProfileOverview,
} from '../api';
import { PrivacyScreen } from '../PrivacyScreen';
import { ProfileScreen } from '../ProfileScreen';
import { saveExport } from '../saveExport';

jest.mock('../api', () => ({
  ...jest.requireActual('../api'),
  loadOverview: jest.fn(),
  setUnits: jest.fn(),
  savePlanVersion: jest.fn(),
  loadConsents: jest.fn(),
  setConsent: jest.fn(),
  exportData: jest.fn(),
  deleteAccount: jest.fn(),
}));
jest.mock('../saveExport', () => ({ saveExport: jest.fn() }));
jest.mock('@/lib/purchases', () => ({
  ...jest.requireActual('@/lib/purchases'),
  purchasesAvailable: jest.fn(() => false),
  restore: jest.fn(async () => false),
}));
jest.mock('../../notifications/api', () => ({
  loadNotifications: jest.fn().mockResolvedValue([]),
  markAllRead: jest.fn(),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
}));

const overview: ProfileOverview = {
  profile: {
    name: 'Olivia',
    gender: 'female',
    units: 'metric',
    is_premium: false,
    streak_days: 3,
    xp: 120,
  },
  plan: {
    version: 1,
    daily_calories: 1800,
    protein_g: 140,
    carbs_g: 180,
    fat_g: 60,
    fiber_g: 25,
    water_ml: 2500,
    exercise_recommendation: null,
    forecast: { weekly_change_kg: -0.5 },
  },
  goal: { startKg: 82, goalKg: 70, goalDate: '2027-03-01', losing: true },
  latest: { weightKg: 80, bmr: 1500, tdee: 2300 },
  stats: { loggedDays: 12, mealsLogged: 40, goalProgress: 17 },
  checkedInToday: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  (loadOverview as jest.Mock).mockResolvedValue(overview);
  (setUnits as jest.Mock).mockResolvedValue(undefined);
  (savePlanVersion as jest.Mock).mockResolvedValue(undefined);
  (loadConsents as jest.Mock).mockResolvedValue([
    {
      consent_type: 'health_data',
      granted: true,
      version: '2026-09-25',
      updated_at: '2026-09-25T10:00:00Z',
    },
  ]);
  (setConsent as jest.Mock).mockResolvedValue(undefined);
  (exportData as jest.Mock).mockResolvedValue({ format: 'dietbuddy-export-v1' });
  (deleteAccount as jest.Mock).mockResolvedValue(undefined);
});

describe('ProfileScreen', () => {
  it('shows the header stats, goals and settings', async () => {
    await renderScreen(<ProfileScreen />);
    expect(await screen.findByText('Olivia')).toBeOnTheScreen();
    expect(screen.getByLabelText('Goal Progress: 17%')).toBeOnTheScreen();
    expect(screen.getByLabelText('Weight Goal, 70 kg by 1 March 2027')).toBeOnTheScreen();
    expect(screen.getByLabelText('Daily Calorie Target, 1,800 kcal')).toBeOnTheScreen();
    expect(screen.getByLabelText('Hydration Goal, 2.5 L per day')).toBeOnTheScreen();
    expect(screen.getByText('Free plan')).toBeOnTheScreen();
  });

  it('links to health apps and restores purchases', async () => {
    const { router } = jest.requireMock('expo-router') as { router: { push: jest.Mock } };
    const purchases = jest.requireMock('@/lib/purchases') as { purchasesAvailable: jest.Mock };
    await renderScreen(<ProfileScreen />);
    await fireEvent.press(await screen.findByLabelText('Health apps, Not connected'));
    expect(router.push).toHaveBeenCalledWith('/health');
    expect(screen.queryByLabelText(/Restore purchases/)).toBeNull(); // no store on this build

    purchases.purchasesAvailable.mockReturnValue(true);
    await renderScreen(<ProfileScreen />);
    await fireEvent.press(await screen.findByLabelText('Restore purchases'));
    expect(
      await screen.findByLabelText(
        'Restore purchases, No previous purchases were found for this account.',
      ),
    ).toBeOnTheScreen();
    purchases.purchasesAvailable.mockReturnValue(false);
  });

  it('changes units', async () => {
    await renderScreen(<ProfileScreen />);
    await fireEvent.press(await screen.findByLabelText('Units, Metric (kg, cm)'));
    await fireEvent.press(screen.getByRole('radio', { name: 'Imperial (lb, ft)' }));
    await waitFor(() => expect(setUnits).toHaveBeenCalledWith('user-1', 'imperial'));
  });

  it('keeps the calorie target at or above the safe minimum', async () => {
    await renderScreen(<ProfileScreen />);
    await fireEvent.press(await screen.findByLabelText('Daily Calorie Target, 1,800 kcal'));
    const field = screen.getByLabelText('Daily calorie target');
    await fireEvent.changeText(field, '1100');
    expect(screen.getByText('Enter a value between 1,500 and 3,300')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    await fireEvent.changeText(field, '2000');
    expect(screen.getByText('Protein 140 g · Carbs 209 g · Fat 67 g')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(savePlanVersion).toHaveBeenCalled());
    expect((savePlanVersion as jest.Mock).mock.calls[0][1]).toMatchObject({
      version: 2,
      daily_calories: 2000,
    });
  });

  it('shows an error state', async () => {
    (loadOverview as jest.Mock).mockRejectedValue(new Error('offline'));
    await renderScreen(<ProfileScreen />);
    expect(await screen.findByText('We couldn’t load your profile.')).toBeOnTheScreen();
  });
});

describe('PrivacyScreen', () => {
  it('shows consent state and toggles marketing', async () => {
    await renderScreen(<PrivacyScreen />);
    expect(await screen.findByText(/Given on 25 September 2026/)).toBeOnTheScreen();
    await fireEvent(screen.getByLabelText('Marketing messages'), 'valueChange', true);
    await waitFor(() => expect(setConsent).toHaveBeenCalledWith('marketing', true));
  });

  it('exports data', async () => {
    await renderScreen(<PrivacyScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Export my data' }));
    await waitFor(() => expect(saveExport).toHaveBeenCalledWith({ format: 'dietbuddy-export-v1' }));
    expect(await screen.findByText(/Your export is ready/)).toBeOnTheScreen();
  });

  it('deletes the account only after typing DELETE', async () => {
    await renderScreen(<PrivacyScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Delete my account' }));
    const confirm = screen.getByRole('button', { name: 'Permanently delete' });
    expect(confirm).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText('Type DELETE'), 'delete');
    await fireEvent.changeText(screen.getByLabelText('Type DELETE'), 'DELETE');
    await fireEvent.press(screen.getByRole('button', { name: 'Permanently delete' }));
    await waitFor(() => expect(deleteAccount).toHaveBeenCalled());
  });
});
