/**
 * Onglet Objectifs — Cibles financières avec progression
 */
import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Modal, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useHorizonStore, Goal } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/calculations";
import { COLORS, SPACING, RADIUS } from "@/constants/theme";

const GOAL_ICONS = ["🎯", "🏠", "✈️", "🚗", "💍", "🎓", "👶", "🌴", "💻", "🏋️"];

export default function ObjectifsTab() {
  const { data, setData } = useHorizonStore();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [form, setForm] = useState({ name: "", target: "", current: "", deadline: "", icon: "🎯" });
  const [saving, setSaving] = useState(false);

  function openAdd() {
    setEditing(null);
    setForm({ name: "", target: "", current: "", deadline: "", icon: "🎯" });
    setShowModal(true);
  }

  function openEdit(goal: Goal) {
    setEditing(goal);
    setForm({
      name: goal.name,
      target: String(goal.target),
      current: String(goal.current),
      deadline: goal.deadline ?? "",
      icon: goal.icon,
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name || !form.target) return;
    setSaving(true);
    const userId = useHorizonStore.getState().userId;
    if (!userId) { setSaving(false); return; }

    if (editing) {
      const updated = {
        name: form.name,
        target: parseFloat(form.target),
        current: parseFloat(form.current) || 0,
        deadline: form.deadline || null,
        icon: form.icon,
      };
      await supabase.from("goals").update(updated).eq("id", editing.id);
      setData((prev) => ({
        ...prev,
        goals: prev.goals.map((g) => g.id === editing.id ? { ...g, ...updated } : g),
      }));
    } else {
      const newGoal = {
        user_id: userId,
        name: form.name,
        target: parseFloat(form.target),
        current: parseFloat(form.current) || 0,
        deadline: form.deadline || null,
        icon: form.icon,
      };
      const { data: inserted } = await supabase.from("goals").insert(newGoal).select().single();
      if (inserted) setData((prev) => ({ ...prev, goals: [...prev.goals, inserted] }));
    }
    setSaving(false);
    setShowModal(false);
  }

  async function handleDelete(id: string) {
    Alert.alert("Supprimer", "Supprimer cet objectif ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer", style: "destructive",
        onPress: async () => {
          await supabase.from("goals").delete().eq("id", id);
          setData((prev) => ({ ...prev, goals: prev.goals.filter((g) => g.id !== id) }));
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Objectifs</Text>
          <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
            <Text style={styles.addBtnText}>+ Ajouter</Text>
          </TouchableOpacity>
        </View>

        {data.goals.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🎯</Text>
            <Text style={styles.emptyTitle}>Aucun objectif</Text>
            <Text style={styles.emptyText}>
              Définissez vos cibles financières : maison, voyage, retraite anticipée...
            </Text>
            <Button label="Créer mon premier objectif" onPress={openAdd} style={{ marginTop: SPACING.md }} />
          </View>
        ) : (
          data.goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={() => openEdit(goal)}
              onDelete={() => handleDelete(goal.id)}
            />
          ))
        )}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>{editing ? "Modifier" : "Nouvel objectif"}</Text>

          {/* Icônes */}
          <Text style={styles.pickerLabel}>Icône</Text>
          <View style={styles.iconPicker}>
            {GOAL_ICONS.map((icon) => (
              <TouchableOpacity
                key={icon}
                style={[styles.iconOpt, form.icon === icon && styles.iconOptSelected]}
                onPress={() => setForm((f) => ({ ...f, icon }))}
              >
                <Text style={styles.iconOptText}>{icon}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input label="Nom de l'objectif" value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="Achat immobilier" />
          <Input label="Montant cible" value={form.target} onChangeText={(v) => setForm((f) => ({ ...f, target: v }))} keyboardType="decimal-pad" suffix="€" />
          <Input label="Montant actuel" value={form.current} onChangeText={(v) => setForm((f) => ({ ...f, current: v }))} keyboardType="decimal-pad" suffix="€" />
          <Input label="Date limite (optionnel)" value={form.deadline} onChangeText={(v) => setForm((f) => ({ ...f, deadline: v }))} placeholder="2027-06-01" />

          <View style={styles.modalButtons}>
            <Button label="Annuler" onPress={() => setShowModal(false)} variant="ghost" fullWidth={false} style={{ flex: 1 }} />
            <Button label="Enregistrer" onPress={handleSave} loading={saving} fullWidth={false} style={{ flex: 2 }} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function GoalCard({ goal, onEdit, onDelete }: { goal: Goal; onEdit: () => void; onDelete: () => void }) {
  const pct = goal.target > 0 ? Math.min(1, goal.current / goal.target) : 0;
  const done = pct >= 1;

  return (
    <TouchableOpacity onPress={onEdit} onLongPress={onDelete} activeOpacity={0.8}>
      <Card style={styles.goalCard}>
        <View style={styles.goalHeader}>
          <Text style={styles.goalIcon}>{goal.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.goalName}>{goal.name}</Text>
            {goal.deadline && (
              <Text style={styles.goalDeadline}>Avant {goal.deadline}</Text>
            )}
          </View>
          {done && <Text style={styles.goalDone}>✓</Text>}
        </View>
        <View style={styles.goalBarBg}>
          <View style={[styles.goalBarFill, { width: `${pct * 100}%`, backgroundColor: done ? COLORS.success : COLORS.amber }]} />
        </View>
        <View style={styles.goalFooter}>
          <Text style={styles.goalCurrent}>{formatCurrency(goal.current)}</Text>
          <Text style={styles.goalPct}>{(pct * 100).toFixed(0)}%</Text>
          <Text style={styles.goalTarget}>{formatCurrency(goal.target)}</Text>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xxl },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { color: COLORS.textPrimary, fontSize: 24, fontWeight: "700" },
  addBtn: { backgroundColor: `${COLORS.amber}20`, borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: `${COLORS.amber}40` },
  addBtnText: { color: COLORS.amber, fontWeight: "600", fontSize: 14 },
  empty: { alignItems: "center", padding: SPACING.xl, gap: SPACING.sm },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 20, fontWeight: "700" },
  emptyText: { color: COLORS.textSecondary, fontSize: 14, textAlign: "center", lineHeight: 20 },
  goalCard: { gap: SPACING.sm },
  goalHeader: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  goalIcon: { fontSize: 24 },
  goalName: { color: COLORS.textPrimary, fontWeight: "600", fontSize: 15 },
  goalDeadline: { color: COLORS.textMuted, fontSize: 12 },
  goalDone: { color: COLORS.success, fontSize: 20, fontWeight: "700" },
  goalBarBg: { height: 8, backgroundColor: COLORS.bgElevated, borderRadius: RADIUS.full, overflow: "hidden" },
  goalBarFill: { height: "100%", borderRadius: RADIUS.full },
  goalFooter: { flexDirection: "row", justifyContent: "space-between" },
  goalCurrent: { color: COLORS.textSecondary, fontSize: 12 },
  goalPct: { color: COLORS.amber, fontWeight: "700", fontSize: 13 },
  goalTarget: { color: COLORS.textSecondary, fontSize: 12 },
  modal: { flex: 1, backgroundColor: COLORS.bg, padding: SPACING.lg, gap: SPACING.md },
  modalTitle: { color: COLORS.textPrimary, fontSize: 20, fontWeight: "700" },
  pickerLabel: { color: COLORS.textSecondary, fontSize: 13, fontWeight: "500" },
  iconPicker: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  iconOpt: { width: 44, height: 44, borderRadius: RADIUS.md, backgroundColor: COLORS.bgCard, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: COLORS.border },
  iconOptSelected: { borderColor: COLORS.amber, backgroundColor: `${COLORS.amber}20` },
  iconOptText: { fontSize: 20 },
  modalButtons: { flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.md },
});
