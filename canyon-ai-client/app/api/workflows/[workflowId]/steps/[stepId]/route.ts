import { NextRequest, NextResponse } from 'next/server'
import { updateWorkflowStep, deleteWorkflowStep, type WorkflowStep } from '@/lib/supabase/workflows'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ workflowId: string; stepId: string }> }
) {
  try {
    const { stepId } = await params
    const updates = await request.json()
    
    // Validate allowed fields
    const allowedFields = [
      'title', 'assignee', 'assignee_avatar', 'status', 'due_date', 
      'completed_date', 'description', 'layer_index', 'position_in_layer', 'persona'
    ]
    const sanitizedUpdates: Partial<Omit<WorkflowStep, 'id' | 'workflow_id' | 'created_at' | 'updated_at'>> = {}
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        // Validate status if provided
        if (key === 'status') {
          const validStatuses = ['completed', 'ready', 'pending', 'overdue']
          if (!validStatuses.includes(value as string)) {
            return NextResponse.json(
              { error: 'Invalid status' },
              { status: 400 }
            )
          }
        }
        
        // Validate persona if provided
        if (key === 'persona' && value !== null) {
          const validPersonas = ['ae', 'deal-desk', 'cro', 'legal', 'finance', 'customer']
          if (!validPersonas.includes(value as string)) {
            return NextResponse.json(
              { error: 'Invalid persona' },
              { status: 400 }
            )
          }
        }
        
        (sanitizedUpdates as Record<string, unknown>)[key] = value
      }
    }

    if (Object.keys(sanitizedUpdates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    const updatedStep = await updateWorkflowStep(stepId, sanitizedUpdates)

    return NextResponse.json(updatedStep)
  } catch (error) {
    console.error('Error updating workflow step:', error)
    return NextResponse.json(
      { error: 'Failed to update workflow step' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ workflowId: string; stepId: string }> }
) {
  try {
    const { stepId } = await params

    await deleteWorkflowStep(stepId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting workflow step:', error)
    return NextResponse.json(
      { error: 'Failed to delete workflow step' },
      { status: 500 }
    )
  }
} 