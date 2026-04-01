// scripts/migrate-existing-users.js
// This script adds app_id metadata to existing users in Supabase

const { createClient } = require('@supabase/supabase-js');

// ===== EDIT THESE VALUES =====
// Replace with your actual Supabase URL and service role key
const supabaseUrl = 'https://ugolpzpaykhrumlwcpue.supabase.co';
// You're currently using the anon key, not the service role key
// The anon key has 'role': 'anon' in the JWT payload
// The service role key has 'role': 'service_role' in the JWT payload
// Please replace this with your service role key from Project Settings > API > service_role key
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnb2xwenBheWtocnVtbHdjcHVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDA0NjEyNCwiZXhwIjoyMDU5NjIyMTI0fQ.IyqG-UY0t9riPYY-Kr4kB1IWQ2QHHBWorlD6JVBULhg';
// ============================

// Check if URL and key are provided
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Please edit the script to add your Supabase URL and service role key');
  process.exit(1);
}

// Create Supabase client with service role for admin access
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Configuration
const CUSTOMER_PORTAL_APP_ID = 'customer_portal';
const MYAVEYO_APP_ID = 'myaveyo';
const CUSTOMER_TYPE = 'customer';
const REP_TYPE = 'rep';
const DRY_RUN = process.argv.includes('--dry-run'); // Use --dry-run to test without making changes

async function migrateUsers() {
  try {
    console.log(`Starting migration${DRY_RUN ? ' (DRY RUN)' : ''}...`);
    
    // Get all users
    const { data: users, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      throw error;
    }
    
    console.log(`Found ${users.users.length} users total`);
    
    // Filter users who don't have app_id metadata
    const usersToUpdate = users.users.filter(user => !user.user_metadata?.app_id);
    
    console.log(`Found ${usersToUpdate.length} users without app_id metadata`);
    
    // Determine which users belong to each app
    const customerPortalUsers = [];
    const myAveyoUsers = [];
    const unclassifiedUsers = [];
    
    for (const user of usersToUpdate) {
      // Check if user has data in podio_data table (Customer Portal)
      // First try with email field
      const { data: podioData, error: podioError } = await supabase
        .from('podio_data')
        .select('id')
        .eq('email', user.email)
        .limit(1);
      
      if (podioError) {
        console.error(`Error checking podio_data for user ${user.id}:`, podioError);
        continue;
      }
      
      // If no match found with email, try with customer_email field if it exists
      let customerEmailMatch = false;
      if (!podioData || podioData.length === 0) {
        // Check if customer_email column exists by querying a sample record
        const { data: sampleData, error: sampleError } = await supabase
          .from('podio_data')
          .select('*')
          .limit(1);
          
        if (!sampleError && sampleData && sampleData.length > 0) {
          // If customer_email exists in the schema, try matching with it
          if ('customer_email' in sampleData[0]) {
            const { data: customerEmailData, error: customerEmailError } = await supabase
              .from('podio_data')
              .select('id')
              .eq('customer_email', user.email)
              .limit(1);
            
            if (!customerEmailError && customerEmailData && customerEmailData.length > 0) {
              customerEmailMatch = true;
              console.log(`Found match using customer_email field for user: ${user.email}`);
            }
          }
        }
      }
      
      // Debug info
      console.log(`Checking user ${user.email}: podio_data match: ${podioData && podioData.length > 0 ? 'Yes' : 'No'}, customer_email match: ${customerEmailMatch ? 'Yes' : 'No'}`);
      
      
      // Check if user has data in sales_reps table (MyAveyo)
      const { data: salesRepData, error: salesRepError } = await supabase
        .from('sales_reps')
        .select('id')
        .eq('rep_email', user.email)
        .limit(1);
      
      if (salesRepError) {
        console.error(`Error checking sales_reps for user ${user.id}:`, salesRepError);
        continue;
      }
      
      // Classify user based on data presence
      if ((podioData && podioData.length > 0) || customerEmailMatch) {
        customerPortalUsers.push(user);
      } else if (salesRepData && salesRepData.length > 0) {
        myAveyoUsers.push(user);
      } else {
        unclassifiedUsers.push(user);
      }
    }
    
    console.log(`Found ${customerPortalUsers.length} customer portal users`);
    console.log(`Found ${myAveyoUsers.length} myaveyo users`);
    console.log(`Found ${unclassifiedUsers.length} unclassified users`);
    
    // Update customer portal users
    if (!DRY_RUN) {
      // Update Customer Portal users
      for (const user of customerPortalUsers) {
        console.log(`Updating user ${user.id} (${user.email}) with app_id: ${CUSTOMER_PORTAL_APP_ID}`);
        
        const { error } = await supabase.auth.admin.updateUserById(user.id, {
          user_metadata: {
            ...user.user_metadata,
            app_id: CUSTOMER_PORTAL_APP_ID,
            user_type: CUSTOMER_TYPE
          }
        });
        
        if (error) {
          console.error(`Error updating user ${user.id}:`, error);
        } else {
          console.log(`Successfully updated user ${user.id} as Customer Portal user`);
        }
      }
      
      // Update MyAveyo users
      for (const user of myAveyoUsers) {
        console.log(`Updating user ${user.id} (${user.email}) with app_id: ${MYAVEYO_APP_ID}`);
        
        const { error } = await supabase.auth.admin.updateUserById(user.id, {
          user_metadata: {
            ...user.user_metadata,
            app_id: MYAVEYO_APP_ID,
            user_type: REP_TYPE
          }
        });
        
        if (error) {
          console.error(`Error updating user ${user.id}:`, error);
        } else {
          console.log(`Successfully updated user ${user.id} as MyAveyo user`);
        }
      }
    } else {
      console.log('DRY RUN: Would update the following users:');
      console.log('Customer Portal Users:');
      customerPortalUsers.forEach(user => {
        console.log(`- ${user.id} (${user.email})`);
      });
      
      console.log('\nMyAveyo Users:');
      myAveyoUsers.forEach(user => {
        console.log(`- ${user.id} (${user.email})`);
      });
      
      console.log('\nUnclassified Users:');
      unclassifiedUsers.forEach(user => {
        console.log(`- ${user.id} (${user.email})`);
      });
    }
    
    console.log('Migration complete!');
    
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

migrateUsers();
