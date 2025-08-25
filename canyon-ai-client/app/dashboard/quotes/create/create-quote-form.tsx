'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

interface CreateQuoteFormData {
  name: string
  customer_slug: string
  status: string
  amount: string
  owner: string
}

export function CreateQuoteForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<CreateQuoteFormData>({
    name: '',
    customer_slug: '',
    status: 'Draft',
    amount: '',
    owner: '',
  })

  const statusOptions = ['Draft', 'Pending', 'Approved', 'Rejected', 'Sent', 'Accepted', 'Declined']

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/quotes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error('Failed to create quote')
      }

      const createdQuote = await response.json()
      toast.success('Quote created successfully')
      router.push(`/dashboard/quotes/${createdQuote.id}`)
    } catch (error) {
      console.error('Error creating quote:', error)
      toast.error('Failed to create quote')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: keyof CreateQuoteFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quote Details</CardTitle>
        <CardDescription>
          Fill in the details for your new quote
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">
                Quote Name <span className="text-destructive">*</span>
              </label>
              <Input
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter quote name"
                className="mt-1"
                required
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-foreground">
                Customer <span className="text-destructive">*</span>
              </label>
              <Input
                value={formData.customer_slug}
                onChange={(e) => handleInputChange('customer_slug', e.target.value)}
                placeholder="Enter customer name"
                className="mt-1"
                required
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-foreground">
                Status
              </label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => handleInputChange('status', value)}
              >
                <SelectTrigger className="mt-1">
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
              <label className="text-sm font-medium text-foreground">
                Amount <span className="text-destructive">*</span>
              </label>
              <Input
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', e.target.value)}
                placeholder="$0.00"
                className="mt-1"
                required
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-foreground">
                Owner <span className="text-destructive">*</span>
              </label>
              <Input
                value={formData.owner}
                onChange={(e) => handleInputChange('owner', e.target.value)}
                placeholder="Enter owner name"
                className="mt-1"
                required
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Quote'}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => router.back()}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
} 