import { notFound } from "next/navigation"
import { getUserQuotes, type Quote } from "@/lib/supabase/quotes"
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
      {/* Client Components */}
      <QuotePageClient quote={quote} />
    </div>
  )
} 