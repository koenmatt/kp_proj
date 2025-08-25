import { createClient } from './server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const DEFAULT_QUOTES = [
  {
    name: 'Website Redesign Project',
    customer_slug: 'acme-corp',
    status: 'In Progress',
    amount: '$15,000',
    owner: 'Eddie Lake'
  },
  {
    name: 'Mobile App Development',
    customer_slug: 'tech-solutions',
    status: 'Done',
    amount: '$25,000',
    owner: 'Jamik Tashpulatov'
  },
  {
    name: 'Database Migration',
    customer_slug: 'startup-inc',
    status: 'In Progress',
    amount: '$8,500',
    owner: 'Eddie Lake'
  },
  {
    name: 'E-commerce Platform',
    customer_slug: 'retail-plus',
    status: 'Done',
    amount: '$32,000',
    owner: 'Jamik Tashpulatov'
  },
  {
    name: 'API Integration',
    customer_slug: 'fintech-co',
    status: 'Not Started',
    amount: '$12,000',
    owner: 'Assign owner'
  },
  {
    name: 'Cloud Infrastructure Setup',
    customer_slug: 'enterprise-ltd',
    status: 'In Progress',
    amount: '$18,500',
    owner: 'Eddie Lake'
  },
  {
    name: 'Security Audit',
    customer_slug: 'healthcare-sys',
    status: 'Done',
    amount: '$9,200',
    owner: 'Assign owner'
  },
  {
    name: 'Data Analytics Dashboard',
    customer_slug: 'media-group',
    status: 'In Progress',
    amount: '$21,800',
    owner: 'Jamik Tashpulatov'
  }
]

export async function initializeUserData() {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    console.log('No authenticated user found')
    return { success: false, error: 'Not authenticated' }
  }

  try {
    // Check if user already has quotes using regular client
    const { data: existingQuotes, error: checkError } = await supabase
      .from('quotes')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)

    if (checkError) {
      console.error('Error checking existing quotes:', checkError)
      return { success: false, error: checkError.message }
    }

    // If user already has quotes, don't create more
    if (existingQuotes && existingQuotes.length > 0) {
      console.log('User already has quotes, skipping initialization')
      return { success: true, message: 'User already initialized' }
    }

    // Use service role client to bypass RLS for initialization
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Create default quotes for the new user
    const quotesToInsert = DEFAULT_QUOTES.map(quote => ({
      ...quote,
      user_id: user.id  // user.id is already a UUID string, database will handle the conversion
    }))

    const { data, error: insertError } = await serviceClient
      .from('quotes')
      .insert(quotesToInsert)
      .select()

    if (insertError) {
      console.error('Error creating default quotes:', insertError)
      return { success: false, error: insertError.message }
    }

    console.log(`Successfully created ${data?.length || 0} default quotes for user ${user.id}`)
    return { 
      success: true, 
      message: `Created ${data?.length || 0} default quotes`,
      data 
    }

  } catch (error) {
    console.error('Unexpected error in initializeUserData:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
} 