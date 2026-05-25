import { create } from "zustand";
import { supabase } from "./supabase";
import { computeFire } from "./calculations";

export interface HorizonData {
  // Profil
  firstName: string;
  age: number;
  isPremium: boolean;
  onboardingCompleted: boolean;
  onboardingWhy: string | null;

  // Finances
  monthlyIncome: number;
  monthlyExpenses: number;
  currentSavings: number;
  monthlyInvestment: number;

  // Budget catégories
  budgetCategories: BudgetCategory[];

  // Patrimoine
  assets: Asset[];

  // Objectifs
  goals: Goal[];

  // Streaks
  streak: number;
  lastUpdateAt: string | null;

  // Mode couple
  partnerEmail: string | null;
  partnerId: string | null;
  partnerFirstName: string | null;
}

export interface BudgetCategory {
  id: string;
  name: string;
  budget: number;
  spent: number;
  icon: string;
  color: string;
}

export interface Asset {
  id: string;
  name: string;
  value: number;
  type: "savings" | "stocks" | "real_estate" | "crypto" | "other";
  monthly_contribution: number;
}

export interface Goal {
  id: string;
  name: string;
  target: number;
  current: number;
  deadline: string | null;
  icon: string;
}

const EMPTY_DATA: HorizonData = {
  firstName: "",
  age: 30,
  isPremium: false,
  onboardingCompleted: true, // true par défaut pour éviter un flash
  onboardingWhy: null,
  monthlyIncome: 0,
  monthlyExpenses: 0,
  currentSavings: 0,
  monthlyInvestment: 0,
  budgetCategories: [],
  assets: [],
  goals: [],
  streak: 0,
  lastUpdateAt: null,
  partnerEmail: null,
  partnerId: null,
  partnerFirstName: null,
};

interface HorizonStore {
  data: HorizonData;
  loaded: boolean;
  userId: string | null;
  setData: (updater: Partial<HorizonData> | ((prev: HorizonData) => HorizonData)) => void;
  loadProfile: () => Promise<void>;
  updateField: <K extends keyof HorizonData>(field: K, value: HorizonData[K]) => Promise<void>;
  updateStreak: () => Promise<void>;
  getFireResult: () => ReturnType<typeof computeFire>;
  reset: () => void;
}

export const useHorizonStore = create<HorizonStore>((set, get) => ({
  data: EMPTY_DATA,
  loaded: false,
  userId: null,

  setData: (updater) => {
    if (typeof updater === "function") {
      set((state) => ({ data: updater(state.data) }));
    } else {
      set((state) => ({ data: { ...state.data, ...updater } }));
    }
  },

  loadProfile: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      set({ loaded: true });
      return;
    }

    set({ userId: user.id });

    const { data: profile } = await supabase
      .from("profiles")
      .select(`
        first_name, age, is_premium,
        onboarding_completed, onboarding_why,
        monthly_income, monthly_expenses,
        current_savings, monthly_investment,
        current_streak, last_update_at,
        partner_email, partner_id, partner_first_name
      `)
      .eq("id", user.id)
      .single();

    if (!profile) {
      set({ loaded: true });
      return;
    }

    // Budget categories
    const { data: budgets } = await supabase
      .from("budget_categories")
      .select("*")
      .eq("user_id", user.id);

    // Assets
    const { data: assets } = await supabase
      .from("assets")
      .select("*")
      .eq("user_id", user.id);

    // Goals
    const { data: goals } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", user.id);

    set({
      loaded: true,
      data: {
        firstName: profile.first_name ?? "",
        age: profile.age ?? 30,
        isPremium: profile.is_premium ?? false,
        onboardingCompleted: profile.onboarding_completed ?? false,
        onboardingWhy: profile.onboarding_why ?? null,
        monthlyIncome: profile.monthly_income ?? 0,
        monthlyExpenses: profile.monthly_expenses ?? 0,
        currentSavings: profile.current_savings ?? 0,
        monthlyInvestment: profile.monthly_investment ?? 0,
        budgetCategories: budgets ?? [],
        assets: assets ?? [],
        goals: goals ?? [],
        streak: profile.current_streak ?? 0,
        lastUpdateAt: profile.last_update_at ?? null,
        partnerEmail: profile.partner_email ?? null,
        partnerId: profile.partner_id ?? null,
        partnerFirstName: profile.partner_first_name ?? null,
      },
    });
  },

  updateField: async (field, value) => {
    const userId = get().userId;
    if (!userId) return;

    get().setData({ [field]: value } as any);

    const fieldMap: Partial<Record<keyof HorizonData, string>> = {
      firstName: "first_name",
      age: "age",
      monthlyIncome: "monthly_income",
      monthlyExpenses: "monthly_expenses",
      currentSavings: "current_savings",
      monthlyInvestment: "monthly_investment",
    };

    const dbField = fieldMap[field];
    if (!dbField) return;

    await supabase
      .from("profiles")
      .update({ [dbField]: value })
      .eq("id", userId);
  },

  updateStreak: async () => {
    const { data, userId } = get();
    if (!userId) return;

    const now = new Date();
    const lastUpdate = data.lastUpdateAt ? new Date(data.lastUpdateAt) : null;

    // Calcul nouvelle streak
    let newStreak = data.streak;
    if (!lastUpdate) {
      newStreak = 1;
    } else {
      const diffDays = Math.floor(
        (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays === 1) {
        newStreak = data.streak + 1;
      } else if (diffDays > 1) {
        newStreak = 1;
      }
      // diffDays === 0 → déjà mis à jour aujourd'hui, pas de changement
    }

    const prevStreak = data.streak;
    const prevLastUpdateAt = data.lastUpdateAt;
    const nowIso = now.toISOString();

    // Optimistic update
    get().setData((prev) => ({ ...prev, streak: newStreak, lastUpdateAt: nowIso }));

    const { error } = await supabase
      .from("profiles")
      .update({ current_streak: newStreak, last_update_at: nowIso })
      .eq("id", userId);

    if (error) {
      // Rollback
      get().setData((prev) => ({ ...prev, streak: prevStreak, lastUpdateAt: prevLastUpdateAt }));
    }
  },

  getFireResult: () => {
    const { data } = get();
    return computeFire({
      monthlyIncome: data.monthlyIncome,
      monthlyExpenses: data.monthlyExpenses,
      currentSavings: data.currentSavings,
      currentAge: data.age,
      monthlyReturn: 0.007,
      withdrawalRate: 0.04,
    });
  },

  reset: () => {
    set({ data: EMPTY_DATA, loaded: false, userId: null });
  },
}));
