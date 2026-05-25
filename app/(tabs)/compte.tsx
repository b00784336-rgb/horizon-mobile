/**
 * Onglet Compte — Profil, paramètres, mode couple, déconnexion
 */
import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, Switch,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useHorizonStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/calculations";
import { COLORS, SPACING, RADIUS } from "@/constants/theme";

export default function CompteTab() {
  const router = useRouter();
  const { data, setData, updateField, userId } = useHorizonStore();
  const [editingIncome, setEditingIncome] = useState(false);
  const [incomeVal, setIncomeVal] = useState(String(data.monthlyIncome));
  const [expensesVal, setExpensesVal] = useState(String(data.monthlyExpenses));
  const [savingsVal, setSavingsVal] = useState(String(data.currentSavings));
  const [partnerEmail, setPartnerEmail] = useState(data.partnerEmail ?? "");
  const [linkingPartner, setLinkingPartner] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  async function handleSaveFinances() {
    setSavingProfile(true);
    const userId_ = useHorizonStore.getState().userId;
    if (!userId_) { setSavingProfile(false); return; }

    const updates = {
      monthly_income: parseFloat(incomeVal) || 0,
      monthly_expenses: parseFloat(expensesVal) || 0,
      current_savings: parseFloat(savingsVal) || 0,
    };
    await supabase.from("profiles").update(updates).eq("id", userId_);
    setData((prev) => ({
      ...prev,
      monthlyIncome: updates.monthly_income,
      monthlyExpenses: updates.monthly_expenses,
      currentSavings: updates.current_savings,
    }));
    setSavingProfile(false);
    setEditingIncome(false);
  }

  async function handleLinkPartner() {
    if (!partnerEmail) return;
    setLinkingPartner(true);

    const userId_ = useHorizonStore.getState().userId;
    if (!userId_) { setLinkingPartner(false); return; }

    // Trouver l'ID du partenaire par email
    const { data: partnerProfile } = await supabase
      .from("profiles")
      .select("id, first_name")
      .eq("email", partnerEmail)
      .single();

    if (!partnerProfile) {
      Alert.alert("Introuvable", "Aucun compte trouvé avec cet email.");
      setLinkingPartner(false);
      return;
    }

    await supabase.from("profiles").update({
      partner_email: partnerEmail,
      partner_id: partnerProfile.id,
    }).eq("id", userId_);

    setData((prev) => ({
      ...prev,
      partnerEmail,
      partnerId: partnerProfile.id,
      partnerFirstName: partnerProfile.first_name,
    }));

    Alert.alert("Mode couple activé !", `Vous êtes maintenant lié à ${partnerProfile.first_name}.`);
    setLinkingPartner(false);
  }

  async function handleUnlinkPartner() {
    const userId_ = useHorizonStore.getState().userId;
    if (!userId_) return;
    await supabase.from("profiles").update({ partner_email: null, partner_id: null }).eq("id", userId_);
    setData((prev) => ({ ...prev, partnerEmail: null, partnerId: null, partnerFirstName: null }));
    setPartnerEmail("");
  }

  async function handleLogout() {
    Alert.alert("Déconnexion", "Voulez-vous vous déconnecter ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Déconnecter", style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace("/(auth)/login");
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* En-tête profil */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {data.firstName ? data.firstName[0].toUpperCase() : "?"}
            </Text>
          </View>
          <View>
            <Text style={styles.profileName}>{data.firstName || "Mon profil"}</Text>
            <Text style={styles.profileBadge}>
              {data.isPremium ? "✨ Premium" : "Plan gratuit"}
            </Text>
          </View>
        </View>

        {/* Finances */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Mes finances</Text>
            <TouchableOpacity onPress={() => setEditingIncome((v) => !v)}>
              <Text style={styles.editBtn}>{editingIncome ? "Annuler" : "Modifier"}</Text>
            </TouchableOpacity>
          </View>

          {editingIncome ? (
            <>
              <Input label="Revenus nets / mois" value={incomeVal} onChangeText={setIncomeVal} keyboardType="decimal-pad" suffix="€" />
              <Input label="Dépenses / mois" value={expensesVal} onChangeText={setExpensesVal} keyboardType="decimal-pad" suffix="€" />
              <Input label="Épargne actuelle" value={savingsVal} onChangeText={setSavingsVal} keyboardType="decimal-pad" suffix="€" />
              <Button label="Enregistrer" onPress={handleSaveFinances} loading={savingProfile} />
            </>
          ) : (
            <View style={styles.financeRows}>
              <FinanceRow label="Revenus" value={formatCurrency(data.monthlyIncome)} />
              <FinanceRow label="Dépenses" value={formatCurrency(data.monthlyExpenses)} />
              <FinanceRow label="Épargne" value={formatCurrency(data.currentSavings)} />
            </View>
          )}
        </Card>

        {/* Mode couple */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Mode couple</Text>
          {data.partnerId ? (
            <>
              <View style={styles.partnerLinked}>
                <Text style={styles.partnerEmoji}>💑</Text>
                <View>
                  <Text style={styles.partnerName}>{data.partnerFirstName}</Text>
                  <Text style={styles.partnerEmail}>{data.partnerEmail}</Text>
                </View>
              </View>
              <Button label="Délier le partenaire" onPress={handleUnlinkPartner} variant="danger" />
            </>
          ) : (
            <>
              <Text style={styles.sectionSub}>
                Liez votre compte à votre partenaire pour suivre vos finances ensemble.
              </Text>
              <Input
                label="Email du partenaire"
                value={partnerEmail}
                onChangeText={setPartnerEmail}
                placeholder="partenaire@exemple.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Button label="Lier le compte" onPress={handleLinkPartner} loading={linkingPartner} disabled={!partnerEmail} />
            </>
          )}
        </Card>

        {/* Abonnement */}
        {!data.isPremium && (
          <Card style={[styles.section, styles.premiumCard]}>
            <Text style={styles.premiumTitle}>Passez à Premium ✨</Text>
            <Text style={styles.premiumSub}>Débloque toutes les fonctionnalités</Text>
            <Button label="Voir les offres" onPress={() => router.push("/paywall")} />
          </Card>
        )}

        {/* Support */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <TouchableOpacity style={styles.supportRow}>
            <Text style={styles.supportText}>📧 horizondate@outlook.com</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.supportRow}>
            <Text style={styles.supportText}>🌐 horizondate.app</Text>
          </TouchableOpacity>
        </Card>

        {/* Déconnexion */}
        <Button label="Se déconnecter" onPress={handleLogout} variant="ghost" />
      </ScrollView>
    </SafeAreaView>
  );
}

function FinanceRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.financeRow}>
      <Text style={styles.financeLabel}>{label}</Text>
      <Text style={styles.financeValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xxl },
  profileHeader: { flexDirection: "row", alignItems: "center", gap: SPACING.md },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: `${COLORS.amber}30`, borderWidth: 2, borderColor: COLORS.amber, alignItems: "center", justifyContent: "center" },
  avatarText: { color: COLORS.amber, fontSize: 26, fontWeight: "700" },
  profileName: { color: COLORS.textPrimary, fontSize: 20, fontWeight: "700" },
  profileBadge: { color: COLORS.amber, fontSize: 13 },
  section: { gap: SPACING.md },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: "600" },
  sectionSub: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 18 },
  editBtn: { color: COLORS.amber, fontSize: 14, fontWeight: "600" },
  financeRows: { gap: SPACING.sm },
  financeRow: { flexDirection: "row", justifyContent: "space-between" },
  financeLabel: { color: COLORS.textSecondary, fontSize: 14 },
  financeValue: { color: COLORS.textPrimary, fontWeight: "600", fontSize: 14 },
  partnerLinked: { flexDirection: "row", alignItems: "center", gap: SPACING.md },
  partnerEmoji: { fontSize: 28 },
  partnerName: { color: COLORS.textPrimary, fontWeight: "600" },
  partnerEmail: { color: COLORS.textMuted, fontSize: 12 },
  premiumCard: { borderColor: `${COLORS.amber}40`, borderWidth: 1, backgroundColor: `${COLORS.amber}08` },
  premiumTitle: { color: COLORS.amber, fontSize: 16, fontWeight: "700" },
  premiumSub: { color: COLORS.textSecondary, fontSize: 13 },
  supportRow: { paddingVertical: SPACING.xs },
  supportText: { color: COLORS.textSecondary, fontSize: 14 },
});
