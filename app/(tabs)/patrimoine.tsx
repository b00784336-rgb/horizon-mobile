/**
 * Onglet Patrimoine — Actifs + évolution estimée
 */
import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Modal, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useHorizonStore, Asset } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatCompact } from "@/lib/calculations";
import { COLORS, SPACING, RADIUS } from "@/constants/theme";

const ASSET_TYPES: { key: Asset["type"]; label: string; emoji: string }[] = [
  { key: "savings", label: "Épargne", emoji: "🏦" },
  { key: "stocks", label: "Actions / ETF", emoji: "📈" },
  { key: "real_estate", label: "Immobilier", emoji: "🏠" },
  { key: "crypto", label: "Crypto", emoji: "₿" },
  { key: "other", label: "Autre", emoji: "📦" },
];

export default function PatrimoineTab() {
  const { data, setData } = useHorizonStore();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [form, setForm] = useState({ name: "", value: "", monthly: "", type: "savings" as Asset["type"] });
  const [saving, setSaving] = useState(false);

  const totalPatrimoine = data.assets.reduce((s, a) => s + a.value, 0);
  const totalMonthly = data.assets.reduce((s, a) => s + (a.monthly_contribution ?? 0), 0);

  // Projection 10 ans (7% annuel)
  const projection10 = totalPatrimoine * Math.pow(1.07, 10) +
    totalMonthly * 12 * ((Math.pow(1.07, 10) - 1) / 0.07);

  function openAdd() {
    setEditing(null);
    setForm({ name: "", value: "", monthly: "", type: "savings" });
    setShowModal(true);
  }

  function openEdit(asset: Asset) {
    setEditing(asset);
    setForm({
      name: asset.name,
      value: String(asset.value),
      monthly: String(asset.monthly_contribution ?? 0),
      type: asset.type,
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name || !form.value) return;
    setSaving(true);
    const userId = useHorizonStore.getState().userId;
    if (!userId) { setSaving(false); return; }

    if (editing) {
      const updated = {
        name: form.name,
        value: parseFloat(form.value),
        monthly_contribution: parseFloat(form.monthly) || 0,
        type: form.type,
      };
      await supabase.from("assets").update(updated).eq("id", editing.id);
      setData((prev) => ({
        ...prev,
        assets: prev.assets.map((a) => a.id === editing.id ? { ...a, ...updated } : a),
      }));
    } else {
      const newAsset = {
        user_id: userId,
        name: form.name,
        value: parseFloat(form.value),
        monthly_contribution: parseFloat(form.monthly) || 0,
        type: form.type,
      };
      const { data: inserted } = await supabase.from("assets").insert(newAsset).select().single();
      if (inserted) setData((prev) => ({ ...prev, assets: [...prev.assets, inserted] }));
    }
    setSaving(false);
    setShowModal(false);
  }

  async function handleDelete(id: string) {
    Alert.alert("Supprimer", "Supprimer cet actif ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer", style: "destructive",
        onPress: async () => {
          await supabase.from("assets").delete().eq("id", id);
          setData((prev) => ({ ...prev, assets: prev.assets.filter((a) => a.id !== id) }));
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Patrimoine</Text>
          <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
            <Text style={styles.addBtnText}>+ Ajouter</Text>
          </TouchableOpacity>
        </View>

        {/* Total */}
        <Card elevated style={styles.totalCard}>
          <Text style={styles.totalLabel}>Patrimoine total</Text>
          <Text style={styles.totalValue}>{formatCurrency(totalPatrimoine)}</Text>
          <View style={styles.projRow}>
            <View>
              <Text style={styles.projLabel}>Contribution / mois</Text>
              <Text style={styles.projValue}>{formatCurrency(totalMonthly)}</Text>
            </View>
            <View>
              <Text style={styles.projLabel}>Projection 10 ans</Text>
              <Text style={[styles.projValue, { color: COLORS.success }]}>
                {formatCompact(projection10)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Répartition par type */}
        <Text style={styles.sectionTitle}>Répartition</Text>
        {ASSET_TYPES.map((type) => {
          const typeAssets = data.assets.filter((a) => a.type === type.key);
          const typeTotal = typeAssets.reduce((s, a) => s + a.value, 0);
          if (typeTotal === 0) return null;
          const pct = totalPatrimoine > 0 ? typeTotal / totalPatrimoine : 0;
          return (
            <Card key={type.key} style={styles.typeCard}>
              <View style={styles.typeHeader}>
                <Text style={styles.typeEmoji}>{type.emoji}</Text>
                <Text style={styles.typeName}>{type.label}</Text>
                <Text style={styles.typeValue}>{formatCurrency(typeTotal)}</Text>
                <Text style={styles.typePct}>{(pct * 100).toFixed(0)}%</Text>
              </View>
            </Card>
          );
        })}

        {/* Liste des actifs */}
        <Text style={styles.sectionTitle}>Mes actifs</Text>
        {data.assets.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Aucun actif. Ajoutez votre premier actif.</Text>
          </View>
        ) : (
          data.assets.map((asset) => (
            <TouchableOpacity key={asset.id} onPress={() => openEdit(asset)} onLongPress={() => handleDelete(asset.id)} activeOpacity={0.8}>
              <Card style={styles.assetCard}>
                <Text style={styles.assetEmoji}>
                  {ASSET_TYPES.find((t) => t.key === asset.type)?.emoji ?? "📦"}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.assetName}>{asset.name}</Text>
                  {asset.monthly_contribution > 0 && (
                    <Text style={styles.assetSub}>+{formatCurrency(asset.monthly_contribution)}/mois</Text>
                  )}
                </View>
                <Text style={styles.assetValue}>{formatCurrency(asset.value)}</Text>
              </Card>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>{editing ? "Modifier l'actif" : "Nouvel actif"}</Text>

          {/* Type */}
          <Text style={styles.pickerLabel}>Type</Text>
          <View style={styles.typePicker}>
            {ASSET_TYPES.map((t) => (
              <TouchableOpacity
                key={t.key}
                style={[styles.typeOpt, form.type === t.key && styles.typeOptSelected]}
                onPress={() => setForm((f) => ({ ...f, type: t.key }))}
              >
                <Text style={styles.typeOptEmoji}>{t.emoji}</Text>
                <Text style={[styles.typeOptLabel, form.type === t.key && { color: COLORS.amber }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input label="Nom" value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="PEA Vanguard" />
          <Input label="Valeur actuelle" value={form.value} onChangeText={(v) => setForm((f) => ({ ...f, value: v }))} keyboardType="decimal-pad" suffix="€" />
          <Input label="Versement mensuel" value={form.monthly} onChangeText={(v) => setForm((f) => ({ ...f, monthly: v }))} keyboardType="decimal-pad" suffix="€/mois" />

          <View style={styles.modalButtons}>
            <Button label="Annuler" onPress={() => setShowModal(false)} variant="ghost" fullWidth={false} style={{ flex: 1 }} />
            <Button label="Enregistrer" onPress={handleSave} loading={saving} fullWidth={false} style={{ flex: 2 }} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xxl },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { color: COLORS.textPrimary, fontSize: 24, fontWeight: "700" },
  addBtn: { backgroundColor: `${COLORS.amber}20`, borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: `${COLORS.amber}40` },
  addBtnText: { color: COLORS.amber, fontWeight: "600", fontSize: 14 },
  totalCard: { gap: SPACING.sm },
  totalLabel: { color: COLORS.textSecondary, fontSize: 13 },
  totalValue: { color: COLORS.amber, fontSize: 36, fontWeight: "800" },
  projRow: { flexDirection: "row", justifyContent: "space-between" },
  projLabel: { color: COLORS.textMuted, fontSize: 11 },
  projValue: { color: COLORS.textPrimary, fontWeight: "700", fontSize: 15 },
  sectionTitle: { color: COLORS.textSecondary, fontSize: 12, textTransform: "uppercase", letterSpacing: 1, fontWeight: "600" },
  typeCard: { padding: SPACING.sm },
  typeHeader: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  typeEmoji: { fontSize: 20 },
  typeName: { flex: 1, color: COLORS.textSecondary, fontSize: 14 },
  typeValue: { color: COLORS.textPrimary, fontWeight: "600" },
  typePct: { color: COLORS.textMuted, fontSize: 12, width: 36, textAlign: "right" },
  empty: { alignItems: "center", padding: SPACING.xl },
  emptyText: { color: COLORS.textMuted, fontSize: 14 },
  assetCard: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  assetEmoji: { fontSize: 22 },
  assetName: { color: COLORS.textPrimary, fontWeight: "600", fontSize: 15 },
  assetSub: { color: COLORS.success, fontSize: 12 },
  assetValue: { color: COLORS.amber, fontWeight: "700", fontSize: 16 },
  modal: { flex: 1, backgroundColor: COLORS.bg, padding: SPACING.lg, gap: SPACING.md },
  modalTitle: { color: COLORS.textPrimary, fontSize: 20, fontWeight: "700" },
  pickerLabel: { color: COLORS.textSecondary, fontSize: 13, fontWeight: "500" },
  typePicker: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeOpt: { padding: SPACING.sm, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bgCard, alignItems: "center", minWidth: 80 },
  typeOptSelected: { borderColor: COLORS.amber, backgroundColor: `${COLORS.amber}15` },
  typeOptEmoji: { fontSize: 18 },
  typeOptLabel: { color: COLORS.textSecondary, fontSize: 11 },
  modalButtons: { flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.md },
});
