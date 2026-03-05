import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { router, usePathname, type Href } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type HubTabRouteName = '(home)' | '(analytics)' | '(team)';
const HUB_TAB_DISPLAY_ORDER: readonly HubTabRouteName[] = ['(home)', '(analytics)', '(team)'];

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
    activePathnames: ['/Dashboard'],
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
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const pathname = usePathname();
  const styles = createStyles(sizeClass);
  const iconSize = scaleBySizeClass(20, sizeClass);
  const bottomPadding = scaleBySizeClass(6, sizeClass);

  const handleGamePress = () => {
    router.dismissTo('/');
  };

  const hubRoutes = HUB_TAB_DISPLAY_ORDER.map((routeName) => {
    const routeIndex = state.routes.findIndex((route) => route.name === routeName);
    if (routeIndex === -1) return null;
    return { route: { ...state.routes[routeIndex], name: routeName }, index: routeIndex };
  }).filter((entry): entry is HubRouteEntry => entry !== null);

  const renderHubTabButton = ({ route, index }: HubRouteEntry) => {
    const tabConfig = TAB_CONFIG[route.name];
    const isFocused = state.index === index;
    const isActive = isFocused && isTabPathActive(pathname, tabConfig);
    const color = isActive ? palette.accent : palette.textMuted;

    const onPress = () => {
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
          { backgroundColor: isActive ? palette.overlay05 : palette.overlay02 },
          pressed && styles.pressed,
        ]}>
        <MaterialCommunityIcons
          name={isActive ? tabConfig.activeIcon : tabConfig.inactiveIcon}
          size={iconSize}
          color={color}
        />
        <Text style={[styles.tabLabel, { color }]}>{tabConfig.label}</Text>
      </Pressable>
    );
  };

  const homeRoute = hubRoutes.find(({ route }) => route.name === '(home)');
  const analyticsRoute = hubRoutes.find(({ route }) => route.name === '(analytics)');
  const teamRoute = hubRoutes.find(({ route }) => route.name === '(team)');

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: palette.primary,
          paddingBottom: bottomPadding,
        },
      ]}>
      <View style={styles.row}>
        {homeRoute ? renderHubTabButton(homeRoute) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go to scoreboard"
          onPress={handleGamePress}
          style={({ pressed }) => [
            styles.tabButton,
            { backgroundColor: palette.overlay02 },
            pressed && styles.pressed,
          ]}>
          <MaterialCommunityIcons
            name="scoreboard-outline"
            size={iconSize}
            color={palette.textMuted}
          />
          <Text style={[styles.tabLabel, { color: palette.textMuted }]}>Game</Text>
        </Pressable>
        {analyticsRoute ? renderHubTabButton(analyticsRoute) : null}
        {teamRoute ? renderHubTabButton(teamRoute) : null}
      </View>
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    container: {
      paddingTop: scaleBySizeClass(6, sizeClass),
      paddingHorizontal: scaleBySizeClass(8, sizeClass),
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: scaleBySizeClass(6, sizeClass),
    },
    tabButton: {
      flex: 1,
      minHeight: scaleBySizeClass(44, sizeClass),
      borderRadius: scaleBySizeClass(10, sizeClass),
      alignItems: 'center',
      justifyContent: 'center',
      gap: scaleBySizeClass(1, sizeClass),
      paddingHorizontal: scaleBySizeClass(6, sizeClass),
      paddingVertical: scaleBySizeClass(4, sizeClass),
    },
    tabLabel: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontWeight: '700',
      letterSpacing: scaleBySizeClass(0.3, sizeClass, { rounding: 'none' }),
    },
    pressed: {
      opacity: 0.8,
    },
  });
}
