import { NewGameSheet } from '@/components/new-game/NewGameSheet';
import { useTheme } from '@/context/ThemeContext';
import { useActiveGameSession } from '@/hooks/useActiveGameSession';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { useNewGameLauncher } from '@/hooks/useNewGameLauncher';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { router, usePathname, useSegments, type Href } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Fonts } from '@/theme/theme';

type HubTabRouteName = '(home)' | '(game)' | '(analytics)' | '(team)';
const MODAL_SEGMENTS = new Set<string>(['(modals)']);

const HUB_TAB_DISPLAY_ORDER: readonly HubTabRouteName[] = [
  '(home)',
  '(game)',
  '(analytics)',
  '(team)',
];

type TabConfig = {
  activeIcon: keyof typeof MaterialCommunityIcons.glyphMap;
  activePathnames: readonly string[];
  activePathPrefixes?: readonly string[];
  href: Href;
  inactiveIcon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  rootRoute: string;
};

const TAB_CONFIG: Record<HubTabRouteName, TabConfig> = {
  '(home)': {
    activeIcon: 'view-dashboard',
    activePathnames: ['/Dashboard', '/Help', '/About', '/Showcase'],
    href: '/Dashboard',
    inactiveIcon: 'view-dashboard-outline',
    label: 'Home',
    rootRoute: 'Dashboard',
  },
  '(analytics)': {
    activeIcon: 'chart-bar',
    activePathnames: [
      '/ViewStats',
      '/PlayerStats',
      '/SavedGameStats',
      '/AggregateStats',
      '/GameTimeline',
    ],
    activePathPrefixes: ['/saved-games/'],
    href: '/ViewStats',
    inactiveIcon: 'chart-bar',
    label: 'Stats',
    rootRoute: 'ViewStats',
  },
  '(game)': {
    activeIcon: 'scoreboard',
    activePathnames: ['/Scoreboard', '/GameInfo'],
    activePathPrefixes: ['/advancedTracking/Tracker', '/advancedTracking/PullTracking'],
    href: '/Scoreboard',
    inactiveIcon: 'scoreboard-outline',
    label: 'Game',
    rootRoute: 'index',
  },
  '(team)': {
    activeIcon: 'account-group',
    activePathnames: ['/EditRoster'],
    href: '/EditRoster',
    inactiveIcon: 'account-group-outline',
    label: 'Team',
    rootRoute: 'EditRoster',
  },
};

function isTabPathActive(pathname: string, tabConfig: TabConfig): boolean {
  if (tabConfig.activePathnames.includes(pathname)) return true;
  return tabConfig.activePathPrefixes?.some((prefix) => pathname.startsWith(prefix)) ?? false;
}

type HubRouteEntry = {
  index: number;
  route: BottomTabBarProps['state']['routes'][number] & { name: HubTabRouteName };
};

export default function HubTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { palette, themeMode } = useTheme();
  const { sizeClass } = useLayout();
  const pathname = usePathname();
  const segments = useSegments();
  const activeSession = useActiveGameSession();
  const {
    isNewGameSheetVisible,
    activeGameKind,
    openNewGameSheet,
    closeNewGameSheet,
    startBasicGame,
    startAdvancedGame,
  } = useNewGameLauncher();
  const styles = createStyles(sizeClass);
  const iconSize = scaleBySizeClass(20, sizeClass);
  const bottomPadding = scaleBySizeClass(6, sizeClass);
  const isLightTheme = themeMode === 'light';

  if (pathname === '/Scoreboard' || segments.some((s) => MODAL_SEGMENTS.has(s))) {
    return null;
  }

  const hubRoutes = HUB_TAB_DISPLAY_ORDER.map((routeName) => {
    const routeIndex = state.routes.findIndex((route) => route.name === routeName);
    if (routeIndex === -1) return null;
    return { route: { ...state.routes[routeIndex], name: routeName }, index: routeIndex };
  }).filter((entry): entry is HubRouteEntry => entry !== null);

  const renderHubTabButton = ({ route, index }: HubRouteEntry) => {
    const tabConfig = TAB_CONFIG[route.name];
    const isFocused = state.index === index;
    const isActive = isFocused && isTabPathActive(pathname, tabConfig);
    let color: string;
    if (isActive) {
      color = isLightTheme ? palette.accent : palette.textInverse;
    } else {
      color = palette.textMuted;
    }
    let buttonBackgroundColor: string;
    if (isActive) {
      buttonBackgroundColor = isLightTheme ? palette.accentOverlay10 : palette.accentOverlay15;
    } else {
      buttonBackgroundColor = 'transparent';
    }
    const buttonBorderColor = isActive ? palette.accentOverlay30 : 'transparent';

    const onPress = () => {
      if (route.name === '(game)') {
        if (activeSession.kind === 'none') {
          openNewGameSheet();
          return;
        }

        router.navigate(activeSession.route);
        return;
      }

      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });

      if (event.defaultPrevented) return;

      if (isFocused) {
        router.navigate(tabConfig.href);
        return;
      }

      navigation.navigate(route.name);
    };

    const onLongPress = () => {
      navigation.emit({
        type: 'tabLongPress',
        target: route.key,
      });
    };

    return (
      <Pressable
        key={route.key}
        accessibilityRole="button"
        accessibilityState={isActive ? { selected: true } : {}}
        accessibilityLabel={descriptors[route.key].options.tabBarAccessibilityLabel}
        testID={descriptors[route.key].options.tabBarButtonTestID}
        onPress={onPress}
        onLongPress={onLongPress}
        style={({ pressed }) => [
          styles.tabButton,
          {
            backgroundColor: buttonBackgroundColor,
            borderColor: buttonBorderColor,
          },
          isActive && styles.activeTabButton,
          pressed && styles.pressed,
        ]}>
        <MaterialCommunityIcons
          name={isActive ? tabConfig.activeIcon : tabConfig.inactiveIcon}
          size={iconSize}
          color={color}
        />
        <ThemedText style={[styles.tabLabel, { color }]}>{tabConfig.label}</ThemedText>
      </Pressable>
    );
  };

  const homeRoute = hubRoutes.find(({ route }) => route.name === '(home)');
  const gameRoute = hubRoutes.find(({ route }) => route.name === '(game)');
  const analyticsRoute = hubRoutes.find(({ route }) => route.name === '(analytics)');
  const teamRoute = hubRoutes.find(({ route }) => route.name === '(team)');

  return (
    <>
      <NewGameSheet
        visible={isNewGameSheetVisible}
        activeGameKind={activeGameKind}
        onClose={closeNewGameSheet}
        onStartBasic={startBasicGame}
        onStartAdvanced={startAdvancedGame}
      />
      <View
        style={[
          styles.container,
          {
            backgroundColor: isLightTheme ? palette.cardBg : palette.primary,
            borderTopColor: isLightTheme ? palette.borderLight : palette.overlay10,
            paddingBottom: bottomPadding,
            shadowColor: palette.shadow,
          },
        ]}>
        <View style={styles.row}>
          {homeRoute ? renderHubTabButton(homeRoute) : null}
          {gameRoute ? renderHubTabButton(gameRoute) : null}
          {analyticsRoute ? renderHubTabButton(analyticsRoute) : null}
          {teamRoute ? renderHubTabButton(teamRoute) : null}
        </View>
      </View>
    </>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    container: {
      paddingTop: scaleBySizeClass(6, sizeClass),
      paddingHorizontal: scaleBySizeClass(12, sizeClass),
      borderTopWidth: 1,
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.04,
      shadowRadius: 10,
      elevation: 5,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: scaleBySizeClass(2, sizeClass),
    },
    tabButton: {
      flex: 1,
      minHeight: scaleBySizeClass(50, sizeClass),
      borderRadius: scaleBySizeClass(12, sizeClass),
      alignItems: 'center',
      justifyContent: 'center',
      gap: scaleBySizeClass(2, sizeClass),
      paddingHorizontal: scaleBySizeClass(6, sizeClass),
      paddingVertical: scaleBySizeClass(6, sizeClass),
      borderWidth: 1,
    },
    activeTabButton: {
      transform: [{ translateY: -1 }],
    },
    tabLabel: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: scaleBySizeClass(0.3, sizeClass, { rounding: 'none' }),
    },
    pressed: {
      opacity: 0.8,
    },
  });
}
