import React from 'react';
import { StyleSheet, View } from 'react-native';

import AdvancedTimelineActionChip from '@/components/advancedTracking/timeline/AdvancedTimelineActionChip';
import AdvancedTimelinePassChain from '@/components/advancedTracking/timeline/AdvancedTimelinePassChain';
import LinkedSubDetail from '@/components/advancedTracking/timeline/LinkedSubDetail';
import PossessionResultBadge from '@/components/advancedTracking/timeline/PossessionResultBadge';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import type {
  AdvancedTimelineTouchEditRequest,
  AdvancedTimelineTurnoverEditRequest,
} from '@/lib/advancedTracking/advancedTimelineTouchCorrectionUtils';
import type { FlowItem, AdvancedTimelineSub } from '@/lib/advancedTracking/advancedTimelineUtils';
import {
  getActionNodeColorKey,
  getHeaderNodeColorKey,
} from '@/lib/advancedTracking/advancedTimelineUtils';
import { Fonts, Palette } from '@/theme/theme';

const HEADER_NODE_CENTER_Y = 16;
const ACTION_NODE_CENTER_Y = 18;
const TRACK_COLUMN_WIDTH = 28;
const TRACK_LINE_WIDTH = 2;
const NODE_WRAPPER_SIZE = 20;
const AVATAR_NODE_SIZE = 20;
const DOT_NODE_SIZE = 8;

interface TimelineFlowRowProps {
  item: FlowItem;
  isFirst: boolean;
  isLast: boolean;
  sideLabels: Record<string, string>;
  focusSideId: string;
  oppSideId: string;
  subs: AdvancedTimelineSub[];
  pointId: string;
  editableTouchActionIds?: ReadonlySet<string>;
  onEditTouch?: (request: AdvancedTimelineTouchEditRequest) => void;
  editableTurnoverActionIds?: ReadonlySet<string>;
  onEditTurnover?: (request: AdvancedTimelineTurnoverEditRequest) => void;
}

interface TimelineFlowRenderContext {
  sideLabels: Record<string, string>;
  focusSideId: string;
  oppSideId: string;
  subs: AdvancedTimelineSub[];
  pointId: string;
  editableTouchActionIds?: ReadonlySet<string>;
  onEditTouch?: (request: AdvancedTimelineTouchEditRequest) => void;
  editableTurnoverActionIds?: ReadonlySet<string>;
  onEditTurnover?: (request: AdvancedTimelineTurnoverEditRequest) => void;
  palette: Palette;
  styles: ReturnType<typeof createStyles>;
}

function renderHeaderNode(
  item: Extract<FlowItem, { type: 'header' }>,
  context: TimelineFlowRenderContext,
): React.ReactNode {
  const { sideLabels, focusSideId, oppSideId, palette, styles } = context;
  const sideName = sideLabels[item.sideId] ?? item.sideId;
  const initial = sideName.trim().charAt(0).toUpperCase() || '?';
  const backgroundColor =
    palette[getHeaderNodeColorKey(item.sideId, item.possession.result, focusSideId, oppSideId)];

  return (
    <View style={[styles.avatarNode, { backgroundColor }]}>
      <ThemedText style={[styles.avatarText, { color: palette.textOnAccent }]}>
        {initial}
      </ThemedText>
    </View>
  );
}

function renderActionNode(item: FlowItem, context: TimelineFlowRenderContext): React.ReactNode {
  const { palette, styles } = context;
  const colorKey =
    item.type === 'action_single' ? getActionNodeColorKey(item.action.tone) : 'overlay20';
  const toneColor = palette[colorKey];
  return <View style={[styles.dotNode, { backgroundColor: toneColor }]} />;
}

function renderNodeElement(item: FlowItem, context: TimelineFlowRenderContext): React.ReactNode {
  if (item.type === 'header') {
    return renderHeaderNode(item, context);
  }
  return renderActionNode(item, context);
}

function renderRowContent(item: FlowItem, context: TimelineFlowRenderContext): React.ReactNode {
  const {
    sideLabels,
    subs,
    pointId,
    editableTouchActionIds,
    onEditTouch,
    editableTurnoverActionIds,
    onEditTurnover,
    palette,
    styles,
  } = context;

  if (item.type === 'header') {
    return (
      <View style={styles.possessionHeader}>
        <ThemedText style={[styles.possessionSide, { color: palette.textInverse }]}>
          {sideLabels[item.sideId] ?? item.sideId}
        </ThemedText>
        <PossessionResultBadge possession={item.possession} />
      </View>
    );
  }

  if (item.type === 'action_chain') {
    const firstAction = item.chainActions[0];
    const isEditable =
      onEditTouch != null &&
      item.chainActions.some((action) => editableTouchActionIds?.has(action.id) === true);
    return (
      <AdvancedTimelinePassChain
        actions={item.chainActions}
        showElapsed
        onEdit={
          isEditable
            ? () =>
                onEditTouch({
                  pointId,
                  possessionId: item.possession.possessionId,
                  actionId: firstAction.id,
                  preselectTouch: false,
                })
            : undefined
        }
      />
    );
  }

  const isEditableTurnover =
    item.action.kind === 'throw' &&
    editableTurnoverActionIds?.has(item.action.id) === true &&
    onEditTurnover != null;
  const canEditTouch =
    !isEditableTurnover &&
    editableTouchActionIds?.has(item.action.id) === true &&
    onEditTouch != null;
  const preselectTouch =
    item.action.kind === 'disc_pickup' ||
    (item.action.kind === 'throw' &&
      (item.action.throwResult === 'goal' ||
        item.action.throwResult === 'drop' ||
        item.action.throwResult === 'callahan')) ||
    item.action.kind === 'pull';

  return (
    <View style={styles.actionWrapper}>
      <AdvancedTimelineActionChip
        action={item.action}
        showElapsed
        editHint={isEditableTurnover ? 'Opens turnover editor' : undefined}
        onPress={getActionEditHandler({
          isEditableTurnover,
          canEditTouch,
          pointId,
          possessionId: item.possession.possessionId,
          actionId: item.action.id,
          preselectTouch,
          onEditTurnover,
          onEditTouch,
        })}
      />
      {item.action.kind === 'stoppage' && item.action.reason === 'injury' && (
        <LinkedSubDetail subs={subs} stoppageActionId={item.action.id} />
      )}
    </View>
  );
}

function getActionEditHandler({
  isEditableTurnover,
  canEditTouch,
  pointId,
  possessionId,
  actionId,
  preselectTouch,
  onEditTurnover,
  onEditTouch,
}: {
  isEditableTurnover: boolean;
  canEditTouch: boolean;
  pointId: string;
  possessionId: string;
  actionId: string;
  preselectTouch: boolean;
  onEditTurnover?: (request: AdvancedTimelineTurnoverEditRequest) => void;
  onEditTouch?: (request: AdvancedTimelineTouchEditRequest) => void;
}) {
  if (isEditableTurnover && onEditTurnover != null) {
    return () => onEditTurnover({ pointId, possessionId, actionId });
  }
  if (canEditTouch && onEditTouch != null) {
    return () => onEditTouch({ pointId, possessionId, actionId, preselectTouch });
  }
  return undefined;
}

export default function TimelineFlowRow({
  item,
  isFirst,
  isLast,
  sideLabels,
  focusSideId,
  oppSideId,
  subs,
  pointId,
  editableTouchActionIds,
  onEditTouch,
  editableTurnoverActionIds,
  onEditTurnover,
}: TimelineFlowRowProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  const context: TimelineFlowRenderContext = {
    sideLabels,
    focusSideId,
    oppSideId,
    subs,
    pointId,
    editableTouchActionIds,
    onEditTouch,
    editableTurnoverActionIds,
    onEditTurnover,
    palette,
    styles,
  };
  const nodeCenterY = item.type === 'header' ? HEADER_NODE_CENTER_Y : ACTION_NODE_CENTER_Y;
  const nodeElement = renderNodeElement(item, context);
  const rowContent = renderRowContent(item, context);

  return (
    <View style={styles.rowContainer}>
      <View style={styles.trackColumn}>
        {!isFirst && (
          <View
            style={[
              styles.lineSegment,
              { top: 0, height: nodeCenterY, backgroundColor: palette.overlay10 },
            ]}
          />
        )}
        {!isLast && (
          <View
            style={[
              styles.lineSegment,
              { top: nodeCenterY, bottom: 0, backgroundColor: palette.overlay10 },
            ]}
          />
        )}
        <View style={[styles.nodeWrapper, { top: nodeCenterY - NODE_WRAPPER_SIZE / 2 }]}>
          {nodeElement}
        </View>
      </View>

      <View style={styles.contentColumn}>{rowContent}</View>
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    rowContainer: {
      flexDirection: 'row',
      gap: 12,
      minHeight: 36,
    },
    trackColumn: {
      width: TRACK_COLUMN_WIDTH,
      alignItems: 'center',
      position: 'relative',
    },
    lineSegment: {
      position: 'absolute',
      left: (TRACK_COLUMN_WIDTH - TRACK_LINE_WIDTH) / 2,
      width: TRACK_LINE_WIDTH,
    },
    nodeWrapper: {
      position: 'absolute',
      width: NODE_WRAPPER_SIZE,
      height: NODE_WRAPPER_SIZE,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarNode: {
      width: AVATAR_NODE_SIZE,
      height: AVATAR_NODE_SIZE,
      borderRadius: AVATAR_NODE_SIZE / 2,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.bold,
    },
    dotNode: {
      width: DOT_NODE_SIZE,
      height: DOT_NODE_SIZE,
      borderRadius: DOT_NODE_SIZE / 2,
    },
    contentColumn: {
      flex: 1,
      justifyContent: 'center',
      paddingVertical: 4,
    },
    possessionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 24,
    },
    possessionSide: {
      fontSize: scaleBySizeClass(13, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    actionWrapper: {
      gap: 4,
    },
  });
}
