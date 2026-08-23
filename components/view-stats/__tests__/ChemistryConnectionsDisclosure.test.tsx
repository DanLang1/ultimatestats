import { screen, userEvent, within } from '@testing-library/react-native';

import ChemistryConnectionsDisclosure, {
  ChemistryConnectionDisplay,
} from '@/components/view-stats/ChemistryConnectionsDisclosure';
import { renderScreen } from '@/test/render';

const makeConnection = (
  id: string,
  name: string,
  goalsFrom: number,
  assistsTo: number,
): ChemistryConnectionDisplay => ({
  id,
  name,
  goalsFrom,
  assistsTo,
  totalConnections: goalsFrom + assistsTo,
});

describe('ChemistryConnectionsDisclosure', () => {
  it('stays hidden when the map can show every connection', async () => {
    await renderScreen(
      <ChemistryConnectionsDisclosure
        connections={[
          makeConnection('one', 'One', 1, 0),
          makeConnection('two', 'Two', 0, 1),
          makeConnection('three', 'Three', 2, 0),
          makeConnection('four', 'Four', 0, 2),
        ]}
      />,
    );

    expect(screen.queryByTestId('chemistry-connections-toggle')).toBeNull();
  });

  it('expands every connection in total-count order and collapses again', async () => {
    const user = userEvent.setup();
    await renderScreen(
      <ChemistryConnectionsDisclosure
        connections={[
          makeConnection('low', 'Alex', 0, 1),
          makeConnection('top', 'Top Partner', 2, 3),
          makeConnection('middle', 'Middle Partner', 1, 2),
          makeConnection('second', 'Second Partner', 3, 1),
          makeConnection('duplicate-name', 'Alex', 2, 0),
        ]}
      />,
    );

    expect(screen.getByText('Showing top 4')).toBeVisible();
    expect(screen.getByText('View all 5')).toBeVisible();
    expect(screen.queryByTestId('chemistry-connections-list')).toBeNull();

    const toggle = screen.getByRole('button', {
      name: 'View all 5 chemistry connections',
    });
    expect(toggle).toHaveProp('accessibilityState', { expanded: false });

    await user.press(toggle);

    expect(screen.getByText('Showing all 5')).toBeVisible();
    expect(screen.getByText('Show less')).toBeVisible();
    expect(screen.getByTestId('chemistry-connections-list')).toBeVisible();
    expect(screen.getAllByText('Alex')).toHaveLength(2);
    expect(screen.getByTestId('chemistry-connection-low')).toBeVisible();
    expect(screen.getByTestId('chemistry-connection-duplicate-name')).toBeVisible();

    const rankedRows = screen.getAllByTestId(/^chemistry-connection-/);
    expect(rankedRows.map((row) => row.props.testID)).toEqual([
      'chemistry-connection-top',
      'chemistry-connection-second',
      'chemistry-connection-middle',
      'chemistry-connection-duplicate-name',
      'chemistry-connection-low',
    ]);

    const topRow = screen.getByTestId('chemistry-connection-top');
    expect(within(topRow).getByText('2')).toBeVisible();
    expect(within(topRow).getByText('3')).toBeVisible();
    expect(within(topRow).getByText('5')).toBeVisible();

    const collapseToggle = screen.getByRole('button', {
      name: 'Hide all chemistry connections',
    });
    expect(collapseToggle).toHaveProp('accessibilityState', { expanded: true });

    await user.press(collapseToggle);

    expect(screen.queryByTestId('chemistry-connections-list')).toBeNull();
    expect(screen.getByText('Showing top 4')).toBeVisible();
  });
});
