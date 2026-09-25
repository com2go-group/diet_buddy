import { fireEvent, render, screen } from '@testing-library/react-native';

import { signUp } from '../api';
import { SignUpForm } from '../components/SignUpForm';
import { maskIdentifier } from '../screens/VerifyScreen';

jest.mock('../api', () => ({ signUp: jest.fn(), signIn: jest.fn() }));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

const { router } = jest.requireMock('expo-router') as { router: { push: jest.Mock } };

async function fillValidForm() {
  await fireEvent.changeText(screen.getByLabelText('Full Name'), 'Alex Johnson');
  await fireEvent.changeText(screen.getByLabelText('Email'), 'Alex@Example.com');
  await fireEvent.changeText(screen.getByLabelText('Date of birth, Day'), '17');
  await fireEvent.changeText(screen.getByLabelText('Date of birth, Month'), '05');
  await fireEvent.changeText(screen.getByLabelText('Date of birth, Year'), '1990');
  await fireEvent.changeText(screen.getByLabelText('Password'), 'diet2buddy');
  await fireEvent.changeText(screen.getByLabelText('Confirm Password'), 'diet2buddy');
}

describe('SignUpForm', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows translated validation errors and does not submit', async () => {
    await render(<SignUpForm method="email" />);
    await fireEvent.press(screen.getByRole('button', { name: 'Create Account' }));
    // Name and email both report at once, not one after the other.
    expect(await screen.findAllByText('This field is required')).toHaveLength(2);
    expect(screen.getByText('Enter a valid date')).toBeOnTheScreen();
    expect(
      screen.getByText('Use at least 8 characters, with letters and numbers'),
    ).toBeOnTheScreen();
    expect(signUp).not.toHaveBeenCalled();
  });

  it('blocks under-18s before calling the server', async () => {
    await render(<SignUpForm method="email" />);
    await fillValidForm();
    await fireEvent.changeText(
      screen.getByLabelText('Date of birth, Year'),
      String(new Date().getFullYear() - 10),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Create Account' }));
    expect(await screen.findByText('You must be 18 or older to use DietBuddy')).toBeOnTheScreen();
    expect(signUp).not.toHaveBeenCalled();
  });

  it('signs up and moves to the code screen', async () => {
    (signUp as jest.Mock).mockResolvedValue({
      method: 'email',
      identifier: 'alex@example.com',
      purpose: 'signup',
    });
    await render(<SignUpForm method="email" />);
    await fillValidForm();
    await fireEvent.press(screen.getByRole('button', { name: 'Create Account' }));
    await screen.findByRole('button', { name: 'Create Account' });
    expect(signUp).toHaveBeenCalledWith({
      method: 'email',
      identifier: 'alex@example.com',
      password: 'diet2buddy',
      name: 'Alex Johnson',
      birthDate: '1990-05-17',
    });
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/verify',
      params: { method: 'email', identifier: 'alex@example.com', purpose: 'signup' },
    });
  });

  it('shows server errors in a banner', async () => {
    const { AuthFailure } = jest.requireActual('../errors');
    (signUp as jest.Mock).mockRejectedValue(new AuthFailure('authErrors.alreadyRegistered'));
    await render(<SignUpForm method="email" />);
    await fillValidForm();
    await fireEvent.press(screen.getByRole('button', { name: 'Create Account' }));
    expect(await screen.findByText(/An account already exists/)).toBeOnTheScreen();
  });

  it('asks for a phone number in phone mode', async () => {
    await render(<SignUpForm method="phone" />);
    expect(screen.getByLabelText('Mobile number')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Email')).toBeNull();
  });
});

describe('maskIdentifier', () => {
  it('hides most of the address', () => {
    expect(maskIdentifier('email', 'alex@example.com')).toBe('a•••@example.com');
    expect(maskIdentifier('phone', '+447700900123')).toBe('+44•••23');
  });
});
