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
const ADMIN_EMAIL = "admin123@fblaatlas.app";
const ADMIN_PASSWORD = "Admin123";
const ADMIN_INPUT_EMAIL = "Admin123";
const ADMIN_INPUT_PASSWORD = "Admin123";

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
      role: "superadmin",
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
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [schoolName, setSchoolName] = useState("FBLA Atlas High School");
  const [state, setState] = useState("CA");
  const [graduationYear, setGraduationYear] = useState(String(new Date().getFullYear() + 2));

  const [fblaConnectOpen, setFblaConnectOpen] = useState(false);
  const [fblaConnectUrl, setFblaConnectUrl] = useState("https://connect.fbla.org");
  const [fblaCapture, setFblaCapture] = useState<ReturnType<typeof parseFbConnectUrl> | null>(null);

  const redirectUri = useMemo(() => AuthSession.makeRedirectUri({ scheme: "fblaatlas", path: "fbla-connect" }), []);
  const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ?? "";
  const googleConfigured = useMemo(() => Boolean(googleWebClientId), [googleWebClientId]);

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
    if (adminEmail.trim() !== ADMIN_INPUT_EMAIL || adminPassword !== ADMIN_INPUT_PASSWORD) {
      setError("Incorrect admin credentials.");
      return;
    }
    try {
      setBusy(true);
      setError(null);
      let credential;
      const methods = await fetchSignInMethodsForEmail(auth, ADMIN_EMAIL);
      if (methods.length === 0) {
        credential = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
      } else {
        credential = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
      }
      await ensureAdminProfile(credential.user.uid);
      await setAdminMode(true);
      await setOnboardingCompleted(true);
      setAdminOpen(false);
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
            <AppLogo size={52} layout="stack" subtitle="Your FBLA journey starts here" />
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
                googleWebClientId={googleWebClientId}
              />
            ) : (
              <GlassButton
                variant="primary"
                label="Continue with Google"
                icon={<Text style={{ color: palette.colors.text, fontSize: 16, fontWeight: "900" }}>G</Text>}
                onPress={() => {
                  setError(
                    "Google sign-in is not configured for this build yet. Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID from Firebase Google Sign-In.",
                  );
                }}
                disabled={busy}
              />
            )}
            {!googleConfigured ? (
              <Text style={{ color: palette.colors.textSecondary, marginTop: 8 }}>
                Google sign-in is currently unavailable in this build (missing Firebase Web client ID).
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

            {mode === "signin" ? (
              <View style={{ alignItems: "flex-end", marginTop: 6 }}>
                <Pressable onPress={() => void runPasswordReset()}>
                  <Text style={{ color: palette.colors.textSecondary, fontSize: 13 }}>Forgot password?</Text>
                </Pressable>
              </View>
            ) : null}

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
              Built for FBLA - FBLA-PBL is not affiliated with this app.
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
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 16 }} keyboardShouldPersistTaps="handled">
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 24 }}>
                <Pressable
                  onPress={() => setAdminOpen(false)}
                  style={{ minHeight: 44, minWidth: 44, alignItems: "center", justifyContent: "center" }}
                >
                  <Text style={{ color: palette.colors.text, fontSize: 22 }}>&lt;</Text>
                </Pressable>
                <Shield size={18} color={palette.colors.primary} />
                <Text style={{ color: palette.colors.text, fontWeight: "900", fontSize: 20 }}>
                  Administrator Login
                </Text>
              </View>

              <GlassSurface style={{ padding: 16, gap: 12 }}>
                <GlassInput
                  value={adminEmail}
                  onChangeText={setAdminEmail}
                  label="Admin Email"
                  placeholder="Admin123"
                  autoCapitalize="none"
                  keyboardType="default"
                />
                <GlassInput
                  value={adminPassword}
                  onChangeText={setAdminPassword}
                  label="Admin Password"
                  placeholder="Admin123"
                  secureTextEntry
                />
                {error ? (
                  <GlassSurface style={{ padding: 10, borderColor: palette.colors.danger }}>
                    <Text style={{ color: palette.colors.danger }}>{error}</Text>
                  </GlassSurface>
                ) : null}
                <GlassButton
                  variant="solid"
                  label="Sign In as Administrator"
                  loading={busy}
                  onPress={() => void runAdminAuth()}
                />
              </GlassSurface>
            </ScrollView>
          </KeyboardAvoidingView>
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
  googleWebClientId,
}: GoogleAuthButtonProps) {
  const { palette } = useThemeContext();
  const googleRedirectUri = useMemo(
    () =>
      AuthSession.makeRedirectUri({
        scheme: "fblaatlas",
        path: "google-auth",
      }),
    [],
  );

  // Ensure Google is enabled in Firebase Console -> Authentication -> Sign-in method.
  const [googleRequest, googleResponse, promptGoogle] = Google.useAuthRequest({
    clientId: googleWebClientId,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim() || googleWebClientId,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() || googleWebClientId,
    webClientId: googleWebClientId,
    redirectUri: googleRedirectUri,
    responseType: AuthSession.ResponseType.IdToken,
  });

  React.useEffect(() => {
    const runGoogleResponse = async () => {
      if (!googleResponse) {
        return;
      }

      if (googleResponse.type === "error") {
        console.error("[GoogleSignIn] OAuth response error:", googleResponse);
        console.log("Google Sign-In error:", JSON.stringify(googleResponse));
        onError(
          (googleResponse as { error?: { message?: string } }).error?.message ??
            "Google OAuth failed. Check Firebase Web client ID and SHA settings.",
        );
        return;
      }

      if (googleResponse.type !== "success") {
        return;
      }

      try {
        onBusyChange(true);
        onError(null);
        const idToken =
          googleResponse.authentication?.idToken ??
          (googleResponse as { params?: { id_token?: string } }).params?.id_token;
        if (!idToken) {
          console.error("[GoogleSignIn] success response missing idToken:", googleResponse);
          throw new Error("Google sign-in returned no token. Check your Google OAuth client IDs.");
        }

        const credential = GoogleAuthProvider.credential(idToken);
        const userCredential = await signInWithCredential(auth, credential);
        console.log("[GoogleSignIn] Firebase credential sign-in success:", userCredential.user.uid);

        const newUser = await upsertAuthenticatedProfile(userCredential.user.uid, "google", {
          displayName: userCredential.user.displayName ?? "FBLA Member",
          schoolName,
          state,
          graduationYear,
        });

        await setAdminMode(false);
        await setOnboardingCompleted(!newUser);
      } catch (authError) {
        console.error("[GoogleSignIn] full error:", authError, {
          responseType: googleResponse.type,
          responseKeys: Object.keys(googleResponse),
        });
        try {
          const serialized = JSON.stringify(authError, Object.getOwnPropertyNames(authError as object));
          console.log("Google Sign-In error:", serialized);
        } catch {
          console.log("Google Sign-In error:", String(authError));
        }
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
      onPress={async () => {
        onError(null);
        try {
          const result = await promptGoogle();
          if (result.type === "error") {
            console.error("[GoogleSignIn] prompt error result:", result);
            console.log("Google Sign-In error:", JSON.stringify(result));
            onError("Google sign-in prompt failed.");
          }
        } catch (promptError) {
          console.error("[GoogleSignIn] prompt exception:", promptError);
          try {
            const serialized = JSON.stringify(promptError, Object.getOwnPropertyNames(promptError as object));
            console.log("Google Sign-In error:", serialized);
          } catch {
            console.log("Google Sign-In error:", String(promptError));
          }
          onError(promptError instanceof Error ? promptError.message : "Unable to start Google sign-in.");
        }
      }}
      disabled={busy || !googleRequest}
    />
  );
}



