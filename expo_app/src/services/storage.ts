import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEYS = {
  session: 'atlas.session',
  profile: 'atlas.profile',
  reminders: 'atlas.reminders',
  theme: 'atlas.theme',
};

export async function getJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) {
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function setJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function removeKey(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}
