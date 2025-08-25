import { NextRequest, NextResponse } from 'next/server'
import { getWorkflowSteps, createWorkflowStep } from '@/lib/supabase/workflows'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  try {
    const { workflowId } = await params

    const steps = await getWorkflowSteps(workflowId)

    return NextResponse.json({ steps })
  } catch (error) {
    console.error('Error fetching workflow steps:', error)
    return NextResponse.json(
      { error: 'Failed to fetch workflow steps' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  try {
    const { workflowId } = await params
    const stepData = await request.json()
    
    // Validate required fields
    const requiredFields = ['title', 'assignee', 'status', 'layer_index', 'position_in_layer']
    for (const field of requiredFields) {
      if (!(field in stepData)) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        )
      }
    }

    // Validate status values
    const validStatuses = ['completed', 'ready', 'pending', 'overdue']
    if (!validStatuses.includes(stepData.status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      )
    }

    // Validate persona if provided
    if (stepData.persona) {
      const validPersonas = ['ae', 'deal-desk', 'cro', 'legal', 'finance', 'customer']
      if (!validPersonas.includes(stepData.persona)) {
        return NextResponse.json(
          { error: 'Invalid persona' },
          { status: 400 }
        )
      }
    }

    const step = await createWorkflowStep(workflowId, stepData)

    return NextResponse.json(step)
  } catch (error) {
    console.error('Error creating workflow step:', error)
    return NextResponse.json(
      { error: 'Failed to create workflow step' },
      { status: 500 }
    )
  }
} 