import { createClient } from './server'

export async function migrateQuotesToHaveWorkflows() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('User not authenticated')
  }

  try {
    // Find quotes that don't have workflows
    const { data: quotesWithoutWorkflows, error: queryError } = await supabase
      .from('quotes')
      .select(`
        id, 
        name,
        workflows!inner(id)
      `)
      .eq('user_id', user.id)
      .is('workflows.id', null)

    if (queryError) {
      console.error('Error finding quotes without workflows:', queryError)
      throw queryError
    }

    if (!quotesWithoutWorkflows || quotesWithoutWorkflows.length === 0) {
      console.log('All quotes already have workflows')
      return { success: true, created: 0 }
    }

    // Create workflows for quotes that don't have them
    const workflowsToCreate = quotesWithoutWorkflows.map(quote => ({
      quote_id: quote.id,
      user_id: user.id,
      name: 'Approval Workflow',
      status: 'active'
    }))

    const { data: createdWorkflows, error: createError } = await supabase
      .from('workflows')
      .insert(workflowsToCreate)
      .select()

    if (createError) {
      console.error('Error creating workflows:', createError)
      throw createError
    }

    console.log(`Successfully created ${createdWorkflows?.length || 0} workflows for existing quotes`)
    return { 
      success: true, 
      created: createdWorkflows?.length || 0,
      data: createdWorkflows 
    }

  } catch (error) {
    console.error('Error in migrateQuotesToHaveWorkflows:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      created: 0
    }
  }
} 