#!/usr/bin/env node

/**
 * Test script to verify KPI API endpoint and database connectivity
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testKPIAPI() {
  console.log('🔍 Testing KPI API and Database...\n');

  // Test 1: Check if custom_kpis table exists
  console.log('1️⃣ Testing custom_kpis table access...');
  try {
    const { data, error, count } = await supabase
      .from('custom_kpis')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('❌ Error accessing custom_kpis table:', error.message);
      console.log('   This table may not exist yet. Run migrations first.');
    } else {
      console.log(`✅ custom_kpis table exists (${count || 0} records)`);
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
  }

  console.log('');

  // Test 2: Try to fetch a few KPIs
  console.log('2️⃣ Testing KPI fetch...');
  try {
    const { data, error } = await supabase
      .from('custom_kpis')
      .select('kpi_id, name, is_original, is_hidden, is_active')
      .eq('is_active', true)
      .limit(5);

    if (error) {
      console.error('❌ Error fetching KPIs:', error.message);
    } else {
      console.log(`✅ Fetched ${data.length} KPIs successfully`);
      if (data.length > 0) {
        console.log('   Sample KPIs:');
        data.forEach(kpi => {
          console.log(`   - ${kpi.kpi_id}: ${kpi.name} (${kpi.is_original ? 'Original' : 'Custom'}${kpi.is_hidden ? ', Hidden' : ''})`);
        });
      }
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
  }

  console.log('');

  // Test 3: Test local API endpoint (requires Next.js dev server running)
  console.log('3️⃣ Testing /api/kpis endpoint (requires dev server)...');
  try {
    const response = await fetch('http://localhost:3000/api/kpis');
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API endpoint responded successfully');
      console.log(`   Total KPIs: ${data.kpis?.total || 0}`);
      console.log(`   Original: ${data.kpis?.builtIn?.length || 0}`);
      console.log(`   Custom: ${data.kpis?.custom?.length || 0}`);
    } else {
      console.error(`❌ API endpoint returned status ${response.status}`);
    }
  } catch (err) {
    console.log('⚠️  Could not reach API endpoint (is dev server running?)');
    console.log('   Error:', err.message);
  }

  console.log('\n✨ Diagnostics complete!\n');
}

testKPIAPI();
