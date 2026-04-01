// Test MySQL Connection and Data Retrieval
// Run with: npx ts-node --esm scripts/test-mysql-connection.ts

import { checkDatabaseConnection } from '../src/lib/mysql/client';
import { getProjects, getProjectById, getActionItems } from '../src/lib/mysql/data-service';

async function testConnection() {
  console.log('🧪 Testing MySQL Connection and Data Retrieval\n');
  
  // Test 1: Database Connection
  console.log('Test 1: Checking database connection...');
  const connected = await checkDatabaseConnection();
  
  if (!connected) {
    console.error('❌ Failed to connect to MySQL database');
    console.log('\n⚠️  Make sure DATABASE_URL is set in .env.local:');
    console.log('DATABASE_URL="mysql://<username>:<password>@<host>:<port>/<database>?ssl-mode=REQUIRED"\n');
    process.exit(1);
  }
  
  // Test 2: Fetch Projects (replace with a test email)
  const testEmail = process.env.TEST_EMAIL || 'test@example.com';
  console.log(`\nTest 2: Fetching projects for email: ${testEmail}`);
  
  try {
    const projects = await getProjects(testEmail);
    console.log(`✅ Successfully fetched ${projects.length} projects`);
    
    if (projects.length > 0) {
      const firstProject = projects[0];
      console.log('\n📋 First Project Sample:');
      console.log(`  - ID: ${firstProject.id}`);
      console.log(`  - Name: ${firstProject.name}`);
      console.log(`  - Address: ${firstProject.address}`);
      console.log(`  - Status: ${firstProject.status}`);
      console.log(`  - Progress: ${firstProject.calculatedStatus?.progressPercentage}%`);
      console.log(`  - Current Stage: ${firstProject.calculatedStatus?.currentStage.name}`);
      console.log(`  - Next Milestone: ${firstProject.calculatedStatus?.nextMilestone}`);
      
      // Test 3: Fetch Single Project
      console.log(`\nTest 3: Fetching project by ID: ${firstProject.id}`);
      const singleProject = await getProjectById(firstProject.id);
      
      if (singleProject) {
        console.log(`✅ Successfully fetched project: ${singleProject.name}`);
        console.log(`  - Has Timeline Data: ${!!singleProject.milestone}`);
        console.log(`  - Milestone Sections:`, Object.keys(singleProject.milestone || {}));
      } else {
        console.log('❌ Failed to fetch project by ID');
      }
      
      // Test 4: Fetch Action Items
      console.log(`\nTest 4: Fetching action items for email: ${testEmail}`);
      const actionItems = await getActionItems(testEmail);
      console.log(`✅ Successfully fetched ${actionItems.length} action items`);
      
      if (actionItems.length > 0) {
        console.log('\n📝 Action Items:');
        actionItems.forEach((item, index) => {
          console.log(`  ${index + 1}. ${item.title} (${item.type})`);
          console.log(`     Status: ${item.status} | Due: ${new Date(item.due_date).toLocaleDateString()}`);
        });
      }
    } else {
      console.log(`\n⚠️  No projects found for email: ${testEmail}`);
      console.log('Try setting TEST_EMAIL environment variable to a valid customer email');
    }
    
    console.log('\n✅ All tests completed successfully!');
    console.log('\n📊 Data Source Configuration:');
    console.log(`   NEXT_PUBLIC_USE_MYSQL = ${process.env.NEXT_PUBLIC_USE_MYSQL || 'true (default)'}`);
    console.log('   To switch to Supabase: Set NEXT_PUBLIC_USE_MYSQL=false in .env.local\n');
    
  } catch (error) {
    console.error('❌ Error during tests:', error);
    process.exit(1);
  }
}

// Run tests
testConnection()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

