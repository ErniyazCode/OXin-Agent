"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ResponsiveContainer, ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Scatter } from "recharts"
import { TrendingUp, TrendingDown, Loader2, ShoppingCart, ArrowRightLeft } from "lucide-react"

interface PNLChartProps {
  walletAddress: string
  currentTokens?: any[] // Текущие токены из портфеля с ценами
}

type TimeRange = "24h" | "7d" | "30d" | "6m" | "1y"

interface PNLEvent {
  timestamp: number
  type: "BUY" | "SELL" | "TRANSFER_OUT"
  tokens: Array<{
    mint: string
    symbol?: string
    amount: number
    direction: "IN" | "OUT"
  }>
  totalValue: number
}

interface PNLDataPoint {
  timestamp: number
  date: string
  portfolioValue: number
  pnl: number
  pnlPercent: number
}

interface PNLStats {
  investedCapital: number
  currentValue: number
  bestDayValue: number
  bestDayDate: string
  totalPnl: number
  totalPnlPercent: number
  totalBuys: number
  totalSells: number
  totalTransfers: number
}

type ScatterPoint = {
  date: string
  portfolioValue: number
  type: PNLEvent["type"]
  event: PNLEvent
}

export function PNLChart({ walletAddress, currentTokens }: PNLChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d")
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<PNLDataPoint[]>([])
  const [events, setEvents] = useState<PNLEvent[]>([])
  const [stats, setStats] = useState<PNLStats | null>(null)

  // Загрузка данных из API
  useEffect(() => {
    if (walletAddress) {
      loadPNLData()
    }
  }, [timeRange, walletAddress])

  const loadPNLData = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/pnl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress,
          timeRange,
          currentTokens, // Передаем текущие токены с ценами
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to load PNL data")
      }

      const result = await response.json()
      
      if (result.success) {
        setData(result.data.timeline || [])
        setEvents(result.data.events || [])
        setStats(result.data.stats || null)
      }
    } catch (_error) {
      // Показываем пустой график
      setData([])
      setEvents([])
      setStats(null)
    } finally {
      setLoading(false)
    }
  }

  const currentValue = stats?.currentValue || 0
  const initialValue = stats?.investedCapital || 0
  const totalPnL = stats?.totalPnl || 0
  const totalPnLPercent = stats?.totalPnlPercent || 0
  const isProfit = totalPnL >= 0

  const scatterPoints: ScatterPoint[] = events.flatMap((event) => {
    const eventDate = new Date(event.timestamp * 1000).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
    const point = data.find((entry) => entry.date === eventDate)
    if (!point) {
      return []
    }
    return [
      {
        date: point.date,
        portfolioValue: point.portfolioValue,
        type: event.type,
        event,
      },
    ]
  })

  const buyPoints = scatterPoints.filter((point) => point.type === "BUY")
  const sellPoints = scatterPoints.filter((point) => point.type === "SELL")
  const transferPoints = scatterPoints.filter((point) => point.type === "TRANSFER_OUT")

  const renderScatterShape = (color: string) => (props: any) => {
    const { cx, cy } = props
    if (cx === undefined || cy === undefined) {
      return null
    }
    return <circle cx={cx} cy={cy} r={6} stroke="#fff" strokeWidth={2} fill={color} />
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload as PNLDataPoint
      
      // Найти события в этот день
      const dayEvents = events.filter((event) => {
        const eventDate = new Date(event.timestamp * 1000).toLocaleDateString()
        const pointDate = new Date(dataPoint.timestamp * 1000).toLocaleDateString()
        return eventDate === pointDate
      })

      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg max-w-xs">
          <p className="text-xs text-muted-foreground mb-2">{dataPoint.date}</p>
          <p className="text-sm font-semibold mb-1">
            ${dataPoint.portfolioValue.toFixed(2)}
          </p>
          <p className={`text-xs mb-2 ${dataPoint.pnl >= 0 ? "text-green-500" : "text-red-500"}`}>
            {dataPoint.pnl >= 0 ? "+" : ""}
            ${dataPoint.pnl.toFixed(2)} ({dataPoint.pnlPercent.toFixed(2)}%)
          </p>

          {/* Показать события в этот день */}
          {dayEvents.length > 0 && (
            <div className="border-t border-border pt-2 mt-2 space-y-2">
              {dayEvents.map((event, idx) => (
                <div key={idx} className="text-xs">
                  <div className="flex items-center gap-1 mb-1">
                    {event.type === "BUY" && (
                      <>
                        <ShoppingCart className="w-3 h-3 text-green-500" />
                        <span className="text-green-500 font-semibold">Bought</span>
                      </>
                    )}
                    {event.type === "SELL" && (
                      <>
                        <TrendingDown className="w-3 h-3 text-red-500" />
                        <span className="text-red-500 font-semibold">Sold</span>
                      </>
                    )}
                    {event.type === "TRANSFER_OUT" && (
                      <>
                        <ArrowRightLeft className="w-3 h-3 text-yellow-500" />
                        <span className="text-yellow-500 font-semibold">Transferred</span>
                      </>
                    )}
                  </div>
                  {event.tokens.map((token, tokenIdx) => (
                    <p key={tokenIdx} className="text-muted-foreground ml-4">
                      {token.direction === "IN" ? "+" : "-"}
                      {Math.abs(token.amount).toFixed(4)} {token.symbol ?? token.mint.slice(0, 4)}
                    </p>
                  ))}
                  {event.totalValue > 0 && (
                    <p className="text-muted-foreground ml-4">
                      ${event.totalValue.toFixed(2)} total
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }
    return null
  }

  const timeRangeButtons: { value: TimeRange; label: string }[] = [
    { value: "24h", label: "24H" },
    { value: "7d", label: "7D" },
    { value: "30d", label: "1M" },
    { value: "6m", label: "6M" },
    { value: "1y", label: "1Y" },
  ]

  return (
    <Card className="p-6 bg-black/60 backdrop-blur-xl border-border/50">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Portfolio P&L</h2>
            <p className="text-sm text-muted-foreground">
              Profit & Loss over time
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 justify-end mb-1">
              {isProfit ? (
                <TrendingUp className="w-5 h-5 text-green-500" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-500" />
              )}
              <span className={`text-2xl font-bold ${isProfit ? "text-green-500" : "text-red-500"}`}>
                {isProfit ? "+" : ""}
                ${Math.abs(totalPnL).toFixed(2)}
              </span>
            </div>
            <p className={`text-sm ${isProfit ? "text-green-500" : "text-red-500"}`}>
              {isProfit ? "+" : ""}
              {totalPnLPercent.toFixed(2)}% {timeRange}
            </p>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-2">
          {timeRangeButtons.map((btn) => (
            <Button
              key={btn.value}
              variant={timeRange === btn.value ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeRange(btn.value)}
              className="flex-1"
            >
              {btn.label}
            </Button>
          ))}
        </div>

        {/* Chart */}
        <div className="h-[300px]">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-3">
                <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
                <p className="text-sm text-muted-foreground">Loading transaction history...</p>
              </div>
            </div>
          ) : data.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">No transaction data available</p>
                <p className="text-xs text-muted-foreground">Try selecting a different time range</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={isProfit ? "#10b981" : "#ef4444"}
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor={isProfit ? "#10b981" : "#ef4444"}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis
                dataKey="date"
                stroke="#9ca3af"
                fontSize={12}
                tickLine={false}
              />
              <YAxis
                stroke="#9ca3af"
                fontSize={12}
                tickLine={false}
                tickFormatter={(value) => `$${value.toFixed(0)}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="portfolioValue"
                stroke={isProfit ? "#10b981" : "#ef4444"}
                strokeWidth={2}
                fill="url(#colorValue)"
              />
              {buyPoints.length > 0 && (
                <Scatter
                  data={buyPoints}
                  dataKey="portfolioValue"
                  fill="#10b981"
                  name="Buys"
                  shape={renderScatterShape("#10b981")}
                />
              )}
              {sellPoints.length > 0 && (
                <Scatter
                  data={sellPoints}
                  dataKey="portfolioValue"
                  fill="#ef4444"
                  name="Sells"
                  shape={renderScatterShape("#ef4444")}
                />
              )}
              {transferPoints.length > 0 && (
                <Scatter
                  data={transferPoints}
                  dataKey="portfolioValue"
                  fill="#eab308"
                  name="Transfers"
                  shape={renderScatterShape("#eab308")}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
          )}
        </div>

        {/* Stats */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : stats ? (
          <>
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/50">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Invested Capital</p>
                <p className="text-sm font-semibold">${stats.investedCapital.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{stats.totalBuys} buys</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Current Value</p>
                <p className="text-sm font-semibold">${stats.currentValue.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{stats.totalSells} sells, {stats.totalTransfers} transfers</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Best Day</p>
                <p className="text-sm font-semibold text-green-500">
                  ${stats.bestDayValue.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">{stats.bestDayDate}</p>
              </div>
            </div>

            {/* Events Legend */}
            <div className="flex items-center gap-4 pt-4 border-t border-border/50">
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-muted-foreground">Buy</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-muted-foreground">Sell</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="text-muted-foreground">Transfer Out</span>
              </div>
            </div>

            {/* Note */}
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <p className="text-xs text-muted-foreground">
                ℹ️ <span className="font-semibold">Note:</span> P&L calculation is based on your wallet transaction history.
                Hover over the chart to see buy/sell events. Green points = buys, red points = sells, yellow points = transfers out.
              </p>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No transaction history available for this time range.</p>
            <p className="text-xs mt-2">Try selecting a longer time period.</p>
          </div>
        )}
      </div>
    </Card>
  )
}
