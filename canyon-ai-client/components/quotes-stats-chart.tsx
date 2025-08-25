"use client"

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts"

import {
  Card,
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

const quotesByStageData = [
  {
    stage: "AE",
    fullName: "Account Executive",
    count: 145,
  },
  {
    stage: "Deal Desk",
    fullName: "Deal Desk",
    count: 89,
  },
  {
    stage: "CRO",
    fullName: "Chief Revenue Officer",
    count: 34,
  },
]

const approvalData = [
  {
    status: "approved", 
    count: 342,
    percentage: 78,
    fill: "var(--color-approved)",
  },
  {
    status: "rejected",
    count: 96, 
    percentage: 22,
    fill: "var(--color-rejected)",
  },
]

const stageChartConfig = {
  count: {
    label: "Quote Count",
    color: "hsl(var(--chart-4))",
  },
} satisfies ChartConfig

const approvalChartConfig = {
  approved: {
    label: "Approved",
    color: "hsl(var(--chart-1))",
  },
  rejected: {
    label: "Rejected", 
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

export function QuotesStatsChart() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Quotes by Stage */}
      <Card className="@container/card">
        <CardHeader>
          <CardTitle>Quotes by Stage</CardTitle>
          <CardDescription>
            Current distribution of quotes across approval stages
          </CardDescription>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <ChartContainer
            config={stageChartConfig}
            className="aspect-auto h-[200px] w-full"
          >
            <BarChart
              data={quotesByStageData}
              margin={{
                left: 12,
                right: 12,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="stage"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    hideLabel
                    className="w-[180px]"
                    formatter={(value, name, item) => (
                      <>
                        <div className="h-2.5 w-2.5 shrink-0 rounded-[2px] bg-[--color-bg]" />
                        {item.payload.fullName}
                        <div className="ml-auto flex items-baseline gap-0.5 font-mono font-medium tabular-nums text-foreground">
                          {value}
                          <span className="font-normal text-muted-foreground">
                            quotes
                          </span>
                        </div>
                      </>
                    )}
                  />
                }
              />
              <Bar dataKey="count" fill="var(--color-count)" radius={8} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Approval/Rejection Rates */}
      <Card className="@container/card">
        <CardHeader>
          <CardTitle>Quote Approval Rate</CardTitle>
          <CardDescription>
            Percentage of quotes approved vs rejected
          </CardDescription>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <ChartContainer
            config={approvalChartConfig}
            className="mx-auto aspect-square max-h-[200px]"
          >
            <PieChart>
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    hideLabel
                    className="w-[180px]"
                  />
                }
              />
              <Pie
                data={approvalData}
                dataKey="percentage"
                nameKey="status"
                innerRadius={60}
                strokeWidth={5}
              >
                {approvalData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className="flex justify-center gap-4 pt-4">
            <div className="flex items-center gap-2">
              <div 
                className="h-3 w-3 rounded-full" 
                style={{ backgroundColor: "hsl(var(--chart-1))" }}
              ></div>
              <span className="text-sm">Approved (78%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div 
                className="h-3 w-3 rounded-full" 
                style={{ backgroundColor: "hsl(var(--chart-2))" }}
              ></div>
              <span className="text-sm">Rejected (22%)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 