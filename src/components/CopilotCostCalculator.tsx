import React, { useState, useMemo, ChangeEvent } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Interfaces
interface Stage {
  name: string;
  users: number;
  month: number;
  dau: number;
  phase: string;
}

interface Config {
  conversationsPerDay: number;
  turnsPerConversation: number;
  generativeRatio: number;
  actionsPerConversation: number;
  peakMultiplier: number;
  m365CopilotPrice: number;
  autonomousActionRatio: number;
  hybridM365Users: number;
}

interface MonthlyData {
  month: number;
  year: string;
  users: number;
  dau: number;
  dauPercent: number;
  activeUsers: number;
  conversations: number;
  credits: number;
  paygCost: number;
  p3Cost: number;
  paygM365Cost: number;
  p3M365Cost: number;
  m365AllCost: number;
}

interface PricingSummary {
  model: string;
  year1: number;
  year2: number;
  year3: number;
  total: number;
  color: string;
}

const CopilotCostCalculator: React.FC = () => {
  // Stages with time-based rollout
  const [stages] = useState<Stage[]>([
    { name: 'Pilot (HQ)', users: 130, month: 1, dau: 0.45, phase: 'Pilot' },
    { name: 'HQ Expansion', users: 500, month: 4, dau: 0.40, phase: 'Expansion' },
    { name: 'Full HQ', users: 1000, month: 7, dau: 0.38, phase: 'Expansion' },
    { name: 'HQ + Mgmt', users: 2500, month: 10, dau: 0.35, phase: 'Management' },
    { name: 'All Mgmt', users: 6000, month: 13, dau: 0.33, phase: 'Management' },
    { name: 'Mgmt + Stores', users: 12000, month: 19, dau: 0.30, phase: 'Stores' },
    { name: 'Near-Complete', users: 30000, month: 31, dau: 0.28, phase: 'Enterprise' }
  ]);

  // Configuration parameters with sliders
  const [config, setConfig] = useState<Config>({
    conversationsPerDay: 4,
    turnsPerConversation: 5,
    generativeRatio: 0.70,
    actionsPerConversation: 1.5,
    peakMultiplier: 1.4,
    m365CopilotPrice: 30,
    autonomousActionRatio: 0.15,
    hybridM365Users: 200
  });

  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // Parameter ranges with market research guidance
  const parameterRanges = {
    conversationsPerDay: {
      min: 1, max: 12, default: 4, step: 1,
      low: "1-2 (Store workers, simple lookups)",
      medium: "3-5 (Office workers, moderate usage)",
      high: "6-12 (Power users, heavy daily usage)"
    },
    turnsPerConversation: {
      min: 2, max: 10, default: 5, step: 1,
      low: "2-3 (Quick queries)",
      medium: "4-6 (Standard interactions)",
      high: "7-10 (Complex problem-solving)"
    },
    generativeRatio: {
      min: 0, max: 100, default: 70, step: 5,
      low: "20-40% (Mostly classic responses)",
      medium: "50-70% (Balanced approach)",
      high: "80-100% (AI-first strategy)"
    },
    actionsPerConversation: {
      min: 0, max: 5, default: 1.5, step: 0.5,
      low: "0-1 (Information only)",
      medium: "1-2 (Some automation)",
      high: "3-5 (Action-heavy workflows)"
    },
    m365CopilotPrice: {
      min: 25, max: 35, default: 30, step: 1,
      low: "$25-27 (Negotiated discount)",
      medium: "$28-32 (Standard pricing)",
      high: "$33-35 (List price)"
    },
    autonomousActionRatio: {
      min: 0, max: 50, default: 15, step: 5,
      low: "0-10% (User-triggered only)",
      medium: "10-20% (Some automation)",
      high: "25-50% (Highly autonomous)"
    }
  };

  // Calculate credits per conversation
  const creditsPerConversation = useMemo(() => {
    const classicTurns = config.turnsPerConversation * (1 - config.generativeRatio);
    const generativeTurns = config.turnsPerConversation * config.generativeRatio;
    const classicCredits = classicTurns * 1;
    const generativeCredits = generativeTurns * 2;
    const actionCredits = config.actionsPerConversation * 5;
    return classicCredits + generativeCredits + actionCredits;
  }, [config.turnsPerConversation, config.generativeRatio, config.actionsPerConversation]);

  // Linear interpolation between stages
  const interpolateValue = (month: number, stagesBefore: Stage[], stagesAfter: Stage[], getValue: (stage: Stage) => number): number => {
    const beforeStage = stagesBefore[stagesBefore.length - 1];
    const afterStage = stagesAfter[0];

    if (!beforeStage) return getValue(afterStage);
    if (!afterStage) return getValue(beforeStage);

    const monthRange = afterStage.month - beforeStage.month;
    const monthProgress = month - beforeStage.month;
    const ratio = monthProgress / monthRange;

    const beforeValue = getValue(beforeStage);
    const afterValue = getValue(afterStage);

    return beforeValue + (afterValue - beforeValue) * ratio;
  };

  // Calculate monthly projections over 36 months
  const monthlyData = useMemo((): MonthlyData[] => {
    const data: MonthlyData[] = [];
    const workingDaysPerMonth = 22;

    for (let month = 1; month <= 36; month++) {
      // Find stages before and after this month
      const stagesBefore = stages.filter(s => s.month <= month);
      const stagesAfter = stages.filter(s => s.month > month);

      // Interpolate users and DAU
      const users = Math.round(interpolateValue(month, stagesBefore, stagesAfter, s => s.users));
      const dau = interpolateValue(month, stagesBefore, stagesAfter, s => s.dau);
      const activeUsers = Math.round(users * dau);

      // Check if this is a peak month (every 6 months)
      const isPeakMonth = month % 6 === 0;
      const multiplier = isPeakMonth ? config.peakMultiplier : 1.0;

      // Calculate conversations and credits
      const conversations = activeUsers * config.conversationsPerDay * workingDaysPerMonth * multiplier;
      const totalCredits = conversations * creditsPerConversation;

      // Pricing calculations
      const paygRate = 0.01;
      const p3Discount = 0.15;

      // Model 1: PAYG Alone
      const paygCost = totalCredits * paygRate;

      // Model 2: P3 Pre-Purchase (15% discount)
      const p3Cost = totalCredits * paygRate * (1 - p3Discount);

      // Model 3: PAYG + M365 Licenses (hybrid)
      // M365 users only pay for autonomous actions
      const m365Users = Math.min(config.hybridM365Users, users);
      const paygUsers = users - m365Users;
      const m365ActiveUsers = Math.round(m365Users * dau);
      const paygActiveUsers = Math.round(paygUsers * dau);

      const m365Conversations = m365ActiveUsers * config.conversationsPerDay * workingDaysPerMonth * multiplier;
      const paygConversations = paygActiveUsers * config.conversationsPerDay * workingDaysPerMonth * multiplier;

      // M365 users: only autonomous actions incur credits
      const m365AutonomousCredits = m365Conversations * config.actionsPerConversation * config.autonomousActionRatio * 5;
      const paygCredits = paygConversations * creditsPerConversation;

      const paygM365Cost = (m365Users * config.m365CopilotPrice) + ((m365AutonomousCredits + paygCredits) * paygRate);

      // Model 4: P3 + M365 Licenses (hybrid with discount)
      const p3M365Cost = (m365Users * config.m365CopilotPrice) + ((m365AutonomousCredits + paygCredits) * paygRate * (1 - p3Discount));

      // Model 5: M365 Copilot for All
      const m365AllCost = users * config.m365CopilotPrice;

      data.push({
        month,
        year: month <= 12 ? 'Year 1' : month <= 24 ? 'Year 2' : 'Year 3',
        users,
        dau,
        dauPercent: dau * 100, // DAU as percentage for chart display
        activeUsers,
        conversations: Math.round(conversations),
        credits: Math.round(totalCredits),
        paygCost: Math.round(paygCost),
        p3Cost: Math.round(p3Cost),
        paygM365Cost: Math.round(paygM365Cost),
        p3M365Cost: Math.round(p3M365Cost),
        m365AllCost: Math.round(m365AllCost)
      });
    }

    return data;
  }, [stages, config, creditsPerConversation]);

  // Calculate 3-year summary
  const pricingSummary = useMemo((): PricingSummary[] => {
    const year1Data = monthlyData.slice(0, 12);
    const year2Data = monthlyData.slice(12, 24);
    const year3Data = monthlyData.slice(24, 36);

    const sum = (data: MonthlyData[], key: keyof MonthlyData): number =>
      data.reduce((acc, m) => acc + (m[key] as number), 0);

    const models = [
      {
        model: 'PAYG Alone',
        year1: sum(year1Data, 'paygCost'),
        year2: sum(year2Data, 'paygCost'),
        year3: sum(year3Data, 'paygCost'),
        color: '#3b82f6' // blue
      },
      {
        model: 'P3 Pre-Purchase (15% discount)',
        year1: sum(year1Data, 'p3Cost'),
        year2: sum(year2Data, 'p3Cost'),
        year3: sum(year3Data, 'p3Cost'),
        color: '#8b5cf6' // violet
      },
      {
        model: 'PAYG + M365 Licenses',
        year1: sum(year1Data, 'paygM365Cost'),
        year2: sum(year2Data, 'paygM365Cost'),
        year3: sum(year3Data, 'paygM365Cost'),
        color: '#10b981' // green
      },
      {
        model: 'P3 + M365 Licenses',
        year1: sum(year1Data, 'p3M365Cost'),
        year2: sum(year2Data, 'p3M365Cost'),
        year3: sum(year3Data, 'p3M365Cost'),
        color: '#f59e0b' // amber
      },
      {
        model: 'M365 Copilot for All',
        year1: sum(year1Data, 'm365AllCost'),
        year2: sum(year2Data, 'm365AllCost'),
        year3: sum(year3Data, 'm365AllCost'),
        color: '#ef4444' // red
      }
    ];

    return models.map(m => ({
      ...m,
      total: m.year1 + m.year2 + m.year3
    }));
  }, [monthlyData]);

  // Find cheapest model
  const cheapestModel = useMemo(() => {
    return pricingSummary.reduce((min, curr) => curr.total < min.total ? curr : min);
  }, [pricingSummary]);

  // Helper functions
  const formatCurrency = (value: number): string => `$${value.toLocaleString()}`;
  const formatNumber = (value: number): string => value.toLocaleString();

  const updateConfig = (key: keyof Config, value: number) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6 bg-gray-50">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h1 className="text-3xl font-bold text-blue-900 mb-2">
          Copilot Studio Cost Projection Calculator
        </h1>
        <p className="text-gray-600 mb-4">
          Interactive 3-year cost projection with usage-based modeling and 5 pricing strategies
        </p>

        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
          <p className="text-sm text-blue-900">
            <strong>Usage-Based Model:</strong> {creditsPerConversation.toFixed(1)} credits/conversation •
            Classic turns (1 credit) • Generative turns (2 credits) • Actions (5 credits each)
          </p>
        </div>

        {/* Parameter Sliders */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Conversations per Day */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Conversations per Day
                </label>
                <div className="group relative">
                  <svg className="w-4 h-4 text-blue-500 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div className="hidden group-hover:block absolute z-10 w-64 p-2 mt-1 text-xs bg-gray-900 text-white rounded shadow-lg">
                    <div><strong>Low:</strong> {parameterRanges.conversationsPerDay.low}</div>
                    <div><strong>Medium:</strong> {parameterRanges.conversationsPerDay.medium}</div>
                    <div><strong>High:</strong> {parameterRanges.conversationsPerDay.high}</div>
                  </div>
                </div>
              </div>
              <input
                type="range"
                min={parameterRanges.conversationsPerDay.min}
                max={parameterRanges.conversationsPerDay.max}
                step={parameterRanges.conversationsPerDay.step}
                value={config.conversationsPerDay}
                onChange={(e: ChangeEvent<HTMLInputElement>) => updateConfig('conversationsPerDay', parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-gray-600 mt-1">
                <span>{parameterRanges.conversationsPerDay.min}</span>
                <span className="font-semibold">{config.conversationsPerDay}</span>
                <span>{parameterRanges.conversationsPerDay.max}</span>
              </div>
            </div>

            {/* Turns per Conversation */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Turns per Conversation
                </label>
                <div className="group relative">
                  <svg className="w-4 h-4 text-blue-500 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div className="hidden group-hover:block absolute z-10 w-64 p-2 mt-1 text-xs bg-gray-900 text-white rounded shadow-lg">
                    <div><strong>Low:</strong> {parameterRanges.turnsPerConversation.low}</div>
                    <div><strong>Medium:</strong> {parameterRanges.turnsPerConversation.medium}</div>
                    <div><strong>High:</strong> {parameterRanges.turnsPerConversation.high}</div>
                  </div>
                </div>
              </div>
              <input
                type="range"
                min={parameterRanges.turnsPerConversation.min}
                max={parameterRanges.turnsPerConversation.max}
                step={parameterRanges.turnsPerConversation.step}
                value={config.turnsPerConversation}
                onChange={(e: ChangeEvent<HTMLInputElement>) => updateConfig('turnsPerConversation', parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-gray-600 mt-1">
                <span>{parameterRanges.turnsPerConversation.min}</span>
                <span className="font-semibold">{config.turnsPerConversation}</span>
                <span>{parameterRanges.turnsPerConversation.max}</span>
              </div>
            </div>

            {/* Generative AI Ratio */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Generative AI Ratio (%)
                </label>
                <div className="group relative">
                  <svg className="w-4 h-4 text-blue-500 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div className="hidden group-hover:block absolute z-10 w-64 p-2 mt-1 text-xs bg-gray-900 text-white rounded shadow-lg">
                    <div><strong>Low:</strong> {parameterRanges.generativeRatio.low}</div>
                    <div><strong>Medium:</strong> {parameterRanges.generativeRatio.medium}</div>
                    <div><strong>High:</strong> {parameterRanges.generativeRatio.high}</div>
                  </div>
                </div>
              </div>
              <input
                type="range"
                min={parameterRanges.generativeRatio.min}
                max={parameterRanges.generativeRatio.max}
                step={parameterRanges.generativeRatio.step}
                value={config.generativeRatio * 100}
                onChange={(e: ChangeEvent<HTMLInputElement>) => updateConfig('generativeRatio', parseFloat(e.target.value) / 100)}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-gray-600 mt-1">
                <span>{parameterRanges.generativeRatio.min}%</span>
                <span className="font-semibold">{(config.generativeRatio * 100).toFixed(0)}%</span>
                <span>{parameterRanges.generativeRatio.max}%</span>
              </div>
            </div>

            {/* Actions per Conversation */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Actions per Conversation
                </label>
                <div className="group relative">
                  <svg className="w-4 h-4 text-blue-500 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div className="hidden group-hover:block absolute z-10 w-64 p-2 mt-1 text-xs bg-gray-900 text-white rounded shadow-lg">
                    <div><strong>Low:</strong> {parameterRanges.actionsPerConversation.low}</div>
                    <div><strong>Medium:</strong> {parameterRanges.actionsPerConversation.medium}</div>
                    <div><strong>High:</strong> {parameterRanges.actionsPerConversation.high}</div>
                  </div>
                </div>
              </div>
              <input
                type="range"
                min={parameterRanges.actionsPerConversation.min}
                max={parameterRanges.actionsPerConversation.max}
                step={parameterRanges.actionsPerConversation.step}
                value={config.actionsPerConversation}
                onChange={(e: ChangeEvent<HTMLInputElement>) => updateConfig('actionsPerConversation', parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-gray-600 mt-1">
                <span>{parameterRanges.actionsPerConversation.min}</span>
                <span className="font-semibold">{config.actionsPerConversation.toFixed(1)}</span>
                <span>{parameterRanges.actionsPerConversation.max}</span>
              </div>
            </div>
          </div>

          {/* Advanced Settings Toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            {showAdvanced ? '▼' : '▶'} Advanced Settings
          </button>

          {showAdvanced && (
            <div className="space-y-4 p-4 bg-gray-100 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* M365 Copilot Price */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      M365 Copilot Price ($/user/month)
                    </label>
                    <div className="group relative">
                      <svg className="w-4 h-4 text-blue-500 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <div className="hidden group-hover:block absolute z-10 w-64 p-2 mt-1 text-xs bg-gray-900 text-white rounded shadow-lg">
                        <div><strong>Low:</strong> {parameterRanges.m365CopilotPrice.low}</div>
                        <div><strong>Medium:</strong> {parameterRanges.m365CopilotPrice.medium}</div>
                        <div><strong>High:</strong> {parameterRanges.m365CopilotPrice.high}</div>
                      </div>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={parameterRanges.m365CopilotPrice.min}
                    max={parameterRanges.m365CopilotPrice.max}
                    step={parameterRanges.m365CopilotPrice.step}
                    value={config.m365CopilotPrice}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => updateConfig('m365CopilotPrice', parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-600 mt-1">
                    <span>${parameterRanges.m365CopilotPrice.min}</span>
                    <span className="font-semibold">${config.m365CopilotPrice}</span>
                    <span>${parameterRanges.m365CopilotPrice.max}</span>
                  </div>
                </div>

                {/* Autonomous Action Ratio */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Autonomous Action Ratio (%)
                    </label>
                    <div className="group relative">
                      <svg className="w-4 h-4 text-blue-500 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <div className="hidden group-hover:block absolute z-10 w-64 p-2 mt-1 text-xs bg-gray-900 text-white rounded shadow-lg">
                        <div><strong>Low:</strong> {parameterRanges.autonomousActionRatio.low}</div>
                        <div><strong>Medium:</strong> {parameterRanges.autonomousActionRatio.medium}</div>
                        <div><strong>High:</strong> {parameterRanges.autonomousActionRatio.high}</div>
                      </div>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={parameterRanges.autonomousActionRatio.min}
                    max={parameterRanges.autonomousActionRatio.max}
                    step={parameterRanges.autonomousActionRatio.step}
                    value={config.autonomousActionRatio * 100}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => updateConfig('autonomousActionRatio', parseFloat(e.target.value) / 100)}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-600 mt-1">
                    <span>{parameterRanges.autonomousActionRatio.min}%</span>
                    <span className="font-semibold">{(config.autonomousActionRatio * 100).toFixed(0)}%</span>
                    <span>{parameterRanges.autonomousActionRatio.max}%</span>
                  </div>
                </div>

                {/* Hybrid M365 Users */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Hybrid M365 Users (for hybrid models)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={30000}
                    value={config.hybridM365Users}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => updateConfig('hybridM365Users', parseInt(e.target.value) || 0)}
                    className="w-full p-2 border rounded bg-white"
                  />
                </div>

                {/* Peak Multiplier */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Peak Multiplier (every 6 months)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={2}
                    step={0.1}
                    value={config.peakMultiplier}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => updateConfig('peakMultiplier', parseFloat(e.target.value) || 1)}
                    className="w-full p-2 border rounded bg-white"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3-Year Cost Summary Table */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          3-Year Cost Summary
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left">Pricing Model</th>
                <th className="p-3 text-right">Year 1</th>
                <th className="p-3 text-right">Year 2</th>
                <th className="p-3 text-right">Year 3</th>
                <th className="p-3 text-right font-bold">3-Year Total</th>
              </tr>
            </thead>
            <tbody>
              {pricingSummary.map((summary, idx) => {
                const isCheapest = summary.model === cheapestModel.model;
                return (
                  <tr
                    key={idx}
                    className={`border-t ${isCheapest ? 'bg-green-50 font-semibold' : ''}`}
                  >
                    <td className="p-3 flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: summary.color }}></div>
                      {summary.model}
                    </td>
                    <td className="p-3 text-right">{formatCurrency(summary.year1)}</td>
                    <td className="p-3 text-right">{formatCurrency(summary.year2)}</td>
                    <td className="p-3 text-right">{formatCurrency(summary.year3)}</td>
                    <td className="p-3 text-right font-bold">{formatCurrency(summary.total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pricing Legend Boxes */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-5 gap-3">
          {pricingSummary.map((summary, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg border-2"
              style={{ borderColor: summary.color, backgroundColor: `${summary.color}15` }}
            >
              <div className="text-xs font-medium text-gray-700 mb-1">{summary.model}</div>
              <div className="text-lg font-bold" style={{ color: summary.color }}>
                {formatCurrency(summary.total)}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {summary.model === cheapestModel.model ? '✓ Cheapest' : `+${formatCurrency(summary.total - cheapestModel.total)}`}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Cost Comparison Chart */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          36-Month Cost Comparison (All Pricing Models)
        </h2>
        <ResponsiveContainer width="100%" height={480}>
          <LineChart
            data={monthlyData}
            margin={{ top: 20, right: 30, left: 60, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              label={{ value: 'Month', position: 'insideBottom', offset: -10 }}
            />
            <YAxis
              label={{ value: 'Cost ($)', angle: -90, position: 'insideLeft', offset: 20 }}
            />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              labelFormatter={(month: number) => `Month ${month}`}
            />
            <Legend
              verticalAlign="top"
              height={36}
              wrapperStyle={{ paddingBottom: '10px' }}
            />
            <Line
              type="monotone"
              dataKey="paygCost"
              stroke="#3b82f6"
              strokeWidth={2}
              name="PAYG Alone"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="p3Cost"
              stroke="#8b5cf6"
              strokeWidth={2}
              name="P3 Pre-Purchase"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="paygM365Cost"
              stroke="#10b981"
              strokeWidth={2}
              name="PAYG + M365 Licenses"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="p3M365Cost"
              stroke="#f59e0b"
              strokeWidth={2}
              name="P3 + M365 Licenses"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="m365AllCost"
              stroke="#ef4444"
              strokeWidth={2}
              strokeDasharray="5 5"
              name="M365 Copilot for All"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Onboarding Strategy & User Growth */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Onboarding Strategy & User Growth (36 Months)
        </h2>
        <ResponsiveContainer width="100%" height={380}>
          <LineChart
            data={monthlyData}
            margin={{ top: 20, right: 60, left: 60, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              label={{ value: 'Month', position: 'insideBottom', offset: -10 }}
            />
            <YAxis
              yAxisId="left"
              label={{ value: 'Number of Users', angle: -90, position: 'insideLeft', offset: 20 }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              label={{ value: 'Daily Active Users (%)', angle: 90, position: 'insideRight', offset: 20 }}
            />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (name === "DAU %") return `${value}%`;
                return formatNumber(value);
              }}
              labelFormatter={(month: number) => `Month ${month}`}
            />
            <Legend
              verticalAlign="top"
              height={36}
              wrapperStyle={{ paddingBottom: '10px' }}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="users"
              stroke="#8b5cf6"
              strokeWidth={3}
              name="Total Users (Cumulative)"
              dot={{ r: 1 }}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="activeUsers"
              stroke="#06b6d4"
              strokeWidth={2}
              strokeDasharray="5 5"
              name="Daily Active Users"
              dot={false}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="dauPercent"
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="3 3"
              name="DAU %"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>

        {/* Onboarding Roadmap with Milestones */}
        <div className="mt-6 space-y-3">
          <h3 className="font-semibold text-gray-800 mb-3">Rollout Milestones & Strategy</h3>
          {stages.map((stage, idx) => (
            <div key={idx} className="relative pl-8 pb-4">
              {/* Timeline connector */}
              {idx < stages.length - 1 && (
                <div className="absolute left-2 top-6 bottom-0 w-0.5 bg-gray-300"></div>
              )}

              {/* Milestone marker */}
              <div className="absolute left-0 top-1 w-4 h-4 rounded-full bg-blue-500 border-2 border-white"></div>

              <div className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded">
                      Month {stage.month}
                    </span>
                    <span className="font-semibold text-gray-900">{stage.name}</span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded font-medium ${
                    stage.phase === 'Pilot' ? 'bg-purple-100 text-purple-700' :
                    stage.phase === 'Expansion' ? 'bg-blue-100 text-blue-700' :
                    stage.phase === 'Management' ? 'bg-green-100 text-green-700' :
                    stage.phase === 'Stores' ? 'bg-amber-100 text-amber-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {stage.phase}
                  </span>
                </div>
                <div className="flex gap-4 text-xs text-gray-600 mt-2">
                  <span>👥 <strong>{formatNumber(stage.users)}</strong> total users</span>
                  <span>📊 <strong>{(stage.dau * 100).toFixed(0)}%</strong> DAU rate</span>
                  <span>✅ <strong>~{formatNumber(Math.round(stage.users * stage.dau))}</strong> daily active</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Key Strategy Notes */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-2">🎯 Onboarding Strategy Key Points:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>Gradual rollout</strong> over 31 months minimizes disruption and allows for learning</li>
            <li>• <strong>DAU decreases</strong> from 45% → 28% as casual users join (expected and healthy)</li>
            <li>• <strong>HQ first</strong> (engaged users) builds success stories before broader rollout</li>
            <li>• <strong>Store workers last</strong> (lowest DAU) ensures infrastructure is proven at scale</li>
          </ul>
        </div>
      </div>

      {/* Strategic Recommendations */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Strategic Recommendations
        </h2>

        <div className="space-y-4">
          <div className="border-l-4 border-green-500 pl-4">
            <h3 className="font-semibold text-gray-900 mb-2">Winner by Stage</h3>
            <p className="text-gray-700">
              <strong>Best Overall:</strong> {cheapestModel.model} with 3-year total of {formatCurrency(cheapestModel.total)}.
              {cheapestModel.model.includes('PAYG') && ' PAYG models offer cost advantages at lower usage levels.'}
              {cheapestModel.model.includes('M365') && ' Hybrid models balance license costs with usage-based pricing.'}
            </p>
          </div>

          <div className="border-l-4 border-blue-500 pl-4">
            <h3 className="font-semibold text-gray-900 mb-2">Breakeven Analysis</h3>
            <p className="text-gray-700">
              At {creditsPerConversation.toFixed(1)} credits/conversation, monitor monthly consumption closely.
              M365 Copilot ($30/user/month) becomes cost-effective at 3,000 credits/user/month.
              Hybrid models optimize costs by giving M365 licenses to power users while using PAYG for occasional users.
            </p>
          </div>

          <div className="border-l-4 border-yellow-500 pl-4">
            <h3 className="font-semibold text-gray-900 mb-2">Recommended Phased Strategy</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              <li><strong>Pilot (Month 1-3):</strong> Start with PAYG to measure actual usage patterns</li>
              <li><strong>Expansion (Month 4-9):</strong> Continue PAYG, consider P3 if usage is consistent</li>
              <li><strong>Management (Month 10-18):</strong> Evaluate hybrid models for power users</li>
              <li><strong>Enterprise (Month 19+):</strong> Optimize mix based on usage data - consider M365 for high-consumption users</li>
            </ul>
          </div>

          <div className="border-l-4 border-purple-500 pl-4">
            <h3 className="font-semibold text-gray-900 mb-2">3-Year Total Comparison</h3>
            <p className="text-gray-700">
              Savings from {cheapestModel.model} vs most expensive: {formatCurrency(
                pricingSummary.reduce((max, curr) => curr.total > max.total ? curr : max).total - cheapestModel.total
              )}. The choice depends on your organization's M365 licensing strategy and predicted usage growth.
            </p>
          </div>
        </div>
      </div>

      {/* Cost Optimization Tips */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Cost Optimization Tips
        </h2>

        <div className="space-y-3">
          <div className="bg-blue-50 p-3 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-1">Classic vs Generative Turns</h4>
            <p className="text-sm text-blue-800">
              Classic responses (1 credit) cost 50% less than generative (2 credits). Design agents to use classic responses for FAQ-style queries and reserve generative AI for complex problem-solving.
            </p>
          </div>

          <div className="bg-green-50 p-3 rounded-lg">
            <h4 className="font-semibold text-green-900 mb-1">Action Usage Best Practices</h4>
            <p className="text-sm text-green-800">
              Actions cost 5 credits each. Batch multiple data operations into single actions where possible. Cache frequently-accessed data to reduce redundant action calls.
            </p>
          </div>

          <div className="bg-yellow-50 p-3 rounded-lg">
            <h4 className="font-semibold text-yellow-900 mb-1">Peak Month Planning</h4>
            <p className="text-sm text-yellow-800">
              Plan for {((config.peakMultiplier - 1) * 100).toFixed(0)}% usage spikes every 6 months. Consider P3 pre-purchase (15% discount) if your baseline usage is predictable.
            </p>
          </div>

          <div className="bg-purple-50 p-3 rounded-lg">
            <h4 className="font-semibold text-purple-900 mb-1">When to Switch: PAYG → P3</h4>
            <p className="text-sm text-purple-800">
              P3 pre-purchase offers 15% savings. Switch when monthly usage is consistent (±20%) for 3+ months. The discount offsets the commitment risk.
            </p>
          </div>

          <div className="bg-pink-50 p-3 rounded-lg">
            <h4 className="font-semibold text-pink-900 mb-1">When to Add M365 Licenses (Hybrid)</h4>
            <p className="text-sm text-pink-800">
              Give M365 Copilot licenses to users consuming &gt;3,000 credits/month. For hybrid models, only autonomous actions ({(config.autonomousActionRatio * 100).toFixed(0)}% of actions) incur credits for licensed users.
            </p>
          </div>

          <div className="bg-indigo-50 p-3 rounded-lg">
            <h4 className="font-semibold text-indigo-900 mb-1">Autonomous Action Optimization</h4>
            <p className="text-sm text-indigo-800">
              With M365 licenses, user-triggered actions are free - only autonomous (scheduled/background) actions incur credits. Design workflows to maximize user-triggered interactions.
            </p>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-1">Dev/Test/Prod Separation</h4>
            <p className="text-sm text-gray-800">
              Separate development and testing environments from production billing. Use mock responses in dev/test to avoid consuming production credits during agent development.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CopilotCostCalculator;
