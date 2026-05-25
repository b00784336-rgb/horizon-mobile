/**
 * Onglet Budget — Catégories de dépenses avec suivi mensuel
 */
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useHorizonStore, BudgetCategory } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/calculations";
import { COLORS, SPACING, RADIUS } from "@/constants/theme";

const CATEGORY_ICONS = ["🏠", "🍔", "🚗", "👕", "💊", "🎮", "📚", "✈️", "💡", "📱"];
const CATEGORY_COLORS = [
  "#F59E0B", "#10B981", "#3B82F6", "#EC4899",
  "#8B5CF6", "#14B8A6", "#F97316", "#EF4444",
];

export default function BudgetTab() {
  const { data, setData, userId } = useHorizonStore();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<BudgetCategory | null>(null);
  const [form, setForm] = useState({ name: "", budget: "", spent: "", icon: "🏠", color: CATEGORY_COLORS[0] });
  const [saving, setSaving] = useState(false);

  const totalBudget = data.budgetCategories.reduce((s, c) => s + c.budget, 0);
  const totalSpent = data.budgetCategories.reduce((s, c) => s + c.spent, 0);

  function openAdd() {
    setEditing(null);
    setForm({ name: "", budget: "", spent: "", icon: "🏠", color: CATEGORY_COLORS[0] });
    setShowModal(true);
  }

  function openEdit(cat: BudgetCategory) {
    setEditing(cat);
    setForm({
      name: cat.name,
      budget: String(cat.budget),
      spent: String(cat.spent),
      icon: cat.icon,
      color: cat.color,
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name || !form.budget) return;
    setSaving(true);

    const userId_ = useHorizonStore.getState().userId;
    if (!userId_) { setSaving(false); return; }

    if (editing) {
      const updated = {
        name: form.name,
        budget: parseFloat(form.budget),
        spent: parseFloat(form.spent) || 0,
        icon: form.icon,
        color: form.color,
      };
      await supabase.from("budget_categories").update(updated).eq("id", editing.id);
      setData((prev) => ({
        ...prev,
        budgetCategories: prev.budgetCategories.map((c) =>
          c.id === editing.id ? { ...c, ...updated } : c
        ),
      }));
    } else {
      const newCat = {
        user_id: userId_,
        name: form.name,
        budget: parseFloat(form.budget),
        spent: parseFloat(form.spent) || 0,
        icon: form.icon,
        color: form.color,
      };
      const { data: inserted } = await supabase
        .from("budget_categories")
        .insert(newCat)
        .select()
        .single();

      if (inserted) {
        setData((prev) => ({
          ...prev,
          budgetCategories: [...prev.budgetCategories, inserted],
        }));
      }
    }

    setSaving(false);
    setShowModal(false);
  }

  async function handleDelete(id: string) {
    Alert.alert("Supprimer", "Supprimer cette catégorie ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer", style: "destructive",
        onPress: async () => {
          await supabase.from("budget_categories").delete().eq("id", id);
          setData((prev) => ({
            ...prev,
            budgetCategories: prev.budgetCategories.filter((c) => c.id !== id),
          }));
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Budget</Text>
          <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
            <Text style={styles.addBtnText}>+ Ajouter</Text>
          </TouchableOpacity>
        </View>

        {/* Résumé */}
        <Card style={styles.summary}>
          <View style={styles.summaryRow}>
            <SummaryItem label="Budget total" value={formatCurrency(totalBudget)} />
            <SummaryItem label="Dépensé" value={formatCurrency(totalSpent)} color={totalSpent > totalBudget ? COLORS.danger : COLORS.success} />
            <SummaryItem label="Restant" value={formatCurrency(Math.max(0, totalBudget - totalSpent))} />
          </View>
          <View style={styles.globalBar}>
            <View
              style={[
                styles.globalFill,
                {
                  width: `${Math.min(100, totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0)}%`,
                  backgroundColor: totalSpent > totalBudget ? COLORS.danger : COLORS.amber,
                },
              ]}
            />
          </View>
        </Card>

        {/* Catégories */}
        {data.budgetCategories.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Aucune catégorie. Ajoutez votre première.</Text>
          </View>
        ) : (
          data.budgetCategories.map((cat) => (
            <CategoryRow
              key={cat.id}
              cat={cat}
              onEdit={() => openEdit(cat)}
              onDelete={() => handleDelete(cat.id)}
            />
          ))
        )}
      </ScrollView>

      {/* Modal ajout/édition */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>{editing ? "Modifier" : "Nouvelle catégorie"}</Text>

          <Input label="Nom" value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="Loyer" />
          <Input label="Budget mensuel" value={form.budget} onChangeText={(v) => setForm((f) => ({ ...f, budget: v }))} keyboardType="decimal-pad" suffix="€" />
          <Input label="Déjà dépensé" value={form.spent} onChangeText={(v) => setForm((f) => ({ ...f, spent: v }))} keyboardType="decimal-pad" suffix="€" />

          {/* Icônes */}
          <Text style={styles.pickerLabel}>Icône</Text>
          <View style={styles.iconPicker}>
            {CATEGORY_ICONS.map((icon) => (
              <TouchableOpacity
                key={icon}
                style={[styles.iconOpt, form.icon === icon && styles.iconOptSelected]}
                onPress={() => setForm((f) => ({ ...f, icon }))}
              >
                <Text style={styles.iconOptText}>{icon}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.modalButtons}>
            <Button label="Annuler" onPress={() => setShowModal(false)} variant="ghost" fullWidth={false} style={{ flex: 1 }} />
            <Button label="Enregistrer" onPress={handleSave} loading={saving} fullWidth={false} style={{ flex: 2 }} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function CategoryRow({
  cat, onEdit, onDelete,
}: {
  cat: BudgetCategory;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const pct = cat.budget > 0 ? Math.min(1, cat.spent / cat.budget) : 0;
  const over = cat.spent > cat.budget;

  return (
    <TouchableOpacity onPress={onEdit} onLongPress={onDelete} activeOpacity={0.8}>
      <Card style={styles.catCard}>
        <View style={styles.catHeader}>
          <Text style={styles.catIcon}>{cat.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.catName}>{cat.name}</Text>
            <Text style={styles.catSub}>
              {formatCurrency(cat.spent)} / {formatCurrency(cat.budget)}
            </Text>
          </View>
          <Text style={[styles.catPct, { color: over ? COLORS.danger : COLORS.success }]}>
            {(pct * 100).toFixed(0)}%
          </Text>
        </View>
        <View style={styles.catBar}>
          <View
            style={[
              styles.catFill,
              { width: `${pct * 100}%`, backgroundColor: over ? COLORS.danger : cat.color },
            ]}
          />
        </View>
      </Card>
    </TouchableOpacity>
  );
}

function SummaryItem({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ alignItems: "center" }}>
      <Text style={[styles.summaryValue, color ? { color } : null]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xxl },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { color: COLORS.textPrimary, fontSize: 24, fontWeight: "700" },
  addBtn: { backgroundColor: `${COLORS.amber}20`, borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: `${COLORS.amber}40` },
  addBtnText: { color: COLORS.amber, fontWeight: "600", fontSize: 14 },
  summary: { gap: SPACING.sm },
  summaryRow: { flexDirection: "row", justifyContent: "space-around" },
  summaryValue: { color: COLORS.textPrimary, fontWeight: "700", fontSize: 16 },
  summaryLabel: { color: COLORS.textMuted, fontSize: 11 },
  globalBar: { height: 6, backgroundColor: COLORS.bgElevated, borderRadius: RADIUS.full, overflow: "hidden" },
  globalFill: { height: "100%", borderRadius: RADIUS.full },
  empty: { alignItems: "center", padding: SPACING.xl },
  emptyText: { color: COLORS.textMuted, fontSize: 14 },
  catCard: { gap: SPACING.sm },
  catHeader: { flexDirection: "row", gap: SPACING.sm, alignItems: "center" },
  catIcon: { fontSize: 24 },
  catName: { color: COLORS.textPrimary, fontWeight: "600", fontSize: 15 },
  catSub: { color: COLORS.textMuted, fontSize: 12 },
  catPct: { fontWeight: "700", fontSize: 14 },
  catBar: { height: 6, backgroundColor: COLORS.bgElevated, borderRadius: RADIUS.full, overflow: "hidden" },
  catFill: { height: "100%", borderRadius: RADIUS.full },
  modal: { flex: 1, backgroundColor: COLORS.bg, padding: SPACING.lg, gap: SPACING.md },
  modalTitle: { color: COLORS.textPrimary, fontSize: 20, fontWeight: "700" },
  pickerLabel: { color: COLORS.textSecondary, fontSize: 13, fontWeight: "500" },
  iconPicker: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  iconOpt: { width: 44, height: 44, borderRadius: RADIUS.md, backgroundColor: COLORS.bgCard, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: COLORS.border },
  iconOptSelected: { borderColor: COLORS.amber, backgroundColor: `${COLORS.amber}20` },
  iconOptText: { fontSize: 20 },
  modalButtons: { flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.md },
});
