#!/usr/bin/env node

/**
 * Test Database Connection and KPI Queries
 */

require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
};

async function testConnection() {
  let connection;
  
  try {
    console.log('🔌 Testing database connection...');
    connection = await mysql.createConnection(dbConfig);
    await connection.ping();
    console.log('✅ Database connection successful!\n');
    
    // Test a simple query
    console.log('📊 Testing sample KPI query: Total Sales (Current Week)...');
    
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    const startDate = monday.toISOString().split('T')[0];
    const endDate = sunday.toISOString().split('T')[0];
    
    console.log(`   Date range: ${startDate} to ${endDate}`);
    
    const sql = `
      SELECT COUNT(*) as count
      FROM \`timeline\` t
      JOIN \`project-data\` pd ON t.\`project-id\` = pd.\`project-id\`
      WHERE t.\`contract-signed\` IS NOT NULL
        AND pd.\`project-status\` != 'Cancelled'
        AND t.\`contract-signed\` >= ?
        AND t.\`contract-signed\` <= ?
    `;
    
    const [rows] = await connection.execute(sql, [startDate, endDate]);
    const totalSales = rows[0].count;
    
    console.log(`   Result: ${totalSales} sales this week\n`);
    
    // Test another query
    console.log('📊 Testing sample KPI query: Installs Complete (Current Week)...');
    
    const installSql = `
      SELECT COUNT(*) as count
      FROM \`timeline\`
      WHERE \`install-complete\` IS NOT NULL
        AND \`install-complete\` >= ?
        AND \`install-complete\` <= ?
    `;
    
    const [installRows] = await connection.execute(installSql, [startDate, endDate]);
    const installsComplete = installRows[0].count;
    
    console.log(`   Result: ${installsComplete} installs completed this week\n`);
    
    // Test financial query
    console.log('📊 Testing sample KPI query: Outstanding A/R (M2/M3)...');
    
    const arSql = `
      SELECT SUM(\`contract-price\`) as total
      FROM \`project-data\`
      WHERE (
        (\`m2-submitted\` IS NOT NULL AND \`m2-received-date\` IS NULL)
        OR (\`m3-submitted\` IS NOT NULL AND \`m3-approved\` IS NULL)
      )
      AND \`project-status\` != 'Cancelled'
      AND \`is_deleted\` = 0
    `;
    
    const [arRows] = await connection.execute(arSql);
    const arTotal = arRows[0].total || 0;
    
    console.log(`   Result: $${arTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} outstanding A/R\n`);
    
    console.log('✅ All test queries executed successfully!');
    console.log('\n🎉 Database integration is working correctly!');
    
    return true;
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.code === 'ENOTFOUND') {
      console.error('   Could not find the database host. Check DB_HOST in .env.local');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('   Access denied. Check DB_USER and DB_PASSWORD in .env.local');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('   Database does not exist. Check DB_NAME in .env.local');
    } else if (error.code === 'ER_BAD_FIELD_ERROR') {
      console.error('   SQL query error. One of the fields may not exist in the database.');
      console.error('   Error details:', error.sqlMessage);
    }
    
    return false;
    
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testConnection().then(success => {
  process.exit(success ? 0 : 1);
});
