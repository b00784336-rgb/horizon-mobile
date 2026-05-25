/**
 * Paywall dur — affiché après l'onboarding et pour tous les non-premium.
 * Deux produits : mensuel + annuel.
 * Boutons : "Commencer l'essai gratuit" + "Restaurer un achat"
 * Pas de bypass possible.
 */
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as InAppPurchases from "expo-in-app-purchases";
import { supabase } from "@/lib/supabase";
import { useHorizonStore } from "@/lib/store";
import {
  initIAP, getProducts, purchaseProduct,
  verifyAndActivate, restorePurchases, IAP_PRODUCTS,
} from "@/lib/iap";
import { COLORS, SPACING, RADIUS } from "@/constants/theme";

interface Product {
  productId: string;
  title: string;
  description: string;
  price: string;
}

export default function PaywallScreen() {
  const router = useRouter();
  const { setData } = useHorizonStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<string>(IAP_PRODUCTS.YEARLY);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [iapReady, setIapReady] = useState(false);

  useEffect(() => {
    (async () => {
      await initIAP();

      // Écouter les achats entrants
      InAppPurchases.setPurchaseListener(async ({ responseCode, results }) => {
        if (responseCode === InAppPurchases.IAPResponseCode.OK && results) {
          for (const purchase of results) {
            if (!purchase.acknowledged && purchase.transactionReceipt) {
              const ok = await verifyAndActivate(purchase.transactionReceipt);
              if (ok) {
                await InAppPurchases.finishTransactionAsync(purchase, false);
                setData({ isPremium: true });
                router.replace("/(tabs)");
              }
            }
          }
        }
        setLoading(false);
      });

      const prods = await getProducts();
      setProducts(prods as Product[]);
      setIapReady(true);
    })();
  }, []);

  async function handlePurchase() {
    if (!selected) return;
    setLoading(true);
    await purchaseProduct(selected);
    // résultat géré par setPurchaseListener
  }

  async function handleRestore() {
    setRestoring(true);
    const ok = await restorePurchases();
    setRestoring(false);

    if (ok) {
      setData({ isPremium: true });
      router.replace("/(tabs)");
    } else {
      Alert.alert(
        "Aucun achat trouvé",
        "Aucun abonnement actif n'a été trouvé sur ce compte Apple."
      );
    }
  }

  const monthly = products.find((p) => p.productId === IAP_PRODUCTS.MONTHLY);
  const yearly = products.find((p) => p.productId === IAP_PRODUCTS.YEARLY);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* En-tête */}
        <View style={styles.header}>
          <Text style={styles.emoji}>🚀</Text>
          <Text style={styles.title}>Débloquez votre liberté financière</Text>
          <Text style={styles.subtitle}>
            Accès illimité à tous les outils Horizon pour piloter votre chemin vers l'indépendance.
          </Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f} style={styles.featureRow}>
              <Text style={styles.featureCheck}>✓</Text>
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        {/* Plans */}
        <View style={styles.plans}>
          {/* Annuel */}
          <TouchableOpacity
            style={[styles.planCard, selected === IAP_PRODUCTS.YEARLY && styles.planSelected]}
            onPress={() => setSelected(IAP_PRODUCTS.YEARLY)}
            activeOpacity={0.8}
          >
            <View style={styles.planBadge}>
              <Text style={styles.planBadgeText}>Meilleure offre</Text>
            </View>
            <Text style={styles.planTitle}>Annuel</Text>
            <Text style={styles.planPrice}>
              {yearly ? yearly.price : "59,99€"}{" "}
              <Text style={styles.planPeriod}>/an</Text>
            </Text>
            <Text style={styles.planNote}>soit ~5€/mois</Text>
          </TouchableOpacity>

          {/* Mensuel */}
          <TouchableOpacity
            style={[styles.planCard, selected === IAP_PRODUCTS.MONTHLY && styles.planSelected]}
            onPress={() => setSelected(IAP_PRODUCTS.MONTHLY)}
            activeOpacity={0.8}
          >
            <Text style={styles.planTitle}>Mensuel</Text>
            <Text style={styles.planPrice}>
              {monthly ? monthly.price : "9,99€"}{" "}
              <Text style={styles.planPeriod}>/mois</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.ctaButton, loading && styles.ctaDisabled]}
          onPress={handlePurchase}
          disabled={loading || !iapReady}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.ctaText}>Commencer l'essai gratuit</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestore}
          disabled={restoring}
        >
          <Text style={styles.restoreText}>
            {restoring ? "Vérification..." : "Restaurer un achat"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.legal}>
          L'abonnement se renouvelle automatiquement. Annulable à tout moment depuis les réglages Apple.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const FEATURES = [
  "Tableau de bord FIRE personnalisé",
  "Suivi budget par catégories",
  "Patrimoine et objectifs",
  "Rapport PDF exportable",
  "Mode couple",
  "Synchronisation web + mobile",
];

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: {
    flexGrow: 1,
    padding: SPACING.lg,
    gap: SPACING.lg,
  },
  header: { alignItems: "center", gap: SPACING.sm, paddingTop: SPACING.md },
  emoji: { fontSize: 48 },
  title: {
    color: COLORS.textPrimary,
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 32,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  features: { gap: SPACING.sm },
  featureRow: { flexDirection: "row", gap: SPACING.sm, alignItems: "center" },
  featureCheck: { color: COLORS.success, fontWeight: "700", fontSize: 16 },
  featureText: { color: COLORS.textSecondary, fontSize: 15 },
  plans: { flexDirection: "row", gap: SPACING.sm },
  planCard: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    gap: 4,
    position: "relative",
    overflow: "hidden",
  },
  planSelected: { borderColor: COLORS.amber },
  planBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: COLORS.amber,
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  planBadgeText: { color: "#000", fontSize: 10, fontWeight: "700" },
  planTitle: { color: COLORS.textSecondary, fontSize: 12, marginTop: SPACING.lg },
  planPrice: { color: COLORS.textPrimary, fontSize: 22, fontWeight: "800" },
  planPeriod: { color: COLORS.textSecondary, fontSize: 13, fontWeight: "400" },
  planNote: { color: COLORS.textMuted, fontSize: 11 },
  ctaButton: {
    backgroundColor: COLORS.amber,
    borderRadius: RADIUS.full,
    paddingVertical: SPACING.md,
    alignItems: "center",
    minHeight: 54,
    justifyContent: "center",
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { color: "#000", fontWeight: "700", fontSize: 17 },
  restoreButton: { alignItems: "center", paddingVertical: SPACING.sm },
  restoreText: { color: COLORS.textMuted, fontSize: 14, textDecorationLine: "underline" },
  legal: {
    color: COLORS.textMuted,
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
    paddingBottom: SPACING.lg,
  },
});
