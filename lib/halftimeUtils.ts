import { GameEvent, GoalEvent } from '@/store/gameStore.types';

export function inferHalftimeGoalEventIndex(
  events: GameEvent[],
  gameTo: number,
  autoHalftimeEnabled = true,
): number | null {
  if (!autoHalftimeEnabled) {
    return null;
  }

  const halftimeScore = Math.ceil(gameTo / 2);
  let team1Score = 0;
  let team2Score = 0;

  for (let index = 0; index < events.length; index++) {
    const event = events[index];
    if (event.type !== 'goal') {
      continue;
    }

    if (event.team === 'team1') {
      team1Score++;
    } else {
      team2Score++;
    }

    if (team1Score === halftimeScore || team2Score === halftimeScore) {
      return index;
    }
  }

  return null;
}

export function normalizeHalftimeMarkers(
  events: GameEvent[],
  gameTo: number,
  autoHalftimeEnabled = true,
): GameEvent[] {
  const explicitHalftimeGoalIndex = events.findIndex(
    (event) => event.type === 'goal' && event.triggeredHalftime === true,
  );
  const halftimeGoalIndex =
    explicitHalftimeGoalIndex >= 0
      ? explicitHalftimeGoalIndex
      : inferHalftimeGoalEventIndex(events, gameTo, autoHalftimeEnabled);

  let didChange = false;

  const normalizedEvents = events.map((event, index) => {
    if (event.type !== 'goal') {
      return event;
    }

    const shouldBeHalftimeGoal = index === halftimeGoalIndex;
    const isHalftimeGoal = event.triggeredHalftime === true;

    if (
      shouldBeHalftimeGoal === isHalftimeGoal &&
      (isHalftimeGoal || !('triggeredHalftime' in event))
    ) {
      return event;
    }

    didChange = true;

    if (shouldBeHalftimeGoal) {
      return {
        ...event,
        triggeredHalftime: true,
      };
    }

    const { triggeredHalftime, ...eventWithoutHalftime } = event;
    return eventWithoutHalftime;
  });

  return didChange ? normalizedEvents : events;
}

export function didGoalTriggerHalftime(event: GoalEvent, halftimeAlreadyReached: boolean): boolean {
  if (halftimeAlreadyReached) {
    return false;
  }

  return event.triggeredHalftime === true;
}
