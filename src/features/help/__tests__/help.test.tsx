import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { renderScreen } from '@/test/render';

import { compareVersions } from '../../config';
import { loadFaq, loadTickets, sendTicket } from '../api';
import { HelpScreen } from '../HelpScreen';

jest.mock('../api', () => ({
  loadFaq: jest.fn(),
  loadTickets: jest.fn(),
  sendTicket: jest.fn(),
}));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
}));

beforeEach(() => {
  jest.clearAllMocks();
  (loadTickets as jest.Mock).mockResolvedValue([]);
  (sendTicket as jest.Mock).mockResolvedValue(undefined);
});

describe('HelpScreen', () => {
  it('shows the FAQ from the dashboard, falling back to the built-in one', async () => {
    (loadFaq as jest.Mock).mockResolvedValue([
      { question: 'How do I scan a barcode?', answer: 'Log Food → Search.' },
    ]);
    await renderScreen(<HelpScreen />);
    expect(await screen.findByText('How do I scan a barcode?')).toBeOnTheScreen();

    (loadFaq as jest.Mock).mockResolvedValue([]);
    await renderScreen(<HelpScreen />);
    expect((await screen.findAllByText(/\?$/)).length).toBeGreaterThanOrEqual(5);
  });

  it('validates and sends a support request, and shows replies', async () => {
    (loadFaq as jest.Mock).mockResolvedValue([]);
    (loadTickets as jest.Mock).mockResolvedValue([
      {
        id: 't1',
        subject: 'Water button',
        message: 'x',
        status: 'answered',
        reply: 'Fixed!',
        created_at: '',
      },
    ]);
    await renderScreen(<HelpScreen />);
    expect(await screen.findByText('Our reply: Fixed!')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Send' }));
    expect(screen.getByText(/Add a subject/)).toBeOnTheScreen();
    expect(sendTicket).not.toHaveBeenCalled();
    await fireEvent.changeText(screen.getByLabelText('Subject'), 'Sync issue');
    await fireEvent.changeText(screen.getByLabelText('Message'), 'Weight doesn’t sync');
    await fireEvent.press(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() =>
      expect(sendTicket).toHaveBeenCalledWith('Sync issue', 'Weight doesn’t sync'),
    );
    expect(await screen.findByText(/We’ve got your message/)).toBeOnTheScreen();
  });
});

describe('compareVersions', () => {
  it('compares numerically', () => {
    expect(compareVersions('1.9.3', '1.10.0')).toBe(-1);
    expect(compareVersions('1.10.0', '1.9.3')).toBe(1);
    expect(compareVersions('1.0', '1.0.0')).toBe(0);
    expect(compareVersions('2.0.0', '1.99.99')).toBe(1);
  });
});
