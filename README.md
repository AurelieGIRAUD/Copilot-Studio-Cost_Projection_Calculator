# Copilot Studio Cost Projection Calculator

Interactive 3-year cost projection calculator for Microsoft Copilot Studio. Compare 5 payments options with detailed scenario analysis.

## Features

- **24-Month Projections**: Visualize costs over 2 years with growing adoption curves
- **Scenario Comparison**: Compare multiple user/agent/complexity combinations
- **Advanced Settings**: Customize credit consumption, growth rates, and adoption ceilings
- **Interactive Charts**: Built with Recharts for responsive visualizations
- **Real-time Calculations**: Instant updates as you adjust parameters

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast build tooling
- **Tailwind CSS** for styling
- **Recharts** for data visualization
- **Vitest** for testing

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
# Install dependencies
npm install
```

### Development

```bash
# Start development server
npm run dev
```

The app will open at `http://localhost:3000`

### Build

```bash
# Type check
npm run type-check

# Build for production
npm run build

# Preview production build
npm run preview
```

### Testing

```bash
# Run tests
npm test

# Run tests with UI
npm test:ui
```

## Usage

1. **Select User Count**: Choose from 1,300 / 5,000 / 30,000 users
2. **Select Agent Count**: Choose from 10 / 30 / 100 agents
3. **Set Complexity Ratio**: Adjust simple vs complex agent usage (80/20, 70/30, 50/50)
4. **Advanced Settings** (optional):
   - Customize credit consumption per user
   - Adjust Year 1 growth rate
   - Set adoption ceiling

## Pricing Assumptions (Nov 2025)

- Pay-as-you-go: **$0.01/credit**
- Prepaid packs: **$200/month** (25,000 credits)
- M365 Copilot: **$30/user/month**
- Breakeven point: **3,000 credits/user/month**

## Project Structure

```
├── src/
│   ├── components/
│   │   └── CopilotCostCalculator.tsx    # Main calculator component
│   ├── App.tsx                           # App wrapper
│   ├── main.tsx                          # Entry point
│   └── index.css                         # Global styles
├── public/                                # Static assets
├── index.html                             # HTML template
├── package.json                           # Dependencies
├── tsconfig.json                          # TypeScript config
├── vite.config.ts                         # Vite config
├── tailwind.config.js                     # Tailwind config
└── README.md                              # This file
```

## License

MIT
