// Calculs FIRE — identiques à la version web (horizon/src/lib/calculations.ts)

export interface FireInputs {
  monthlyIncome: number;       // revenus mensuels nets
  monthlyExpenses: number;     // dépenses mensuelles
  currentSavings: number;      // épargne actuelle
  currentAge: number;          // âge actuel
  monthlyReturn: number;       // rendement mensuel (ex: 0.007 = 0.7%)
  withdrawalRate: number;      // taux de retrait sûr (ex: 0.04 = 4%)
}

export interface FireResult {
  fireNumber: number;          // capital cible
  yearsToFire: number;         // années avant l'indépendance
  fireAge: number;             // âge à la FIRE
  monthlySavings: number;      // épargne mensuelle = income - expenses
}

/**
 * Calcul FIRE par simulation mensuelle avec intérêts composés.
 * Formule identique au SaaS web.
 */
export function computeFire(inputs: FireInputs): FireResult {
  const {
    monthlyIncome,
    monthlyExpenses,
    currentSavings,
    currentAge,
    monthlyReturn,
    withdrawalRate,
  } = inputs;

  const monthlySavings = Math.max(0, monthlyIncome - monthlyExpenses);
  const annualSavings = monthlySavings * 12;
  const fireNumber = (annualSavings / withdrawalRate);

  // Si aucune épargne possible, retour indéfini
  if (monthlySavings <= 0) {
    return {
      fireNumber: 0,
      yearsToFire: 999,
      fireAge: 999,
      monthlySavings: 0,
    };
  }

  // Simulation mois par mois
  let capital = currentSavings;
  let months = 0;
  const maxMonths = 600; // 50 ans max

  while (capital < fireNumber && months < maxMonths) {
    capital = capital * (1 + monthlyReturn) + monthlySavings;
    months++;
  }

  const yearsToFire = months / 12;
  const fireAge = currentAge + yearsToFire;

  return {
    fireNumber,
    yearsToFire,
    fireAge,
    monthlySavings,
  };
}

/**
 * Retourne l'année civile estimée de la FIRE.
 */
export function computeFireYear(
  currentAge: number,
  monthlyIncome: number,
  monthlyExpenses: number,
  currentSavings: number,
  monthlyReturn = 0.007,
  withdrawalRate = 0.04
): number {
  const result = computeFire({
    monthlyIncome,
    monthlyExpenses,
    currentSavings,
    currentAge,
    monthlyReturn,
    withdrawalRate,
  });
  const currentYear = new Date().getFullYear();
  return Math.round(currentYear + result.yearsToFire);
}

/**
 * Formate un nombre en devise française.
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Formate un nombre compact (ex: 1 200 000 → "1,2M€").
 */
export function formatCompact(amount: number): string {
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1).replace(".", ",")}M€`;
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(0)}k€`;
  }
  return `${amount}€`;
}
