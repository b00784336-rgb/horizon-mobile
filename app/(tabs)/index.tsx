/**
 * Onglet Accueil — Dashboard FIRE principal
 */
import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useHorizonStore } from "@/lib/store";
import { FireCountdown } from "@/components/FireCountdown";
import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/calculations";
import { COLORS, SPACING, RADIUS } from "@/constants/theme";

export default function HomeTab() {
  const { data, loaded, loadProfile, updateStreak } = useHorizonStore();
  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    if (loaded) updateStreak();
  }, [loaded]);

  async function onRefresh() {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  }

  const monthlySavings = Math.max(0, data.monthlyIncome - data.monthlyExpenses);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.amber}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>
            Bonjour{data.firstName ? `, ${data.firstName}` : ""} 👋
          </Text>
          {data.streak > 0 && (
            <View style={styles.streakBadge}>
              <Text style={styles.streakText}>🔥 {data.streak} j</Text>
            </View>
          )}
        </View>

        {/* FIRE Countdown */}
        <FireCountdown />

        {/* Résumé financier */}
        <Text style={styles.sectionTitle}>Résumé du mois</Text>
        <View style={styles.statsGrid}>
          <StatCard
            label="Revenus"
            value={formatCurrency(data.monthlyIncome)}
            color={COLORS.success}
          />
          <StatCard
            label="Dépenses"
            value={formatCurrency(data.monthlyExpenses)}
            color={COLORS.danger}
          />
          <StatCard
            label="Épargne"
            value={formatCurrency(monthlySavings)}
            color={COLORS.amber}
          />
          <StatCard
            label="Capital"
            value={formatCurrency(data.currentSavings)}
            color={COLORS.info}
          />
        </View>

        {/* Taux d'épargne */}
        {data.monthlyIncome > 0 && (
          <Card style={styles.savingsRateCard}>
            <Text style={styles.savingsRateLabel}>Taux d'épargne</Text>
            <View style={styles.savingsRateBar}>
              <View
                style={[
                  styles.savingsRateFill,
                  { width: `${Math.min(100, (monthlySavings / data.monthlyIncome) * 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.savingsRateValue}>
              {((monthlySavings / data.monthlyIncome) * 100).toFixed(0)}%
            </Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <Card style={styles.statCard}>
      <View style={[styles.statDot, { backgroundColor: color }]} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { padding: SPACING.lg, gap: SPACING.lg, paddingBottom: SPACING.xxl },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greeting: { color: COLORS.textPrimary, fontSize: 20, fontWeight: "700" },
  streakBadge: {
    backgroundColor: `${COLORS.amber}20`,
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: `${COLORS.amber}40`,
  },
  streakText: { color: COLORS.amber, fontWeight: "600", fontSize: 13 },
  sectionTitle: { color: COLORS.textSecondary, fontSize: 13, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1 },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  statCard: {
    width: "47%",
    gap: 4,
    alignItems: "flex-start",
  },
  statDot: { width: 8, height: 8, borderRadius: 4 },
  statValue: { color: COLORS.textPrimary, fontSize: 18, fontWeight: "700" },
  statLabel: { color: COLORS.textMuted, fontSize: 12 },
  savingsRateCard: { gap: SPACING.sm },
  savingsRateLabel: { color: COLORS.textSecondary, fontSize: 13 },
  savingsRateBar: {
    height: 8,
    backgroundColor: COLORS.bgElevated,
    borderRadius: RADIUS.full,
    overflow: "hidden",
  },
  savingsRateFill: {
    height: "100%",
    backgroundColor: COLORS.amber,
    borderRadius: RADIUS.full,
  },
  savingsRateValue: { color: COLORS.amber, fontWeight: "700", fontSize: 16 },
});
