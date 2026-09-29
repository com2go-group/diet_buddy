import { screen } from '@testing-library/react-native';

import { renderScreen } from '@/test/render';

import { ScoreCard } from '../components/ScoreCard';

describe('ScoreCard', () => {
  it('shows streak freezes when the user has some', async () => {
    await renderScreen(<ScoreCard score={80} streak={9} xp={120} freezes={2} />);
    expect(screen.getByLabelText(/^2 streak freezes/)).toBeOnTheScreen();
  });

  it('hides them when there are none', async () => {
    await renderScreen(<ScoreCard score={80} streak={3} xp={20} />);
    expect(screen.queryByLabelText(/streak freezes/)).toBeNull();
  });
});
