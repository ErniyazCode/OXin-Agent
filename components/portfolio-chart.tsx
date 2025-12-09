"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"

interface Token {
  mint: string
  balance: number
  decimals: number
  symbol?: string
  name?: string
  logoURI?: string
  price?: number
  value?: number
  change24h?: number
}

interface PortfolioChartProps {
  tokens: Token[]
  totalValue: number
}

export function PortfolioChart({ tokens, totalValue }: PortfolioChartProps) {
  // ВАЖНО: Цвета должны совпадать с Portfolio Distribution на 100%
  // Используем CSS переменные из globals.css для chart-1 через chart-5
  const COLORS = [
    "var(--chart-1)", // chart-1 для первого токена (SOL)
    "var(--chart-2)", // chart-2 для второго токена (KitKat)
    "var(--chart-3)", // chart-3 для третьего токена
    "var(--chart-4)", // chart-4
    "var(--chart-5)", // chart-5
  ]

  // Prepare data for the pie chart
  const chartData = tokens
    .filter((token) => token.value && token.value > 0)
    .map((token) => ({
      name: token.symbol || "Unknown",
      value: token.value || 0,
      percentage: totalValue > 0 ? ((token.value || 0) / totalValue) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value)

  // Group small tokens into "Others" if there are more than 5
  let displayData = chartData
  if (chartData.length > 5) {
    const top4 = chartData.slice(0, 4)
    const others = chartData.slice(4)
    const othersTotal = others.reduce((sum, item) => sum + item.value, 0)
    const othersPercentage = others.reduce((sum, item) => sum + item.percentage, 0)

    displayData = [
      ...top4,
      {
        name: "Others",
        value: othersTotal,
        percentage: othersPercentage,
      },
    ]
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold">{payload[0].name}</p>
          <p className="text-sm text-muted-foreground">
            {"$"}
            {payload[0].value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-sm text-primary">{payload[0].payload.percentage.toFixed(2)}%</p>
        </div>
      )
    }
    return null
  }

  if (displayData.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        {"No token data available"}
      </div>
    )
  }

  return (
    <div className="h-[400px] w-full relative">
      <ResponsiveContainer width="100%" height={400}>
        <PieChart>
          <Pie
            data={displayData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percentage }: any) => `${name} ${percentage.toFixed(1)}%`}
            outerRadius={120}
            fill="#8884d8"
            dataKey="value"
          >
            {displayData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value, entry: any) => {
              // entry.payload содержит весь объект из displayData
              const tokenValue = entry.payload?.value || 0
              return (
                <span className="text-sm">
                  {value} - ${tokenValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              )
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
