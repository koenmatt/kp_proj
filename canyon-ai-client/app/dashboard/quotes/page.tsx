import { DataTable } from "@/components/data-table"
import { getUserQuotes } from "@/lib/supabase/quotes"
import { ClientOnly } from "@/components/client-only"
import { Skeleton } from "@/components/ui/skeleton"

export default async function QuotesPage() {
  const data = await getUserQuotes()

  return (
    <div className="px-4 lg:px-6">
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Quotes</h1>
          <p className="text-muted-foreground">
            Manage your quotes and proposals
          </p>
        </div>
        
        <ClientOnly fallback={<TableSkeleton />}>
          <DataTable data={data} />
        </ClientOnly>
      </div>
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-[200px]" />
        <div className="flex space-x-2">
          <Skeleton className="h-8 w-[100px]" />
          <Skeleton className="h-8 w-[100px]" />
        </div>
      </div>
      <div className="rounded-md border">
        <div className="h-12 border-b flex items-center px-4">
          <div className="flex space-x-4">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-[100px]" />
            <Skeleton className="h-4 w-[100px]" />
            <Skeleton className="h-4 w-[100px]" />
            <Skeleton className="h-4 w-[100px]" />
          </div>
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 border-b flex items-center px-4">
            <div className="flex space-x-4 w-full">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-4 w-[120px]" />
              <Skeleton className="h-4 w-[80px]" />
              <Skeleton className="h-4 w-[100px]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 