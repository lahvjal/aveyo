import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuthenticatedContext } from '@/lib/api-auth';

/**
 * Database Schema API
 * 
 * Endpoint: /api/db-schema
 * 
 * Returns all available database fields with their types for use in KPI formulas.
 * This is used by the KPI admin interface to show available fields for @ autocomplete.
 */

export interface DatabaseField {
  field: string;
  type: string;
  nullable: boolean;
  table: string;
}

export interface DatabaseSchema {
  [tableName: string]: DatabaseField[];
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedContext(request);
    if (auth.errorResponse || !auth.context) {
      return auth.errorResponse!;
    }

    // Define the tables we want to expose for KPI formulas
    const tables = [
      'timeline',
      'project-data',
      'funding',
      'customer-sow',
      'sla-tracker'
    ];
    
    const schema: DatabaseSchema = {};
    
    // Fetch column information for each table
    for (const tableName of tables) {
      try {
        const columns = await query(`SHOW COLUMNS FROM \`${tableName}\``);
        
        schema[tableName] = columns.map((col: any) => ({
          field: col.Field,
          type: col.Type,
          nullable: col.Null === 'YES',
          table: tableName
        }));
      } catch (error) {
        console.error(`Error fetching schema for table ${tableName}:`, error);
        // Continue with other tables even if one fails
        schema[tableName] = [];
      }
    }
    
    // Calculate total field count
    const totalFields = Object.values(schema).reduce(
      (sum, fields) => sum + fields.length,
      0
    );
    
    return NextResponse.json({
      success: true,
      schema,
      metadata: {
        tableCount: tables.length,
        totalFields,
        tables: Object.keys(schema)
      }
    });
    
  } catch (error: any) {
    console.error('Database Schema API Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch database schema',
        details: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS handler for CORS
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
