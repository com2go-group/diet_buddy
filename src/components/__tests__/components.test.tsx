import { fireEvent, render, screen } from '@testing-library/react-native';

import { Button, Chip, EmptyState, ErrorState, KpiTile, Ring } from '..';

describe('Button', () => {
  it('is an accessible button that fires onPress', async () => {
    const onPress = jest.fn();
    await render(<Button label="Log meal" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Log meal' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire while loading', async () => {
    const onPress = jest.fn();
    await render(<Button label="Save" loading onPress={onPress} />);
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toBeDisabled();
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('Chip', () => {
  it('exposes checked state for multi-select', async () => {
    await render(<Chip label="Vegan" selected onPress={() => undefined} />);
    expect(screen.getByRole('checkbox', { name: 'Vegan' })).toBeChecked();
  });

  it('exposes checked state for single-select', async () => {
    await render(<Chip label="Balanced" selectionRole="radio" selected={false} />);
    expect(screen.getByRole('radio', { name: 'Balanced' })).not.toBeChecked();
  });
});

describe('Ring', () => {
  it('announces progress', async () => {
    await render(<Ring value={1240} max={1800} color="#F59E0B" label="Calories" />);
    const ring = screen.getByRole('progressbar', { name: 'Calories: 1240 of 1800' });
    expect(ring.props.accessibilityValue).toEqual({ min: 0, max: 1800, now: 1240 });
  });

  it('handles a zero max', async () => {
    await render(<Ring value={0} max={0} color="#F59E0B" label="Water" />);
    expect(screen.getByRole('progressbar', { name: 'Water: 0 of 0' })).toBeOnTheScreen();
  });
});

describe('KpiTile', () => {
  it('reads as one accessible label', async () => {
    await render(<KpiTile label="Protein" value="162" unit="g" />);
    expect(screen.getByLabelText('Protein 162 g')).toBeOnTheScreen();
  });
});

describe('states', () => {
  it('EmptyState shows its action', async () => {
    const onAction = jest.fn();
    await render(<EmptyState title="No meals" actionLabel="Log food" onAction={onAction} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Log food' }));
    expect(onAction).toHaveBeenCalled();
  });

  it('ErrorState is an alert with retry', async () => {
    const onRetry = jest.fn();
    await render(<ErrorState onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalled();
  });
});
