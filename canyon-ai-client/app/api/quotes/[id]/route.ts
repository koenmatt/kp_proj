import { NextRequest, NextResponse } from 'next/server'
import { updateQuote, type Quote } from '@/lib/supabase/quotes'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const updates = await request.json()
    
    // Validate that the ID is a number
    const quoteId = parseInt(id)
    if (isNaN(quoteId)) {
      return NextResponse.json(
        { error: 'Invalid quote ID' },
        { status: 400 }
      )
    }

    // Validate that we only allow certain fields to be updated
    const allowedFields = ['name', 'customer_slug', 'status', 'amount', 'owner', 'current_stage']
    const sanitizedUpdates: Partial<Pick<Quote, 'name' | 'customer_slug' | 'status' | 'amount' | 'owner' | 'current_stage'>> = {}
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && typeof value === 'string') {
        (sanitizedUpdates as Record<string, string>)[key] = value
      }
    }

    if (Object.keys(sanitizedUpdates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    const updatedQuote = await updateQuote(quoteId, sanitizedUpdates)

    return NextResponse.json(updatedQuote)
  } catch (error) {
    console.error('Error updating quote:', error)
    return NextResponse.json(
      { error: 'Failed to update quote' },
      { status: 500 }
    )
  }
} 