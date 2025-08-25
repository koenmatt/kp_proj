import { NextRequest, NextResponse } from 'next/server'
import { reorderWorkflowSteps } from '@/lib/supabase/workflows'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  try {
    const { workflowId } = await params
    const { stepUpdates } = await request.json()
    
    if (!Array.isArray(stepUpdates)) {
      return NextResponse.json(
        { error: 'stepUpdates must be an array' },
        { status: 400 }
      )
    }

    // Validate each step update
    for (const update of stepUpdates) {
      if (!update.id || typeof update.layer_index !== 'number' || typeof update.position_in_layer !== 'number') {
        return NextResponse.json(
          { error: 'Each step update must have id, layer_index, and position_in_layer' },
          { status: 400 }
        )
      }
    }

    await reorderWorkflowSteps(workflowId, stepUpdates)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error reordering workflow steps:', error)
    return NextResponse.json(
      { error: 'Failed to reorder workflow steps' },
      { status: 500 }
    )
  }
} 