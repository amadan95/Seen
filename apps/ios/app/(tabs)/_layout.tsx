import { Platform } from 'react-native';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { Tabs } from 'expo-router/js-tabs';
import { Icon, type IconName } from '../../src/components/Icon';
import { colors } from '../../src/design/tokens';
const tabs = [
  { name: 'index', label: 'Home', icon: 'home', sf: 'house' },
  { name: 'discover', label: 'Discover', icon: 'search', sf: 'magnifyingglass' },
  { name: 'rank', label: 'Rank', icon: 'rank', sf: 'list.number' },
  { name: 'watchlist', label: 'Watchlist', icon: 'watchlist', sf: 'bookmark' },
  { name: 'profile', label: 'Profile', icon: 'profile', sf: 'person.crop.circle' },
] as const;
export default function TabLayout() {
  if (Platform.OS === 'ios')
    return (
      <NativeTabs
        backgroundColor={colors.background}
        tintColor={colors.accent}
        iconColor={colors.muted}
        labelStyle={{ color: colors.muted, fontSize: 11 }}
      >
        {tabs.map((t) => (
          <NativeTabs.Trigger
            key={t.name}
            name={t.name}
            disableTransparentOnScrollEdge
            disableAutomaticContentInsets
          >
            <NativeTabs.Trigger.Label>{t.label}</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon sf={t.sf} />
          </NativeTabs.Trigger>
        ))}
      </NativeTabs>
    );
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          height: 68,
          paddingBottom: 10,
          paddingTop: 8,
        },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      {tabs.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.label,
            tabBarIcon: ({ color }) => (
              <Icon
                name={t.icon as IconName}
                color={typeof color === 'string' ? color : colors.muted}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
