'use client'

import { useState } from 'react'
import { Quote } from '@/lib/supabase/quotes'
import { ApprovalFlowChart } from '@/components/approval-flow-chart'
import { InlineEditableText, InlineEditableSelect } from '@/components/inline-editable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, Download, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

interface QuotePageClientProps {
  quote: Quote
}

export function QuotePageClient({ quote: initialQuote }: QuotePageClientProps) {
  const [quote, setQuote] = useState(initialQuote)

  const statusOptions = ['Draft', 'Pending', 'Approved', 'Rejected', 'Sent', 'Accepted', 'Declined']

  const updateQuoteField = async (field: keyof Quote, value: string) => {
    try {
      const response = await fetch(`/api/quotes/${quote.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [field]: value,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update quote')
      }

      const updatedQuote = await response.json()
      setQuote(updatedQuote)
      toast.success('Quote updated successfully')
    } catch (error) {
      console.error('Error updating quote:', error)
      throw error // Re-throw to let the component handle the error
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
      case 'accepted':
        return 'bg-green-100 text-green-800 hover:bg-green-200'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
      case 'rejected':
      case 'declined':
        return 'bg-red-100 text-red-800 hover:bg-red-200'
      case 'sent':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200'
    }
  }

  return (
    <div className="space-y-8 py-6">
      {/* Editable Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <InlineEditableText
            value={quote.name}
            onSave={(value) => updateQuoteField('name', value)}
            className="inline-block"
            textClassName="text-3xl font-bold tracking-tight"
            inputClassName="text-3xl font-bold tracking-tight h-auto py-2"
            placeholder="Click to edit quote name"
          />
          <p className="text-muted-foreground mt-1">
            Quote details and approval workflow
          </p>
        </div>
        
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Status:</span>
            <InlineEditableSelect
              value={quote.status}
              options={statusOptions}
              onSave={(value) => updateQuoteField('status', value)}
              className="inline-block"
              displayClassName={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(quote.status)}`}
              placeholder="Set status"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Customer:</span>
            <InlineEditableText
              value={quote.customer_slug}
              onSave={(value) => updateQuoteField('customer_slug', value)}
              className="inline-block"
              textClassName="font-medium"
              placeholder="Set customer"
            />
          </div>
          
          <div className="text-muted-foreground">
            <span className="text-xs">ID: {quote.id}</span>
          </div>
        </div>
      </div>

      {/* Order Form Section */}
      {quote.generated_order_form_url && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Order Form
            </CardTitle>
            <CardDescription>
              Generated proposal document for this quote
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50 dark:bg-gray-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-sm">Business Proposal</p>
                  <p className="text-xs text-muted-foreground">
                    Generated on {new Date(quote.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (quote.generated_order_form_url?.startsWith('http')) {
                      window.open(quote.generated_order_form_url, '_blank')
                    }
                  }}
                  className="text-xs"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Preview
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    if (quote.generated_order_form_url?.startsWith('http')) {
                      const link = document.createElement('a')
                      link.href = quote.generated_order_form_url
                      link.download = `${quote.name}_proposal.pdf`
                      link.target = '_blank'
                      link.click()
                    }
                  }}
                  className="text-xs"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Download
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approval Flow Chart */}
      <div className="space-y-4">
        {/* <div>
          <h2 className="text-2xl font-bold tracking-tight">Approval Flow</h2>
          <p className="text-muted-foreground">
            Visual representation of the quote approval process
          </p>
        </div> */}
        <ApprovalFlowChart quoteId={quote.id} />
      </div>
    </div>
  )
} 