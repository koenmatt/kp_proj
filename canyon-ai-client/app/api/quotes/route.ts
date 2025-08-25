import { NextRequest, NextResponse } from 'next/server'
import { createQuote } from '@/lib/supabase/quotes'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    const { name, customer_slug, status, amount, owner } = body
    
    if (!name || !customer_slug || !amount || !owner) {
      return NextResponse.json(
        { error: 'Missing required fields: name, customer_slug, amount, and owner are required' },
        { status: 400 }
      )
    }

    const quote = await createQuote({
      name,
      customer_slug,
      status: status || 'Draft',
      amount,
      owner,
    })

    return NextResponse.json(quote, { status: 201 })
  } catch (error) {
    console.error('Error creating quote:', error)
    return NextResponse.json(
      { error: 'Failed to create quote' },
      { status: 500 }
    )
  }
} 