import { notFound } from "next/navigation"
import Link from "next/link"
import { getUserQuotes, type Quote } from "@/lib/supabase/quotes"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
// @ts-ignore TypeScript cache issue - file exists
import { QuotePageClient } from "./quote-page-client"

interface QuotePageProps {
  params: Promise<{
    id: string
  }>
}

async function getQuoteById(id: string): Promise<Quote | null> {
  const quotes = await getUserQuotes()
  return quotes.find(quote => quote.id === parseInt(id)) || null
}

export default async function QuotePage({ params }: QuotePageProps) {
  const { id } = await params
  const quote = await getQuoteById(id)

  if (!quote) {
    notFound()
  }

  return (
    <div className="px-4 lg:px-6">
      <div className="mb-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/dashboard/quotes">Quotes</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{quote.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      
      {/* Client Components */}
      <QuotePageClient quote={quote} />
    </div>
  )
} 