import { createClient } from './supabase/client';

/**
 * This utility adds the ai_suggestions_enabled column to the organizations table
 * Run this from the browser console: window.fixAISuggestionsColumn()
 */

export async function fixAISuggestionsColumn() {
  const supabase = createClient();
  
  console.log('🔧 Starting fix for ai_suggestions_enabled column...');
  
  try {
    // Step 1: Check if column exists by trying to select it
    console.log('📋 Step 1: Checking if column exists...');
    const { data: testData, error: testError } = await supabase
      .from('organizations')
      .select('id, ai_suggestions_enabled')
      .limit(1);
    
    if (!testError) {
      console.log('✅ Column already exists!');
      console.log('📊 Sample data:', testData);
      return { success: true, message: 'Column already exists' };
    }
    
    // Step 2: If column doesn't exist, we need to add it via RPC or direct SQL
    console.log('❌ Column does not exist. Error:', testError);
    console.log('');
    console.log('⚠️ You need to run this SQL in your Supabase SQL Editor:');
    console.log('');
    console.log('-- Add ai_suggestions_enabled column to organizations table');
    console.log('ALTER TABLE public.organizations');
    console.log('ADD COLUMN IF NOT EXISTS ai_suggestions_enabled BOOLEAN DEFAULT true;');
    console.log('');
    console.log('-- Update existing organizations to enable AI suggestions');
    console.log('UPDATE public.organizations');
    console.log('SET ai_suggestions_enabled = true');
    console.log('WHERE ai_suggestions_enabled IS NULL;');
    console.log('');
    
    return { 
      success: false, 
      message: 'Column does not exist. Please run the SQL above in Supabase SQL Editor.',
      sql: `
-- Add ai_suggestions_enabled column to organizations table
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS ai_suggestions_enabled BOOLEAN DEFAULT true;

-- Update existing organizations to enable AI suggestions
UPDATE public.organizations
SET ai_suggestions_enabled = true
WHERE ai_suggestions_enabled IS NULL;
      `.trim()
    };
    
  } catch (error) {
    console.error('❌ Error:', error);
    return { success: false, error };
  }
}

// Make it available globally for easy access from console
if (typeof window !== 'undefined') {
  (window as any).fixAISuggestionsColumn = fixAISuggestionsColumn;
}
