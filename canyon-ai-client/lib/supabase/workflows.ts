import { createClient } from './server'

export interface Workflow {
  id: string
  quote_id: number
  user_id: string
  name: string
  status: 'active' | 'completed' | 'cancelled'
  created_at: string
  updated_at: string
}

export interface WorkflowStep {
  id: string
  workflow_id: string
  title: string
  assignee: string
  assignee_avatar?: string
  status: 'completed' | 'ready' | 'pending' | 'overdue'
  due_date?: string
  completed_date?: string
  description?: string
  layer_index: number
  position_in_layer: number
  persona?: 'ae' | 'deal-desk' | 'cro' | 'legal' | 'finance' | 'customer'
  created_at: string
  updated_at: string
}

export async function getWorkflowByQuoteId(quoteId: number): Promise<Workflow | null> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('User not authenticated')
  }

  const { data, error } = await supabase
    .from('workflows')
    .select('*')
    .eq('quote_id', quoteId)
    .eq('user_id', user.id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // No workflow found
    }
    throw error
  }

  return data
}

export async function getWorkflowSteps(workflowId: string): Promise<WorkflowStep[]> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('User not authenticated')
  }

  const { data, error } = await supabase
    .from('workflow_steps')
    .select('*')
    .eq('workflow_id', workflowId)
    .order('layer_index', { ascending: true })
    .order('position_in_layer', { ascending: true })

  if (error) {
    throw error
  }

  return data || []
}

export async function createWorkflow(quoteId: number, name: string): Promise<Workflow> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('User not authenticated')
  }

  const { data, error } = await supabase
    .from('workflows')
    .insert({
      quote_id: quoteId,
      user_id: user.id,
      name,
      status: 'active'
    })
    .select()
    .single()

  // If insertion fails due to unique constraint, fetch the existing workflow
  if (error) {
    if (error.code === '23505') { // Unique constraint violation
      const existing = await getWorkflowByQuoteId(quoteId)
      if (existing) {
        return existing
      }
    }
    throw error
  }

  return data
}

export async function createWorkflowStep(
  workflowId: string, 
  stepData: Omit<WorkflowStep, 'id' | 'workflow_id' | 'created_at' | 'updated_at'>
): Promise<WorkflowStep> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('User not authenticated')
  }

  const { data, error } = await supabase
    .from('workflow_steps')
    .insert({
      workflow_id: workflowId,
      ...stepData
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function updateWorkflowStep(
  stepId: string, 
  updates: Partial<Omit<WorkflowStep, 'id' | 'workflow_id' | 'created_at' | 'updated_at'>>
): Promise<WorkflowStep> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('User not authenticated')
  }

  const { data, error } = await supabase
    .from('workflow_steps')
    .update(updates)
    .eq('id', stepId)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function deleteWorkflowStep(stepId: string): Promise<void> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('User not authenticated')
  }

  const { error } = await supabase
    .from('workflow_steps')
    .delete()
    .eq('id', stepId)

  if (error) {
    throw error
  }
}

export async function updateQuoteCurrentStage(quoteId: number, currentStepId: string | null): Promise<void> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('User not authenticated')
  }

  // Get the step title to use as current_stage
  let currentStage = null
  if (currentStepId) {
    const { data: step } = await supabase
      .from('workflow_steps')
      .select('title')
      .eq('id', currentStepId)
      .single()
    
    if (step) {
      currentStage = step.title
    }
  }

  // Update the quote's current_stage
  const { error } = await supabase
    .from('quotes')
    .update({ current_stage: currentStage })
    .eq('id', quoteId)
    .eq('user_id', user.id)

  if (error) {
    throw error
  }
}

export async function reorderWorkflowSteps(
  workflowId: string,
  stepUpdates: Array<{ id: string; layer_index: number; position_in_layer: number }>
): Promise<void> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('User not authenticated')
  }

  // Update all steps in a transaction-like manner
  for (const update of stepUpdates) {
    const { error } = await supabase
      .from('workflow_steps')
      .update({
        layer_index: update.layer_index,
        position_in_layer: update.position_in_layer
      })
      .eq('id', update.id)

    if (error) {
      throw error
    }
  }
} 