import { NextRequest, NextResponse } from 'next/server'
import { updateQuote } from '@/lib/supabase/quotes'

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
    const allowedFields = ['name', 'customer_slug', 'status', 'amount', 'owner']
    const sanitizedUpdates: any = {}
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && typeof value === 'string') {
        sanitizedUpdates[key] = value
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