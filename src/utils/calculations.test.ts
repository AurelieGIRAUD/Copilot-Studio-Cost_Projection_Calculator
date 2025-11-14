import { describe, it, expect } from 'vitest';
import {
  validateNumber,
  formatCurrency,
  formatNumber,
  calculateMonthlyData,
  calculateScenarioComparison,
  PAYG_RATE,
  M365_COPILOT_COST,
  BREAKEVEN_CREDITS,
  CalculationParams
} from './calculations';

describe('Validation Functions', () => {
  describe('validateNumber', () => {
    it('should clamp value within min and max range', () => {
      expect(validateNumber(50, 0, 100)).toBe(50);
      expect(validateNumber(150, 0, 100)).toBe(100);
      expect(validateNumber(-10, 0, 100)).toBe(0);
    });

    it('should handle NaN values', () => {
      expect(validateNumber(NaN, 0, 100)).toBe(0);
    });

    it('should handle edge cases', () => {
      expect(validateNumber(0, 0, 100)).toBe(0);
      expect(validateNumber(100, 0, 100)).toBe(100);
    });
  });
});

describe('Format Functions', () => {
  describe('formatCurrency', () => {
    it('should format numbers as currency with commas', () => {
      expect(formatCurrency(1000)).toBe('$1,000');
      expect(formatCurrency(1000000)).toBe('$1,000,000');
      expect(formatCurrency(729000)).toBe('$729,000');
    });

    it('should handle small values', () => {
      expect(formatCurrency(0)).toBe('$0');
      expect(formatCurrency(1)).toBe('$1');
    });
  });

  describe('formatNumber', () => {
    it('should format numbers with commas', () => {
      expect(formatNumber(1300)).toBe('1,300');
      expect(formatNumber(30000)).toBe('30,000');
    });
  });
});

describe('Constants', () => {
  it('should have correct pricing constants', () => {
    expect(PAYG_RATE).toBe(0.01);
    expect(M365_COPILOT_COST).toBe(30);
    expect(BREAKEVEN_CREDITS).toBe(3000);
  });
});

describe('Monthly Data Calculations', () => {
  const baseParams: CalculationParams = {
    userCount: 1300,
    complexityRatio: '80/20',
    simpleCreditsPerUser: 75,
    complexCreditsPerUser: 600,
    year1GrowthRate: 15,
    adoptionCeiling: 80,
    steadyStateAdoption: 60
  };

  it('should generate 24 months of data', () => {
    const data = calculateMonthlyData(baseParams);
    expect(data).toHaveLength(24);
  });

  it('should label first 12 months as Year 1', () => {
    const data = calculateMonthlyData(baseParams);
    expect(data[0].year).toBe('Year 1');
    expect(data[11].year).toBe('Year 1');
  });

  it('should label last 12 months as Year 2', () => {
    const data = calculateMonthlyData(baseParams);
    expect(data[12].year).toBe('Year 2');
    expect(data[23].year).toBe('Year 2');
  });

  it('should calculate adoption growth in Year 1', () => {
    const data = calculateMonthlyData(baseParams);
    expect(data[0].adoption).toBe(10); // Month 1: starting adoption
    expect(data[1].adoption).toBe(25); // Month 2: 10 + 15
    expect(data[11].adoption).toBe(80); // Month 12: capped at ceiling
  });

  it('should maintain stable adoption in Year 2', () => {
    const data = calculateMonthlyData(baseParams);
    const year2Adoption = data[12].adoption;
    expect(data[13].adoption).toBe(year2Adoption);
    expect(data[23].adoption).toBe(year2Adoption);
  });

  it('should calculate credits correctly for 80/20 complexity', () => {
    const data = calculateMonthlyData(baseParams);
    // Credits per user = (75 * 0.8) + (600 * 0.2) = 60 + 120 = 180
    const expectedCreditsPerUser = 180;

    // Month 1: 10% adoption of 1300 users = 130 users
    const month1ActiveUsers = 130;
    const month1TotalCredits = month1ActiveUsers * expectedCreditsPerUser;
    expect(data[0].totalCredits).toBe(month1TotalCredits);
  });

  it('should calculate PAYG cost correctly', () => {
    const data = calculateMonthlyData(baseParams);
    // Month 1: 130 users * 180 credits * $0.01 = $234
    expect(data[0].paygCost).toBe(234);
  });

  it('should calculate M365 cost correctly', () => {
    const data = calculateMonthlyData(baseParams);
    // 1300 users * $30 = $39,000 (constant every month)
    expect(data[0].m365Cost).toBe(39000);
    expect(data[23].m365Cost).toBe(39000);
  });

  it('should calculate savings correctly', () => {
    const data = calculateMonthlyData(baseParams);
    const savings = data[0].m365Cost - data[0].paygCost;
    expect(data[0].savings).toBe(savings);
  });
});

describe('Scenario Comparison Calculations', () => {
  const userScenarios = [1300, 5000, 30000];
  const agentScenarios = [10, 30, 100];
  const complexityScenarios = ['80/20', '70/30', '50/50'];

  it('should generate all scenario combinations', () => {
    const scenarios = calculateScenarioComparison(
      userScenarios,
      agentScenarios,
      complexityScenarios,
      75,
      600,
      60
    );
    // 3 user scenarios * 3 agent scenarios * 3 complexity ratios = 27 scenarios
    expect(scenarios).toHaveLength(27);
  });

  it('should calculate correct annual PAYG cost for known scenario', () => {
    // Test case: 30,000 users, 50/50 complexity, 60% adoption
    // Active users: 30,000 * 0.6 = 18,000
    // Credits/user/month: (75 * 0.5) + (600 * 0.5) = 37.5 + 300 = 337.5
    // Monthly credits: 18,000 * 337.5 = 6,075,000
    // Monthly cost: 6,075,000 * $0.01 = $60,750
    // Yearly cost: $60,750 * 12 = $729,000

    const scenarios = calculateScenarioComparison(
      [30000],
      [100],
      ['50/50'],
      75,
      600,
      60
    );

    expect(scenarios[0].activeUsers).toBe(18000);
    expect(scenarios[0].creditsPerUserMonth).toBe(338); // Rounded from 337.5
    expect(scenarios[0].yearlyPayg).toBe(729000);
  });

  it('should calculate correct M365 cost', () => {
    const scenarios = calculateScenarioComparison(
      [30000],
      [100],
      ['50/50'],
      75,
      600,
      60
    );
    // 30,000 users * $30 * 12 months = $10,800,000
    expect(scenarios[0].yearlyM365).toBe(10800000);
  });

  it('should calculate savings and savings percentage', () => {
    const scenarios = calculateScenarioComparison(
      [30000],
      [100],
      ['50/50'],
      75,
      600,
      60
    );
    const expectedSavings = 10800000 - 729000; // $10,071,000
    const expectedPercent = Math.round((expectedSavings / 10800000) * 100); // 93%

    expect(scenarios[0].savings).toBe(expectedSavings);
    expect(scenarios[0].savingsPercent).toBe(expectedPercent);
  });

  it('should handle different complexity ratios correctly', () => {
    const scenarios = calculateScenarioComparison(
      [1000],
      [10],
      ['80/20', '70/30', '50/50'],
      75,
      600,
      60
    );

    // 80/20: (75 * 0.8) + (600 * 0.2) = 180 credits/user
    expect(scenarios[0].creditsPerUserMonth).toBe(180);

    // 70/30: (75 * 0.7) + (600 * 0.3) = 232.5 -> 233 credits/user
    expect(scenarios[1].creditsPerUserMonth).toBe(233);

    // 50/50: (75 * 0.5) + (600 * 0.5) = 337.5 -> 338 credits/user
    expect(scenarios[2].creditsPerUserMonth).toBe(338);
  });

  it('should respect steady state adoption rate', () => {
    const scenarios50 = calculateScenarioComparison(
      [1000],
      [10],
      ['80/20'],
      75,
      600,
      50
    );
    const scenarios80 = calculateScenarioComparison(
      [1000],
      [10],
      ['80/20'],
      75,
      600,
      80
    );

    expect(scenarios50[0].activeUsers).toBe(500); // 1000 * 0.5
    expect(scenarios80[0].activeUsers).toBe(800); // 1000 * 0.8
  });
});

describe('Edge Cases', () => {
  it('should handle zero users', () => {
    const params: CalculationParams = {
      userCount: 0,
      complexityRatio: '80/20',
      simpleCreditsPerUser: 75,
      complexCreditsPerUser: 600,
      year1GrowthRate: 15,
      adoptionCeiling: 80,
      steadyStateAdoption: 60
    };

    const data = calculateMonthlyData(params);
    expect(data[0].activeUsers).toBe(0);
    expect(data[0].paygCost).toBe(0);
  });

  it('should handle 100% adoption ceiling', () => {
    const params: CalculationParams = {
      userCount: 1000,
      complexityRatio: '80/20',
      simpleCreditsPerUser: 75,
      complexCreditsPerUser: 600,
      year1GrowthRate: 100, // Very high growth
      adoptionCeiling: 100, // 100% ceiling
      steadyStateAdoption: 60
    };

    const data = calculateMonthlyData(params);
    // Should cap at 100% adoption
    expect(data[1].adoption).toBeLessThanOrEqual(100);
  });

  it('should handle zero credits per user', () => {
    const params: CalculationParams = {
      userCount: 1000,
      complexityRatio: '80/20',
      simpleCreditsPerUser: 0,
      complexCreditsPerUser: 0,
      year1GrowthRate: 15,
      adoptionCeiling: 80,
      steadyStateAdoption: 60
    };

    const data = calculateMonthlyData(params);
    expect(data[0].totalCredits).toBe(0);
    expect(data[0].paygCost).toBe(0);
  });

  it('should handle maximum values without overflow', () => {
    const params: CalculationParams = {
      userCount: 30000,
      complexityRatio: '50/50',
      simpleCreditsPerUser: 10000,
      complexCreditsPerUser: 10000,
      year1GrowthRate: 100,
      adoptionCeiling: 100,
      steadyStateAdoption: 100
    };

    const data = calculateMonthlyData(params);
    expect(data[0].paygCost).toBeGreaterThan(0);
    expect(data[0].paygCost).toBeLessThan(Infinity);
  });
});

describe('Business Logic Validation', () => {
  it('should confirm PAYG is cheaper than M365 for low usage', () => {
    const scenarios = calculateScenarioComparison(
      [1300],
      [10],
      ['80/20'],
      75,
      600,
      60
    );

    expect(scenarios[0].savings).toBeGreaterThan(0);
    expect(scenarios[0].savingsPercent).toBeGreaterThan(0);
  });

  it('should calculate breakeven point correctly', () => {
    // At 3000 credits/user/month, costs should be equal
    // 3000 credits * $0.01 = $30 (same as M365 Copilot)
    expect(BREAKEVEN_CREDITS).toBe(3000);
  });

  it('should show when M365 becomes more economical', () => {
    // Test with very high credit consumption
    const scenarios = calculateScenarioComparison(
      [1000],
      [10],
      ['50/50'],
      5000, // Very high simple credits
      10000, // Very high complex credits
      100
    );

    // Credits per user = (5000 * 0.5) + (10000 * 0.5) = 7500
    // This is above breakeven (3000), so savings should be negative
    expect(scenarios[0].creditsPerUserMonth).toBeGreaterThan(3000);
    expect(scenarios[0].savings).toBeLessThan(0); // M365 would be cheaper
  });
});
