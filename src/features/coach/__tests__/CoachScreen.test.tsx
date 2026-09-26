import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { renderScreen } from '@/test/render';

import { CoachError, loadThread, sendMessage, type CoachThread } from '../api';
import { CoachScreen } from '../CoachScreen';

jest.mock('../api', () => ({
  ...jest.requireActual('../api'),
  loadThread: jest.fn(),
  sendMessage: jest.fn(),
}));
jest.mock('../../notifications/api', () => ({
  loadNotifications: jest.fn().mockResolvedValue([]),
  markAllRead: jest.fn(),
}));

const thread = (over: Partial<CoachThread> = {}): CoachThread => ({
  conversationId: null,
  messages: [],
  premium: false,
  limit: 5,
  usedToday: 1,
  ...over,
});
const at = new Date().toISOString();

describe('CoachScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (loadThread as jest.Mock).mockResolvedValue(thread());
  });

  it('shows the persona intro, disclaimer and remaining free messages', async () => {
    await renderScreen(<CoachScreen />);
    expect(await screen.findByText(/I’m Aria, your nutrition coach/)).toBeOnTheScreen();
    expect(screen.getByText(/not medical advice/)).toBeOnTheScreen();
    expect(screen.getByText('4 of 5 free messages left today')).toBeOnTheScreen();
  });

  it('sends a message and shows the reply', async () => {
    (sendMessage as jest.Mock).mockResolvedValue({
      conversationId: 'c1',
      remaining: 3,
      messages: [
        { id: 'u1', role: 'user', content: 'Snack idea?', created_at: at },
        { id: 'a1', role: 'assistant', content: 'Greek yogurt with berries.', created_at: at },
      ],
    });
    await renderScreen(<CoachScreen />);
    await fireEvent.changeText(await screen.findByLabelText('Message Aria'), 'Snack idea?');
    await fireEvent.press(screen.getByRole('button', { name: 'Send message' }));
    expect(await screen.findByText('Greek yogurt with berries.')).toBeOnTheScreen();
    expect(sendMessage).toHaveBeenCalledWith('aria', 'Snack idea?', null);
    expect(screen.getByText('3 of 5 free messages left today')).toBeOnTheScreen();
  });

  it('sends quick prompts to the chosen persona', async () => {
    (sendMessage as jest.Mock).mockReturnValue(new Promise(() => {}));
    await renderScreen(<CoachScreen />);
    await fireEvent.press(await screen.findByRole('radio', { name: 'Max, Fitness Coach' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Help me stay motivated' }));
    expect(sendMessage).toHaveBeenCalledWith('max', 'Help me stay motivated', null);
    expect(await screen.findByLabelText('Max is typing')).toBeOnTheScreen();
  });

  it('blocks sending once the free limit is used', async () => {
    (loadThread as jest.Mock).mockResolvedValue(thread({ usedToday: 5 }));
    await renderScreen(<CoachScreen />);
    expect(await screen.findByText(/You’ve used today’s 5 free messages/)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled();
  });

  it('explains server errors', async () => {
    (sendMessage as jest.Mock).mockRejectedValue(new CoachError('ai_failed'));
    await renderScreen(<CoachScreen />);
    await fireEvent.changeText(await screen.findByLabelText('Message Aria'), 'Hi');
    await fireEvent.press(screen.getByRole('button', { name: 'Send message' }));
    expect(await screen.findByText(/The coach couldn’t answer just now/)).toBeOnTheScreen();
    // The typed text is kept so the user can resend.
    await waitFor(() => expect(screen.getByDisplayValue('Hi')).toBeOnTheScreen());
  });

  it('continues the stored conversation', async () => {
    (loadThread as jest.Mock).mockResolvedValue(
      thread({
        conversationId: 'c9',
        messages: [
          { id: 'u', role: 'user', content: 'Earlier question', created_at: at },
          { id: 'a', role: 'assistant', content: 'Earlier answer', created_at: at },
        ],
      }),
    );
    (sendMessage as jest.Mock).mockReturnValue(new Promise(() => {}));
    await renderScreen(<CoachScreen />);
    expect(await screen.findByText('Earlier answer')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('Message Aria'), 'Follow-up');
    await fireEvent.press(screen.getByRole('button', { name: 'Send message' }));
    expect(sendMessage).toHaveBeenCalledWith('aria', 'Follow-up', 'c9');
  });
});
