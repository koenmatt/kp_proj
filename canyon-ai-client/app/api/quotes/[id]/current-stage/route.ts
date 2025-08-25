import { NextRequest, NextResponse } from 'next/server'
import { updateQuoteCurrentStage } from '@/lib/supabase/workflows'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { currentStepId } = await request.json()
    
    // Validate that the ID is a number
    const quoteId = parseInt(id)
    if (isNaN(quoteId)) {
      return NextResponse.json(
        { error: 'Invalid quote ID' },
        { status: 400 }
      )
    }

    // currentStepId can be null (to clear current stage) or a string
    if (currentStepId !== null && typeof currentStepId !== 'string') {
      return NextResponse.json(
        { error: 'currentStepId must be a string or null' },
        { status: 400 }
      )
    }

    await updateQuoteCurrentStage(quoteId, currentStepId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating current stage:', error)
    return NextResponse.json(
      { error: 'Failed to update current stage' },
      { status: 500 }
    )
  }
} 