import { createClient } from './server'

export interface Quote {
  id: number
  created_at: string
  user_id: string // user_id (stored as UUID in DB, returned as string)
  name: string
  customer_slug: string
  status: string
  amount: string
  owner: string
  current_stage?: string
  generated_order_form_url?: string
}

export async function getUserQuotes(): Promise<Quote[]> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return []
  }

  const { data, error } = await supabase
    .from('quotes')
    .select('*')
    .eq('user_id', user.id)
    .order('id', { ascending: true })

  if (error) {
    console.error('Error fetching quotes:', error)
    return []
  }

  return data || []
}

export async function createQuote(quoteData: Pick<Quote, 'name' | 'customer_slug' | 'status' | 'amount' | 'owner'> & Partial<Pick<Quote, 'generated_order_form_url'>>) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('User not authenticated')
  }

  const { data, error } = await supabase
    .from('quotes')
    .insert({
      ...quoteData,
      user_id: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating quote:', error)
    throw error
  }

  return data
}

export async function updateQuote(id: number, updates: Partial<Pick<Quote, 'name' | 'customer_slug' | 'status' | 'amount' | 'owner' | 'current_stage'>>) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('User not authenticated')
  }

  // Debug: Check if the quote exists and belongs to this user
  console.log('Attempting to update quote:', { id, user_id: user.id, updates })
  
  const { data: existingQuote } = await supabase
    .from('quotes')
    .select('id, user_id, name')
    .eq('id', id)
    .single()
  
  console.log('Existing quote check:', existingQuote)

  const { data, error } = await supabase
    .from('quotes')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    console.error('Error updating quote:', error)
    console.error('Update attempted with:', { id, user_id: user.id, updates })
    throw error
  }

  return data
} 