import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { SectionCards } from "@/components/section-cards"
import { ApprovalTimeChart } from "@/components/approval-time-chart"
import { QuotesStatsChart } from "@/components/quotes-stats-chart"

export default function HomePage() {
  return (
    <>
      <SectionCards />
      <div className="px-4 lg:px-6">
        <ChartAreaInteractive />
      </div>
      <div className="px-4 lg:px-6 mt-6 space-y-6">
        <ApprovalTimeChart />
        <QuotesStatsChart />
      </div>
    </>
  )
} 