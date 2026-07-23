import type {
  AdvancedTrackedGame,
  BetweenPointTransition,
  GameSide,
  GameTransition,
  Participant,
  PlayerRef,
  PointPossession,
  PossessionAction,
  TrackedPoint,
} from '../types';

function resolveRef(ref: PlayerRef, participants: Participant[]): string {
  if (ref.refType === 'participant') {
    return participants.find((p) => p.id === ref.participantId)?.name ?? ref.participantId;
  }
  return ref.refType === 'unknown' ? '?' : 'untracked';
}

function sideLabel(sideId: string, sides: GameSide[]): string {
  return sides.find((s) => s.id === sideId)?.label ?? sideId;
}

function formatScore(score: Record<string, number>, sides: GameSide[]): string {
  return sides.map((s) => `${s.label} ${score[s.id] ?? 0}`).join(' - ');
}

function formatAction(
  action: PossessionAction,
  participants: Participant[],
  sides: GameSide[],
): string {
  const r = (ref: PlayerRef) => resolveRef(ref, participants);
  const s = (id: string) => sideLabel(id, sides);

  switch (action.kind) {
    case 'pull': {
      const who = action.receiver ? ` · caught by ${r(action.receiver)}` : ` · ${action.result}`;
      const hang = action.hangTimeMs != null ? ` [${(action.hangTimeMs / 1000).toFixed(1)}s]` : '';
      return `PULL    ${s(action.sideId)} → ${s(action.receivingSideId)}${who}${hang}`;
    }
    case 'disc_pickup':
      return `PICKUP  ${r(action.player)}`;
    case 'throw': {
      const target = action.toPlayer ? r(action.toPlayer) : '?';
      const result = action.result === 'goal' ? 'GOAL' : action.result;
      const defender = action.defender ? `  [block: ${r(action.defender)}]` : '';
      const attr = action.splitAttribution ? '  [split]' : '';
      return `THROW   ${r(action.thrower)} → ${target}  · ${result}${defender}${attr}`;
    }
    case 'stoppage':
      return `STOP    ${action.reason}${action.sideId ? ` (${s(action.sideId)})` : ''}`;
  }

  throw new Error('Unsupported action');
}

function formatPossession(
  pos: PointPossession,
  posIndex: number,
  participants: Participant[],
  sides: GameSide[],
): string {
  const header = `  Pos ${posIndex + 1}  ${sideLabel(pos.sideId, sides)}`;
  const actions = pos.actions.map((a) => `    ${formatAction(a, participants, sides)}`);
  return [header, ...actions].join('\n');
}

function formatBetweenPointTransitions(
  transitions: BetweenPointTransition[],
  sides: GameSide[],
): string {
  return transitions
    .map((t) => {
      if (t.transitionType === 'timeout') return `  ⏱  ${sideLabel(t.sideId, sides)} timeout`;
      const label = t.transitionType.replace(/_/g, ' ');
      return t.sideId ? `  ⏱  ${label} (${sideLabel(t.sideId, sides)})` : `  ⏱  ${label}`;
    })
    .join('\n');
}

function formatGameTransitions(transitions: GameTransition[], afterPointId: string): string {
  return transitions
    .filter((t) => t.afterPointId === afterPointId)
    .map((t) => `\n  ════  ${t.transitionType.replace(/_/g, ' ').toUpperCase()}  ════`)
    .join('');
}

function formatPoint(
  point: TrackedPoint,
  pointIndex: number,
  score: Record<string, number>,
  participants: Participant[],
  sides: GameSide[],
  gameTransitions: GameTransition[],
): string {
  const offenseSide = point.possessions[0] ? sideLabel(point.possessions[0].sideId, sides) : '?';
  const header = `── Point ${pointIndex + 1} ──  ${formatScore(score, sides)}  ·  ${offenseSide} O  ${'─'.repeat(20)}`;

  const possessions = point.possessions.map((pos, i) =>
    formatPossession(pos, i, participants, sides),
  );

  const lastPossession = point.possessions[point.possessions.length - 1];
  const lastAction = lastPossession?.actions[lastPossession.actions.length - 1];
  let outcome: string;
  if (lastAction?.kind === 'throw' && lastAction.result === 'goal') {
    outcome = `  → ${sideLabel(lastPossession.sideId, sides)} scored`;
  } else if (lastAction?.kind === 'throw' && lastAction.result === 'callahan') {
    const scoringSide = sides.find((s) => s.id !== lastPossession.sideId);
    outcome = `  → ${scoringSide?.label ?? '?'} scored (callahan)`;
  } else {
    outcome = `  → unfinished`;
  }

  const outputLines = [header, ...possessions, outcome];

  if (point.transitionsAfter?.length) {
    outputLines.push(formatBetweenPointTransitions(point.transitionsAfter, sides));
  }

  const gameTrans = formatGameTransitions(gameTransitions, point.id);
  if (gameTrans) outputLines.push(gameTrans);

  return outputLines.join('\n');
}

export function formatGame(game: AdvancedTrackedGame): string {
  const sideLabels = game.sides.map((s) => s.label).join(' vs ');
  const fmt = game.settings.format;
  const fmtDesc = fmt ? `${fmt.formatType} · to ${fmt.gameTo ?? '?'}` : 'no format';
  const statusDesc =
    game.status === 'terminated' && game.endReason ? `terminated (${game.endReason})` : game.status;
  const bar = '═'.repeat(56);

  const headerLines = [bar, `  ${sideLabels}  [${fmtDesc}]  ${statusDesc}`];
  if (game.metadata?.title) headerLines.push(`  ${game.metadata.title}`);
  if (game.metadata?.date)
    headerLines.push(
      `  ${game.metadata.date}${game.metadata.location ? ` · ${game.metadata.location}` : ''}`,
    );
  if (game.metadata?.notes) headerLines.push(`  note: ${game.metadata.notes}`);
  headerLines.push(bar);

  const score: Record<string, number> = Object.fromEntries(game.sides.map((s) => [s.id, 0]));
  const points = game.points
    .map((p, i) => {
      const rendered = formatPoint(
        p,
        i,
        { ...score },
        game.participants,
        game.sides,
        game.gameTransitions ?? [],
      );
      // Advance score: last action of last possession determines who scored
      const lastPos = p.possessions[p.possessions.length - 1];
      const lastAction = lastPos?.actions[lastPos.actions.length - 1];
      if (lastAction?.kind === 'throw') {
        if (lastAction.result === 'goal') score[lastPos.sideId] = (score[lastPos.sideId] ?? 0) + 1;
        else if (lastAction.result === 'callahan') {
          const other = game.sides.find((s) => s.id !== lastPos.sideId);
          if (other) score[other.id] = (score[other.id] ?? 0) + 1;
        }
      }
      return rendered;
    })
    .join('\n\n');

  return [...headerLines, '', points].join('\n');
}
