import React, { useState, useMemo, ChangeEvent } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Plus, Trash2, Edit2 } from 'lucide-react';

// Interfaces
interface Stage {
  name: string;
  users: number;
  month: number;
  dau: number;
  phase: string;
}

interface Config {
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

interface Agent {
  id: number;
  name: string;
  purpose: string;
  conversationsPerDay: number;
  turns: number;
  generativeRatio: number;
  actions: number;
  tenantGraph: boolean;
  deployMonth: number;
  segments: string[];
  color: string;
  enabled: boolean;
}

interface AgentMonthlyCost {
  month: number;
  agentCosts: { agentId: number; agentName: string; cost: number; color: string }[];
  totalCost: number;
}

const CopilotCostCalculator: React.FC = () => {
  // Stages with time-based rollout (now editable)
  const [stages, setStages] = useState<Stage[]>([
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
    m365CopilotPrice: 30,
    autonomousActionRatio: 0.15,
    hybridM365Users: 200
  });

  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [showStageEditor, setShowStageEditor] = useState<boolean>(false);
  const [showRolloutPlan, setShowRolloutPlan] = useState<boolean>(false);
  const [showAgentPortfolio, setShowAgentPortfolio] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(true);

  // Agent portfolio state
  const agentColors = ['#8b5cf6', '#3b82f6', '#f59e0b', '#22c55e', '#ef4444', '#ec4899', '#06b6d4', '#84cc16'];

  const [agents, setAgents] = useState<Agent[]>([
    {
      id: 1,
      name: 'HR Helper',
      purpose: 'Benefits, PTO, policies',
      conversationsPerDay: 1.5,
      turns: 4,
      generativeRatio: 0.50,
      actions: 0.5,
      tenantGraph: false,
      deployMonth: 1,
      segments: ['HQ', 'Management', 'Stores', 'All'],
      color: '#8b5cf6',
      enabled: true
    },
    {
      id: 2,
      name: 'IT Helpdesk',
      purpose: 'Password reset, access requests',
      conversationsPerDay: 1.0,
      turns: 5,
      generativeRatio: 0.60,
      actions: 2,
      tenantGraph: false,
      deployMonth: 1,
      segments: ['HQ', 'Management', 'Stores', 'All'],
      color: '#3b82f6',
      enabled: true
    },
    {
      id: 3,
      name: 'Document Search',
      purpose: 'Policy docs, manuals',
      conversationsPerDay: 1.0,
      turns: 6,
      generativeRatio: 0.80,
      actions: 1,
      tenantGraph: true,
      deployMonth: 4,
      segments: ['HQ', 'Management'],
      color: '#f59e0b',
      enabled: true
    },
    {
      id: 4,
      name: 'Document Translation',
      purpose: 'Translate PPT, Word, Excel documents',
      conversationsPerDay: 0.75,
      turns: 4,
      generativeRatio: 0.95,
      actions: 2.5,
      tenantGraph: false,
      deployMonth: 5,
      segments: ['HQ', 'Management'],
      color: '#22c55e',
      enabled: true
    },
    {
      id: 5,
      name: 'Document Summarization',
      purpose: 'Summarize PPT, Word, Excel documents',
      conversationsPerDay: 1.5,
      turns: 5,
      generativeRatio: 0.85,
      actions: 1.5,
      tenantGraph: false,
      deployMonth: 2,
      segments: ['HQ', 'Management', 'Stores', 'All'],
      color: '#ef4444',
      enabled: true
    }
  ]);

  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [showAddAgent, setShowAddAgent] = useState<boolean>(false);

  // Update stage values
  const updateStage = (index: number, field: 'users' | 'dau', value: number) => {
    const newStages = [...stages];
    if (field === 'dau') {
      newStages[index] = { ...newStages[index], dau: value / 100 };
    } else {
      newStages[index] = { ...newStages[index], [field]: value };
    }
    setStages(newStages);
  };

  // Agent helper functions
  const calculateAgentCredits = (agent: Agent): number => {
    const classicCredits = agent.turns * (1 - agent.generativeRatio) * 1;
    const generativeCredits = agent.turns * agent.generativeRatio * 2;
    const actionCredits = agent.actions * 5;
    const graphCredits = agent.tenantGraph ? 10 : 0;
    return classicCredits + generativeCredits + actionCredits + graphCredits;
  };

  const addAgent = (newAgent: Partial<Agent>) => {
    const id = Math.max(...agents.map(a => a.id), 0) + 1;
    const color = agentColors[agents.length % agentColors.length];
    setAgents([...agents, { ...newAgent, id, color } as Agent]);
    setShowAddAgent(false);
  };

  const updateAgent = (id: number, updatedAgent: Partial<Agent>) => {
    setAgents(agents.map(a => a.id === id ? { ...a, ...updatedAgent } : a));
    setEditingAgent(null);
  };

  const deleteAgent = (id: number) => {
    setAgents(agents.filter(a => a.id !== id));
  };

  const toggleAgent = (id: number) => {
    setAgents(agents.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a));
  };

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

  // Calculate monthly projections over 36 months (aggregated from all agents)
  const monthlyData = useMemo((): MonthlyData[] => {
    const data: MonthlyData[] = [];
    const DAYS_PER_MONTH = 30;
    const paygRate = 0.01;
    const p3Discount = 0.15;

    for (let month = 1; month <= 36; month++) {
      // Find stages before and after this month
      const stagesBefore = stages.filter(s => s.month <= month);
      const stagesAfter = stages.filter(s => s.month > month);

      // Interpolate users and DAU
      const users = Math.round(interpolateValue(month, stagesBefore, stagesAfter, s => s.users));
      const dau = interpolateValue(month, stagesBefore, stagesAfter, s => s.dau);
      const activeUsers = Math.round(users * dau);

      // Find current stage for segment calculations
      const currentStage = [...stages].reverse().find(s => s.month <= month) || stages[0];

      // Aggregate costs across all enabled agents
      let totalConversations = 0;
      let totalCredits = 0;
      let totalActionsForM365 = 0; // For M365 hybrid model autonomous actions

      agents.forEach(agent => {
        // Only include enabled agents that have been deployed
        if (!agent.enabled || month < agent.deployMonth) {
          return;
        }

        // Determine eligible users based on agent segments
        let eligibleUsers = 0;
        if (agent.segments.includes('All')) {
          eligibleUsers = users;
        } else if (agent.segments.includes('Stores')) {
          eligibleUsers = users;
        } else if (agent.segments.includes('Management')) {
          if (currentStage.phase === 'Management' || currentStage.phase === 'Stores' || currentStage.phase === 'Enterprise') {
            eligibleUsers = users;
          } else if (currentStage.phase === 'Expansion') {
            eligibleUsers = Math.round(users * 0.4);
          }
        } else if (agent.segments.includes('HQ')) {
          if (currentStage.phase === 'Pilot' || currentStage.phase === 'Expansion') {
            eligibleUsers = users;
          } else {
            eligibleUsers = Math.round(users * 0.15);
          }
        }

        // Calculate agent-specific metrics
        const agentActiveUsers = Math.round(eligibleUsers * dau);
        const agentConversations = agentActiveUsers * agent.conversationsPerDay * DAYS_PER_MONTH;
        const agentCreditsPerConv = calculateAgentCredits(agent);
        const agentCredits = agentConversations * agentCreditsPerConv;

        // Accumulate totals
        totalConversations += agentConversations;
        totalCredits += agentCredits;
        totalActionsForM365 += agentConversations * agent.actions; // Track actions for M365 model
      });

      // Model 1: PAYG Alone
      const paygCost = totalCredits * paygRate;

      // Model 2: P3 Pre-Purchase (15% discount)
      const p3Cost = totalCredits * paygRate * (1 - p3Discount);

      // Model 3 & 4: PAYG/P3 + M365 Licenses (hybrid)
      // M365 users only pay for autonomous actions
      const m365Users = Math.min(config.hybridM365Users, users);
      const paygUsers = users - m365Users;

      // Split credits proportionally between M365 and PAYG users
      const userRatio = users > 0 ? paygUsers / users : 0;
      const paygCredits = totalCredits * userRatio;
      const m365AutonomousCredits = totalActionsForM365 * (1 - userRatio) * config.autonomousActionRatio * 5;

      const paygM365Cost = (m365Users * config.m365CopilotPrice) + ((m365AutonomousCredits + paygCredits) * paygRate);
      const p3M365Cost = (m365Users * config.m365CopilotPrice) + ((m365AutonomousCredits + paygCredits) * paygRate * (1 - p3Discount));

      // Model 5: M365 Copilot for All
      const m365AllCost = users * config.m365CopilotPrice;

      data.push({
        month,
        year: month <= 12 ? 'Year 1' : month <= 24 ? 'Year 2' : 'Year 3',
        users,
        dau,
        dauPercent: dau * 100,
        activeUsers,
        conversations: Math.round(totalConversations),
        credits: Math.round(totalCredits),
        paygCost: Math.round(paygCost),
        p3Cost: Math.round(p3Cost),
        paygM365Cost: Math.round(paygM365Cost),
        p3M365Cost: Math.round(p3M365Cost),
        m365AllCost: Math.round(m365AllCost)
      });
    }

    return data;
  }, [stages, agents, config]);

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

  // Calculate agent-based monthly costs
  const agentMonthlyCosts = useMemo((): AgentMonthlyCost[] => {
    const costs: AgentMonthlyCost[] = [];
    const PAYG_RATE = 0.01;
    const DAYS_PER_MONTH = 30;

    for (let month = 1; month <= 36; month++) {
      // Find current user counts from monthlyData
      const monthData = monthlyData[month - 1];
      if (!monthData) continue;

      const agentCosts: { agentId: number; agentName: string; cost: number; color: string }[] = [];
      let totalCost = 0;

      agents.forEach(agent => {
        // Only include enabled agents
        if (!agent.enabled) {
          return;
        }

        // Check if agent is deployed this month
        if (month < agent.deployMonth) {
          return;
        }

        // Determine which users have access based on segments
        let eligibleUsers = 0;
        // Find the last stage that has started (not the first one)
        const currentStage = [...stages].reverse().find(s => s.month <= month) || stages[0];

        // Simplified segment calculation based on stage phase
        if (agent.segments.includes('All')) {
          eligibleUsers = monthData.users;
        } else if (agent.segments.includes('Stores')) {
          eligibleUsers = monthData.users; // Stores implies access to all
        } else if (agent.segments.includes('Management')) {
          // Management is available from "HQ + Mgmt" stage onwards
          if (currentStage.phase === 'Management' || currentStage.phase === 'Stores' || currentStage.phase === 'Enterprise') {
            eligibleUsers = monthData.users;
          } else if (currentStage.phase === 'Expansion') {
            eligibleUsers = Math.round(monthData.users * 0.4); // Partial management access
          }
        } else if (agent.segments.includes('HQ')) {
          // HQ only
          if (currentStage.phase === 'Pilot' || currentStage.phase === 'Expansion') {
            eligibleUsers = monthData.users;
          } else {
            eligibleUsers = Math.round(monthData.users * 0.15); // HQ is ~15% of total
          }
        }

        // Calculate costs for this agent
        const activeUsers = Math.round(eligibleUsers * monthData.dau);
        const creditsPerConv = calculateAgentCredits(agent);
        const monthlyConversations = activeUsers * agent.conversationsPerDay * DAYS_PER_MONTH;
        const monthlyCredits = monthlyConversations * creditsPerConv;
        const monthlyCost = monthlyCredits * PAYG_RATE;

        agentCosts.push({
          agentId: agent.id,
          agentName: agent.name,
          cost: Math.round(monthlyCost),
          color: agent.color
        });

        totalCost += monthlyCost;
      });

      costs.push({
        month,
        agentCosts,
        totalCost: Math.round(totalCost)
      });
    }

    return costs;
  }, [agents, monthlyData, stages]);

  // Calculate 3-year agent cost summary
  const agent3YearSummary = useMemo(() => {
    const summary = agents.filter(agent => agent.enabled).map(agent => {
      let year1 = 0, year2 = 0, year3 = 0;

      agentMonthlyCosts.forEach(({ month, agentCosts }) => {
        const agentCost = agentCosts.find(ac => ac.agentId === agent.id);
        if (!agentCost) return;

        if (month <= 12) year1 += agentCost.cost;
        else if (month <= 24) year2 += agentCost.cost;
        else year3 += agentCost.cost;
      });

      return {
        agent,
        year1,
        year2,
        year3,
        total: year1 + year2 + year3
      };
    });

    return summary;
  }, [agents, agentMonthlyCosts]);

  // Calculate licensing breakpoint analysis
  const licensingBreakpoint = useMemo(() => {
    const enabledAgents = agents.filter(a => a.enabled);

    if (enabledAgents.length === 0) {
      return {
        currentAgentCount: 0,
        currentPaygTotal: 0,
        currentM365Total: 0,
        breakpointAgentCount: 0,
        breakpointPaygTotal: 0,
        additionalAgents: 0,
        hasBreakpoint: false,
        message: 'No agents enabled'
      };
    }

    // Get current costs from pricing summary
    // Compare PAYG to pure M365 licensing (M365 Copilot for All), not hybrid models
    const currentPaygTotal = pricingSummary.find(p => p.model === 'PAYG Alone')?.total || 0;
    const currentM365Total = pricingSummary.find(p => p.model === 'M365 Copilot for All')?.total || 0;

    // If M365 is already cheaper, return current state
    if (currentPaygTotal >= currentM365Total) {
      return {
        currentAgentCount: enabledAgents.length,
        currentPaygTotal,
        currentM365Total,
        breakpointAgentCount: enabledAgents.length,
        breakpointPaygTotal: currentPaygTotal,
        additionalAgents: 0,
        hasBreakpoint: true,
        message: `M365 Copilot for All is already more economical at current scale`
      };
    }

    // Calculate average agent characteristics for simulation
    const avgCreditsPerConv = enabledAgents.reduce((sum, a) => sum + calculateAgentCredits(a), 0) / enabledAgents.length;
    const avgConversationsPerDay = enabledAgents.reduce((sum, a) => sum + a.conversationsPerDay, 0) / enabledAgents.length;
    const avgDeployMonth = Math.round(enabledAgents.reduce((sum, a) => sum + a.deployMonth, 0) / enabledAgents.length);

    // Most common segment (for simulation)
    const segmentCounts = new Map<string, number>();
    enabledAgents.forEach(a => {
      a.segments.forEach(seg => {
        segmentCounts.set(seg, (segmentCounts.get(seg) || 0) + 1);
      });
    });
    const mostCommonSegment = Array.from(segmentCounts.entries()).sort((a, b) => b[1] - a[1])[0][0];

    // Simulate adding agents incrementally
    const PAYG_RATE = 0.01;
    const DAYS_PER_MONTH = 30;
    const MAX_AGENTS_TO_SIMULATE = 200; // Reasonable upper limit

    for (let additionalAgents = 1; additionalAgents <= MAX_AGENTS_TO_SIMULATE; additionalAgents++) {
      // Calculate additional cost from simulated agents
      let additionalCost = 0;

      for (let month = 1; month <= 36; month++) {
        const monthData = monthlyData[month - 1];
        if (!monthData) continue;

        // Only count months after average deployment
        if (month < avgDeployMonth) continue;

        // Calculate eligible users based on most common segment
        let eligibleUsers = 0;
        const currentStage = [...stages].reverse().find(s => s.month <= month) || stages[0];

        if (mostCommonSegment === 'All') {
          eligibleUsers = monthData.users;
        } else if (mostCommonSegment === 'Stores') {
          eligibleUsers = monthData.users;
        } else if (mostCommonSegment === 'Management') {
          if (currentStage.phase === 'Management' || currentStage.phase === 'Stores' || currentStage.phase === 'Enterprise') {
            eligibleUsers = monthData.users;
          } else if (currentStage.phase === 'Expansion') {
            eligibleUsers = Math.round(monthData.users * 0.4);
          }
        } else if (mostCommonSegment === 'HQ') {
          if (currentStage.phase === 'Pilot' || currentStage.phase === 'Expansion') {
            eligibleUsers = monthData.users;
          } else {
            eligibleUsers = Math.round(monthData.users * 0.15);
          }
        }

        // Calculate cost for simulated agents this month
        const activeUsers = Math.round(eligibleUsers * monthData.dau);
        const monthlyConversations = activeUsers * avgConversationsPerDay * DAYS_PER_MONTH;
        const monthlyCredits = monthlyConversations * avgCreditsPerConv;
        const monthlyCost = monthlyCredits * PAYG_RATE;

        additionalCost += monthlyCost * additionalAgents;
      }

      const projectedPaygTotal = currentPaygTotal + additionalCost;

      // Check if we've reached the breakpoint
      if (projectedPaygTotal >= currentM365Total) {
        return {
          currentAgentCount: enabledAgents.length,
          currentPaygTotal,
          currentM365Total,
          breakpointAgentCount: enabledAgents.length + additionalAgents,
          breakpointPaygTotal: Math.round(projectedPaygTotal),
          additionalAgents,
          hasBreakpoint: true,
          avgCreditsPerConv: Math.round(avgCreditsPerConv * 10) / 10,
          message: `With your current onboarding plan, you have headroom for ${additionalAgents} more agent${additionalAgents > 1 ? 's' : ''} before M365 Copilot for All becomes more economical`
        };
      }
    }

    // No breakpoint found within reasonable limits
    return {
      currentAgentCount: enabledAgents.length,
      currentPaygTotal,
      currentM365Total,
      breakpointAgentCount: enabledAgents.length + MAX_AGENTS_TO_SIMULATE,
      breakpointPaygTotal: 0,
      additionalAgents: MAX_AGENTS_TO_SIMULATE,
      hasBreakpoint: false,
      avgCreditsPerConv: Math.round(avgCreditsPerConv * 10) / 10,
      message: `PAYG remains more economical even with ${MAX_AGENTS_TO_SIMULATE}+ additional agents given your onboarding plan`
    };
  }, [agents, pricingSummary, monthlyData, stages]);

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

        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6">
          <p className="text-sm text-amber-900">
            <strong>⚠️ Disclaimer:</strong> This tool provides indicative, non-binding cost estimates based on user inputs and publicly available Microsoft pricing. Actual pricing, terms, and usage costs may change at any time. Estimates are for informational purposes only and must be validated with official Microsoft documentation or an authorized representative. No guarantee of accuracy is provided, and no liability is accepted for decisions made based on these projections.
          </p>
        </div>

        {/* Settings Section */}
        <div className="mb-6">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="w-full text-left text-xl font-bold text-gray-900 p-4 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            {showSettings ? '▼' : '▶'} ⚙️ Settings
          </button>

          {showSettings && (
            <div className="mt-4 space-y-6">

        {/* Agent Configuration & Selection */}
        <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border-2 border-purple-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-800">🤖 Agent Configuration & Selection</h3>
            <button
              onClick={() => setShowAddAgent(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={18} />
              Add Agent
            </button>
          </div>
          <p className="text-sm text-gray-600 mb-4">Configure your agent portfolio and select which agents to include in your cost projection. Each agent has unique usage patterns that impact consumption costs.</p>

          <div className="space-y-3">
            {agents.map(agent => (
              <div key={agent.id} className="bg-white rounded-lg p-4 border border-gray-200 hover:border-purple-300 transition-colors">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={agent.enabled}
                    onChange={() => toggleAgent(agent.id)}
                    className="mt-1 w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: agent.color }}></div>
                      <h4 className="font-semibold text-gray-900">{agent.name}</h4>
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                        Month {agent.deployMonth}+
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{agent.purpose}</p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-gray-500">Conversations/day:</span>
                        <span className="ml-1 font-medium">{agent.conversationsPerDay}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Turns:</span>
                        <span className="ml-1 font-medium">{agent.turns}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Generative:</span>
                        <span className="ml-1 font-medium">{(agent.generativeRatio * 100).toFixed(0)}%</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Actions:</span>
                        <span className="ml-1 font-medium">{agent.actions}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Tenant Graph:</span>
                        <span className="ml-1 font-medium">{agent.tenantGraph ? 'Yes' : 'No'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Credits/Conv:</span>
                        <span className="ml-1 font-medium text-purple-700">{calculateAgentCredits(agent).toFixed(1)}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-500">Segments:</span>
                        <span className="ml-1 font-medium">{agent.segments.join(', ')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => setEditingAgent(agent)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => deleteAgent(agent.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add/Edit Agent Form */}
          {(showAddAgent || editingAgent) && (
            <AgentForm
              agent={editingAgent}
              onSave={editingAgent ? (data: Partial<Agent>) => updateAgent(editingAgent.id, data) : addAgent}
              onCancel={() => {
                setShowAddAgent(false);
                setEditingAgent(null);
              }}
            />
          )}
        </div>

        {/* User Rollout Configuration */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">👥 User Rollout Configuration</h3>

          <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-4">

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Final User Count (Month 31)
              </label>
              <div className="text-2xl font-bold text-blue-900">
                {formatNumber(stages[stages.length - 1].users)} users
              </div>
              <p className="text-xs text-gray-500 mt-1">Click "Edit Deployment Stages" to adjust</p>
            </div>
          </div>

          <button
            onClick={() => setShowStageEditor(!showStageEditor)}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            {showStageEditor ? '▼' : '▶'} Edit Deployment Stages (Users & DAU)
          </button>

          {showStageEditor && (
            <div className="mt-4 space-y-3 p-4 bg-white rounded-lg border border-gray-300">
              <p className="text-sm text-gray-600 mb-3">
                Adjust the number of users and DAU (Daily Active Users) percentage for each deployment stage:
              </p>
              {stages.map((stage, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center p-3 bg-gray-50 rounded">
                  <div>
                    <span className="text-sm font-semibold text-gray-900">Month {stage.month}</span>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Users
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={50000}
                      step={100}
                      value={stage.users}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        updateStage(idx, 'users', parseInt(e.target.value) || 0)
                      }
                      className="w-full p-2 border rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      DAU (Daily Active Users %)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={(stage.dau * 100).toFixed(0)}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        updateStage(idx, 'dau', parseInt(e.target.value) || 0)
                      }
                      className="w-full p-2 border rounded text-sm"
                    />
                  </div>
                </div>
              ))}
              <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                <p className="text-xs text-blue-800">
                  💡 <strong>Tip:</strong> Higher DAU % means more users are actively using the system daily.
                  Typically, early adopters (HQ) have higher DAU than later groups (stores).
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Advanced Settings Toggle */}
        <div className="space-y-4">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            {showAdvanced ? '▼' : '▶'} Advanced Settings
          </button>

          {showAdvanced && (
            <div className="space-y-4 p-4 bg-gray-100 rounded-lg">
              <p className="text-sm text-gray-700 mb-4">
                Configure parameters for the M365 Copilot hybrid pricing models. These settings help accurately model scenarios where some users have M365 Copilot licenses while others use pay-as-you-go Copilot Studio.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* M365 Copilot Price */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    M365 Copilot Price: ${config.m365CopilotPrice}/user/month
                  </label>
                  <input
                    type="number"
                    min="25"
                    max="35"
                    value={config.m365CopilotPrice}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => updateConfig('m365CopilotPrice', parseInt(e.target.value))}
                    className="w-full p-2 border rounded bg-white"
                  />
                  <p className="text-xs text-gray-500 mt-1">Standard: $30, Volume discount: $25-28</p>
                </div>

                {/* Autonomous Action Ratio */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Autonomous Action Ratio: {(config.autonomousActionRatio * 100).toFixed(0)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="5"
                    value={config.autonomousActionRatio * 100}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => updateConfig('autonomousActionRatio', parseFloat(e.target.value) / 100)}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>User-triggered (0-10%)</span>
                    <span>Some automation (10-20%)</span>
                    <span>Highly autonomous (25-50%)</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    M365 Copilot licenses cover user-triggered actions, but autonomous (proactive) actions still cost credits. Typical range: 10-20%.
                  </p>
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
              </div>
            </div>
          )}
        </div>

            </div>
          )}
        </div>

      {/* Configuration Summary */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          📋 Configuration Summary
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Overview of your configured agent portfolio and user rollout plan
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Agent Portfolio Overview */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg p-5">
            <h3 className="text-lg font-semibold mb-3 text-purple-900">🤖 Agent Portfolio Overview</h3>
            <div className="space-y-3">
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="text-sm text-gray-600 mb-1">Enabled Agents</div>
                <div className="text-2xl font-bold text-purple-900">{agents.filter(a => a.enabled).length} of {agents.length}</div>
                <div className="text-xs text-gray-500 mt-1">
                  Avg: {agents.filter(a => a.enabled).length > 0 ? (agents.filter(a => a.enabled).reduce((s, a) => s + calculateAgentCredits(a), 0) / agents.filter(a => a.enabled).length).toFixed(1) : 0} credits/conv
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="text-sm text-gray-600 mb-1">Complexity Range</div>
                <div className="text-2xl font-bold text-purple-900">
                  {agents.filter(a => a.enabled).length > 0 ? Math.min(...agents.filter(a => a.enabled).map(a => calculateAgentCredits(a))).toFixed(1) : 0} - {agents.filter(a => a.enabled).length > 0 ? Math.max(...agents.filter(a => a.enabled).map(a => calculateAgentCredits(a))).toFixed(1) : 0}
                </div>
                <div className="text-xs text-gray-500 mt-1">Credits per conversation</div>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="text-sm text-gray-600 mb-1">Using Tenant Graph</div>
                <div className="text-2xl font-bold text-purple-900">
                  {agents.filter(a => a.enabled && a.tenantGraph).length} / {agents.filter(a => a.enabled).length}
                </div>
                <div className="text-xs text-gray-500 mt-1">+10 credits/conversation each</div>
              </div>
            </div>
          </div>

          {/* User Onboarding Overview */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-5">
            <h3 className="text-lg font-semibold mb-3 text-blue-900">👥 User Onboarding Overview</h3>
            <div className="space-y-3">
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="text-sm text-gray-600 mb-1">Total Users (Final)</div>
                <div className="text-2xl font-bold text-blue-900">{formatNumber(stages[stages.length - 1].users)}</div>
                <div className="text-xs text-gray-500 mt-1">At month {stages[stages.length - 1].month}</div>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="text-sm text-gray-600 mb-1">Rollout Duration</div>
                <div className="text-2xl font-bold text-blue-900">{stages[stages.length - 1].month} months</div>
                <div className="text-xs text-gray-500 mt-1">{stages.length} deployment stages</div>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="text-sm text-gray-600 mb-1">DAU Range</div>
                <div className="text-2xl font-bold text-blue-900">
                  {(Math.min(...stages.map(s => s.dau)) * 100).toFixed(0)}% - {(Math.max(...stages.map(s => s.dau)) * 100).toFixed(0)}%
                </div>
                <div className="text-xs text-gray-500 mt-1">Daily active user rate</div>
              </div>
            </div>
          </div>
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

      {/* Licensing Breakpoint Analysis */}
      {agents.filter(a => a.enabled).length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            💡 Licensing Breakpoint Analysis
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Based on your specific onboarding plan and current agent portfolio, this analysis shows how many more agents you can add before M365 licensing becomes more economical than PAYG.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Current State */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg p-5">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">📊 Current State</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">Enabled Agents:</span>
                  <span className="text-lg font-bold text-blue-900">{licensingBreakpoint.currentAgentCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">PAYG 3-Year Total:</span>
                  <span className="text-lg font-bold text-blue-900">{formatCurrency(licensingBreakpoint.currentPaygTotal)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">M365 Copilot for All Total:</span>
                  <span className="text-lg font-bold text-indigo-900">{formatCurrency(licensingBreakpoint.currentM365Total)}</span>
                </div>
                <div className="pt-3 border-t border-blue-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">PAYG Savings:</span>
                    <span className="text-lg font-bold text-green-600">
                      {licensingBreakpoint.currentPaygTotal < licensingBreakpoint.currentM365Total
                        ? formatCurrency(licensingBreakpoint.currentM365Total - licensingBreakpoint.currentPaygTotal)
                        : '$0'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Breakpoint Analysis */}
            <div className={`bg-gradient-to-br ${
              licensingBreakpoint.hasBreakpoint && licensingBreakpoint.additionalAgents > 0
                ? 'from-green-50 to-emerald-50 border-2 border-green-300'
                : licensingBreakpoint.hasBreakpoint && licensingBreakpoint.additionalAgents === 0
                ? 'from-orange-50 to-amber-50 border-2 border-orange-300'
                : 'from-purple-50 to-pink-50 border-2 border-purple-300'
            } rounded-lg p-5`}>
              <h3 className={`text-lg font-semibold mb-3 ${
                licensingBreakpoint.hasBreakpoint && licensingBreakpoint.additionalAgents > 0
                  ? 'text-green-900'
                  : licensingBreakpoint.hasBreakpoint && licensingBreakpoint.additionalAgents === 0
                  ? 'text-orange-900'
                  : 'text-purple-900'
              }`}>
                {licensingBreakpoint.hasBreakpoint && licensingBreakpoint.additionalAgents > 0
                  ? '✅ Breakpoint Found'
                  : licensingBreakpoint.hasBreakpoint && licensingBreakpoint.additionalAgents === 0
                  ? '⚠️ At Breakpoint'
                  : '🚀 High Headroom'}
              </h3>

              {licensingBreakpoint.hasBreakpoint && licensingBreakpoint.additionalAgents > 0 ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-700">Additional Agents:</span>
                    <span className="text-2xl font-bold text-green-900">+{licensingBreakpoint.additionalAgents}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-700">Breakpoint @ Agents:</span>
                    <span className="text-lg font-bold text-green-900">{licensingBreakpoint.breakpointAgentCount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-700">PAYG @ Breakpoint:</span>
                    <span className="text-lg font-bold text-gray-900">{formatCurrency(licensingBreakpoint.breakpointPaygTotal)}</span>
                  </div>
                  <div className="pt-3 border-t border-green-200">
                    <p className="text-sm text-gray-700 italic">
                      {licensingBreakpoint.avgCreditsPerConv && `Simulated with avg ${licensingBreakpoint.avgCreditsPerConv} credits/conv`}
                    </p>
                  </div>
                </div>
              ) : licensingBreakpoint.hasBreakpoint && licensingBreakpoint.additionalAgents === 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-700">
                    M365 Copilot for All is already more economical at your current agent scale.
                  </p>
                  <div className="flex justify-between items-center pt-3 border-t border-orange-200">
                    <span className="text-sm font-medium text-gray-700">Consider:</span>
                    <span className="text-lg font-bold text-orange-900">M365 Copilot for All</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-700">
                    PAYG remains highly economical even with {licensingBreakpoint.additionalAgents}+ additional agents given your current onboarding plan and user adoption rates.
                  </p>
                  <div className="pt-3 border-t border-purple-200">
                    <p className="text-xs text-gray-600 italic">
                      Your phased rollout and DAU rates keep per-user costs low
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Key Insight */}
          <div className={`mt-6 p-4 rounded-lg border-l-4 ${
            licensingBreakpoint.hasBreakpoint && licensingBreakpoint.additionalAgents > 0
              ? 'bg-green-50 border-green-500'
              : licensingBreakpoint.hasBreakpoint && licensingBreakpoint.additionalAgents === 0
              ? 'bg-orange-50 border-orange-500'
              : 'bg-purple-50 border-purple-500'
          }`}>
            <p className={`text-sm font-medium ${
              licensingBreakpoint.hasBreakpoint && licensingBreakpoint.additionalAgents > 0
                ? 'text-green-900'
                : licensingBreakpoint.hasBreakpoint && licensingBreakpoint.additionalAgents === 0
                ? 'text-orange-900'
                : 'text-purple-900'
            }`}>
              💡 {licensingBreakpoint.message}
            </p>
          </div>
        </div>
      )}

      {/* Agent Cost Analysis (3-Year Total) */}
      {showAgentPortfolio && agents.filter(a => a.enabled).length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Agent Cost Analysis (3-Year Total)
          </h2>

          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-4">
              Long-term cost projection showing how your agent portfolio costs evolve over 36 months with phased deployment.
            </p>

            {/* 3-Year Summary Table */}
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-blue-100 to-indigo-100">
                  <tr>
                    <th className="p-3 text-left">Agent</th>
                    <th className="p-3 text-right">Deploy Month</th>
                    <th className="p-3 text-right">Year 1</th>
                    <th className="p-3 text-right">Year 2</th>
                    <th className="p-3 text-right">Year 3</th>
                    <th className="p-3 text-right">3-Year Total</th>
                  </tr>
                </thead>
                <tbody>
                  {agent3YearSummary
                    .sort((a, b) => b.total - a.total)
                    .map(({ agent, year1, year2, year3, total }) => (
                      <tr key={agent.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: agent.color }}></div>
                            <span className="font-medium">{agent.name}</span>
                          </div>
                        </td>
                        <td className="p-3 text-right">Month {agent.deployMonth}</td>
                        <td className="p-3 text-right font-mono">{formatCurrency(year1)}</td>
                        <td className="p-3 text-right font-mono">{formatCurrency(year2)}</td>
                        <td className="p-3 text-right font-mono">{formatCurrency(year3)}</td>
                        <td className="p-3 text-right font-mono font-bold text-blue-900">{formatCurrency(total)}</td>
                      </tr>
                    ))}
                  <tr className="bg-gradient-to-r from-blue-100 to-indigo-100 font-bold">
                    <td className="p-3" colSpan={2}>Total Portfolio Cost</td>
                    <td className="p-3 text-right">
                      {formatCurrency(agent3YearSummary.reduce((sum, a) => sum + a.year1, 0))}
                    </td>
                    <td className="p-3 text-right">
                      {formatCurrency(agent3YearSummary.reduce((sum, a) => sum + a.year2, 0))}
                    </td>
                    <td className="p-3 text-right">
                      {formatCurrency(agent3YearSummary.reduce((sum, a) => sum + a.year3, 0))}
                    </td>
                    <td className="p-3 text-right text-blue-900">
                      {formatCurrency(agent3YearSummary.reduce((sum, a) => sum + a.total, 0))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Key Insights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-4">
                <div className="text-sm text-green-700 font-semibold mb-1">Year 1 Cost</div>
                <div className="text-2xl font-bold text-green-900">
                  {formatCurrency(agent3YearSummary.reduce((sum, a) => sum + a.year1, 0))}
                </div>
                <div className="text-xs text-green-700 mt-2">
                  Initial deployment phase - {agents.filter(a => a.enabled && a.deployMonth <= 12).length} agents deployed
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4">
                <div className="text-sm text-blue-700 font-semibold mb-1">Year 2 Cost</div>
                <div className="text-2xl font-bold text-blue-900">
                  {formatCurrency(agent3YearSummary.reduce((sum, a) => sum + a.year2, 0))}
                </div>
                <div className="text-xs text-blue-700 mt-2">
                  Full portfolio + user growth - All {agents.filter(a => a.enabled).length} agents active
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-4">
                <div className="text-sm text-purple-700 font-semibold mb-1">Year 3 Cost</div>
                <div className="text-2xl font-bold text-purple-900">
                  {formatCurrency(agent3YearSummary.reduce((sum, a) => sum + a.year3, 0))}
                </div>
                <div className="text-xs text-purple-700 mt-2">
                  Steady state - {formatNumber(monthlyData[35]?.users || 0)} users at {(monthlyData[35]?.dau * 100 || 0).toFixed(0)}% DAU
                </div>
              </div>
            </div>
          </div>

          {/* Comparison to Main Models */}
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-5">
            <h3 className="font-semibold text-yellow-900 mb-3">📊 Comparison: Agent Portfolio vs Main Calculator</h3>
            <div className="text-sm text-yellow-800 space-y-2">
              <p>
                <strong>Agent Portfolio 3-Year Total:</strong> {formatCurrency(agent3YearSummary.reduce((sum, a) => sum + a.total, 0))}
                <span className="ml-2 text-xs">(PAYG, actual agent usage)</span>
              </p>
              <p>
                <strong>Main Calculator Best Model:</strong> {cheapestModel.model} = {formatCurrency(cheapestModel.total)}
                <span className="ml-2 text-xs">(Based on average usage parameters)</span>
              </p>
              <p className="pt-2 border-t border-yellow-300 mt-3">
                💡 <strong>Insight:</strong> The agent portfolio provides detailed per-agent costs based on actual deployment timing and segment access,
                while the main calculator shows overall costs across different licensing strategies. Use both views together for complete planning.
              </p>
            </div>
          </div>
        </div>
      )}

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
        <div className="mt-6">
          <button
            onClick={() => setShowRolloutPlan(!showRolloutPlan)}
            className="text-blue-600 hover:text-blue-800 font-medium mb-3"
          >
            {showRolloutPlan ? '▼' : '▶'} Rollout Milestones & Strategy
          </button>

          {showRolloutPlan && (
            <>
              <div className="space-y-3">
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
            </>
          )}
        </div>
      </div>

      {/* Cost Breakdown by Agent (Monthly, PAYG Pricing) */}
      {showAgentPortfolio && agents.filter(a => a.enabled).length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Cost Breakdown by Agent (Monthly, PAYG Pricing)
          </h2>

          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-4">
              This shows the actual monthly cost in dollars for each agent, accounting for deployment timing and user segment access.
            </p>

            {/* Chart: Agent Monthly Costs */}
            <ResponsiveContainer width="100%" height={400}>
              <LineChart
                data={agentMonthlyCosts}
                margin={{ top: 20, right: 30, left: 60, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  label={{ value: 'Month', position: 'insideBottom', offset: -10 }}
                />
                <YAxis
                  label={{ value: 'Monthly Cost ($)', angle: -90, position: 'insideLeft', offset: 10 }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
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
                {agents.map(agent => (
                  <Line
                    key={agent.id}
                    type="monotone"
                    dataKey={(data: AgentMonthlyCost) => {
                      const agentCost = data.agentCosts.find(ac => ac.agentId === agent.id);
                      return agentCost?.cost || 0;
                    }}
                    stroke={agent.color}
                    strokeWidth={2}
                    name={agent.name}
                    dot={false}
                  />
                ))}
                <Line
                  type="monotone"
                  dataKey="totalCost"
                  stroke="#000000"
                  strokeWidth={3}
                  strokeDasharray="5 5"
                  name="Total Portfolio Cost"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Sample Month Breakdown Table */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Month 12 Cost Breakdown (Example)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="p-3 text-left">Agent</th>
                    <th className="p-3 text-right">Deploy Month</th>
                    <th className="p-3 text-right">Credits/Conv</th>
                    <th className="p-3 text-right">Monthly Cost</th>
                    <th className="p-3 text-right">% of Total</th>
                  </tr>
                </thead>
                <tbody>
                  {agentMonthlyCosts[11]?.agentCosts
                    .sort((a, b) => b.cost - a.cost)
                    .map(agentCost => {
                      const agent = agents.find(a => a.id === agentCost.agentId);
                      if (!agent) return null;
                      const percentage = ((agentCost.cost / agentMonthlyCosts[11].totalCost) * 100).toFixed(1);
                      return (
                        <tr key={agentCost.agentId} className="border-b hover:bg-gray-100">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: agentCost.color }}></div>
                              <span className="font-medium">{agentCost.agentName}</span>
                            </div>
                          </td>
                          <td className="p-3 text-right">Month {agent.deployMonth}</td>
                          <td className="p-3 text-right font-mono">{calculateAgentCredits(agent).toFixed(1)}</td>
                          <td className="p-3 text-right font-mono">{formatCurrency(agentCost.cost)}</td>
                          <td className="p-3 text-right">{percentage}%</td>
                        </tr>
                      );
                    })}
                  <tr className="bg-gray-200 font-bold">
                    <td className="p-3" colSpan={3}>Total Portfolio Cost (Month 12)</td>
                    <td className="p-3 text-right">{formatCurrency(agentMonthlyCosts[11]?.totalCost || 0)}</td>
                    <td className="p-3 text-right">100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      </div>

    </div>
  );
};

// Agent Form Component
interface AgentFormProps {
  agent: Agent | null;
  onSave: (data: Partial<Agent>) => void;
  onCancel: () => void;
}

const AgentForm: React.FC<AgentFormProps> = ({ agent, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Partial<Agent>>(agent || {
    name: '',
    purpose: '',
    conversationsPerDay: 1.0,
    turns: 4,
    generativeRatio: 0.50,
    actions: 1,
    tenantGraph: false,
    deployMonth: 1,
    segments: ['HQ']
  });

  const segments = ['HQ', 'Management', 'Stores', 'All'];

  const calculateCredits = () => {
    const turns = formData.turns || 0;
    const generativeRatio = formData.generativeRatio || 0;
    const actions = formData.actions || 0;
    const tenantGraph = formData.tenantGraph || false;

    const classic = turns * (1 - generativeRatio);
    const gen = turns * generativeRatio * 2;
    const act = actions * 5;
    const graph = tenantGraph ? 10 : 0;
    return (classic + gen + act + graph).toFixed(1);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
        <h3 className="text-xl font-bold mb-4">{agent ? 'Edit Agent' : 'Add New Agent'}</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Agent Name *</label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({...formData, name: e.target.value})}
              className="w-full px-3 py-2 border rounded"
              placeholder="e.g., Store Procedures"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Purpose/Description *</label>
            <input
              type="text"
              value={formData.purpose || ''}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({...formData, purpose: e.target.value})}
              className="w-full px-3 py-2 border rounded"
              placeholder="e.g., SOPs, training materials"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Conversations/Day per User</label>
              <input
                type="number"
                min="0.1"
                max="10"
                step="0.5"
                value={formData.conversationsPerDay || 1.0}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({...formData, conversationsPerDay: parseFloat(e.target.value)})}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Deploy from Month</label>
              <input
                type="number"
                min="1"
                max="36"
                value={formData.deployMonth || 1}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({...formData, deployMonth: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Turns per Conversation: {formData.turns || 4}</label>
              <input
                type="range"
                min="2"
                max="10"
                value={formData.turns || 4}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({...formData, turns: parseInt(e.target.value)})}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Actions per Conversation: {formData.actions || 1}</label>
              <input
                type="range"
                min="0"
                max="5"
                step="0.5"
                value={formData.actions || 1}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({...formData, actions: parseFloat(e.target.value)})}
                className="w-full"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Generative AI Ratio: {((formData.generativeRatio || 0.5) * 100).toFixed(0)}%</label>
            <input
              type="range"
              min="0"
              max="100"
              value={(formData.generativeRatio || 0.5) * 100}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({...formData, generativeRatio: parseInt(e.target.value) / 100})}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Scripted (0%)</span>
              <span>Balanced (50%)</span>
              <span>AI-Driven (100%)</span>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.tenantGraph || false}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({...formData, tenantGraph: e.target.checked})}
                className="rounded"
              />
              <span className="text-sm font-medium">Tenant Graph Grounding (+10 credits/conversation)</span>
            </label>
            <p className="text-xs text-gray-500 mt-1">Search across Microsoft 365 data (expensive!)</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Available to User Segments</label>
            <div className="flex flex-wrap gap-2">
              {segments.map(seg => (
                <label key={seg} className="flex items-center gap-2 px-3 py-2 border rounded hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={(formData.segments || []).includes(seg)}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      const currentSegments = formData.segments || [];
                      if (e.target.checked) {
                        setFormData({...formData, segments: [...currentSegments, seg]});
                      } else {
                        setFormData({...formData, segments: currentSegments.filter(s => s !== seg)});
                      }
                    }}
                  />
                  <span className="text-sm">{seg}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="p-4 bg-blue-50 rounded">
            <p className="text-sm font-semibold text-blue-900">Calculated Credits per Conversation: {calculateCredits()}</p>
            <p className="text-xs text-blue-700 mt-1">
              Classic: {((formData.turns || 0) * (1-(formData.generativeRatio || 0))).toFixed(1)}×1 +
              Gen: {((formData.turns || 0) * (formData.generativeRatio || 0)).toFixed(1)}×2 +
              Actions: {formData.actions || 0}×5
              {formData.tenantGraph && ' + Graph: 10'}
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => onSave(formData)}
            disabled={!formData.name || !formData.purpose}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {agent ? 'Update Agent' : 'Add Agent'}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default CopilotCostCalculator;
