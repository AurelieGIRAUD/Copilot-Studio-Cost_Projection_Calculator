// Calculation utilities for Copilot Studio Cost Calculator

export interface MonthlyData {
  month: number;
  year: string;
  adoption: number;
  activeUsers: number;
  totalCredits: number;
  paygCost: number;
  packCost: number;
  m365Cost: number;
  savings: number;
}

export interface ScenarioData {
  users: number;
  agents: number;
  ratio: string;
  activeUsers: number;
  creditsPerUserMonth: number;
  monthlyPayg: number;
  yearlyPayg: number;
  yearlyM365: number;
  savings: number;
  savingsPercent: number;
}

export interface CalculationParams {
  userCount: number;
  complexityRatio: string;
  simpleCreditsPerUser: number;
  complexCreditsPerUser: number;
  year1GrowthRate: number;
  adoptionCeiling: number;
  steadyStateAdoption: number;
}

// Constants
export const PAYG_RATE = 0.01;
export const PACK_COST = 200;
export const PACK_CREDITS = 25000;
export const M365_COPILOT_COST = 30;
export const BREAKEVEN_CREDITS = M365_COPILOT_COST / PAYG_RATE;

// Validation helper
export const validateNumber = (value: number, min: number, max: number): number => {
  const num = isNaN(value) ? min : value;
  return Math.min(Math.max(num, min), max);
};

// Format helpers
export const formatCurrency = (value: number): string => `$${value.toLocaleString()}`;
export const formatNumber = (value: number): string => value.toLocaleString();

// Calculate monthly projection data
export const calculateMonthlyData = (params: CalculationParams): MonthlyData[] => {
  const { userCount, complexityRatio, simpleCreditsPerUser, complexCreditsPerUser, year1GrowthRate, adoptionCeiling } = params;
  const [simplePercent, complexPercent] = complexityRatio.split('/').map((n: string) => parseInt(n) / 100);

  const data: MonthlyData[] = [];
  let currentAdoption = 10;

  for (let month = 1; month <= 24; month++) {
    // Year 1: growing engagement, Year 2: stable
    if (month <= 12) {
      currentAdoption = Math.min(adoptionCeiling, 10 + (month - 1) * year1GrowthRate);
    }

    const activeUsers = Math.round(userCount * (currentAdoption / 100));
    const creditsPerUserMonth = (simpleCreditsPerUser * simplePercent) + (complexCreditsPerUser * complexPercent);
    const totalCredits = activeUsers * creditsPerUserMonth;

    // Calculate costs
    const paygCost = totalCredits * PAYG_RATE;
    const packsNeeded = Math.ceil(totalCredits / PACK_CREDITS);
    const packCost = packsNeeded * PACK_COST;
    const m365Cost = userCount * M365_COPILOT_COST;

    data.push({
      month,
      year: month <= 12 ? 'Year 1' : 'Year 2',
      adoption: currentAdoption,
      activeUsers,
      totalCredits,
      paygCost: Math.round(paygCost),
      packCost,
      m365Cost,
      savings: Math.round(m365Cost - paygCost)
    });
  }

  return data;
};

// Calculate scenario comparison matrix
export const calculateScenarioComparison = (
  userScenarios: number[],
  agentScenarios: number[],
  complexityScenarios: string[],
  simpleCreditsPerUser: number,
  complexCreditsPerUser: number,
  steadyStateAdoption: number
): ScenarioData[] => {
  const results: ScenarioData[] = [];

  for (const users of userScenarios) {
    for (const agents of agentScenarios) {
      for (const ratio of complexityScenarios) {
        const [simplePercent, complexPercent] = ratio.split('/').map((n: string) => parseInt(n) / 100);

        // Use configurable steady state adoption rate
        const activeUsers = Math.round(users * (steadyStateAdoption / 100));
        const creditsPerUserMonth = (simpleCreditsPerUser * simplePercent) + (complexCreditsPerUser * complexPercent);
        const totalCreditsMonth = activeUsers * creditsPerUserMonth;
        const totalCreditsYear = totalCreditsMonth * 12;

        const paygYearlyCost = totalCreditsYear * PAYG_RATE;
        const m365YearlyCost = users * M365_COPILOT_COST * 12;

        results.push({
          users,
          agents,
          ratio,
          activeUsers,
          creditsPerUserMonth: Math.round(creditsPerUserMonth),
          monthlyPayg: Math.round(totalCreditsMonth * PAYG_RATE),
          yearlyPayg: Math.round(paygYearlyCost),
          yearlyM365: m365YearlyCost,
          savings: Math.round(m365YearlyCost - paygYearlyCost),
          savingsPercent: Math.round(((m365YearlyCost - paygYearlyCost) / m365YearlyCost) * 100)
        });
      }
    }
  }

  return results;
};
