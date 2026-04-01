#!/usr/bin/env node

/**
 * Database Schema Explorer
 * 
 * This script connects to the MySQL database and displays:
 * - All tables
 * - Column names and types for each table
 * - Sample data (first 5 rows) from each table
 * - Row counts for each table
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

async function exploreDatabase() {
  let connection;
  
  try {
    console.log('🔌 Connecting to database...');
    console.log(`   Host: ${dbConfig.host}`);
    console.log(`   Port: ${dbConfig.port}`);
    console.log(`   Database: ${dbConfig.database}`);
    console.log('');
    
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected successfully!\n');
    
    // Get all tables
    const [tables] = await connection.query('SHOW TABLES');
    const tableNames = tables.map(row => Object.values(row)[0]);
    
    console.log(`📊 Found ${tableNames.length} tables in database "${dbConfig.database}":\n`);
    
    for (const tableName of tableNames) {
      console.log('═'.repeat(80));
      console.log(`📋 TABLE: ${tableName}`);
      console.log('═'.repeat(80));
      
      // Get row count
      const [countResult] = await connection.query(`SELECT COUNT(*) as count FROM \`${tableName}\``);
      const rowCount = countResult[0].count;
      console.log(`   Rows: ${rowCount.toLocaleString()}\n`);
      
      // Get column information
      const [columns] = await connection.query(`SHOW COLUMNS FROM \`${tableName}\``);
      console.log('   Columns:');
      columns.forEach((col, idx) => {
        const nullable = col.Null === 'YES' ? '(nullable)' : '(required)';
        const key = col.Key ? `[${col.Key}]` : '';
        console.log(`     ${idx + 1}. ${col.Field} - ${col.Type} ${nullable} ${key}`);
      });
      
      // Get sample data (first 5 rows)
      if (rowCount > 0) {
        console.log('\n   Sample Data (first 5 rows):');
        const [rows] = await connection.query(`SELECT * FROM \`${tableName}\` LIMIT 5`);
        
        if (rows.length > 0) {
          // Show column headers
          const columnHeaders = Object.keys(rows[0]);
          console.log('\n   ' + columnHeaders.join(' | '));
          console.log('   ' + '-'.repeat(columnHeaders.join(' | ').length));
          
          // Show data rows
          rows.forEach((row, idx) => {
            const values = Object.values(row).map(val => {
              if (val === null) return 'NULL';
              if (val instanceof Date) return val.toISOString().split('T')[0];
              if (typeof val === 'string' && val.length > 30) return val.substring(0, 27) + '...';
              return String(val);
            });
            console.log(`   ${values.join(' | ')}`);
          });
        }
      }
      
      console.log('\n');
    }
    
    console.log('═'.repeat(80));
    console.log('✅ Schema exploration complete!');
    console.log('═'.repeat(80));
    
  } catch (error) {
    console.error('❌ Error exploring database:', error.message);
    if (error.code === 'ENOTFOUND') {
      console.error('   Could not find the database host. Check DB_HOST in .env.local');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('   Access denied. Check DB_USER and DB_PASSWORD in .env.local');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('   Database does not exist. Check DB_NAME in .env.local');
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the exploration
exploreDatabase();
