import { NextRequest, NextResponse } from 'next/server'
import { createQuote } from '@/lib/supabase/quotes'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Handle both old format and new approval format
    let quoteData
    
    if (body.customer_name && body.quote_name) {
      // New approval format from the chat interface
      const { customer_name, quote_name, total_amount, generated_order_form_url, status } = body
      
      if (!customer_name || !quote_name || !total_amount) {
        return NextResponse.json(
          { error: 'Missing required fields: customer_name, quote_name, and total_amount are required' },
          { status: 400 }
        )
      }
      
      quoteData = {
        name: quote_name,
        customer_slug: customer_name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), // Convert to slug format
        status: status || 'approved',
        amount: total_amount.toString(),
        owner: 'AI Generated', // Default owner for AI-generated quotes
        generated_order_form_url
      }
    } else {
      // Original format
      const { name, customer_slug, status, amount, owner, generated_order_form_url } = body
      
      if (!name || !customer_slug || !amount || !owner) {
        return NextResponse.json(
          { error: 'Missing required fields: name, customer_slug, amount, and owner are required' },
          { status: 400 }
        )
      }
      
      quoteData = {
        name,
        customer_slug,
        status: status || 'Draft',
        amount,
        owner,
        generated_order_form_url
      }
    }

    const quote = await createQuote(quoteData)

    return NextResponse.json(quote, { status: 201 })
  } catch (error) {
    console.error('Error creating quote:', error)
    return NextResponse.json(
      { error: 'Failed to create quote' },
      { status: 500 }
    )
  }
} 