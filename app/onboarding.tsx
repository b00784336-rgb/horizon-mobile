/**
 * Onboarding psychologique — 6 étapes
 * 1. Ancre émotionnelle (pourquoi)
 * 2. Choc de l'âge (âge actuel)
 * 3. Douleur de l'inaction (revenus)
 * 4. Finances (dépenses + épargne)
 * 5. Dettes
 * 6. Révélation FIRE + redirect paywall
 */
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { computeFireYear } from "@/lib/calculations";
import { COLORS, SPACING, RADIUS } from "@/constants/theme";

type WhyOption = "freedom" | "family" | "travel" | "security" | "passion";
type DebtRange = "none" | "low" | "medium" | "high";

interface OnboardingState {
  why: WhyOption | null;
  age: string;
  monthlyIncome: string;
  monthlyExpenses: string;
  currentSavings: string;
  hasDebts: boolean | null;
  debtRange: DebtRange | null;
}

const WHY_OPTIONS: { key: WhyOption; label: string; emoji: string }[] = [
  { key: "freedom", label: "Liberté totale", emoji: "🕊️" },
  { key: "family", label: "Ma famille d'abord", emoji: "👨‍👩‍👧" },
  { key: "travel", label: "Voyager sans limites", emoji: "✈️" },
  { key: "security", label: "Sécurité financière", emoji: "🛡️" },
  { key: "passion", label: "Vivre de ma passion", emoji: "🔥" },
];

const DEBT_RANGES: { key: DebtRange; label: string }[] = [
  { key: "low", label: "Moins de 10 000€" },
  { key: "medium", label: "10 000€ – 50 000€" },
  { key: "high", label: "Plus de 50 000€" },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [state, setState] = useState<OnboardingState>({
    why: null,
    age: "",
    monthlyIncome: "",
    monthlyExpenses: "",
    currentSavings: "",
    hasDebts: null,
    debtRange: null,
  });
  const stateRef = useRef(state);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: (step - 1) / 5,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [step]);

  function nextStep() {
    setStep((s) => Math.min(s + 1, 6));
  }

  function prevStep() {
    setStep((s) => Math.max(s - 1, 1));
  }

  async function handleFinish() {
    setSaving(true);
    setSaveError(false);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      router.replace("/(auth)/login");
      return;
    }

    const s = stateRef.current;
    const updatePayload = {
      onboarding_completed: true,
      onboarding_why: s.why,
      age: parseInt(s.age) || null,
      monthly_income: parseFloat(s.monthlyIncome) || null,
      monthly_expenses: parseFloat(s.monthlyExpenses) || null,
      current_savings: parseFloat(s.currentSavings) || null,
    };

    let profileError = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const { error } = await supabase
        .from("profiles")
        .update(updatePayload)
        .eq("id", user.id);
      if (!error) { profileError = null; break; }
      profileError = error;
      if (attempt < 2) await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
    }

    if (profileError) {
      setSaveError(true);
      setSaving(false);
      return;
    }

    setSaving(false);
    router.replace("/paywall");
  }

  function computeRevealYear(): number {
    const s = stateRef.current;
    return computeFireYear(
      parseInt(s.age) || 30,
      parseFloat(s.monthlyIncome) || 0,
      parseFloat(s.monthlyExpenses) || 0,
      parseFloat(s.currentSavings) || 0,
    );
  }

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <SafeAreaView style={styles.safe}>
      {/* Barre de progression */}
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* ÉTAPE 1 — Pourquoi */}
          {step === 1 && (
            <StepWhy
              value={state.why}
              onChange={(why) => setState((s) => ({ ...s, why }))}
              onNext={nextStep}
            />
          )}

          {/* ÉTAPE 2 — Âge */}
          {step === 2 && (
            <StepAge
              value={state.age}
              onChange={(age) => setState((s) => ({ ...s, age }))}
              onNext={nextStep}
              onBack={prevStep}
            />
          )}

          {/* ÉTAPE 3 — Revenus */}
          {step === 3 && (
            <StepIncome
              income={state.monthlyIncome}
              onChangeIncome={(v) => setState((s) => ({ ...s, monthlyIncome: v }))}
              onNext={nextStep}
              onBack={prevStep}
            />
          )}

          {/* ÉTAPE 4 — Dépenses et épargne */}
          {step === 4 && (
            <StepExpenses
              expenses={state.monthlyExpenses}
              savings={state.currentSavings}
              onChangeExpenses={(v) => setState((s) => ({ ...s, monthlyExpenses: v }))}
              onChangeSavings={(v) => setState((s) => ({ ...s, currentSavings: v }))}
              onNext={nextStep}
              onBack={prevStep}
            />
          )}

          {/* ÉTAPE 5 — Dettes */}
          {step === 5 && (
            <StepDebts
              hasDebts={state.hasDebts}
              debtRange={state.debtRange}
              onChangeHasDebts={(v) => setState((s) => ({ ...s, hasDebts: v, debtRange: null }))}
              onChangeRange={(v) => setState((s) => ({ ...s, debtRange: v }))}
              onNext={nextStep}
              onBack={prevStep}
            />
          )}

          {/* ÉTAPE 6 — Révélation FIRE */}
          {step === 6 && (
            <StepReveal
              fireYear={computeRevealYear()}
              saving={saving}
              saveError={saveError}
              onFinish={handleFinish}
              onBack={prevStep}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ─────────────── Étapes ─────────────── */

function StepWhy({
  value, onChange, onNext,
}: {
  value: WhyOption | null;
  onChange: (v: WhyOption) => void;
  onNext: () => void;
}) {
  return (
    <View style={styles.step}>
      <Text style={styles.stepTitle}>Qu'est-ce qui vous pousse à agir ?</Text>
      <Text style={styles.stepSubtitle}>
        Votre motivation profonde est le carburant de votre liberté.
      </Text>
      <View style={styles.optionGrid}>
        {WHY_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            style={[styles.optionCard, value === opt.key && styles.optionSelected]}
            onPress={() => onChange(opt.key)}
            activeOpacity={0.8}
          >
            <Text style={styles.optionEmoji}>{opt.emoji}</Text>
            <Text style={[styles.optionLabel, value === opt.key && styles.optionLabelSelected]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Button label="Continuer" onPress={onNext} disabled={!value} />
    </View>
  );
}

function StepAge({
  value, onChange, onNext, onBack,
}: {
  value: string;
  onChange: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const age = parseInt(value) || 0;
  const yearsWorked = Math.max(0, age - 22);

  return (
    <View style={styles.step}>
      <Text style={styles.stepTitle}>Quel âge avez-vous ?</Text>
      {age >= 25 && (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Vous avez déjà travaillé environ{" "}
            <Text style={styles.infoHighlight}>{yearsWorked} ans</Text>.{"\n"}
            Combien avez-vous accumulé ? C'est le moment de le calculer.
          </Text>
        </View>
      )}
      <Input
        label="Votre âge"
        value={value}
        onChangeText={onChange}
        placeholder="30"
        keyboardType="number-pad"
        suffix="ans"
      />
      <View style={styles.buttonRow}>
        <Button label="Retour" onPress={onBack} variant="ghost" fullWidth={false} style={{ flex: 1 }} />
        <Button label="Continuer" onPress={onNext} disabled={!value || parseInt(value) < 16} fullWidth={false} style={{ flex: 2 }} />
      </View>
    </View>
  );
}

function StepIncome({
  income, onChangeIncome, onNext, onBack,
}: {
  income: string;
  onChangeIncome: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <View style={styles.step}>
      <Text style={styles.stepTitle}>Vos revenus mensuels nets</Text>
      <Text style={styles.stepSubtitle}>
        Après impôts. C'est votre point de départ — pas de jugement ici.
      </Text>
      <Input
        label="Revenus nets / mois"
        value={income}
        onChangeText={onChangeIncome}
        placeholder="2 500"
        keyboardType="decimal-pad"
        suffix="€/mois"
      />
      <View style={styles.buttonRow}>
        <Button label="Retour" onPress={onBack} variant="ghost" fullWidth={false} style={{ flex: 1 }} />
        <Button label="Continuer" onPress={onNext} disabled={!income} fullWidth={false} style={{ flex: 2 }} />
      </View>
    </View>
  );
}

function StepExpenses({
  expenses, savings, onChangeExpenses, onChangeSavings, onNext, onBack,
}: {
  expenses: string;
  savings: string;
  onChangeExpenses: (v: string) => void;
  onChangeSavings: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <View style={styles.step}>
      <Text style={styles.stepTitle}>Vos finances actuelles</Text>
      <Text style={styles.stepSubtitle}>
        Loyer, courses, sorties... tout confondu. Et votre épargne disponible.
      </Text>
      <Input
        label="Dépenses mensuelles"
        value={expenses}
        onChangeText={onChangeExpenses}
        placeholder="1 800"
        keyboardType="decimal-pad"
        suffix="€/mois"
      />
      <Input
        label="Épargne actuelle"
        value={savings}
        onChangeText={onChangeSavings}
        placeholder="5 000"
        keyboardType="decimal-pad"
        suffix="€"
      />
      <View style={styles.buttonRow}>
        <Button label="Retour" onPress={onBack} variant="ghost" fullWidth={false} style={{ flex: 1 }} />
        <Button label="Continuer" onPress={onNext} disabled={!expenses} fullWidth={false} style={{ flex: 2 }} />
      </View>
    </View>
  );
}

function StepDebts({
  hasDebts, debtRange, onChangeHasDebts, onChangeRange, onNext, onBack,
}: {
  hasDebts: boolean | null;
  debtRange: DebtRange | null;
  onChangeHasDebts: (v: boolean) => void;
  onChangeRange: (v: DebtRange) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const canContinue = hasDebts === false || (hasDebts === true && debtRange !== null);

  return (
    <View style={styles.step}>
      <Text style={styles.stepTitle}>Avez-vous des dettes ?</Text>
      <Text style={styles.stepSubtitle}>
        Crédit conso, prêt étudiant... Les dettes ralentissent votre chemin.
      </Text>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.yesNoBtn, hasDebts === false && styles.yesNoBtnSelected]}
          onPress={() => onChangeHasDebts(false)}
        >
          <Text style={[styles.yesNoText, hasDebts === false && styles.yesNoTextSelected]}>Non</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.yesNoBtn, hasDebts === true && styles.yesNoBtnSelected]}
          onPress={() => onChangeHasDebts(true)}
        >
          <Text style={[styles.yesNoText, hasDebts === true && styles.yesNoTextSelected]}>Oui</Text>
        </TouchableOpacity>
      </View>

      {hasDebts === true && (
        <View style={styles.debtRanges}>
          {DEBT_RANGES.map((r) => (
            <TouchableOpacity
              key={r.key}
              style={[styles.rangeBtn, debtRange === r.key && styles.rangeBtnSelected]}
              onPress={() => onChangeRange(r.key)}
            >
              <Text style={[styles.rangeText, debtRange === r.key && styles.rangeTextSelected]}>
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.buttonRow}>
        <Button label="Retour" onPress={onBack} variant="ghost" fullWidth={false} style={{ flex: 1 }} />
        <Button label="Continuer" onPress={onNext} disabled={!canContinue} fullWidth={false} style={{ flex: 2 }} />
      </View>
      {hasDebts === true && !debtRange && (
        <TouchableOpacity onPress={onNext}>
          <Text style={styles.skipText}>Passer cette étape</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function StepReveal({
  fireYear, saving, saveError, onFinish, onBack,
}: {
  fireYear: number;
  saving: boolean;
  saveError: boolean;
  onFinish: () => void;
  onBack: () => void;
}) {
  return (
    <View style={styles.step}>
      <Text style={styles.revealLabel}>Votre liberté financière</Text>
      <Text style={styles.revealYear}>{fireYear}</Text>
      <Text style={styles.revealSub}>
        C'est votre cap. Horizon vous guide chaque mois pour y arriver.
      </Text>

      {saveError && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>
            Erreur de sauvegarde. Vérifiez votre connexion.
          </Text>
        </View>
      )}

      <Button
        label={saveError ? "Réessayer" : "Commencer mon parcours"}
        onPress={onFinish}
        loading={saving}
      />
      <Button label="Retour" onPress={onBack} variant="ghost" />
    </View>
  );
}

/* ─────────────── Styles ─────────────── */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  progressTrack: {
    height: 3,
    backgroundColor: COLORS.bgElevated,
  },
  progressBar: {
    height: 3,
    backgroundColor: COLORS.amber,
  },
  content: {
    flexGrow: 1,
    padding: SPACING.lg,
  },
  step: {
    flex: 1,
    gap: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  stepTitle: {
    color: COLORS.textPrimary,
    fontSize: 26,
    fontWeight: "700",
    lineHeight: 32,
  },
  stepSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginTop: -SPACING.sm,
  },
  infoBox: {
    backgroundColor: COLORS.bgElevated,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.amber,
  },
  infoText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  infoHighlight: {
    color: COLORS.amber,
    fontWeight: "700",
  },
  buttonRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  optionGrid: {
    gap: SPACING.sm,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.md,
  },
  optionSelected: {
    borderColor: COLORS.amber,
    backgroundColor: `${COLORS.amber}15`,
  },
  optionEmoji: { fontSize: 22 },
  optionLabel: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: "500",
  },
  optionLabelSelected: {
    color: COLORS.amber,
  },
  yesNoBtn: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    backgroundColor: COLORS.bgCard,
  },
  yesNoBtnSelected: {
    borderColor: COLORS.amber,
    backgroundColor: `${COLORS.amber}20`,
  },
  yesNoText: { color: COLORS.textSecondary, fontWeight: "600", fontSize: 16 },
  yesNoTextSelected: { color: COLORS.amber },
  debtRanges: { gap: SPACING.sm },
  rangeBtn: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
    alignItems: "center",
  },
  rangeBtnSelected: {
    borderColor: COLORS.amber,
    backgroundColor: `${COLORS.amber}20`,
  },
  rangeText: { color: COLORS.textSecondary, fontWeight: "500" },
  rangeTextSelected: { color: COLORS.amber },
  skipText: {
    color: COLORS.textMuted,
    textAlign: "center",
    fontSize: 13,
    textDecorationLine: "underline",
  },
  revealLabel: {
    color: COLORS.textSecondary,
    fontSize: 15,
    textAlign: "center",
    marginTop: SPACING.xl,
  },
  revealYear: {
    color: COLORS.amber,
    fontSize: 80,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -3,
  },
  revealSub: {
    color: COLORS.textSecondary,
    textAlign: "center",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  errorBox: {
    backgroundColor: `${COLORS.danger}20`,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  errorText: { color: COLORS.danger, fontSize: 14, textAlign: "center" },
});
