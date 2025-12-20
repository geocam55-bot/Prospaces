/**
 * SUPABASE EDGE FUNCTION TEMPLATE
 * 
 * This is a template for a Supabase Edge Function that processes scheduled jobs.
 * 
 * SETUP INSTRUCTIONS:
 * 
 * 1. Create the function in your Supabase project:
 *    - Go to Edge Functions in your Supabase dashboard
 *    - Create a new function called "process-scheduled-jobs"
 *    - Copy this code into the function
 * 
 * 2. Set up a cron trigger:
 *    - In the Supabase dashboard, go to Edge Functions
 *    - Select your function
 *    - Add a cron schedule: "* * * * *" (runs every minute)
 *    - Or use "*/5 * * * *" to run every 5 minutes
 * 
 * 3. Deploy the function:
 *    supabase functions deploy process-scheduled-jobs
 * 
 * 4. The function will automatically run on schedule and process pending jobs
 * 
 * NOTE: This requires Supabase Pro plan for cron triggers.
 * The client-side polling solution already implemented works with free tier.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key for admin access
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    const now = new Date().toISOString()

    // Find all pending jobs that are due
    const { data: dueJobs, error: fetchError } = await supabaseClient
      .from('scheduled_jobs')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_time', now)

    if (fetchError) {
      throw fetchError
    }

    if (!dueJobs || dueJobs.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No due jobs to process', count: 0 }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    console.log(`Found ${dueJobs.length} due job(s) to process`)

    const results = []

    // Process each job
    for (const job of dueJobs) {
      try {
        console.log(`Processing job ${job.id}: ${job.job_type} ${job.data_type}`)

        // Mark as processing
        await supabaseClient
          .from('scheduled_jobs')
          .update({ status: 'processing' })
          .eq('id', job.id)

        let recordCount = 0

        if (job.job_type === 'export') {
          recordCount = await executeExport(supabaseClient, job)
        } else if (job.job_type === 'import') {
          recordCount = await executeImport(supabaseClient, job)
        }

        // Mark as completed
        await supabaseClient
          .from('scheduled_jobs')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            record_count: recordCount,
          })
          .eq('id', job.id)

        results.push({
          id: job.id,
          status: 'success',
          recordCount,
        })
      } catch (error: any) {
        console.error(`Failed to process job ${job.id}:`, error)

        // Mark as failed
        await supabaseClient
          .from('scheduled_jobs')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: error.message,
          })
          .eq('id', job.id)

        results.push({
          id: job.id,
          status: 'failed',
          error: error.message,
        })
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Jobs processed',
        count: dueJobs.length,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('Error processing scheduled jobs:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

// Execute export job
async function executeExport(supabase: any, job: any): Promise<number> {
  // Query the appropriate table based on data_type
  const { data, error } = await supabase
    .from(job.data_type)
    .select('*')
    .eq('organizationId', job.organization_id)

  if (error) throw error

  // In a real implementation, you would:
  // 1. Generate the CSV from the data
  // 2. Upload it to Supabase Storage
  // 3. Optionally email it to the user
  // 4. Store the file URL in the job record

  return data?.length || 0
}

// Execute import job
async function executeImport(supabase: any, job: any): Promise<number> {
  if (!job.file_data || !job.file_data.records) {
    throw new Error('No import data found')
  }

  const records = job.file_data.records
  let successCount = 0

  // Process each record
  for (const record of records) {
    try {
      if (job.data_type === 'contacts') {
        // Check if contact exists by email
        const { data: existing } = await supabase
          .from('contacts')
          .select('id')
          .eq('email', record.email)
          .eq('organizationId', job.organization_id)
          .single()

        if (existing) {
          // Update existing
          await supabase
            .from('contacts')
            .update(record)
            .eq('id', existing.id)
        } else {
          // Create new
          await supabase
            .from('contacts')
            .insert({
              ...record,
              organizationId: job.organization_id,
            })
        }
      } else if (job.data_type === 'inventory') {
        // Similar logic for inventory using SKU
        const { data: existing } = await supabase
          .from('inventory')
          .select('id')
          .eq('sku', record.sku)
          .eq('organizationId', job.organization_id)
          .single()

        if (existing) {
          await supabase
            .from('inventory')
            .update(record)
            .eq('id', existing.id)
        } else {
          await supabase
            .from('inventory')
            .insert({
              ...record,
              organizationId: job.organization_id,
            })
        }
      } else if (job.data_type === 'bids') {
        // Create new bid
        await supabase
          .from('bids')
          .insert({
            ...record,
            organizationId: job.organization_id,
          })
      }

      successCount++
    } catch (error: any) {
      console.error('Failed to import record:', error)
    }
  }

  return successCount
}
