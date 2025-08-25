'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Quote } from '@/lib/supabase/quotes'
import { toast } from 'sonner'

interface EditableQuoteDetailsProps {
  quote: Quote
  onUpdate: (updatedQuote: Quote) => void
}

export function EditableQuoteDetails({ quote, onUpdate }: EditableQuoteDetailsProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedQuote, setEditedQuote] = useState(quote)
  const [isLoading, setIsLoading] = useState(false)

  const handleSave = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/quotes/${quote.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editedQuote.name,
          customer_slug: editedQuote.customer_slug,
          status: editedQuote.status,
          amount: editedQuote.amount,
          owner: editedQuote.owner,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update quote')
      }

      const updatedQuote = await response.json()
      onUpdate(updatedQuote)
      setIsEditing(false)
      toast.success('Quote updated successfully')
    } catch (error) {
      console.error('Error updating quote:', error)
      toast.error('Failed to update quote')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setEditedQuote(quote)
    setIsEditing(false)
  }

  const statusOptions = ['Draft', 'Pending', 'Approved', 'Rejected', 'Sent', 'Accepted', 'Declined']

  if (isEditing) {
    return (
      <div className="bg-muted/50 rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Quote Details</h2>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className="text-xs text-muted-foreground">Name</label>
            <Input
              value={editedQuote.name}
              onChange={(e) => setEditedQuote({ ...editedQuote, name: e.target.value })}
              className="mt-1 h-8 text-sm"
            />
          </div>
          
          <div>
            <label className="text-xs text-muted-foreground">Customer</label>
            <Input
              value={editedQuote.customer_slug}
              onChange={(e) => setEditedQuote({ ...editedQuote, customer_slug: e.target.value })}
              className="mt-1 h-8 text-sm"
            />
          </div>
          
          <div>
            <label className="text-xs text-muted-foreground">Status</label>
            <Select 
              value={editedQuote.status} 
              onValueChange={(value) => setEditedQuote({ ...editedQuote, status: value })}
            >
              <SelectTrigger className="mt-1 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(status => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-xs text-muted-foreground">Amount</label>
            <Input
              value={editedQuote.amount}
              onChange={(e) => setEditedQuote({ ...editedQuote, amount: e.target.value })}
              className="mt-1 h-8 text-sm"
            />
          </div>
          
          <div>
            <label className="text-xs text-muted-foreground">Owner</label>
            <Input
              value={editedQuote.owner}
              onChange={(e) => setEditedQuote({ ...editedQuote, owner: e.target.value })}
              className="mt-1 h-8 text-sm"
            />
          </div>
          
          <div>
            <label className="text-xs text-muted-foreground">ID</label>
            <div className="mt-1 h-8 flex items-center text-sm text-muted-foreground">
              {quote.id}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-muted/50 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">Quote Details</h2>
        <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
          Edit
        </Button>
      </div>
      
      <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-sm">
        <div>
          <div className="text-xs text-muted-foreground">Name</div>
          <div className="font-medium">{quote.name}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Customer</div>
          <div className="font-medium">{quote.customer_slug}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Status</div>
          <div className="font-medium">{quote.status}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Amount</div>
          <div className="font-medium">{quote.amount}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Owner</div>
          <div className="font-medium">{quote.owner}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">ID</div>
          <div className="font-medium">{quote.id}</div>
        </div>
      </div>
    </div>
  )
} 