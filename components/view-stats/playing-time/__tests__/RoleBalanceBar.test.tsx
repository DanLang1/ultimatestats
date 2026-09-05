import { screen } from '@testing-library/react-native';

import RoleBalanceBar from '@/components/view-stats/playing-time/RoleBalanceBar';
import { renderScreen } from '@/test/render';

describe('playing-time O/D performance', () => {
  it('distinguishes an unavailable completed-point rate from a zero rate', async () => {
    await renderScreen(
      <RoleBalanceBar oPoints={1} dPoints={1} oEfficiency={null} dEfficiency={0} />,
    );
    expect(screen.getByText('—')).toBeTruthy();
    expect(screen.getByText('0%')).toBeTruthy();
    expect(screen.queryByText('No O-line points')).toBeNull();
  });

  it('keeps the supplied completed-point efficiency independent of participation counts', async () => {
    await renderScreen(
      <RoleBalanceBar oPoints={3} dPoints={0} oEfficiency={0.5} dEfficiency={null} />,
    );
    expect(screen.getByText('50%')).toBeTruthy();
    expect(screen.getByText('No D-line points')).toBeTruthy();
    expect(screen.queryByText('0%')).toBeNull();
  });

  it('retains basic hold and break counts alongside rates', async () => {
    await renderScreen(
      <RoleBalanceBar
        oPoints={13}
        dPoints={0}
        oEfficiency={9 / 13}
        dEfficiency={null}
        oLineHolds={9}
        dLineBreaks={0}
      />,
    );
    expect(screen.getByText('69%')).toBeTruthy();
    expect(screen.getByText('9 holds')).toBeTruthy();
    expect(screen.getByText('0 breaks')).toBeTruthy();
  });
});
