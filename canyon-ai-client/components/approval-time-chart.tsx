"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

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

const approvalTimeData = [
  {
    persona: "AE",
    fullName: "Account Executive",
    avgTime: 0.5,
  },
  {
    persona: "Deal Desk",
    fullName: "Deal Desk",
    avgTime: 2.3,
  },
  {
    persona: "CRO",
    fullName: "Chief Revenue Officer",
    avgTime: 4.7,
  },
  {
    persona: "Legal",
    fullName: "Legal",
    avgTime: 6.2,
  },
  {
    persona: "Finance",
    fullName: "Finance",
    avgTime: 8.1,
  },
  {
    persona: "Customer",
    fullName: "Customer",
    avgTime: 1.2,
  },
]

const chartConfig = {
  avgTime: {
    label: "Avg Time (days)",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig

export function ApprovalTimeChart() {
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Average Approval Time by Persona</CardTitle>
        <CardDescription>
          Time spent at each stage of the approval workflow
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <BarChart
            data={approvalTimeData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="persona"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => `${value}d`}
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
                          days
                        </span>
                      </div>
                    </>
                  )}
                />
              }
            />
            <Bar dataKey="avgTime" fill="var(--color-avgTime)" radius={8} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
} 