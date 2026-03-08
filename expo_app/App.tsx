import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import * as Network from 'expo-network';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  AccessibilityInfo,
  Alert,
  Pressable,
  RefreshControl,
  Share,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialIcons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import {
  NavigationContainer,
  NavigationProp,
  useNavigation,
} from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  NativeStackScreenProps,
  createNativeStackNavigator,
} from '@react-navigation/native-stack';
import { Calendar, DateData } from 'react-native-calendars';
import * as Speech from 'expo-speech';

import {
  DEMO_PASSWORD,
  EVENTS,
  NEWS,
  RESOURCES,
  SOCIAL_CHANNELS,
  seededProfile,
} from './src/data/seed';
import { fetchFblaEventPdfs, FblaPdfLink } from './src/services/fblaPdfs';
import { searchFblaWebsite, SiteSearchResult } from './src/services/siteSearch';
import {
  cancelReminderNotification,
  scheduleReminderNotification,
  sendTestNotification,
  setupNotifications,
} from './src/services/notifications';
import { openSocialChannel } from './src/services/social';
import { getJson, removeKey, setJson, STORAGE_KEYS } from './src/services/storage';
import { emailError, nameError, passwordError } from './src/services/validation';
import {
  AccessibilitySettings,
  EventItem,
  MemberProfile,
  MemberSession,
  Reminder,
  Role,
} from './src/types';

type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  Profile: undefined;
  Resources: undefined;
  News: undefined;
  Social: undefined;
  Settings: undefined;
  EventDetail: { eventId: string };
  EventPdfs: undefined;
  WebsiteSearch: { query?: string } | undefined;
  SocialFeed: { channelId: string };
};

type MainTabParamList = {
  Home: undefined;
  Calendar: undefined;
  More: undefined;
};

type MenuRoute =
  | 'Profile'
  | 'Resources'
  | 'News'
  | 'Social'
  | 'Settings'
  | 'EventPdfs'
  | 'WebsiteSearch';

type ThemeId = 'atlas' | 'arctic' | 'ember' | 'mono';

type AppTheme = {
  id: ThemeId;
  name: string;
  bg: string;
  card: string;
  text: string;
  muted: string;
  border: string;
  accent: string;
  accentSoft: string;
  online: string;
  offline: string;
  blurTint: 'light' | 'dark';
};

const THEMES: AppTheme[] = [
  {
    id: 'atlas',
    name: 'Atlas',
    bg: '#EEF3F2',
    card: '#FFFFFF',
    text: '#0F303A',
    muted: '#4A6770',
    border: 'rgba(15,48,58,0.10)',
    accent: '#1D6C7F',
    accentSoft: 'rgba(29,108,127,0.14)',
    online: 'rgba(97,186,156,0.24)',
    offline: 'rgba(255,172,119,0.24)',
    blurTint: 'light',
  },
  {
    id: 'arctic',
    name: 'Arctic',
    bg: '#EDF2FA',
    card: '#FFFFFF',
    text: '#0D2A4F',
    muted: '#496484',
    border: 'rgba(13,42,79,0.10)',
    accent: '#2F6FE4',
    accentSoft: 'rgba(47,111,228,0.14)',
    online: 'rgba(82,169,247,0.22)',
    offline: 'rgba(255,182,137,0.24)',
    blurTint: 'light',
  },
  {
    id: 'ember',
    name: 'Ember',
    bg: '#F7F1EE',
    card: '#FFFFFF',
    text: '#3A2419',
    muted: '#76594D',
    border: 'rgba(58,36,25,0.10)',
    accent: '#C65B2A',
    accentSoft: 'rgba(198,91,42,0.15)',
    online: 'rgba(121,192,143,0.22)',
    offline: 'rgba(198,91,42,0.22)',
    blurTint: 'light',
  },
  {
    id: 'mono',
    name: 'Mono',
    bg: '#EFF0F2',
    card: '#FFFFFF',
    text: '#111214',
    muted: '#4A4D52',
    border: 'rgba(17,18,20,0.14)',
    accent: '#121519',
    accentSoft: 'rgba(18,21,25,0.12)',
    online: 'rgba(121,167,136,0.24)',
    offline: 'rgba(187,131,87,0.24)',
    blurTint: 'light',
  },
];

const ROLE_OPTIONS: Role[] = [
  'Competitor',
  'Chapter Officer',
  'Member',
  'Adviser Assistant',
];

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

export default function App() {
  const [booting, setBooting] = useState(true);
  const [session, setSession] = useState<MemberSession | null>(null);
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [themeId, setThemeId] = useState<ThemeId>('atlas');
  const [reminders, setReminders] = useState<Record<string, Reminder>>({});
  const [accessibility, setAccessibility] = useState<AccessibilitySettings>({
    highContrast: false,
    largeText: false,
    reduceMotion: false,
    readableFont: false,
    largerTouchTargets: false,
    voiceAssist: false,
  });
  const networkState = Network.useNetworkState();
  const isOnline = networkState.isConnected ?? true;

  useEffect(() => {
    const init = async () => {
      await setupNotifications();

      const savedSession = await getJson<MemberSession | null>(
        STORAGE_KEYS.session,
        null,
      );
      const savedProfile = await getJson<MemberProfile | null>(
        STORAGE_KEYS.profile,
        null,
      );
      const savedTheme = await getJson<ThemeId>(STORAGE_KEYS.theme, 'atlas');
      const savedReminders = await getJson<Record<string, Reminder>>(
        STORAGE_KEYS.reminders,
        {},
      );

      setThemeId(savedTheme);
      setSession(savedSession);
      setReminders(savedReminders);

      if (savedSession && savedProfile) {
        const hydratedProfile: MemberProfile = {
          ...savedProfile,
          reduceMotionEnabled: savedProfile.reduceMotionEnabled ?? false,
          readableFontEnabled: savedProfile.readableFontEnabled ?? false,
          largerTouchTargetsEnabled:
            savedProfile.largerTouchTargetsEnabled ?? false,
          voiceAssistEnabled: savedProfile.voiceAssistEnabled ?? false,
        };
        setProfile(hydratedProfile);
        setAccessibility({
          highContrast: hydratedProfile.highContrastEnabled,
          largeText: hydratedProfile.largeTextEnabled,
          reduceMotion: hydratedProfile.reduceMotionEnabled,
          readableFont: hydratedProfile.readableFontEnabled,
          largerTouchTargets: hydratedProfile.largerTouchTargetsEnabled,
          voiceAssist: hydratedProfile.voiceAssistEnabled,
        });
      } else if (savedSession) {
        const seeded = seededProfile(savedSession.memberId, savedSession.email);
        setProfile(seeded);
        await setJson(STORAGE_KEYS.profile, seeded);
      }

      setBooting(false);
    };
    void init();
  }, []);

  const theme = useMemo(
    () => resolveTheme(themeId, accessibility.highContrast),
    [themeId, accessibility.highContrast],
  );

  const login = async (email: string, password: string): Promise<string | null> => {
    const emailMessage = emailError(email);
    if (emailMessage) {
      return emailMessage;
    }
    const passwordMessage = passwordError(password);
    if (passwordMessage) {
      return passwordMessage;
    }
    if (password !== DEMO_PASSWORD) {
      return 'Demo password is incorrect.';
    }

    const normalized = email.trim().toLowerCase();
    const memberId = normalized.replace(/[^a-z0-9]/g, '_');
    const nextSession: MemberSession = {
      memberId,
      email: normalized,
      token: `expo-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const nextProfile = seededProfile(memberId, normalized);

    setSession(nextSession);
    setProfile(nextProfile);
    setAccessibility({
      highContrast: nextProfile.highContrastEnabled,
      largeText: nextProfile.largeTextEnabled,
      reduceMotion: nextProfile.reduceMotionEnabled,
      readableFont: nextProfile.readableFontEnabled,
      largerTouchTargets: nextProfile.largerTouchTargetsEnabled,
      voiceAssist: nextProfile.voiceAssistEnabled,
    });

    await setJson(STORAGE_KEYS.session, nextSession);
    await setJson(STORAGE_KEYS.profile, nextProfile);
    return null;
  };

  const logout = async () => {
    setSession(null);
    setProfile(null);
    await removeKey(STORAGE_KEYS.session);
  };

  const saveProfile = async (nextProfile: MemberProfile) => {
    setProfile(nextProfile);
    setAccessibility({
      highContrast: nextProfile.highContrastEnabled,
      largeText: nextProfile.largeTextEnabled,
      reduceMotion: nextProfile.reduceMotionEnabled,
      readableFont: nextProfile.readableFontEnabled,
      largerTouchTargets: nextProfile.largerTouchTargetsEnabled,
      voiceAssist: nextProfile.voiceAssistEnabled,
    });
    await setJson(STORAGE_KEYS.profile, nextProfile);
  };

  const saveTheme = async (nextThemeId: ThemeId) => {
    setThemeId(nextThemeId);
    await setJson(STORAGE_KEYS.theme, nextThemeId);
  };

  const saveAccessibility = async (next: AccessibilitySettings) => {
    setAccessibility(next);
    if (!profile) {
      return;
    }
    const updated: MemberProfile = {
      ...profile,
      highContrastEnabled: next.highContrast,
      largeTextEnabled: next.largeText,
      reduceMotionEnabled: next.reduceMotion,
      readableFontEnabled: next.readableFont,
      largerTouchTargetsEnabled: next.largerTouchTargets,
      voiceAssistEnabled: next.voiceAssist,
    };
    setProfile(updated);
    await setJson(STORAGE_KEYS.profile, updated);
  };

  const setReminder = async (
    event: EventItem,
    offsetMs: number,
  ): Promise<string> => {
    const reminderAt = new Date(new Date(event.startDate).getTime() - offsetMs);
    const notificationId = await scheduleReminderNotification({
      title: 'FBLA Reminder',
      body: `${event.title} at ${formatDateTime(event.startDate)}`,
      at: reminderAt,
    });

    const nextReminders: Record<string, Reminder> = {
      ...reminders,
      [event.id]: {
        eventId: event.id,
        scheduledAt: reminderAt.toISOString(),
        notificationId,
      },
    };

    setReminders(nextReminders);
    await setJson(STORAGE_KEYS.reminders, nextReminders);
    return notificationId;
  };

  const clearReminder = async (eventId: string) => {
    const existing = reminders[eventId];
    if (existing) {
      await cancelReminderNotification(existing.notificationId);
    }
    const nextReminders = { ...reminders };
    delete nextReminders[eventId];
    setReminders(nextReminders);
    await setJson(STORAGE_KEYS.reminders, nextReminders);
  };

  if (booting) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.accent} />
        <Text style={{ color: theme.muted, marginTop: 10 }}>
          Loading FBLA Atlas...
        </Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style={theme.id === 'mono' ? 'dark' : 'dark'} />
      <Stack.Navigator>
        {!session || !profile ? (
          <Stack.Screen name="Login" options={{ headerShown: false }}>
            {() => (
              <LoginScreen
                theme={theme}
                largeText={accessibility.largeText}
                onLogin={login}
              />
            )}
          </Stack.Screen>
        ) : (
          <>
            <Stack.Screen name="Main" options={{ headerShown: false }}>
              {() => (
                <MainTabs
                  theme={theme}
                  session={session}
                  reminders={reminders}
                  profile={profile}
                  isOnline={isOnline}
                  accessibility={accessibility}
                  onSetReminder={setReminder}
                  onClearReminder={clearReminder}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Profile" options={{ title: 'Profile' }}>
              {() => (
                <ProfileScreen
                  theme={theme}
                  profile={profile}
                  accessibility={accessibility}
                  onSaveProfile={saveProfile}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Resources" options={{ title: 'Resources' }}>
              {() => (
                <ResourcesScreen theme={theme} largeText={accessibility.largeText} />
              )}
            </Stack.Screen>
            <Stack.Screen name="News" options={{ title: 'News' }}>
              {() => (
                <NewsScreen
                  theme={theme}
                  largeText={accessibility.largeText}
                  isOnline={isOnline}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Social" options={{ title: 'Social' }}>
              {() => (
                <SocialScreen
                  theme={theme}
                  accessibility={accessibility}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="SocialFeed" options={{ title: 'Social Feed' }}>
              {(props) => (
                <SocialFeedScreen
                  {...props}
                  theme={theme}
                  accessibility={accessibility}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="EventPdfs" options={{ title: 'FBLA Event PDFs' }}>
              {() => (
                <EventPdfsScreen
                  theme={theme}
                  largeText={accessibility.largeText}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="WebsiteSearch" options={{ title: 'FBLA Website Search' }}>
              {(props) => (
                <WebsiteSearchScreen
                  {...props}
                  theme={theme}
                  accessibility={accessibility}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Settings" options={{ title: 'Settings' }}>
              {() => (
                <SettingsScreen
                  theme={theme}
                  profile={profile}
                  accessibility={accessibility}
                  themeId={themeId}
                  onSaveAccessibility={saveAccessibility}
                  onSaveTheme={saveTheme}
                  onSendTestNotification={sendTestNotification}
                  onLogout={logout}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="EventDetail" options={{ title: 'Event Detail' }}>
              {(props) => (
                <EventDetailScreen
                  {...props}
                  theme={theme}
                  reminders={reminders}
                  accessibility={accessibility}
                  onSetReminder={setReminder}
                  onClearReminder={clearReminder}
                />
              )}
            </Stack.Screen>
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

type MainTabsProps = {
  theme: AppTheme;
  session: MemberSession;
  profile: MemberProfile;
  reminders: Record<string, Reminder>;
  isOnline: boolean;
  accessibility: AccessibilitySettings;
  onSetReminder: (event: EventItem, offsetMs: number) => Promise<string>;
  onClearReminder: (eventId: string) => Promise<void>;
};

function MainTabs({
  theme,
  session,
  profile,
  reminders,
  isOnline,
  accessibility,
  onSetReminder,
  onClearReminder,
}: MainTabsProps) {
  const rootNavigation = useNavigation<NavigationProp<RootStackParamList>>();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: theme.bg },
        headerTintColor: theme.text,
        headerShadowVisible: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: 'absolute',
          left: 14,
          right: 14,
          bottom: 14,
          borderRadius: 18,
          borderTopWidth: 0,
          backgroundColor: 'transparent',
          height: 62,
          elevation: 0,
        },
        tabBarBackground: () => (
          <BlurView
            intensity={accessibility.reduceMotion ? 30 : 70}
            tint={theme.blurTint}
            style={[StyleSheet.absoluteFill, { borderRadius: 18, overflow: 'hidden' }]}
            experimentalBlurMethod="dimezisBlurView"
          />
        ),
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.muted,
        tabBarIcon: ({ color, size }) => (
          <MaterialIcons name={tabIcon(route.name)} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Home">
        {() => (
          <HomeScreen
            theme={theme}
            session={session}
            reminders={reminders}
            isOnline={isOnline}
            accessibility={accessibility}
          />
        )}
      </Tab.Screen>
      <Tab.Screen name="Calendar">
        {() => (
          <CalendarScreen
            theme={theme}
            reminders={reminders}
            largeText={accessibility.largeText}
            largerTargets={accessibility.largerTouchTargets}
            readableFont={accessibility.readableFont}
            onSetReminder={onSetReminder}
            onClearReminder={onClearReminder}
          />
        )}
      </Tab.Screen>
      <Tab.Screen name="More">
        {() => (
          <MoreScreen
            theme={theme}
            profile={profile}
            largeText={accessibility.largeText}
            onOpen={(route) => rootNavigation.navigate(route)}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

type LoginScreenProps = {
  theme: AppTheme;
  largeText: boolean;
  onLogin: (email: string, password: string) => Promise<string | null>;
};

function LoginScreen({ theme, largeText, onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState('member@fbla.org');
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const signIn = async () => {
    setPending(true);
    const message = await onLogin(email, password);
    setPending(false);
    setError(message);
  };

  return (
    <View style={[styles.center, { backgroundColor: theme.bg, padding: 20 }]}>
      <GlassCard theme={theme} style={{ width: '100%', maxWidth: 460 }}>
        <Text style={[styles.title, { color: theme.text, fontSize: scale(26, largeText) }]}>FBLA Atlas</Text>
        <Text style={{ color: theme.muted, fontSize: scale(13, largeText) }}>
          Minimal Expo build with calendar and live FBLA event docs.
        </Text>
        <InputField
          label="Email"
          value={email}
          keyboardType="email-address"
          onChangeText={setEmail}
          theme={theme}
          largeText={largeText}
        />
        <InputField
          label="Password"
          value={password}
          secureTextEntry
          onChangeText={setPassword}
          theme={theme}
          largeText={largeText}
        />
        <Text style={{ color: theme.muted, fontSize: scale(12, largeText) }}>
          Demo password: {DEMO_PASSWORD}
        </Text>
        {error ? <Text style={{ color: '#B3261E', fontWeight: '700' }}>{error}</Text> : null}
        <PrimaryButton
          label={pending ? 'Signing In...' : 'Sign In'}
          onPress={signIn}
          disabled={pending}
          theme={theme}
          largeText={largeText}
        />
      </GlassCard>
    </View>
  );
}

type HomeScreenProps = {
  theme: AppTheme;
  session: MemberSession;
  reminders: Record<string, Reminder>;
  isOnline: boolean;
  accessibility: AccessibilitySettings;
};

function HomeScreen({
  theme,
  session,
  reminders,
  isOnline,
  accessibility,
}: HomeScreenProps) {
  const largeText = accessibility.largeText;
  const nav = useNavigation<NavigationProp<RootStackParamList>>();
  const [query, setQuery] = useState('');
  const nextEvents = EVENTS.slice(0, 3);

  return (
    <Page theme={theme}>
      <GlassCard theme={theme}>
        <View style={[styles.statusRow, { backgroundColor: isOnline ? theme.online : theme.offline }]}>
          <MaterialIcons
            name={isOnline ? 'wifi' : 'wifi-off'}
            size={18}
            color={theme.text}
          />
          <Text style={{ color: theme.text, fontWeight: '700', fontSize: scale(12, largeText) }}>
            {isOnline ? 'Online mode active' : 'Offline mode active'}
          </Text>
        </View>
        <Text style={{ color: theme.text, fontSize: scale(20, largeText), fontWeight: '700' }}>
          Hello
        </Text>
        <Text style={{ color: theme.muted, fontSize: scale(13, largeText) }}>
          {session.email}
        </Text>
      </GlassCard>

      <View style={styles.metricRow}>
        <MetricCard
          theme={theme}
          label="Events"
          value={String(EVENTS.length)}
          largeText={largeText}
          readableFont={accessibility.readableFont}
        />
        <MetricCard
          theme={theme}
          label="Reminders"
          value={String(Object.keys(reminders).length)}
          largeText={largeText}
          readableFont={accessibility.readableFont}
        />
      </View>

      <GlassCard theme={theme}>
        <Text style={{ color: theme.text, fontWeight: '700', fontSize: scale(14, largeText) }}>
          Search All FBLA Website Content
        </Text>
        <InputField
          label="Search query"
          value={query}
          onChangeText={setQuery}
          theme={theme}
          largeText={largeText}
          readableFont={accessibility.readableFont}
        />
        <PrimaryButton
          label="Search FBLA Website"
          onPress={() => nav.navigate('WebsiteSearch', { query })}
          theme={theme}
          largeText={largeText}
          largerTargets={accessibility.largerTouchTargets}
          readableFont={accessibility.readableFont}
          disabled={!query.trim()}
        />
      </GlassCard>

      {nextEvents.map((event) => (
        <GlassCard key={event.id} theme={theme}>
          <Text style={{ color: theme.text, fontWeight: '700', fontSize: scale(15, largeText) }}>
            {event.title}
          </Text>
          <Text style={{ color: theme.muted, fontSize: scale(12, largeText) }}>
            {formatDateTime(event.startDate)} - {event.location}
          </Text>
        </GlassCard>
      ))}
    </Page>
  );
}

type CalendarScreenProps = {
  theme: AppTheme;
  reminders: Record<string, Reminder>;
  largeText: boolean;
  largerTargets: boolean;
  readableFont: boolean;
  onSetReminder: (event: EventItem, offsetMs: number) => Promise<string>;
  onClearReminder: (eventId: string) => Promise<void>;
};

function CalendarScreen({
  theme,
  reminders,
  largeText,
  largerTargets,
  readableFont,
  onSetReminder,
  onClearReminder,
}: CalendarScreenProps) {
  const nav = useNavigation<NavigationProp<RootStackParamList>>();
  const initial = toDayKey(new Date().toISOString());
  const [selectedDay, setSelectedDay] = useState(initial);

  const markedDates = useMemo(() => {
    const marks: Record<string, { marked?: boolean; dotColor?: string; selected?: boolean; selectedColor?: string }> = {};
    for (const event of EVENTS) {
      const key = toDayKey(event.startDate);
      marks[key] = {
        ...(marks[key] ?? {}),
        marked: true,
        dotColor: theme.accent,
      };
    }
    marks[selectedDay] = {
      ...(marks[selectedDay] ?? {}),
      selected: true,
      selectedColor: theme.accent,
    };
    return marks;
  }, [selectedDay, theme.accent]);

  const dayEvents = EVENTS.filter((event) => toDayKey(event.startDate) === selectedDay);

  const setEventReminder = async (event: EventItem, offsetMs: number) => {
    const notificationId = await onSetReminder(event, offsetMs);
    if (notificationId.startsWith('expo-go-fallback-')) {
      Alert.alert(
        'Reminder Saved',
        'Reminder saved locally. Expo Go cannot schedule full native notifications for this path.',
      );
      return;
    }
    Alert.alert('Reminder Saved', 'Notification reminder scheduled.');
  };

  return (
    <Page theme={theme}>
      <GlassCard theme={theme}>
        <Calendar
          current={selectedDay}
          markedDates={markedDates}
          onDayPress={(day: DateData) => setSelectedDay(day.dateString)}
          theme={{
            calendarBackground: 'transparent',
            textSectionTitleColor: theme.muted,
            dayTextColor: theme.text,
            monthTextColor: theme.text,
            textDisabledColor: '#A8AFB5',
            arrowColor: theme.accent,
            selectedDayBackgroundColor: theme.accent,
            selectedDayTextColor: '#FFFFFF',
            todayTextColor: theme.accent,
          }}
        />
      </GlassCard>

      {dayEvents.length === 0 ? (
        <GlassCard theme={theme}>
          <Text style={{ color: theme.muted, fontSize: scale(13, largeText) }}>
            No events on {selectedDay}.
          </Text>
        </GlassCard>
      ) : (
        dayEvents.map((event) => {
          const reminder = reminders[event.id];
          return (
            <GlassCard key={event.id} theme={theme}>
              <Text style={{ color: theme.text, fontWeight: '700', fontSize: scale(15, largeText) }}>
                {event.title}
              </Text>
              <Text style={{ color: theme.muted, fontSize: scale(12, largeText) }}>
                {formatDateTime(event.startDate)} - {formatTime(event.endDate)}
              </Text>
              <Text style={{ color: theme.text, fontSize: scale(13, largeText) }}>
                {event.description}
              </Text>
              <View style={styles.actions}>
                <SecondaryButton
                  label="Details"
                  onPress={() => nav.navigate('EventDetail', { eventId: event.id })}
                  theme={theme}
                  largeText={largeText}
                  largerTargets={largerTargets}
                  readableFont={readableFont}
                />
                {reminder ? (
                  <SecondaryButton
                    label="Remove Reminder"
                    onPress={() => onClearReminder(event.id)}
                    theme={theme}
                    largeText={largeText}
                    largerTargets={largerTargets}
                    readableFont={readableFont}
                  />
                ) : (
                  <>
                    <SecondaryButton
                      label="1 Day"
                      onPress={() => void setEventReminder(event, 24 * 60 * 60 * 1000)}
                      theme={theme}
                      largeText={largeText}
                      largerTargets={largerTargets}
                      readableFont={readableFont}
                    />
                    <SecondaryButton
                      label="2 Hours"
                      onPress={() => void setEventReminder(event, 2 * 60 * 60 * 1000)}
                      theme={theme}
                      largeText={largeText}
                      largerTargets={largerTargets}
                      readableFont={readableFont}
                    />
                  </>
                )}
              </View>
            </GlassCard>
          );
        })
      )}
    </Page>
  );
}

type MoreScreenProps = {
  theme: AppTheme;
  profile: MemberProfile;
  largeText: boolean;
  onOpen: (route: MenuRoute) => void;
};

function MoreScreen({ theme, profile, largeText, onOpen }: MoreScreenProps) {
  const items: Array<{ label: string; route: MenuRoute; icon: keyof typeof MaterialIcons.glyphMap }> = [
    { label: 'Profile', route: 'Profile', icon: 'badge' },
    { label: 'Website Search', route: 'WebsiteSearch', icon: 'search' },
    { label: 'Resources', route: 'Resources', icon: 'folder' },
    { label: 'News', route: 'News', icon: 'newspaper' },
    { label: 'Social', route: 'Social', icon: 'groups' },
    { label: 'FBLA Event PDFs', route: 'EventPdfs', icon: 'description' },
    { label: 'Settings', route: 'Settings', icon: 'settings' },
  ];

  return (
    <Page theme={theme}>
      <GlassCard theme={theme}>
        <Text style={{ color: theme.text, fontWeight: '700', fontSize: scale(18, largeText) }}>
          {profile.fullName}
        </Text>
        <Text style={{ color: theme.muted, fontSize: scale(12, largeText) }}>
          {profile.chapterRole}
        </Text>
      </GlassCard>
      {items.map((item) => (
        <Pressable key={item.label} onPress={() => onOpen(item.route)}>
          <GlassCard theme={theme}>
            <View style={styles.rowBetween}>
              <View style={styles.rowInline}>
                <MaterialIcons name={item.icon} size={20} color={theme.accent} />
                <Text style={{ color: theme.text, fontWeight: '600', fontSize: scale(14, largeText) }}>
                  {item.label}
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={theme.muted} />
            </View>
          </GlassCard>
        </Pressable>
      ))}
    </Page>
  );
}

type ProfileScreenProps = {
  theme: AppTheme;
  profile: MemberProfile;
  accessibility: AccessibilitySettings;
  onSaveProfile: (profile: MemberProfile) => Promise<void>;
};

function ProfileScreen({
  theme,
  profile,
  accessibility,
  onSaveProfile,
}: ProfileScreenProps) {
  const largeText = accessibility.largeText;
  const [name, setName] = useState(profile.fullName);
  const [email, setEmail] = useState(profile.email);
  const [role, setRole] = useState<Role>(profile.chapterRole);
  const [interests, setInterests] = useState(profile.interests.join(', '));
  const [highContrast, setHighContrast] = useState(profile.highContrastEnabled);
  const [largeTextMode, setLargeTextMode] = useState(profile.largeTextEnabled);

  useEffect(() => {
    setName(profile.fullName);
    setEmail(profile.email);
    setRole(profile.chapterRole);
    setInterests(profile.interests.join(', '));
    setHighContrast(profile.highContrastEnabled);
    setLargeTextMode(profile.largeTextEnabled);
  }, [profile]);

  const save = async () => {
    const nameMessage = nameError(name);
    if (nameMessage) {
      Alert.alert('Validation', nameMessage);
      return;
    }
    const emailMessage = emailError(email);
    if (emailMessage) {
      Alert.alert('Validation', emailMessage);
      return;
    }

    await onSaveProfile({
      ...profile,
      fullName: name.trim(),
      email: email.trim().toLowerCase(),
      chapterRole: role,
      interests: interests.split(',').map((item) => item.trim()).filter(Boolean),
      highContrastEnabled: highContrast,
      largeTextEnabled: largeTextMode,
    });

    Alert.alert('Profile', 'Profile updated.');
  };

  return (
    <Page theme={theme}>
      <GlassCard theme={theme}>
        <InputField
          label="Full Name"
          value={name}
          onChangeText={setName}
          theme={theme}
          largeText={largeText}
          readableFont={accessibility.readableFont}
        />
        <InputField
          label="Email"
          value={email}
          keyboardType="email-address"
          onChangeText={setEmail}
          theme={theme}
          largeText={largeText}
          readableFont={accessibility.readableFont}
        />
        <Text style={{ color: theme.text, fontWeight: '600', fontSize: scale(12, largeText) }}>
          Chapter Role
        </Text>
        <View style={styles.pills}>
          {ROLE_OPTIONS.map((option) => (
            <Pill
              key={option}
              title={option}
              selected={role === option}
              onPress={() => setRole(option)}
              theme={theme}
              largeText={largeText}
            />
          ))}
        </View>
        <InputField
          label="Interests (comma-separated)"
          value={interests}
          onChangeText={setInterests}
          theme={theme}
          largeText={largeText}
          readableFont={accessibility.readableFont}
        />
        <ToggleRow
          label="High contrast mode"
          value={highContrast}
          onValueChange={setHighContrast}
          theme={theme}
          largeText={largeText}
          largerTargets={accessibility.largerTouchTargets}
          readableFont={accessibility.readableFont}
        />
        <ToggleRow
          label="Large text mode"
          value={largeTextMode}
          onValueChange={setLargeTextMode}
          theme={theme}
          largeText={largeText}
          largerTargets={accessibility.largerTouchTargets}
          readableFont={accessibility.readableFont}
        />
        <PrimaryButton
          label="Save Profile"
          onPress={save}
          theme={theme}
          largeText={largeText}
          largerTargets={accessibility.largerTouchTargets}
          readableFont={accessibility.readableFont}
        />
      </GlassCard>
    </Page>
  );
}

type EventDetailScreenProps = NativeStackScreenProps<RootStackParamList, 'EventDetail'> & {
  theme: AppTheme;
  reminders: Record<string, Reminder>;
  accessibility: AccessibilitySettings;
  onSetReminder: (event: EventItem, offsetMs: number) => Promise<string>;
  onClearReminder: (eventId: string) => Promise<void>;
};

function EventDetailScreen({
  route,
  theme,
  reminders,
  accessibility,
  onSetReminder,
  onClearReminder,
}: EventDetailScreenProps) {
  const largeText = accessibility.largeText;
  const event = EVENTS.find((item) => item.id === route.params.eventId);
  if (!event) {
    return (
      <Page theme={theme}>
        <GlassCard theme={theme}>
          <Text style={{ color: theme.text }}>Event not found.</Text>
        </GlassCard>
      </Page>
    );
  }
  const reminder = reminders[event.id];

  return (
    <Page theme={theme}>
      <GlassCard theme={theme}>
        <Text style={{ color: theme.text, fontWeight: '700', fontSize: scale(22, largeText) }}>
          {event.title}
        </Text>
        <Text style={{ color: theme.muted, fontSize: scale(13, largeText) }}>
          {formatDateTime(event.startDate)} - {formatDateTime(event.endDate)}
        </Text>
        <Text style={{ color: theme.muted, fontSize: scale(13, largeText) }}>
          {event.location}
        </Text>
        <Text style={{ color: theme.text, fontSize: scale(14, largeText) }}>
          {event.description}
        </Text>
        <SecondaryButton
          label="Read Event Aloud"
          onPress={() => {
            if (!accessibility.voiceAssist) {
              Alert.alert(
                'Voice Assist Disabled',
                'Enable Voice Assist in Settings to use read-aloud.',
              );
              return;
            }
            const message =
              `${event.title}. ${event.description}. ` +
              `Starts ${formatDateTime(event.startDate)} at ${event.location}.`;
            Speech.stop();
            Speech.speak(message);
            AccessibilityInfo.announceForAccessibility(
              'Reading event details aloud.',
            );
          }}
          theme={theme}
          largeText={largeText}
          largerTargets={accessibility.largerTouchTargets}
          readableFont={accessibility.readableFont}
        />
        {reminder ? (
          <SecondaryButton
            label="Remove Reminder"
            onPress={() => onClearReminder(event.id)}
            theme={theme}
            largeText={largeText}
            largerTargets={accessibility.largerTouchTargets}
            readableFont={accessibility.readableFont}
          />
        ) : (
          <PrimaryButton
            label="Set Reminder (2 Hours Before)"
            onPress={() => void onSetReminder(event, 2 * 60 * 60 * 1000)}
            theme={theme}
            largeText={largeText}
            largerTargets={accessibility.largerTouchTargets}
            readableFont={accessibility.readableFont}
          />
        )}
      </GlassCard>
    </Page>
  );
}

function ResourcesScreen({ theme, largeText }: { theme: AppTheme; largeText: boolean }) {
  const open = async (url: string) => {
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      Alert.alert('Link', 'Unable to open this resource.');
      return;
    }
    await Linking.openURL(url);
  };

  return (
    <Page theme={theme}>
      {RESOURCES.map((resource) => (
        <GlassCard key={resource.id} theme={theme}>
          <Text style={{ color: theme.text, fontWeight: '700', fontSize: scale(16, largeText) }}>
            {resource.title}
          </Text>
          <Text style={{ color: theme.muted, fontSize: scale(12, largeText) }}>
            {resource.category} - {resource.offlineAvailable ? 'Offline Ready' : 'Online Link'}
          </Text>
          <Text style={{ color: theme.text, fontSize: scale(13, largeText) }}>
            {resource.description}
          </Text>
          <SecondaryButton
            label="Open"
            onPress={() => void open(resource.url)}
            theme={theme}
            largeText={largeText}
          />
        </GlassCard>
      ))}
    </Page>
  );
}

function NewsScreen({
  theme,
  largeText,
  isOnline,
}: {
  theme: AppTheme;
  largeText: boolean;
  isOnline: boolean;
}) {
  return (
    <Page theme={theme}>
      {!isOnline ? (
        <GlassCard theme={theme}>
          <Text style={{ color: theme.text, fontWeight: '600', fontSize: scale(12, largeText) }}>
            Offline mode: showing local news feed.
          </Text>
        </GlassCard>
      ) : null}
      {NEWS.map((item) => (
        <GlassCard key={item.id} theme={theme}>
          <Text style={{ color: theme.text, fontWeight: '700', fontSize: scale(16, largeText) }}>
            {item.title}
          </Text>
          <Text style={{ color: theme.muted, fontSize: scale(12, largeText) }}>
            {item.category} - {formatDate(item.publishedAt)}
          </Text>
          <Text style={{ color: theme.text, fontSize: scale(13, largeText) }}>
            {item.body}
          </Text>
          <Text style={{ color: theme.muted, fontSize: scale(12, largeText) }}>
            Source: {item.source}
          </Text>
        </GlassCard>
      ))}
    </Page>
  );
}

function SocialScreen({
  theme,
  accessibility,
}: {
  theme: AppTheme;
  accessibility: AccessibilitySettings;
}) {
  const largeText = accessibility.largeText;
  const nav = useNavigation<NavigationProp<RootStackParamList>>();

  const open = async (channelId: string) => {
    const channel = SOCIAL_CHANNELS.find((item) => item.id === channelId);
    if (!channel) {
      Alert.alert('Social', 'Channel not found.');
      return;
    }
    const result = await openSocialChannel(channel.appUri, channel.webUri);
    if (result === 'openedApp') {
      Alert.alert('Social', `Opened ${channel.platform} app.`);
      return;
    }
    if (result === 'openedWeb') {
      Alert.alert('Social', 'App unavailable, opened web fallback.');
      return;
    }
    Alert.alert('Social', `Unable to open ${channel.platform}.`);
  };

  return (
    <Page theme={theme}>
      {SOCIAL_CHANNELS.map((channel) => (
        <GlassCard key={channel.id} theme={theme}>
          <Text style={{ color: theme.text, fontWeight: '700', fontSize: scale(16, largeText) }}>
            {channel.platform}
          </Text>
          <Text style={{ color: theme.muted, fontSize: scale(12, largeText) }}>
            {channel.handle}
          </Text>
          <Text style={{ color: theme.text, fontSize: scale(13, largeText) }}>
            {channel.description}
          </Text>
          <View style={styles.actions}>
            <SecondaryButton
              label="Open App/Web"
              onPress={() => void open(channel.id)}
              theme={theme}
              largeText={largeText}
              largerTargets={accessibility.largerTouchTargets}
              readableFont={accessibility.readableFont}
            />
            <SecondaryButton
              label="In-App Feed"
              onPress={() => nav.navigate('SocialFeed', { channelId: channel.id })}
              theme={theme}
              largeText={largeText}
              largerTargets={accessibility.largerTouchTargets}
              readableFont={accessibility.readableFont}
            />
            <SecondaryButton
              label="Share"
              onPress={() =>
                void Share.share({
                  message: `${channel.platform} ${channel.handle} - ${channel.webUri}`,
                })
              }
              theme={theme}
              largeText={largeText}
              largerTargets={accessibility.largerTouchTargets}
              readableFont={accessibility.readableFont}
            />
          </View>
        </GlassCard>
      ))}
    </Page>
  );
}

function SocialFeedScreen({
  route,
  theme,
  accessibility,
}: NativeStackScreenProps<RootStackParamList, 'SocialFeed'> & {
  theme: AppTheme;
  accessibility: AccessibilitySettings;
}) {
  const channel = SOCIAL_CHANNELS.find((item) => item.id === route.params.channelId);
  if (!channel) {
    return (
      <Page theme={theme}>
        <GlassCard theme={theme}>
          <Text style={{ color: theme.text }}>Social channel not found.</Text>
        </GlassCard>
      </Page>
    );
  }

  const uri = channel.feedUri ?? channel.webUri;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <GlassCard theme={theme} style={{ margin: 14 }}>
        <View style={styles.rowBetween}>
          <View>
            <Text
              style={{
                color: theme.text,
                fontWeight: '700',
                fontSize: scale(16, accessibility.largeText),
              }}
            >
              {channel.platform}
            </Text>
            <Text style={{ color: theme.muted, fontSize: scale(12, accessibility.largeText) }}>
              {channel.handle}
            </Text>
          </View>
          <SecondaryButton
            label="Open External"
            onPress={() => void Linking.openURL(channel.webUri)}
            theme={theme}
            largeText={accessibility.largeText}
            largerTargets={accessibility.largerTouchTargets}
          />
        </View>
      </GlassCard>
      <View style={{ flex: 1, marginHorizontal: 14, marginBottom: 14, overflow: 'hidden', borderRadius: 16 }}>
        <WebView source={{ uri }} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

type SettingsScreenProps = {
  theme: AppTheme;
  profile: MemberProfile;
  accessibility: AccessibilitySettings;
  themeId: ThemeId;
  onSaveAccessibility: (settings: AccessibilitySettings) => Promise<void>;
  onSaveTheme: (themeId: ThemeId) => Promise<void>;
  onSendTestNotification: () => Promise<void>;
  onLogout: () => Promise<void>;
};

function SettingsScreen({
  theme,
  profile,
  accessibility,
  themeId,
  onSaveAccessibility,
  onSaveTheme,
  onSendTestNotification,
  onLogout,
}: SettingsScreenProps) {
  const largeText = accessibility.largeText;
  const [highContrast, setHighContrast] = useState(accessibility.highContrast);
  const [largeTextMode, setLargeTextMode] = useState(accessibility.largeText);
  const [reduceMotion, setReduceMotion] = useState(accessibility.reduceMotion);
  const [readableFont, setReadableFont] = useState(accessibility.readableFont);
  const [largerTouchTargets, setLargerTouchTargets] = useState(
    accessibility.largerTouchTargets,
  );
  const [voiceAssist, setVoiceAssist] = useState(accessibility.voiceAssist);
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>(themeId);

  useEffect(() => {
    setHighContrast(accessibility.highContrast);
    setLargeTextMode(accessibility.largeText);
    setReduceMotion(accessibility.reduceMotion);
    setReadableFont(accessibility.readableFont);
    setLargerTouchTargets(accessibility.largerTouchTargets);
    setVoiceAssist(accessibility.voiceAssist);
  }, [
    accessibility.highContrast,
    accessibility.largeText,
    accessibility.reduceMotion,
    accessibility.readableFont,
    accessibility.largerTouchTargets,
    accessibility.voiceAssist,
  ]);

  useEffect(() => {
    setSelectedTheme(themeId);
  }, [themeId]);

  const save = async () => {
    await onSaveAccessibility({
      highContrast,
      largeText: largeTextMode,
      reduceMotion,
      readableFont,
      largerTouchTargets,
      voiceAssist,
    });
    await onSaveTheme(selectedTheme);
    Alert.alert('Settings', 'Preferences saved.');
  };

  return (
    <Page theme={theme}>
      <GlassCard theme={theme}>
        <Text style={{ color: theme.text, fontWeight: '700', fontSize: scale(17, largeText) }}>
          Theme
        </Text>
        <View style={styles.pills}>
          {THEMES.map((candidate) => (
            <Pill
              key={candidate.id}
              title={candidate.name}
              selected={selectedTheme === candidate.id}
              onPress={() => setSelectedTheme(candidate.id)}
              theme={theme}
              largeText={largeText}
            />
          ))}
        </View>
      </GlassCard>

      <GlassCard theme={theme}>
        <Text style={{ color: theme.text, fontWeight: '700', fontSize: scale(17, largeText) }}>
          Accessibility
        </Text>
        <ToggleRow
          label="High contrast mode"
          value={highContrast}
          onValueChange={setHighContrast}
          theme={theme}
          largeText={largeText}
          largerTargets={largerTouchTargets}
          readableFont={readableFont}
        />
        <ToggleRow
          label="Large text mode"
          value={largeTextMode}
          onValueChange={setLargeTextMode}
          theme={theme}
          largeText={largeText}
          largerTargets={largerTouchTargets}
          readableFont={readableFont}
        />
        <ToggleRow
          label="Readable font mode"
          value={readableFont}
          onValueChange={setReadableFont}
          theme={theme}
          largeText={largeText}
          largerTargets={largerTouchTargets}
          readableFont={readableFont}
        />
        <ToggleRow
          label="Larger touch targets"
          value={largerTouchTargets}
          onValueChange={setLargerTouchTargets}
          theme={theme}
          largeText={largeText}
          largerTargets={largerTouchTargets}
          readableFont={readableFont}
        />
        <ToggleRow
          label="Voice assist"
          value={voiceAssist}
          onValueChange={setVoiceAssist}
          theme={theme}
          largeText={largeText}
          largerTargets={largerTouchTargets}
          readableFont={readableFont}
        />
        <ToggleRow
          label="Reduce motion effects"
          value={reduceMotion}
          onValueChange={setReduceMotion}
          theme={theme}
          largeText={largeText}
          largerTargets={largerTouchTargets}
          readableFont={readableFont}
        />
        <PrimaryButton
          label="Save Preferences"
          onPress={save}
          theme={theme}
          largeText={largeText}
          largerTargets={largerTouchTargets}
          readableFont={readableFont}
        />
      </GlassCard>

      <GlassCard theme={theme}>
        <Text style={{ color: theme.muted, fontSize: scale(12, largeText) }}>
          Signed in as {profile.email}
        </Text>
        <SecondaryButton
          label="Send Test Notification"
          onPress={() => void onSendTestNotification()}
          theme={theme}
          largeText={largeText}
          largerTargets={largerTouchTargets}
          readableFont={readableFont}
        />
        <SecondaryButton
          label="Sign Out"
          onPress={() => void onLogout()}
          theme={theme}
          largeText={largeText}
          largerTargets={largerTouchTargets}
          readableFont={readableFont}
        />
      </GlassCard>
    </Page>
  );
}

function EventPdfsScreen({ theme, largeText }: { theme: AppTheme; largeText: boolean }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [links, setLinks] = useState<FblaPdfLink[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async (isRefresh: boolean) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const next = await fetchFblaEventPdfs();
      setLinks(next);
      if (next.length === 0) {
        setError('No PDFs found from FBLA pages right now.');
      }
    } catch {
      setError('Unable to fetch FBLA event PDFs.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void load(false);
  }, []);

  const grouped = useMemo(() => {
    const map: Record<string, FblaPdfLink[]> = {};
    for (const link of links) {
      map[link.division] = [...(map[link.division] ?? []), link];
    }
    return map;
  }, [links]);

  const open = async (url: string) => {
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      Alert.alert('PDF', 'Unable to open this PDF link.');
      return;
    }
    await Linking.openURL(url);
  };

  if (loading) {
    return (
      <Page theme={theme}>
        <GlassCard theme={theme}>
          <View style={styles.rowInline}>
            <ActivityIndicator size="small" color={theme.accent} />
            <Text style={{ color: theme.muted }}>Fetching FBLA event PDFs...</Text>
          </View>
        </GlassCard>
      </Page>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={styles.page}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}
    >
      {error ? (
        <GlassCard theme={theme}>
          <Text style={{ color: '#B3261E', fontWeight: '700' }}>{error}</Text>
        </GlassCard>
      ) : null}
      {Object.entries(grouped).map(([division, items]) => (
        <GlassCard key={division} theme={theme}>
          <Text style={{ color: theme.text, fontWeight: '700', fontSize: scale(16, largeText) }}>
            {division}
          </Text>
          {items.map((item) => (
            <Pressable key={item.id} onPress={() => void open(item.url)}>
              <View style={styles.pdfRow}>
                <MaterialIcons name="picture-as-pdf" size={20} color={theme.accent} />
                <Text style={{ color: theme.text, flex: 1, fontSize: scale(13, largeText) }}>
                  {item.title}
                </Text>
              </View>
            </Pressable>
          ))}
        </GlassCard>
      ))}
    </ScrollView>
  );
}

function WebsiteSearchScreen({
  route,
  theme,
  accessibility,
}: NativeStackScreenProps<RootStackParamList, 'WebsiteSearch'> & {
  theme: AppTheme;
  accessibility: AccessibilitySettings;
}) {
  const initialQuery = route.params?.query ?? '';
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SiteSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSearch = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setResults([]);
      setSearched(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const next = await searchFblaWebsite(trimmed);
      setResults(next);
      AccessibilityInfo.announceForAccessibility(
        `${next.length} website results loaded.`,
      );
      if (next.length === 0) {
        setError('No results found from FBLA domains for that query.');
      }
    } catch {
      setError('Website search is currently unavailable.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuery.trim()) {
      void runSearch(initialQuery);
    }
  }, [initialQuery]);

  return (
    <Page theme={theme}>
      <GlassCard theme={theme}>
        <Text style={{ color: theme.text, fontWeight: '700', fontSize: scale(16, accessibility.largeText) }}>
          Search Entire FBLA Website
        </Text>
        <InputField
          label="Search all FBLA pages"
          value={query}
          onChangeText={setQuery}
          theme={theme}
          largeText={accessibility.largeText}
          readableFont={accessibility.readableFont}
        />
        <PrimaryButton
          label={loading ? 'Searching...' : 'Search'}
          onPress={() => void runSearch(query)}
          disabled={loading || !query.trim()}
          theme={theme}
          largeText={accessibility.largeText}
          largerTargets={accessibility.largerTouchTargets}
          readableFont={accessibility.readableFont}
        />
      </GlassCard>
      {loading ? (
        <GlassCard theme={theme}>
          <View style={styles.rowInline}>
            <ActivityIndicator size="small" color={theme.accent} />
            <Text style={{ color: theme.muted, fontSize: scale(13, accessibility.largeText) }}>
              Searching FBLA website content...
            </Text>
          </View>
        </GlassCard>
      ) : null}
      {error ? (
        <GlassCard theme={theme}>
          <Text style={{ color: '#B3261E', fontWeight: '700' }}>{error}</Text>
        </GlassCard>
      ) : null}
      {!searched && !loading ? (
        <GlassCard theme={theme}>
          <Text style={{ color: theme.muted, fontSize: scale(13, accessibility.largeText) }}>
            Enter a query to search FBLA website pages, event docs, and resources.
          </Text>
        </GlassCard>
      ) : null}
      {results.map((result) => (
        <Pressable
          key={result.id}
          onPress={() => void Linking.openURL(result.url)}
          accessibilityRole="button"
          accessibilityLabel={`Open website result ${result.title}`}
          accessibilityHint="Opens the result in your browser."
        >
          <GlassCard theme={theme}>
            <Text style={{ color: theme.text, fontWeight: '700', fontSize: scale(14, accessibility.largeText) }}>
              {result.title}
            </Text>
            <Text style={{ color: theme.muted, fontSize: scale(12, accessibility.largeText) }}>
              {result.url}
            </Text>
            <Text style={{ color: theme.text, fontSize: scale(12, accessibility.largeText) }}>
              {result.snippet}
            </Text>
          </GlassCard>
        </Pressable>
      ))}
    </Page>
  );
}

function Page({ theme, children }: { theme: AppTheme; children: React.ReactNode }) {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={styles.page}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

function GlassCard({
  theme,
  children,
  style,
}: {
  theme: AppTheme;
  children: React.ReactNode;
  style?: object;
}) {
  return (
    <View style={[styles.glassWrap, { borderColor: theme.border }, style]}>
      <BlurView
        intensity={42}
        tint={theme.blurTint}
        style={StyleSheet.absoluteFill}
        experimentalBlurMethod="dimezisBlurView"
      />
      <View style={[styles.glassInner, { backgroundColor: theme.accentSoft }]}>
        {children}
      </View>
    </View>
  );
}

function InputField({
  label,
  value,
  onChangeText,
  theme,
  largeText,
  readableFont = false,
  secureTextEntry,
  keyboardType = 'default',
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  theme: AppTheme;
  largeText: boolean;
  readableFont?: boolean;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
}) {
  return (
    <View style={{ gap: 4 }}>
      <Text
        style={[
          { color: theme.text, fontWeight: '600', fontSize: scale(12, largeText) },
          readableFont && styles.readableFont,
        ]}
      >
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
        style={[
          styles.input,
          {
            borderColor: theme.border,
            color: theme.text,
            backgroundColor: theme.card,
            fontSize: scale(13, largeText),
          },
          readableFont && styles.readableFont,
        ]}
        placeholderTextColor={theme.muted}
        accessibilityLabel={label}
      />
    </View>
  );
}

function PrimaryButton({
  label,
  onPress,
  disabled,
  theme,
  largeText,
  largerTargets = false,
  readableFont = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  theme: AppTheme;
  largeText: boolean;
  largerTargets?: boolean;
  readableFont?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={[
        styles.primaryButton,
        { backgroundColor: theme.accent },
        largerTargets && styles.largerButton,
        disabled && styles.disabled,
      ]}
    >
      <Text
        style={[
          {
            color: '#FFFFFF',
            fontWeight: '700',
            fontSize: scale(13, largeText),
          },
          readableFont && styles.readableFont,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function SecondaryButton({
  label,
  onPress,
  theme,
  largeText,
  largerTargets = false,
  readableFont = false,
}: {
  label: string;
  onPress: () => void;
  theme: AppTheme;
  largeText: boolean;
  largerTargets?: boolean;
  readableFont?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.secondaryButton,
        { borderColor: theme.border, backgroundColor: theme.card },
        largerTargets && styles.largerButton,
      ]}
    >
      <Text
        style={[
          { color: theme.text, fontWeight: '600', fontSize: scale(12, largeText) },
          readableFont && styles.readableFont,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Pill({
  title,
  selected,
  onPress,
  theme,
  largeText,
}: {
  title: string;
  selected: boolean;
  onPress: () => void;
  theme: AppTheme;
  largeText: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ selected }}
      style={[
        styles.pill,
        {
          borderColor: selected ? theme.accent : theme.border,
          backgroundColor: selected ? theme.accentSoft : theme.card,
        },
      ]}
    >
      <Text style={{ color: theme.text, fontSize: scale(12, largeText) }}>{title}</Text>
    </Pressable>
  );
}

function ToggleRow({
  label,
  value,
  onValueChange,
  theme,
  largeText,
  largerTargets = false,
  readableFont = false,
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  theme: AppTheme;
  largeText: boolean;
  largerTargets?: boolean;
  readableFont?: boolean;
}) {
  return (
    <View style={[styles.rowBetween, styles.toggleRow, largerTargets && styles.largerToggleRow]}>
      <Text
        style={[
          { color: theme.text, fontSize: scale(13, largeText) },
          readableFont && styles.readableFont,
        ]}
      >
        {label}
      </Text>
      <Switch value={value} onValueChange={onValueChange} accessibilityLabel={label} />
    </View>
  );
}

function MetricCard({
  theme,
  label,
  value,
  largeText,
  readableFont = false,
}: {
  theme: AppTheme;
  label: string;
  value: string;
  largeText: boolean;
  readableFont?: boolean;
}) {
  return (
    <View style={[styles.metricCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
      <Text
        style={[
          { color: theme.muted, fontSize: scale(12, largeText) },
          readableFont && styles.readableFont,
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          { color: theme.text, fontWeight: '800', fontSize: scale(21, largeText) },
          readableFont && styles.readableFont,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function tabIcon(routeName: keyof MainTabParamList): keyof typeof MaterialIcons.glyphMap {
  switch (routeName) {
    case 'Home':
      return 'home';
    case 'Calendar':
      return 'calendar-month';
    case 'More':
      return 'grid-view';
    default:
      return 'circle';
  }
}

function resolveTheme(themeId: ThemeId, highContrast: boolean): AppTheme {
  const base = THEMES.find((item) => item.id === themeId) ?? THEMES[0];
  if (!highContrast) {
    return base;
  }
  return {
    ...base,
    bg: '#FFFFFF',
    card: '#FFFFFF',
    text: '#000000',
    muted: '#1C1C1C',
    border: '#000000',
    accent: '#000000',
    accentSoft: 'rgba(0,0,0,0.06)',
    blurTint: 'light',
  };
}

function toDayKey(isoDate: string): string {
  return isoDate.slice(0, 10);
}

function formatDateTime(isoDate: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(isoDate));
}

function formatTime(isoDate: string): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(isoDate));
}

function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(isoDate));
}

function scale(value: number, largeText: boolean): number {
  return largeText ? Math.round(value * 1.12) : value;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  page: {
    padding: 14,
    gap: 10,
    paddingBottom: 90,
  },
  glassWrap: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  glassInner: {
    gap: 8,
    padding: 12,
  },
  title: {
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  primaryButton: {
    borderRadius: 11,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    borderWidth: 1,
    borderRadius: 11,
    paddingVertical: 9,
    paddingHorizontal: 11,
  },
  largerButton: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  readableFont: {
    fontFamily: 'monospace',
  },
  disabled: {
    opacity: 0.58,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusRow: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    gap: 4,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  toggleRow: {
    minHeight: 38,
  },
  largerToggleRow: {
    minHeight: 46,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  pdfRow: {
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
