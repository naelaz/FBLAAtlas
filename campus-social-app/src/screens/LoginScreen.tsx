import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { LinearGradient } from "expo-linear-gradient";
import { Eye, EyeOff, Mail, Shield, UserRound } from "lucide-react-native";
import {
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import React, { useMemo, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import * as Google from "expo-auth-session/providers/google";

import { AppLogo } from "../components/branding/AppLogo";
import { Badge } from "../components/ui/badge";
import { GlassButton } from "../components/ui/GlassButton";
import { GlassInput } from "../components/ui/GlassInput";
import { GlassSegmentedControl } from "../components/ui/GlassSegmentedControl";
import { GlassSurface } from "../components/ui/GlassSurface";
import { auth, db } from "../config/firebase";
import { useAuthContext } from "../context/AuthContext";
import { useOnboarding } from "../context/OnboardingContext";
import { useThemeContext } from "../context/ThemeContext";
import { createDefaultUserProfile, getUserProfileOnce } from "../services/userService";
import { hapticTap } from "../services/haptics";

WebBrowser.maybeCompleteAuthSession();

type FormMode = "signin" | "signup";
const ADMIN_EMAIL = "admin@fblaatlas.com";
const ADMIN_LOGIN_PASSWORD = "Admin";
const ADMIN_AUTH_PASSWORD = "Admin2026";

type ProfileSetupFields = {
  displayName: string;
  schoolName: string;
  state: string;
  graduationYear: string;
  chapterName?: string;
  membershipId?: string | null;
};

function slugFromSchool(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
  if (!normalized) {
    return "fbla-atlas";
  }
  return normalized.replace(/(^-|-$)/g, "");
}

function parseFbConnectUrl(url: string): { token: string | null; chapterName: string | null; state: string | null; membershipId: string | null } {
  try {
    const parsed = new URL(url);
    return {
      token: parsed.searchParams.get("token") ?? parsed.searchParams.get("session") ?? parsed.searchParams.get("code"),
      chapterName: parsed.searchParams.get("chapter") ?? parsed.searchParams.get("chapterName"),
      state: parsed.searchParams.get("state"),
      membershipId: parsed.searchParams.get("membershipId") ?? parsed.searchParams.get("member"),
    };
  } catch {
    return { token: null, chapterName: null, state: null, membershipId: null };
  }
}

async function upsertAuthenticatedProfile(
  uid: string,
  provider: "email" | "google" | "fbla_connect",
  fields: ProfileSetupFields,
): Promise<boolean> {
  const existing = await getUserProfileOnce(uid);
  const now = serverTimestamp();

  if (!existing) {
    const base = createDefaultUserProfile(uid);
    await setDoc(doc(db, "users", uid), {
      ...base,
      displayName: fields.displayName || base.displayName,
      schoolName: fields.schoolName || base.schoolName,
      schoolId: slugFromSchool(fields.schoolName || base.schoolName),
      state: fields.state || base.state,
      chapterName: fields.chapterName ?? base.chapterName,
      membershipId: fields.membershipId ?? null,
      graduationYear: Number(fields.graduationYear) || base.graduationYear,
      authProvider: provider,
      isGuest: false,
      onboardingCompleted: false,
      createdAt: now,
      updatedAt: now,
    }, { merge: true });
    return true;
  }

  await updateDoc(doc(db, "users", uid), {
    displayName: fields.displayName || existing.displayName,
    schoolName: fields.schoolName || existing.schoolName,
    schoolId: slugFromSchool(fields.schoolName || existing.schoolName),
    state: fields.state || existing.state || "CA",
    chapterName: fields.chapterName ?? existing.chapterName ?? "FBLA Atlas Chapter",
    membershipId: fields.membershipId ?? existing.membershipId ?? null,
    graduationYear: Number(fields.graduationYear) || existing.graduationYear,
    authProvider: provider,
    isGuest: false,
    updatedAt: now,
  });

  return false;
}

async function ensureAdminProfile(uid: string): Promise<void> {
  await setDoc(
    doc(db, "users", uid),
    {
      displayName: "FBLA Atlas Administrator",
      schoolName: "FBLA Atlas",
      schoolId: "fbla-atlas-admin",
      role: "admin",
      banned: false,
      onboardingCompleted: true,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export function LoginScreen() {
  const { palette } = useThemeContext();
  const { setOnboardingCompleted } = useOnboarding();
  const { signInAsGuest, setAdminMode } = useAuthContext();

  const [mode, setMode] = useState<FormMode>("signin");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminEmail, setAdminEmail] = useState(ADMIN_EMAIL);
  const [adminPassword, setAdminPassword] = useState("");
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [schoolName, setSchoolName] = useState("FBLA Atlas High School");
  const [state, setState] = useState("CA");
  const [graduationYear, setGraduationYear] = useState(String(new Date().getFullYear() + 2));

  const [fblaConnectOpen, setFblaConnectOpen] = useState(false);
  const [fblaConnectUrl, setFblaConnectUrl] = useState("https://connect.fbla.org");
  const [fblaCapture, setFblaCapture] = useState<ReturnType<typeof parseFbConnectUrl> | null>(null);

  const redirectUri = useMemo(() => AuthSession.makeRedirectUri({ scheme: "fblaatlas", path: "fbla-connect" }), []);
  const googleExpoClientId = process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID?.trim() ?? "";
  const googleAndroidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim() ?? "";
  const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() ?? "";
  const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ?? "";
  const googleConfigured = useMemo(() => {
    if (Platform.OS === "android") {
      return Boolean(googleAndroidClientId);
    }
    if (Platform.OS === "ios") {
      return Boolean(googleIosClientId);
    }
    return Boolean(googleWebClientId);
  }, [googleAndroidClientId, googleIosClientId, googleWebClientId]);

  const runEmailAuth = async () => {
    setBusy(true);
    setError(null);

    try {
      await setAdminMode(false);
      if (mode === "signin") {
        const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
        const existing = await getUserProfileOnce(credential.user.uid);
        if (!existing) {
          await upsertAuthenticatedProfile(credential.user.uid, "email", {
            displayName: credential.user.displayName ?? (displayName || "FBLA Member"),
            schoolName,
            state,
            graduationYear,
          });
          await setOnboardingCompleted(false);
        } else {
          await setOnboardingCompleted(Boolean(existing.onboardingCompleted ?? true));
        }
      } else {
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await upsertAuthenticatedProfile(credential.user.uid, "email", {
          displayName: displayName.trim() || "FBLA Member",
          schoolName,
          state,
          graduationYear,
        });
        await setOnboardingCompleted(false);
      }
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  };

  const runPasswordReset = async () => {
    if (!email.trim()) {
      setError("Enter your email first, then tap Forgot password.");
      return;
    }

    try {
      setBusy(true);
      setError(null);
      await sendPasswordResetEmail(auth, email.trim());
      setError("Password reset email sent. Check your inbox.");
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Could not send password reset email.");
    } finally {
      setBusy(false);
    }
  };

  const startFblaConnect = () => {
    setError(null);
    setFblaCapture(null);
    setFblaConnectUrl(`https://connect.fbla.org?redirect_uri=${encodeURIComponent(redirectUri)}`);
    setFblaConnectOpen(true);
  };

  const completeFblaConnect = async () => {
    const token = fblaCapture?.token;
    if (!token) {
      setError("FBLA Connect token not found yet. Complete login and allow redirect back to the app.");
      return;
    }

    const pseudoEmail = `fbla_${token.slice(0, 16)}@connect.fbla-atlas.app`;
    const pseudoPassword = `Fbla#${token.slice(0, 12)}!`;

    try {
      setBusy(true);
      setError(null);
      await setAdminMode(false);

      let uid: string;
      try {
        const signIn = await signInWithEmailAndPassword(auth, pseudoEmail, pseudoPassword);
        uid = signIn.user.uid;
      } catch {
        const created = await createUserWithEmailAndPassword(auth, pseudoEmail, pseudoPassword);
        uid = created.user.uid;
      }

      const newUser = await upsertAuthenticatedProfile(uid, "fbla_connect", {
        displayName,
        schoolName,
        state: fblaCapture?.state ?? state,
        chapterName: fblaCapture?.chapterName ?? undefined,
        membershipId: fblaCapture?.membershipId ?? token,
        graduationYear,
      });

      await setOnboardingCompleted(!newUser);
      setFblaConnectOpen(false);
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : "FBLA Connect sign-in failed.");
    } finally {
      setBusy(false);
    }
  };

  const runAdminAuth = async () => {
    if (!adminEmail.trim() || !adminPassword) {
      setError("Enter admin email and password.");
      return;
    }
    if (adminEmail.trim().toLowerCase() !== ADMIN_EMAIL || adminPassword !== ADMIN_LOGIN_PASSWORD) {
      setError("Use the configured administrator credentials for this login.");
      return;
    }
    try {
      setBusy(true);
      setError(null);
      let credential;
      const methods = await fetchSignInMethodsForEmail(auth, ADMIN_EMAIL);
      if (methods.length === 0) {
        credential = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_AUTH_PASSWORD);
      } else {
        credential = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_AUTH_PASSWORD);
      }
      await ensureAdminProfile(credential.user.uid);
      const existing = await getUserProfileOnce(credential.user.uid);
      const role = existing?.role;
      if (role !== "admin") {
        await signOut(auth);
        await setAdminMode(false);
        setError("This account does not have administrator access");
        return;
      }
      await setAdminMode(true);
      await setOnboardingCompleted(true);
      setAdminOpen(false);
      setAdminEmail(ADMIN_EMAIL);
      setAdminPassword("");
    } catch (adminError) {
      setError(adminError instanceof Error ? adminError.message : "Administrator login failed.");
      await setAdminMode(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.colors.background }}>
      <LinearGradient
        colors={[palette.colors.elevated, palette.colors.background, palette.colors.surface]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 36 }} keyboardShouldPersistTaps="handled">
          <View style={{ marginTop: 14, alignItems: "center" }}>
            <AppLogo subtitle="FBLA Atlas" />
            <Text style={{ color: palette.colors.textSecondary, marginTop: 10 }}>
              Your FBLA journey starts here
            </Text>
          </View>

          <GlassSurface style={{ marginTop: 14, padding: 12 }}>
            {googleConfigured ? (
              <GoogleAuthButton
                busy={busy}
                onBusyChange={setBusy}
                onError={setError}
                schoolName={schoolName}
                state={state}
                graduationYear={graduationYear}
                setOnboardingCompleted={setOnboardingCompleted}
                setAdminMode={setAdminMode}
                googleExpoClientId={googleExpoClientId}
                googleAndroidClientId={googleAndroidClientId}
                googleIosClientId={googleIosClientId}
                googleWebClientId={googleWebClientId}
              />
            ) : (
              <GlassButton
                variant="primary"
                label="Continue with Google"
                icon={<Text style={{ color: palette.colors.text, fontSize: 16, fontWeight: "900" }}>G</Text>}
                onPress={() => {
                  setError(
                    "Google sign-in is not configured for this build yet. Add the Google OAuth client IDs to .env first.",
                  );
                }}
                disabled={busy}
              />
            )}
            {!googleConfigured ? (
              <Text style={{ color: palette.colors.textSecondary, marginTop: 8 }}>
                Google sign-in is currently unavailable in this build.
              </Text>
            ) : null}

            <View style={{ marginTop: 10 }}>
              <GlassSegmentedControl
                value={mode}
                onValueChange={(next) => {
                  if (next === "signin" || next === "signup") {
                    setMode(next);
                  }
                }}
                options={[
                  { label: "Sign In", value: "signin" },
                  { label: "Sign Up", value: "signup" },
                ]}
              />
            </View>

            <View style={{ marginTop: 12, gap: 8 }}>
              <GlassInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                label="Email"
                placeholder="you@school.edu"
                leftSlot={<Mail size={18} color={palette.colors.textSecondary} />}
              />
              <GlassInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                label="Password"
                placeholder="Enter password"
                rightSlot={
                  <Pressable
                    onPress={() => setShowPassword((prev) => !prev)}
                    style={{ minHeight: 30, minWidth: 30, alignItems: "center", justifyContent: "center" }}
                  >
                    {showPassword ? (
                      <EyeOff size={18} color={palette.colors.textSecondary} />
                    ) : (
                      <Eye size={18} color={palette.colors.textSecondary} />
                    )}
                  </Pressable>
                }
              />

              {mode === "signup" ? (
                <>
                  <GlassInput
                    value={displayName}
                    onChangeText={setDisplayName}
                    label="Full Name"
                    placeholder="Your name"
                    leftSlot={<UserRound size={18} color={palette.colors.textSecondary} />}
                  />
                  <GlassInput
                    value={schoolName}
                    onChangeText={setSchoolName}
                    label="School Name"
                    placeholder="Your chapter school"
                  />
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <GlassInput
                      value={state}
                      onChangeText={setState}
                      label="State"
                      placeholder="CA"
                      containerStyle={{ flex: 1 }}
                    />
                    <GlassInput
                      value={graduationYear}
                      onChangeText={setGraduationYear}
                      label="Graduation Year"
                      keyboardType="numeric"
                      placeholder="2028"
                      containerStyle={{ flex: 1 }}
                    />
                  </View>
                </>
              ) : null}
            </View>

            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
              <Text style={{ color: palette.colors.textSecondary }}>
                {mode === "signin" ? "Use the tabs above to create account." : "Fill all fields to create account."}
              </Text>
              {mode === "signin" ? (
                <Pressable onPress={() => void runPasswordReset()}>
                  <Text style={{ color: palette.colors.textSecondary }}>Forgot password?</Text>
                </Pressable>
              ) : null}
            </View>

            <View style={{ marginTop: 10 }}>
              <GlassButton
                variant="solid"
                label={mode === "signin" ? "Sign In" : "Create Account"}
                onPress={() => {
                  void runEmailAuth();
                }}
                loading={busy}
              />
            </View>

            <View style={{ marginTop: 10 }}>
              <GlassButton
                variant="primary"
                label="Sign in with FBLA Connect"
                icon={<Shield size={18} color={palette.colors.text} />}
                onPress={startFblaConnect}
              />
              <View style={{ position: "absolute", right: 10, top: 9 }}>
                <Badge size="sm" variant="amber-subtle" capitalize={false}>
                  Beta
                </Badge>
              </View>
            </View>

            <View style={{ marginTop: 10 }}>
              <GlassButton
                variant="ghost"
                label="Continue as Guest"
                onPress={async () => {
                  hapticTap();
                  await setAdminMode(false);
                  await signInAsGuest();
                  await setOnboardingCompleted(true);
                }}
              />
            </View>

            <Pressable
              onPress={() => {
                hapticTap();
                setAdminOpen(true);
              }}
              style={{ alignSelf: "center", marginTop: 10, minHeight: 28, justifyContent: "center" }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Shield size={14} color={palette.colors.textSecondary} />
                <Text style={{ color: palette.colors.textSecondary, fontSize: 13 }}>
                  Administrator Login
                </Text>
              </View>
            </Pressable>

            {busy ? (
              <View style={{ marginTop: 10, alignItems: "center" }}>
                <Text style={{ color: palette.colors.textSecondary }}>Signing you in...</Text>
              </View>
            ) : null}

            {error ? (
              <GlassSurface style={{ marginTop: 10, padding: 10, borderColor: palette.colors.danger }}>
                <Text style={{ color: palette.colors.danger }}>{error}</Text>
              </GlassSurface>
            ) : null}
          </GlassSurface>

          <View style={{ marginTop: 14, alignItems: "center", gap: 8 }}>
            <View style={{ flexDirection: "row", gap: 14 }}>
              <Pressable onPress={() => void WebBrowser.openBrowserAsync("https://www.fbla.org/legal/")}>
                <Text style={{ color: palette.colors.textSecondary }}>Terms of Service</Text>
              </Pressable>
              <Pressable onPress={() => void WebBrowser.openBrowserAsync("https://www.fbla.org/privacy-policy/")}>
                <Text style={{ color: palette.colors.textSecondary }}>Privacy Policy</Text>
              </Pressable>
            </View>
            <Text style={{ color: palette.colors.muted, fontSize: 12, textAlign: "center" }}>
              Built for FBLA — FBLA-PBL is not affiliated with this app.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={fblaConnectOpen} animationType="slide" onRequestClose={() => setFblaConnectOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: palette.colors.background }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12 }}>
            <Text style={{ color: palette.colors.text, fontWeight: "800" }}>FBLA Connect (Beta)</Text>
            <Pressable onPress={() => setFblaConnectOpen(false)}>
              <Text style={{ color: palette.colors.primary, fontWeight: "700" }}>Close</Text>
            </Pressable>
          </View>

          <WebView
            source={{ uri: fblaConnectUrl }}
            onNavigationStateChange={(state) => {
              setFblaConnectUrl(state.url);
              const parsed = parseFbConnectUrl(state.url);
              if (parsed.token) {
                setFblaCapture(parsed);
              }
            }}
            sharedCookiesEnabled
          />

          <View style={{ padding: 12, gap: 8 }}>
            <Text style={{ color: palette.colors.textSecondary }}>
              Sign in on FBLA Connect, then return here to complete account linking.
            </Text>
            {fblaCapture?.token ? (
              <Text style={{ color: palette.colors.success }}>Session token captured. Ready to continue.</Text>
            ) : (
              <Text style={{ color: palette.colors.textSecondary }}>
                Waiting for redirect token from FBLA Connect...
              </Text>
            )}
            <GlassButton
              variant="solid"
              label="Complete FBLA Connect Sign-In"
              onPress={() => {
                void completeFblaConnect();
              }}
            />
          </View>
        </SafeAreaView>
      </Modal>

      <Modal visible={adminOpen} animationType="slide" onRequestClose={() => setAdminOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: palette.colors.background }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4 }}>
            <Pressable
              onPress={() => setAdminOpen(false)}
              style={{ minHeight: 44, minWidth: 44, alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ color: palette.colors.text, fontSize: 22 }}>‹</Text>
            </Pressable>
            <Shield size={18} color={palette.colors.text} />
            <Text style={{ color: palette.colors.text, fontWeight: "900", fontSize: 20 }}>
              Administrator Access
            </Text>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <GlassSurface style={{ padding: 14 }}>
              <GlassInput
                value={adminEmail}
                onChangeText={setAdminEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                label="Admin Email"
                placeholder={ADMIN_EMAIL}
                leftSlot={<Mail size={18} color={palette.colors.textSecondary} />}
              />
              <GlassInput
                value={adminPassword}
                onChangeText={setAdminPassword}
                secureTextEntry={!showAdminPassword}
                label="Admin Password"
                placeholder="Enter password"
                rightSlot={
                  <Pressable
                    onPress={() => setShowAdminPassword((prev) => !prev)}
                    style={{ minHeight: 30, minWidth: 30, alignItems: "center", justifyContent: "center" }}
                  >
                    {showAdminPassword ? (
                      <EyeOff size={18} color={palette.colors.textSecondary} />
                    ) : (
                      <Eye size={18} color={palette.colors.textSecondary} />
                    )}
                  </Pressable>
                }
              />
              <GlassButton
                variant="solid"
                label="Login as Administrator"
                style={{ marginTop: 10 }}
                loading={busy}
                onPress={() => {
                  void runAdminAuth();
                }}
              />
            </GlassSurface>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

type GoogleAuthButtonProps = {
  busy: boolean;
  onBusyChange: (value: boolean) => void;
  onError: (value: string | null) => void;
  schoolName: string;
  state: string;
  graduationYear: string;
  setOnboardingCompleted: (value: boolean) => Promise<void>;
  setAdminMode: (enabled: boolean) => Promise<void>;
  googleExpoClientId: string;
  googleAndroidClientId: string;
  googleIosClientId: string;
  googleWebClientId: string;
};

function GoogleAuthButton({
  busy,
  onBusyChange,
  onError,
  schoolName,
  state,
  graduationYear,
  setOnboardingCompleted,
  setAdminMode,
  googleExpoClientId,
  googleAndroidClientId,
  googleIosClientId,
  googleWebClientId,
}: GoogleAuthButtonProps) {
  const { palette } = useThemeContext();

  const [googleRequest, googleResponse, promptGoogle] = Google.useAuthRequest({
    clientId: googleExpoClientId,
    androidClientId: googleAndroidClientId,
    iosClientId: googleIosClientId,
    webClientId: googleWebClientId,
  });

  React.useEffect(() => {
    const runGoogleResponse = async () => {
      if (googleResponse?.type !== "success") {
        return;
      }
      try {
        onBusyChange(true);
        onError(null);
        const idToken = googleResponse.authentication?.idToken;
        if (!idToken) {
          throw new Error("Google sign-in returned no token. Check your Google OAuth client IDs.");
        }

        const credential = GoogleAuthProvider.credential(idToken);
        const userCredential = await signInWithCredential(auth, credential);

        const newUser = await upsertAuthenticatedProfile(userCredential.user.uid, "google", {
          displayName: userCredential.user.displayName ?? "FBLA Member",
          schoolName,
          state,
          graduationYear,
        });

        await setAdminMode(false);
        await setOnboardingCompleted(!newUser);
      } catch (authError) {
        onError(authError instanceof Error ? authError.message : "Google sign-in failed.");
      } finally {
        onBusyChange(false);
      }
    };

    void runGoogleResponse();
  }, [googleResponse, graduationYear, onBusyChange, onError, schoolName, setAdminMode, setOnboardingCompleted, state]);

  return (
    <GlassButton
      variant="primary"
      label="Continue with Google"
      icon={<Text style={{ color: palette.colors.text, fontSize: 16, fontWeight: "900" }}>G</Text>}
      onPress={() => {
        onError(null);
        void promptGoogle();
      }}
      disabled={busy || !googleRequest}
    />
  );
}

