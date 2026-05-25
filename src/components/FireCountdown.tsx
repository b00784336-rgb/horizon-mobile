import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useHorizonStore } from "@/lib/store";
import { formatCompact, formatCurrency } from "@/lib/calculations";
import { COLORS, SPACING, RADIUS } from "@/constants/theme";

export function FireCountdown() {
  const { data, getFireResult } = useHorizonStore();
  const fire = getFireResult();

  const currentYear = new Date().getFullYear();
  const fireYear = Math.round(currentYear + fire.yearsToFire);
  const yearsLeft = Math.round(fire.yearsToFire);

  if (data.monthlyIncome === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.hint}>
          Renseigne tes revenus pour voir ta date FIRE
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.yearLabel}>Liberté financière estimée</Text>
      <Text style={styles.year}>{fireYear}</Text>
      <Text style={styles.subLabel}>
        dans {yearsLeft} ans · {data.firstName ? `âge ${data.age + yearsLeft}` : ""}
      </Text>

      <View style={styles.row}>
        <StatItem label="Capital cible" value={formatCompact(fire.fireNumber)} />
        <View style={styles.divider} />
        <StatItem label="Épargne / mois" value={formatCurrency(fire.monthlySavings)} />
      </View>
    </View>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: SPACING.xl,
  },
  yearLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginBottom: 4,
  },
  year: {
    color: COLORS.amber,
    fontSize: 64,
    fontWeight: "800",
    letterSpacing: -2,
  },
  subLabel: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginBottom: SPACING.lg,
  },
  row: {
    flexDirection: "row",
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.lg,
  },
  divider: {
    width: 1,
    backgroundColor: COLORS.border,
  },
  stat: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: "700",
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  hint: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: "center",
    padding: SPACING.lg,
  },
});
