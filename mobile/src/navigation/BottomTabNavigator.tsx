import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../lib/ThemeContext';
import { usePulse } from '../lib/animations';
import DashboardScreen from '../screens/DashboardScreen';
import GroupsScreen from '../screens/GroupsScreen';
import MaterialsScreen from '../screens/MaterialsScreen';
import CalendarScreen from '../screens/CalendarScreen';
import SettingsScreen from '../screens/ProfileScreen';
import UploadScreen from '../screens/UploadScreen';
import ProjectsScreen from '../screens/ProjectsScreen';
import AssignmentsScreen from '../screens/AssignmentsScreen';
import AppHeader from '../components/AppHeader';

const Tab = createBottomTabNavigator();

const VISIBLE_TABS = [
  { name: 'Home',     icon: 'home-outline',     iconActive: 'home',     label: 'Home' },
  { name: 'Groups',   icon: 'people-outline',   iconActive: 'people',   label: 'Groups' },
  { name: 'Upload',   icon: 'add',              iconActive: 'add',      label: '' },
  { name: 'Calendar', icon: 'calendar-outline', iconActive: 'calendar', label: 'Calendar' },
  { name: 'Settings', icon: 'settings-outline', iconActive: 'settings', label: 'Settings' },
];

const HIDDEN_ROUTES = new Set(['Materials', 'Projects', 'Assignments']);

const CALENDAR_SUBMENU = [
  { name: 'Calendar',    icon: 'calendar' as const,      label: 'Calendar' },
  { name: 'Materials',   icon: 'book' as const,          label: 'Materials' },
  { name: 'Projects',    icon: 'layers' as const,        label: 'Projects' },
  { name: 'Assignments', icon: 'document-text' as const, label: 'Assignments' },
];

// ─── Calendar Sub-Menu Panel ──────────────────────────────────────────────────

function CalendarPanel({
  visible, slideAnim, opacityAnim, colors, activeRoute,
  onSelect,
}: {
  visible: boolean;
  slideAnim: Animated.Value;
  opacityAnim: Animated.Value;
  colors: any;
  activeRoute: string;
  onSelect: (name: string) => void;
}) {
  if (!visible) return null;
  return (
    <Animated.View style={[
      styles.calPanel,
      { backgroundColor: colors.card ?? colors.tabBar, borderColor: colors.tabBarBorder },
      { opacity: opacityAnim, transform: [{ translateY: slideAnim }] },
    ]}>
      {CALENDAR_SUBMENU.map((item, i) => {
        const isActive = activeRoute === item.name;
        return (
          <Pressable
            key={item.name}
            onPress={() => onSelect(item.name)}
            style={[styles.calItem, i < CALENDAR_SUBMENU.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.tabBarBorder }]}
          >
            <View style={[styles.calItemIcon, { backgroundColor: isActive ? `${colors.accent}22` : 'transparent' }]}>
              <Ionicons
                name={isActive ? item.icon : `${item.icon}-outline` as any}
                size={20}
                color={isActive ? colors.accent : colors.tabInactive}
              />
            </View>
            <Text style={[styles.calItemLabel, { color: isActive ? colors.accent : colors.text }]}>
              {item.label}
            </Text>
            {isActive && <View style={[styles.calActiveBar, { backgroundColor: colors.accent }]} />}
          </Pressable>
        );
      })}
    </Animated.View>
  );
}

// ─── Tab Item ─────────────────────────────────────────────────────────────────

function TabItem({
  route, isFocused, calExpanded, onPress, onLongPress,
}: {
  route: any;
  isFocused: boolean;
  calExpanded: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const { colors } = useTheme();
  const cfg = VISIBLE_TABS.find(t => t.name === route.name) ?? VISIBLE_TABS[0];
  const isUpload = route.name === 'Upload';
  const isSettings = route.name === 'Settings';
  const isCalendar = route.name === 'Calendar';

  const scale = useRef(new Animated.Value(1)).current;
  const pillOpacity = useRef(new Animated.Value(isFocused ? 1 : 0)).current;
  const pillScale = useRef(new Animated.Value(isFocused ? 1 : 0.6)).current;
  const iconRotate = useRef(new Animated.Value(0)).current;
  const labelOpacity = useRef(new Animated.Value(isFocused ? 1 : 0.55)).current;
  const fabRotate = useRef(new Animated.Value(0)).current;
  const fabPulse = usePulse(1, 1.06, 1200);
  const chevronRotate = useRef(new Animated.Value(0)).current;

  const isHighlighted = isCalendar ? (isFocused || calExpanded) : isFocused;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: isHighlighted ? 1.15 : 1, friction: 5, tension: 120, useNativeDriver: true }),
      Animated.timing(pillOpacity, { toValue: isHighlighted ? 1 : 0, duration: 200, useNativeDriver: true }),
      Animated.spring(pillScale, { toValue: isHighlighted ? 1 : 0.6, friction: 6, useNativeDriver: true }),
      Animated.timing(labelOpacity, { toValue: isHighlighted ? 1 : 0.55, duration: 200, useNativeDriver: true }),
      isSettings
        ? Animated.spring(iconRotate, { toValue: isFocused ? 1 : 0, friction: 5, useNativeDriver: true })
        : Animated.timing(iconRotate, { toValue: 0, duration: 1, useNativeDriver: true }),
      isUpload
        ? Animated.spring(fabRotate, { toValue: isFocused ? 1 : 0, friction: 5, useNativeDriver: true })
        : Animated.timing(fabRotate, { toValue: 0, duration: 1, useNativeDriver: true }),
    ]).start();
  }, [isHighlighted, isFocused]);

  useEffect(() => {
    if (isCalendar) {
      Animated.spring(chevronRotate, { toValue: calExpanded ? 1 : 0, friction: 6, useNativeDriver: true }).start();
    }
  }, [calExpanded]);

  const settingsRotate = iconRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const fabRotateDeg = fabRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] });
  const chevronDeg = chevronRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  if (isUpload) {
    return (
      <Pressable onPress={onPress} style={styles.uploadWrap}>
        <Animated.View style={[
          styles.uploadBtn,
          { backgroundColor: colors.accent, transform: [{ scale: Animated.multiply(scale, isFocused ? fabPulse : new Animated.Value(1)) }, { rotate: fabRotateDeg }] },
          isFocused && styles.uploadBtnActive,
        ]}>
          <Ionicons name="add" size={28} color="#ffffff" />
        </Animated.View>
        <Animated.Text style={[styles.uploadLabel, { color: isFocused ? colors.accent : colors.tabInactive, opacity: labelOpacity }]}>
          Upload
        </Animated.Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.tabItem}
      onPressIn={() => Animated.spring(scale, { toValue: 0.88, friction: 6, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: isHighlighted ? 1.15 : 1, friction: 5, useNativeDriver: true }).start()}
    >
      <Animated.View style={{ transform: [{ scale }], alignItems: 'center' }}>
        <Animated.View style={[styles.activePill, { backgroundColor: colors.tabActiveBg, opacity: pillOpacity, transform: [{ scale: pillScale }] }]} />
        <Animated.View style={{ transform: isSettings ? [{ rotate: settingsRotate }] : undefined }}>
          <Ionicons
            name={(isHighlighted ? cfg.iconActive : cfg.icon) as any}
            size={22}
            color={isHighlighted ? colors.tabActive : colors.tabInactive}
          />
        </Animated.View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <Animated.Text style={[styles.tabLabel, { color: isHighlighted ? colors.tabActive : colors.tabInactive, opacity: labelOpacity }]}>
            {cfg.label}
          </Animated.Text>
          {isCalendar && (
            <Animated.View style={{ transform: [{ rotate: chevronDeg }] }}>
              <Ionicons name="chevron-up" size={10} color={isHighlighted ? colors.tabActive : colors.tabInactive} />
            </Animated.View>
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
}

// ─── Custom Tab Bar ───────────────────────────────────────────────────────────

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const barEntrance = useRef(new Animated.Value(60)).current;
  const barOpacity = useRef(new Animated.Value(0)).current;

  const [calExpanded, setCalExpanded] = useState(false);
  const calSlide = useRef(new Animated.Value(16)).current;
  const calOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(barEntrance, { toValue: 0, friction: 7, tension: 80, useNativeDriver: true }),
      Animated.timing(barOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  function openCalendar() {
    setCalExpanded(true);
    calSlide.setValue(16);
    Animated.parallel([
      Animated.timing(calOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(calSlide, { toValue: 0, friction: 8, tension: 100, useNativeDriver: true }),
    ]).start();
  }

  function closeCalendar() {
    Animated.parallel([
      Animated.timing(calOpacity, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(calSlide, { toValue: 16, duration: 160, useNativeDriver: true }),
    ]).start(() => setCalExpanded(false));
  }

  function handleCalendarSubSelect(screenName: string) {
    closeCalendar();
    navigation.navigate(screenName as never);
  }

  const activeRoute = state.routes[state.index]?.name ?? '';

  const visibleRoutes = state.routes.filter(r => !HIDDEN_ROUTES.has(r.name));

  return (
    <View>
      {/* Backdrop — closes panel when tapping outside */}
      {calExpanded && (
        <Pressable style={styles.backdrop} onPress={closeCalendar} />
      )}

      <CalendarPanel
        visible={calExpanded}
        slideAnim={calSlide}
        opacityAnim={calOpacity}
        colors={colors}
        activeRoute={activeRoute}
        onSelect={handleCalendarSubSelect}
      />

      <Animated.View style={[
        styles.tabBar,
        { backgroundColor: colors.tabBar, borderTopColor: colors.tabBarBorder, paddingBottom: Math.max(insets.bottom, 8) },
        { transform: [{ translateY: barEntrance }], opacity: barOpacity },
      ]}>
        {visibleRoutes.map((route) => {
          const index = state.routes.indexOf(route);
          const isFocused = state.index === index;

          const onPress = () => {
            if (route.name === 'Calendar') {
              calExpanded ? closeCalendar() : openCalendar();
              return;
            }
            closeCalendar();
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name as never);
          };

          const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });

          return (
            <TabItem
              key={route.key}
              route={route}
              isFocused={isFocused}
              calExpanded={route.name === 'Calendar' ? calExpanded : false}
              onPress={onPress}
              onLongPress={onLongPress}
            />
          );
        })}
      </Animated.View>
    </View>
  );
}

// ─── Navigator ────────────────────────────────────────────────────────────────

export default function BottomTabNavigator() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={({ route }) => ({
        header: () => route.name !== 'Settings'
          ? <AppHeader title={route.name === 'Home' ? 'Dashboard' : route.name} />
          : null,
      })}
    >
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="Groups" component={GroupsScreen} />
      <Tab.Screen name="Upload" component={UploadScreen} />
      <Tab.Screen name="Calendar" component={CalendarScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Materials" component={MaterialsScreen} options={{ tabBarButton: () => null }} />
      <Tab.Screen name="Projects" component={ProjectsScreen} options={{ tabBarButton: () => null }} />
      <Tab.Screen name="Assignments" component={AssignmentsScreen} options={{ tabBarButton: () => null }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: { flexDirection: 'row', borderTopWidth: 1, paddingTop: 8 },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 4, position: 'relative' },
  activePill: {
    position: 'absolute', width: 48, height: 32,
    borderRadius: 16, top: -4,
  },
  tabLabel: { fontSize: 10, marginTop: 3, fontWeight: '600' },
  uploadWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 0 },
  uploadBtn: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
    marginTop: -16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22, shadowRadius: 8, elevation: 7,
  },
  uploadBtnActive: { shadowOpacity: 0.35, elevation: 10 },
  uploadLabel: { fontSize: 10, fontWeight: '600', marginTop: 3 },

  // Calendar sub-menu panel
  calPanel: {
    position: 'absolute',
    bottom: '100%',
    left: 16,
    right: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
    zIndex: 100,
  },
  calItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  calItemIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  calItemLabel: { fontSize: 15, fontWeight: '600', flex: 1 },
  calActiveBar: {
    width: 4, height: 20, borderRadius: 2,
  },

  // Backdrop
  backdrop: {
    position: 'absolute',
    top: -1000,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99,
  },
});
