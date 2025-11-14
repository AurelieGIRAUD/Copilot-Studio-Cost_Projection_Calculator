import React, { useState, useMemo, ChangeEvent } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  calculateMonthlyData,
  calculateScenarioComparison,
  validateNumber,
  formatCurrency,
  formatNumber,
  BREAKEVEN_CREDITS,
  type ScenarioData
} from '../utils/calculations';

const CopilotCostCalculator: React.FC = () => {
  const [userCount, setUserCount] = useState<number>(1300);
  // Note: agentCount is used for scenario categorization in the comparison table
  // Future enhancement: could factor agent count into credit consumption calculations
  const [agentCount, setAgentCount] = useState<number>(10);
  const [complexityRatio, setComplexityRatio] = useState<string>('80/20');
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // Advanced settings
  const [simpleCreditsPerUser, setSimpleCreditsPerUser] = useState<number>(75);
  const [complexCreditsPerUser, setComplexCreditsPerUser] = useState<number>(600);
  const [year1GrowthRate, setYear1GrowthRate] = useState<number>(15);
  const [adoptionCeiling, setAdoptionCeiling] = useState<number>(80);
  const [steadyStateAdoption, setSteadyStateAdoption] = useState<number>(60); // For scenario comparison

  // Validation constraints
  const VALIDATION = {
    credits: { min: 0, max: 10000 },
    percentage: { min: 0, max: 100 }
  };

  const userScenarios: number[] = [1300, 5000, 30000];
  const agentScenarios: number[] = [10, 30, 100];
  const complexityScenarios: string[] = ['80/20', '70/30', '50/50'];

  const monthlyData = useMemo(() => calculateMonthlyData({
    userCount,
    complexityRatio,
    simpleCreditsPerUser,
    complexCreditsPerUser,
    year1GrowthRate,
    adoptionCeiling,
    steadyStateAdoption
  }), [
    userCount, complexityRatio, simpleCreditsPerUser,
    complexCreditsPerUser, year1GrowthRate, adoptionCeiling, steadyStateAdoption
  ]);

  const scenarioData = useMemo(() => calculateScenarioComparison(
    userScenarios,
    agentScenarios,
    complexityScenarios,
    simpleCreditsPerUser,
    complexCreditsPerUser,
    steadyStateAdoption
  ), [
    simpleCreditsPerUser, complexCreditsPerUser, steadyStateAdoption
  ]);

  const currentScenario: ScenarioData | undefined = scenarioData.find(
    (s: ScenarioData) => s.users === userCount && s.agents === agentCount && s.ratio === complexityRatio
  );

  return (
    <div className="w-full max-w-7xl mx-auto p-6 bg-gray-50">
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h1 className="text-3xl font-bold text-blue-900 mb-2">
          Copilot Studio Cost Projection Calculator
        </h1>
        <p className="text-gray-600 mb-4">
          Interactive 2-year projection with scenario analysis for pay-as-you-go vs M365 Copilot licensing
        </p>

        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
          <p className="text-sm text-blue-900">
            <strong>Latest Pricing (Nov 2025):</strong> Pay-as-you-go at $0.01/credit •
            Prepaid packs $200/month (25k credits) • M365 Copilot $30/user/month
          </p>
        </div>

        {/* Main Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Number of Users
            </label>
            <select
              value={userCount}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setUserCount(parseInt(e.target.value))}
              className="w-full p-2 border rounded-lg bg-white"
            >
              {userScenarios.map(count => (
                <option key={count} value={count}>{formatNumber(count)} users</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Number of Agents
            </label>
            <select
              value={agentCount}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setAgentCount(parseInt(e.target.value))}
              className="w-full p-2 border rounded-lg bg-white"
            >
              {agentScenarios.map(count => (
                <option key={count} value={count}>{count} agents</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Agent Complexity (Simple/Complex)
            </label>
            <select
              value={complexityRatio}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setComplexityRatio(e.target.value)}
              className="w-full p-2 border rounded-lg bg-white"
            >
              {complexityScenarios.map(ratio => (
                <option key={ratio} value={ratio}>{ratio}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Advanced Settings Toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-blue-600 hover:text-blue-800 font-medium mb-4"
        >
          {showAdvanced ? '▼' : '▶'} Advanced Settings
        </button>

        {showAdvanced && (
          <div className="space-y-4 mb-6 p-4 bg-gray-100 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Simple Agent Credits/User/Month
                </label>
                <input
                  type="number"
                  min={VALIDATION.credits.min}
                  max={VALIDATION.credits.max}
                  value={simpleCreditsPerUser}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    const val = parseInt(e.target.value) || 0;
                    setSimpleCreditsPerUser(validateNumber(val, VALIDATION.credits.min, VALIDATION.credits.max));
                  }}
                  className="w-full p-2 border rounded bg-white text-sm"
                  placeholder="0-10000"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Complex Agent Credits/User/Month
                </label>
                <input
                  type="number"
                  min={VALIDATION.credits.min}
                  max={VALIDATION.credits.max}
                  value={complexCreditsPerUser}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    const val = parseInt(e.target.value) || 0;
                    setComplexCreditsPerUser(validateNumber(val, VALIDATION.credits.min, VALIDATION.credits.max));
                  }}
                  className="w-full p-2 border rounded bg-white text-sm"
                  placeholder="0-10000"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Year 1 Monthly Growth (%)
                </label>
                <input
                  type="number"
                  min={VALIDATION.percentage.min}
                  max={VALIDATION.percentage.max}
                  value={year1GrowthRate}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    const val = parseInt(e.target.value) || 0;
                    setYear1GrowthRate(validateNumber(val, VALIDATION.percentage.min, VALIDATION.percentage.max));
                  }}
                  className="w-full p-2 border rounded bg-white text-sm"
                  placeholder="0-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Adoption Ceiling (%)
                </label>
                <input
                  type="number"
                  min={VALIDATION.percentage.min}
                  max={VALIDATION.percentage.max}
                  value={adoptionCeiling}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    const val = parseInt(e.target.value) || 0;
                    setAdoptionCeiling(validateNumber(val, VALIDATION.percentage.min, VALIDATION.percentage.max));
                  }}
                  className="w-full p-2 border rounded bg-white text-sm"
                  placeholder="0-100"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Steady State Adoption (%)
                </label>
                <input
                  type="number"
                  min={VALIDATION.percentage.min}
                  max={VALIDATION.percentage.max}
                  value={steadyStateAdoption}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    const val = parseInt(e.target.value) || 0;
                    setSteadyStateAdoption(validateNumber(val, VALIDATION.percentage.min, VALIDATION.percentage.max));
                  }}
                  className="w-full p-2 border rounded bg-white text-sm"
                  placeholder="0-100"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Used for scenario comparison matrix
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Key Metrics Summary */}
      {currentScenario && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 mb-1">Monthly PAYG Cost</div>
            <div className="text-2xl font-bold text-blue-900">
              {formatCurrency(currentScenario.monthlyPayg)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {formatNumber(currentScenario.creditsPerUserMonth)} credits/user
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 mb-1">Annual PAYG Cost</div>
            <div className="text-2xl font-bold text-blue-900">
              {formatCurrency(currentScenario.yearlyPayg)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Year 1 projection
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 mb-1">M365 Copilot Cost</div>
            <div className="text-2xl font-bold text-gray-600">
              {formatCurrency(currentScenario.yearlyM365)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Annual comparison
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 mb-1">Annual Savings</div>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(currentScenario.savings)}
            </div>
            <div className="text-xs text-green-600 mt-1">
              {currentScenario.savingsPercent}% less than M365
            </div>
          </div>
        </div>
      )}

      {/* 24-Month Projection Chart */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          24-Month Cost Projection
        </h2>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              label={{ value: 'Month', position: 'insideBottom', offset: -5 }}
            />
            <YAxis
              label={{ value: 'Cost ($)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              labelFormatter={(month: number) => `Month ${month}`}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="paygCost"
              stroke="#3b82f6"
              strokeWidth={3}
              name="Pay-as-you-go"
              dot={{ r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="m365Cost"
              stroke="#9ca3af"
              strokeWidth={2}
              strokeDasharray="5 5"
              name="M365 Copilot (reference)"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="bg-blue-50 p-3 rounded">
            <div className="text-sm font-medium text-blue-900">Year 1 Total (Growing)</div>
            <div className="text-xl font-bold text-blue-900">
              {formatCurrency(monthlyData.slice(0, 12).reduce((sum, m) => sum + m.paygCost, 0))}
            </div>
          </div>
          <div className="bg-green-50 p-3 rounded">
            <div className="text-sm font-medium text-green-900">Year 2 Total (Stable)</div>
            <div className="text-xl font-bold text-green-900">
              {formatCurrency(monthlyData.slice(12, 24).reduce((sum, m) => sum + m.paygCost, 0))}
            </div>
          </div>
        </div>
      </div>

      {/* Adoption Curve */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          User Adoption Curve
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              label={{ value: 'Month', position: 'insideBottom', offset: -5 }}
            />
            <YAxis
              label={{ value: 'Active Users', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip
              labelFormatter={(month: number) => `Month ${month}`}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="activeUsers"
              stroke="#10b981"
              strokeWidth={3}
              name="Active Users"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Scenario Comparison Matrix */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Full Scenario Comparison Matrix
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">Users</th>
                <th className="p-2 text-left">Agents</th>
                <th className="p-2 text-left">Ratio</th>
                <th className="p-2 text-right">Credits/User/Mo</th>
                <th className="p-2 text-right">Monthly PAYG</th>
                <th className="p-2 text-right">Annual PAYG</th>
                <th className="p-2 text-right">Annual M365</th>
                <th className="p-2 text-right">Savings</th>
                <th className="p-2 text-right">% Saved</th>
              </tr>
            </thead>
            <tbody>
              {scenarioData.map((scenario, idx) => (
                <tr
                  key={idx}
                  className={`border-t ${
                    scenario.users === userCount &&
                    scenario.agents === agentCount &&
                    scenario.ratio === complexityRatio
                      ? 'bg-blue-50 font-semibold'
                      : ''
                  }`}
                >
                  <td className="p-2">{formatNumber(scenario.users)}</td>
                  <td className="p-2">{scenario.agents}</td>
                  <td className="p-2">{scenario.ratio}</td>
                  <td className="p-2 text-right">{formatNumber(scenario.creditsPerUserMonth)}</td>
                  <td className="p-2 text-right">{formatCurrency(scenario.monthlyPayg)}</td>
                  <td className="p-2 text-right font-medium">{formatCurrency(scenario.yearlyPayg)}</td>
                  <td className="p-2 text-right text-gray-600">{formatCurrency(scenario.yearlyM365)}</td>
                  <td className="p-2 text-right text-green-600 font-medium">
                    {formatCurrency(scenario.savings)}
                  </td>
                  <td className="p-2 text-right text-green-600">
                    {scenario.savingsPercent}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Key Insights */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Key Insights & Recommendations
        </h2>

        <div className="space-y-4">
          <div className="border-l-4 border-green-500 pl-4">
            <h3 className="font-semibold text-gray-900 mb-2">Cost Advantage</h3>
            <p className="text-gray-700">
              Pay-as-you-go is {currentScenario?.savingsPercent}% cheaper than M365 Copilot for your scenario,
              saving {formatCurrency(currentScenario?.savings ?? 0)} annually. This model is optimal when
              credit consumption stays below 3,000 credits/user/month.
            </p>
          </div>

          <div className="border-l-4 border-blue-500 pl-4">
            <h3 className="font-semibold text-gray-900 mb-2">Breakeven Analysis</h3>
            <p className="text-gray-700">
              M365 Copilot becomes cost-effective at {formatNumber(BREAKEVEN_CREDITS)} credits/user/month.
              Your current projection: {currentScenario?.creditsPerUserMonth ?? 0} credits/user/month.
              {(currentScenario?.creditsPerUserMonth ?? 0) < BREAKEVEN_CREDITS
                ? ' ✓ Pay-as-you-go is optimal.'
                : ' ⚠ Consider M365 Copilot licenses.'}
            </p>
          </div>

          <div className="border-l-4 border-yellow-500 pl-4">
            <h3 className="font-semibold text-gray-900 mb-2">Cost Optimization Tips</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              <li>Favor classic answers (1 credit) over generative (2 credits) where possible</li>
              <li>Minimize tenant graph grounding calls (10 credits each) - cache results</li>
              <li>Monitor usage patterns before committing to prepaid packs ($200/25k credits)</li>
              <li>Separate dev/test/prod environments to avoid inflating costs</li>
              <li>Implement governance on which teams can publish agents</li>
            </ul>
          </div>

          <div className="border-l-4 border-purple-500 pl-4">
            <h3 className="font-semibold text-gray-900 mb-2">Growth Considerations</h3>
            <p className="text-gray-700">
              As adoption increases and agents become more complex, monitor the credit burn rate.
              Complex agents with autonomous triggers and tenant grounding can consume 1,000-1,500 credits/user/month,
              at which point M365 Copilot licensing may become more economical.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CopilotCostCalculator;
