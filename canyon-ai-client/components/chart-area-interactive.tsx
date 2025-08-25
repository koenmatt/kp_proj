"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import { useIsMobile } from "@/hooks/use-mobile"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"

export const description = "An interactive area chart"

const chartData = [
  { date: "2024-04-01", enterprise: 45000, smb: 15000 },
  { date: "2024-04-02", enterprise: 38000, smb: 18000 },
  { date: "2024-04-03", enterprise: 52000, smb: 12000 },
  { date: "2024-04-04", enterprise: 67000, smb: 26000 },
  { date: "2024-04-05", enterprise: 78000, smb: 29000 },
  { date: "2024-04-06", enterprise: 71000, smb: 34000 },
  { date: "2024-04-07", enterprise: 49000, smb: 18000 },
  { date: "2024-04-08", enterprise: 89000, smb: 32000 },
  { date: "2024-04-09", enterprise: 35000, smb: 11000 },
  { date: "2024-04-10", enterprise: 61000, smb: 19000 },
  { date: "2024-04-11", enterprise: 77000, smb: 35000 },
  { date: "2024-04-12", enterprise: 62000, smb: 21000 },
  { date: "2024-04-13", enterprise: 84000, smb: 38000 },
  { date: "2024-04-14", enterprise: 43000, smb: 22000 },
  { date: "2024-04-15", enterprise: 40000, smb: 17000 },
  { date: "2024-04-16", enterprise: 44000, smb: 19000 },
  { date: "2024-04-17", enterprise: 96000, smb: 36000 },
  { date: "2024-04-18", enterprise: 84000, smb: 41000 },
  { date: "2024-04-19", enterprise: 53000, smb: 18000 },
  { date: "2024-04-20", enterprise: 39000, smb: 15000 },
  { date: "2024-04-21", enterprise: 47000, smb: 20000 },
  { date: "2024-04-22", enterprise: 54000, smb: 17000 },
  { date: "2024-04-23", enterprise: 48000, smb: 23000 },
  { date: "2024-04-24", enterprise: 87000, smb: 29000 },
  { date: "2024-04-25", enterprise: 55000, smb: 25000 },
  { date: "2024-04-26", enterprise: 35000, smb: 13000 },
  { date: "2024-04-27", enterprise: 93000, smb: 42000 },
  { date: "2024-04-28", enterprise: 42000, smb: 18000 },
  { date: "2024-04-29", enterprise: 75000, smb: 24000 },
  { date: "2024-04-30", enterprise: 104000, smb: 38000 },
  { date: "2024-05-01", enterprise: 55000, smb: 22000 },
  { date: "2024-05-02", enterprise: 73000, smb: 31000 },
  { date: "2024-05-03", enterprise: 67000, smb: 19000 },
  { date: "2024-05-04", enterprise: 85000, smb: 42000 },
  { date: "2024-05-05", enterprise: 101000, smb: 39000 },
  { date: "2024-05-06", enterprise: 108000, smb: 52000 },
  { date: "2024-05-07", enterprise: 88000, smb: 30000 },
  { date: "2024-05-08", enterprise: 49000, smb: 21000 },
  { date: "2024-05-09", enterprise: 57000, smb: 18000 },
  { date: "2024-05-10", enterprise: 73000, smb: 33000 },
  { date: "2024-05-11", enterprise: 75000, smb: 27000 },
  { date: "2024-05-12", enterprise: 57000, smb: 24000 },
  { date: "2024-05-13", enterprise: 47000, smb: 16000 },
  { date: "2024-05-14", enterprise: 98000, smb: 49000 },
  { date: "2024-05-15", enterprise: 103000, smb: 38000 },
  { date: "2024-05-16", enterprise: 78000, smb: 40000 },
  { date: "2024-05-17", enterprise: 109000, smb: 42000 },
  { date: "2024-05-18", enterprise: 75000, smb: 35000 },
  { date: "2024-05-19", enterprise: 55000, smb: 18000 },
  { date: "2024-05-20", enterprise: 47000, smb: 23000 },
  { date: "2024-05-21", enterprise: 42000, smb: 14000 },
  { date: "2024-05-22", enterprise: 41000, smb: 12000 },
  { date: "2024-05-23", enterprise: 72000, smb: 29000 },
  { date: "2024-05-24", enterprise: 74000, smb: 22000 },
  { date: "2024-05-25", enterprise: 61000, smb: 25000 },
  { date: "2024-05-26", enterprise: 53000, smb: 17000 },
  { date: "2024-05-27", enterprise: 100000, smb: 46000 },
  { date: "2024-05-28", enterprise: 63000, smb: 19000 },
  { date: "2024-05-29", enterprise: 38000, smb: 13000 },
  { date: "2024-05-30", enterprise: 80000, smb: 28000 },
  { date: "2024-05-31", enterprise: 48000, smb: 23000 },
  { date: "2024-06-01", enterprise: 58000, smb: 20000 },
  { date: "2024-06-02", enterprise: 100000, smb: 41000 },
  { date: "2024-06-03", enterprise: 43000, smb: 16000 },
  { date: "2024-06-04", enterprise: 99000, smb: 38000 },
  { date: "2024-06-05", enterprise: 38000, smb: 14000 },
  { date: "2024-06-06", enterprise: 74000, smb: 25000 },
  { date: "2024-06-07", enterprise: 83000, smb: 37000 },
  { date: "2024-06-08", enterprise: 85000, smb: 32000 },
  { date: "2024-06-09", enterprise: 98000, smb: 48000 },
  { date: "2024-06-10", enterprise: 55000, smb: 20000 },
  { date: "2024-06-11", enterprise: 42000, smb: 15000 },
  { date: "2024-06-12", enterprise: 112000, smb: 42000 },
  { date: "2024-06-13", enterprise: 41000, smb: 13000 },
  { date: "2024-06-14", enterprise: 106000, smb: 38000 },
  { date: "2024-06-15", enterprise: 77000, smb: 35000 },
  { date: "2024-06-16", enterprise: 91000, smb: 31000 },
  { date: "2024-06-17", enterprise: 115000, smb: 52000 },
  { date: "2024-06-18", enterprise: 47000, smb: 17000 },
  { date: "2024-06-19", enterprise: 81000, smb: 29000 },
  { date: "2024-06-20", enterprise: 98000, smb: 45000 },
  { date: "2024-06-21", enterprise: 59000, smb: 21000 },
  { date: "2024-06-22", enterprise: 77000, smb: 27000 },
  { date: "2024-06-23", enterprise: 120000, smb: 53000 },
  { date: "2024-06-24", enterprise: 52000, smb: 18000 },
  { date: "2024-06-25", enterprise: 51000, smb: 19000 },
  { date: "2024-06-26", enterprise: 104000, smb: 38000 },
  { date: "2024-06-27", enterprise: 108000, smb: 49000 },
  { date: "2024-06-28", enterprise: 49000, smb: 20000 },
  { date: "2024-06-29", enterprise: 43000, smb: 16000 },
  { date: "2024-06-30", enterprise: 106000, smb: 40000 },
]

const chartConfig = {
  revenue: {
    label: "Revenue",
  },
  enterprise: {
    label: "Enterprise",
    color: "hsl(var(--chart-1))",
  },
  smb: {
    label: "SMB",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

export function ChartAreaInteractive() {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState("90d")

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("7d")
    }
  }, [isMobile])

  const filteredData = chartData.filter((item) => {
    const date = new Date(item.date)
    const referenceDate = new Date("2024-06-30")
    let daysToSubtract = 90
    if (timeRange === "30d") {
      daysToSubtract = 30
    } else if (timeRange === "7d") {
      daysToSubtract = 7
    }
    const startDate = new Date(referenceDate)
    startDate.setDate(startDate.getDate() - daysToSubtract)
    return date >= startDate
  })

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Revenue Closed by Segment</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Enterprise vs SMB revenue for the last 3 months
          </span>
          <span className="@[540px]/card:hidden">Last 3 months</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={setTimeRange}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">Last 3 months</ToggleGroupItem>
            <ToggleGroupItem value="30d">Last 30 days</ToggleGroupItem>
            <ToggleGroupItem value="7d">Last 7 days</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select a value"
            >
              <SelectValue placeholder="Last 3 months" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                Last 3 months
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                Last 30 days
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                Last 7 days
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillEnterprise" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-enterprise)"
                  stopOpacity={1.0}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-enterprise)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillSmb" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-smb)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-smb)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }}
                  formatter={(value) => [
                    `$${Number(value).toLocaleString()}`,
                    "",
                  ]}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="smb"
              type="natural"
              fill="url(#fillSmb)"
              stroke="var(--color-smb)"
              stackId="a"
            />
            <Area
              dataKey="enterprise"
              type="natural"
              fill="url(#fillEnterprise)"
              stroke="var(--color-enterprise)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
