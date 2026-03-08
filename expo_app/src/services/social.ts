import * as Linking from 'expo-linking';

export type SocialOpenResult = 'openedApp' | 'openedWeb' | 'failed';

export async function openSocialChannel(appUri: string, webUri: string): Promise<SocialOpenResult> {
  try {
    const canOpenApp = await Linking.canOpenURL(appUri);
    if (canOpenApp) {
      await Linking.openURL(appUri);
      return 'openedApp';
    }

    const canOpenWeb = await Linking.canOpenURL(webUri);
    if (canOpenWeb) {
      await Linking.openURL(webUri);
      return 'openedWeb';
    }

    return 'failed';
  } catch {
    return 'failed';
  }
}
