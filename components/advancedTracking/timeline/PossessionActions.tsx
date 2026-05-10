import AdvancedTimelineActionChip from '@/components/advancedTracking/timeline/AdvancedTimelineActionChip';
import AdvancedTimelinePassChain from '@/components/advancedTracking/timeline/AdvancedTimelinePassChain';
import LinkedSubDetail from '@/components/advancedTracking/timeline/LinkedSubDetail';
import type {
  AdvancedTimelineAction,
  AdvancedTimelineSub,
  ThrowDisplayAction,
} from '@/lib/advancedTracking/advancedTimelineUtils';
import React from 'react';
import { StyleSheet, View } from 'react-native';

function isCompleteThrow(action: AdvancedTimelineAction): action is ThrowDisplayAction {
  return action.kind === 'throw' && action.throwResult === 'complete';
}

type ActionGroup =
  | { type: 'chain'; actions: ThrowDisplayAction[] }
  | { type: 'single'; action: AdvancedTimelineAction };

function groupActions(actions: AdvancedTimelineAction[]): ActionGroup[] {
  const groups: ActionGroup[] = [];

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];

    if (!isCompleteThrow(action)) {
      groups.push({ type: 'single', action });
      continue;
    }

    const chain: ThrowDisplayAction[] = [action];

    while (i + 1 < actions.length) {
      const nextAction = actions[i + 1];
      if (!isCompleteThrow(nextAction)) break;

      chain.push(nextAction);
      i++;
    }

    if (chain.length >= 2) {
      groups.push({ type: 'chain', actions: chain });
    } else {
      groups.push({ type: 'single', action });
    }
  }

  return groups;
}

interface PossessionActionsProps {
  actions: AdvancedTimelineAction[];
  subs: AdvancedTimelineSub[];
}

export default function PossessionActions({ actions, subs }: PossessionActionsProps) {
  const styles = createStyles();

  return (
    <View style={styles.actionsContainer}>
      {groupActions(actions).map((group) =>
        group.type === 'chain' ? (
          <AdvancedTimelinePassChain
            key={`chain-${group.actions[0].id}`}
            actions={group.actions}
            showElapsed
          />
        ) : (
          <View key={group.action.id} style={styles.actionRow}>
            <AdvancedTimelineActionChip action={group.action} showElapsed />
            {group.action.kind === 'stoppage' && group.action.reason === 'injury' && (
              <LinkedSubDetail subs={subs} stoppageActionId={group.action.id} />
            )}
          </View>
        ),
      )}
    </View>
  );
}

function createStyles() {
  return StyleSheet.create({
    actionsContainer: {
      gap: 6,
    },
    actionRow: {
      gap: 4,
    },
  });
}
