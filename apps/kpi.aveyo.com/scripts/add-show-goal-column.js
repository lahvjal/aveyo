/**
 * Migration Script: Add show_goal column to custom_kpis table
 * 
 * Run with: node scripts/add-show-goal-column.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function runMigration() {
  console.log('🔄 Adding show_goal column to custom_kpis table...\n');
  
  try {
    // Step 1: Add show_goal column (using RPC or direct SQL)
    // Note: Supabase client doesn't support ALTER TABLE directly,
    // so we need to use the SQL editor in Supabase dashboard
    // or use RPC to execute SQL
    
    console.log('⚠️  Please run the following SQL in your Supabase SQL Editor:\n');
    console.log('---');
    console.log(`
-- Add show_goal column
ALTER TABLE custom_kpis
ADD COLUMN IF NOT EXISTS show_goal BOOLEAN DEFAULT false;

-- Update original KPIs that should show goals
UPDATE custom_kpis
SET show_goal = true
WHERE kpi_id IN (
  'total_sales',
  'installs_complete',
  'avg_days_pp_to_install',
  'avg_days_install_to_m2',
  'avg_days_pp_to_pto',
  'total_kw_scheduled',
  'total_kw_installed'
);
    `.trim());
    console.log('---\n');
    
    console.log('📋 Steps:');
    console.log('1. Go to https://supabase.com/dashboard');
    console.log('2. Select your project');
    console.log('3. Go to SQL Editor');
    console.log('4. Paste the SQL above');
    console.log('5. Click "Run"');
    console.log('\nOr copy from: supabase-migrations/06-add-show-goal-to-custom-kpis.sql');
    
    // After manual migration, verify
    console.log('\n\n⏳ Press Enter once you\'ve run the SQL to verify...');
    
    // Wait for user input
    await new Promise(resolve => {
      process.stdin.once('data', resolve);
    });
    
    console.log('\n🔍 Verifying migration...');
    
    const { data, error } = await supabase
      .from('custom_kpis')
      .select('kpi_id, name, show_goal')
      .eq('show_goal', true)
      .order('kpi_id');
    
    if (error) {
      console.error('❌ Error verifying:', error.message);
      process.exit(1);
    }
    
    if (!data || data.length === 0) {
      console.log('⚠️  No KPIs found with show_goal = true');
      console.log('   Please make sure you ran the SQL update statement.');
    } else {
      console.log('\n✅ Migration successful! KPIs with goals enabled:');
      data.forEach(kpi => {
        console.log(`   - ${kpi.kpi_id}: ${kpi.name}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
