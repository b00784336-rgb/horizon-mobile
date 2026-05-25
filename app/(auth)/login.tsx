import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { COLORS, SPACING, RADIUS } from "@/constants/theme";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      Alert.alert("Erreur", error.message);
      return;
    }
    router.replace("/");
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    try {
      const redirectUrl = AuthSession.makeRedirectUri({ scheme: "horizondate" });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error || !data.url) throw error;

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

      if (result.type === "success") {
        const url = result.url;
        const params = new URL(url).hash
          .substring(1)
          .split("&")
          .reduce((acc: Record<string, string>, part) => {
            const [k, v] = part.split("=");
            acc[k] = decodeURIComponent(v);
            return acc;
          }, {});

        if (params.access_token) {
          await supabase.auth.setSession({
            access_token: params.access_token,
            refresh_token: params.refresh_token,
          });
          router.replace("/");
        }
      }
    } catch (e: any) {
      Alert.alert("Erreur Google", e?.message ?? "Connexion impossible");
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>Horizon</Text>
          <Text style={styles.tagline}>Votre liberté financière commence ici</Text>
        </View>

        {/* Formulaire */}
        <View style={styles.form}>
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="vous@exemple.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <Input
            label="Mot de passe"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            autoComplete="password"
          />

          <Button label="Se connecter" onPress={handleLogin} loading={loading} />

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ou</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleLogin}
            disabled={googleLoading}
            activeOpacity={0.8}
          >
            <Text style={styles.googleText}>
              {googleLoading ? "Connexion..." : "Continuer avec Google"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <TouchableOpacity onPress={() => router.push("/(auth)/signup")}>
          <Text style={styles.footerText}>
            Pas encore de compte ?{" "}
            <Text style={styles.footerLink}>S'inscrire</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: {
    flexGrow: 1,
    padding: SPACING.lg,
    justifyContent: "center",
    gap: SPACING.xl,
  },
  logoContainer: { alignItems: "center", gap: 8 },
  logoText: {
    color: COLORS.amber,
    fontSize: 42,
    fontWeight: "800",
    letterSpacing: -1,
  },
  tagline: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: "center",
  },
  form: { gap: SPACING.md },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginVertical: SPACING.xs,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { color: COLORS.textMuted, fontSize: 12 },
  googleButton: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.md,
    alignItems: "center",
    minHeight: 52,
    justifyContent: "center",
  },
  googleText: { color: COLORS.textPrimary, fontWeight: "600", fontSize: 16 },
  footerText: {
    color: COLORS.textSecondary,
    textAlign: "center",
    fontSize: 14,
  },
  footerLink: { color: COLORS.amber, fontWeight: "600" },
});
