import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';

export function backgroundJobs(app: Hono) {
  // Create a background import job
  app.post('/make-server-8405be07/background-jobs/create', async (c) => {
    console.log('🔵 Background jobs endpoint hit!');
    
    try {
      const body = await c.req.json();
      const { organization_id, created_by, job_type, data_type, scheduled_time, creator_name, file_name, file_data } = body;

      console.log('📥 Creating background job:', {
        organization_id,
        created_by,
        job_type,
        data_type,
        scheduled_time,
        file_name,
        record_count: file_data?.records?.length || 0
      });

      // Validate required fields
      if (!organization_id || !created_by || !job_type || !data_type || !scheduled_time) {
        return c.json({ 
          error: 'Missing required fields',
          details: { organization_id, created_by, job_type, data_type, scheduled_time }
        }, 400);
      }

      // Use service role key to bypass RLS
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      // Verify the user exists and belongs to the organization
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, organization_id')
        .eq('id', created_by)
        .single();

      if (profileError || !profile) {
        console.error('❌ Profile not found:', profileError);
        return c.json({ error: 'User profile not found' }, 404);
      }

      if (profile.organization_id !== organization_id) {
        console.error('❌ Organization mismatch:', { 
          expected: organization_id, 
          actual: profile.organization_id 
        });
        return c.json({ error: 'Organization mismatch' }, 403);
      }

      console.log('✅ Profile verified:', profile);

      // Create the job
      const jobData = {
        organization_id,
        created_by,
        job_type,
        data_type,
        scheduled_time,
        status: 'pending',
        creator_name: creator_name || 'User',
        file_name: file_name || `import_${data_type}_${new Date().toISOString().split('T')[0]}.csv`,
        file_data: file_data || { records: [], mapping: {} },
        created_at: new Date().toISOString(),
      };

      console.log('📤 Inserting job with service role key...');

      const { data: insertedJob, error: insertError } = await supabase
        .from('scheduled_jobs')
        .insert(jobData)
        .select()
        .single();

      if (insertError) {
        console.error('❌ Insert error:', insertError);
        return c.json({ 
          error: 'Failed to create job',
          details: insertError
        }, 500);
      }

      console.log('✅ Job created successfully:', insertedJob.id);

      return c.json({ 
        success: true, 
        job: insertedJob 
      });

    } catch (error: any) {
      console.error('❌ Server error:', error);
      return c.json({ 
        error: 'Internal server error',
        message: error.message 
      }, 500);
    }
  });
}