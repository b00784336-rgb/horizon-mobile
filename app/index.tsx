/**
 * Route racine — redirige selon l'état de session/onboarding.
 * Pas d'affichage propre, juste une logique de navigation.
 */
import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { COLORS } from "@/constants/theme";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/(auth)/login");
        return;
      }

      // Vérifier si onboarding complété
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed, is_premium")
        .eq("id", session.user.id)
        .single();

      if (!profile?.onboarding_completed) {
        router.replace("/onboarding");
      } else if (!profile?.is_premium) {
        router.replace("/paywall");
      } else {
        router.replace("/(tabs)");
      }
    })();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator color={COLORS.amber} size="large" />
    </View>
  );
}
