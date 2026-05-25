import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { COLORS, SPACING } from "@/constants/theme";

export default function SignupScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    if (!email || !password || !firstName) {
      Alert.alert("Champs manquants", "Merci de remplir tous les champs.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName },
      },
    });
    setLoading(false);

    if (error) {
      Alert.alert("Erreur", error.message);
      return;
    }

    // Redirection vers l'onboarding dès la création
    router.replace("/onboarding");
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Créer un compte</Text>
          <Text style={styles.subtitle}>
            Rejoignez Horizon et découvrez votre date de liberté financière
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Prénom"
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Marie"
            autoCapitalize="words"
            autoComplete="given-name"
          />
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
            autoComplete="new-password"
          />

          <Button label="Créer mon compte" onPress={handleSignup} loading={loading} />
        </View>

        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.footerText}>
            Déjà un compte ?{" "}
            <Text style={styles.footerLink}>Se connecter</Text>
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
  header: { gap: 8 },
  title: {
    color: COLORS.textPrimary,
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  form: { gap: SPACING.md },
  footerText: {
    color: COLORS.textSecondary,
    textAlign: "center",
    fontSize: 14,
  },
  footerLink: { color: COLORS.amber, fontWeight: "600" },
});
