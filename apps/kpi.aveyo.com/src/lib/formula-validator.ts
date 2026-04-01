/**
 * Formula Validator
 * 
 * Validates SQL and expression formulas for custom KPIs before saving/executing.
 * Provides security checks and syntax validation.
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  parsedFields: string[];
}

// Dangerous SQL keywords that should not appear in formulas
const DANGEROUS_KEYWORDS = [
  'DROP', 'DELETE', 'TRUNCATE', 'ALTER', 'CREATE', 'INSERT', 'UPDATE',
  'GRANT', 'REVOKE', 'EXEC', 'EXECUTE', 'SCRIPT', 'DECLARE',
  'INTO OUTFILE', 'INTO DUMPFILE', 'LOAD_FILE', 'SLEEP'
];

// Allowed SQL keywords for read-only queries
const ALLOWED_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER',
  'ON', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'IS', 'NULL',
  'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'DISTINCT', 'GROUP BY', 'ORDER BY',
  'HAVING', 'LIMIT', 'AS', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
  'DATEDIFF', 'DATE_SUB', 'DATE_ADD', 'CURDATE', 'NOW', 'INTERVAL'
];

// Valid table names
const VALID_TABLES = [
  'timeline',
  'project-data',
  'funding',
  'customer-sow',
  'sla-tracker'
];

/**
 * Parse field references from formula
 * Extracts @table.field or @field patterns
 */
export function parseFieldReferences(formula: string): string[] {
  const fieldPattern = /@([\w-]+)(?:\.`?([^`\s]+)`?)?/g;
  const matches = [];
  let match;
  
  while ((match = fieldPattern.exec(formula)) !== null) {
    if (match[2]) {
      // @table.field format
      matches.push(`${match[1]}.${match[2]}`);
    } else {
      // @field format (table not specified)
      matches.push(match[1]);
    }
  }
  
  return Array.from(new Set(matches));
}

/**
 * Validate SQL formula
 */
export function validateSQLFormula(formula: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const parsedFields = parseFieldReferences(formula);

  // Check for dangerous keywords
  const upperFormula = formula.toUpperCase();
  for (const keyword of DANGEROUS_KEYWORDS) {
    if (upperFormula.includes(keyword)) {
      errors.push(`Dangerous keyword detected: ${keyword}. Only SELECT queries are allowed.`);
    }
  }

  // Ensure formula starts with SELECT
  if (!upperFormula.trim().startsWith('SELECT')) {
    errors.push('SQL formula must start with SELECT');
  }

  // Check for semicolons (potential SQL injection)
  if (formula.includes(';') && formula.trim().split(';').length > 2) {
    errors.push('Multiple SQL statements detected. Only single SELECT queries allowed.');
  }

  // Validate field references
  parsedFields.forEach(field => {
    if (field.includes('.')) {
      const [table] = field.split('.');
      if (!VALID_TABLES.includes(table)) {
        warnings.push(`Unknown table: ${table}. Available tables: ${VALID_TABLES.join(', ')}`);
      }
    }
  });

  // Check for required placeholder if period-based
  if (!upperFormula.includes('{{DATEFILTER}}') && !upperFormula.includes('DATE_SUB')) {
    warnings.push('No {{dateFilter}} placeholder found. This KPI may not filter by time period correctly.');
  }

  // Check for result column
  if (!upperFormula.includes(' AS ')) {
    warnings.push('No column alias (AS) found. Ensure your query returns a column named "value", "count", or similar.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    parsedFields
  };
}

/**
 * Validate expression formula
 */
export function validateExpressionFormula(formula: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const parsedFields = parseFieldReferences(formula);

  // Check for balanced parentheses
  const openParens = (formula.match(/\(/g) || []).length;
  const closeParens = (formula.match(/\)/g) || []).length;
  if (openParens !== closeParens) {
    errors.push('Unbalanced parentheses in expression');
  }

  // Check for valid operators
  const validOperators = ['+', '-', '*', '/', '%', '(', ')'];
  const cleanedFormula = formula.replace(/@[\w-]+\.?`?[\w-]*`?/g, ''); // Remove field references
  const remainingChars = cleanedFormula.replace(/[\d\s.]/g, ''); // Remove numbers and whitespace
  
  for (const char of remainingChars) {
    if (!validOperators.includes(char)) {
      errors.push(`Invalid character in expression: "${char}". Only +, -, *, /, % are allowed.`);
      break;
    }
  }

  // Check that expression has at least one field reference
  if (parsedFields.length === 0) {
    errors.push('Expression must contain at least one field reference (use @ syntax)');
  }

  // Check for division by zero risk
  if (formula.includes('/ 0') || formula.includes('/0')) {
    errors.push('Direct division by zero detected');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    parsedFields
  };
}

/**
 * Main validation function
 */
export function validateFormula(
  formula: string,
  formulaType: 'sql' | 'expression'
): ValidationResult {
  if (!formula || formula.trim() === '') {
    return {
      isValid: false,
      errors: ['Formula cannot be empty'],
      warnings: [],
      parsedFields: []
    };
  }

  if (formulaType === 'sql') {
    return validateSQLFormula(formula);
  } else {
    return validateExpressionFormula(formula);
  }
}

/**
 * Replace field tokens with actual SQL field names
 * Converts @table.field or @table.`field` to proper SQL syntax
 */
export function replaceFieldTokens(formula: string): string {
  // Replace @table.`field` with `table`.`field`
  let result = formula.replace(
    /@([\w-]+)\.`([^`]+)`/g,
    '`$1`.`$2`'
  );
  
  // Replace @table.field (without backticks) with `table`.`field`
  result = result.replace(
    /@([\w-]+)\.([\w-]+)/g,
    '`$1`.`$2`'
  );
  
  // Replace standalone @table references (e.g., FROM @timeline)
  // This must come AFTER the @table.field replacements to avoid conflicts
  result = result.replace(
    /@([\w-]+)(?!\.)/g,
    '`$1`'
  );
  
  return result;
}

/**
 * Extract variable names from expression formula
 * For expressions like: (@jobs_with_battery / @total_sales) * 100
 */
export function extractExpressionVariables(formula: string): string[] {
  const varPattern = /@([\w_]+)/g;
  const variables = [];
  let match;
  
  while ((match = varPattern.exec(formula)) !== null) {
    variables.push(match[1]);
  }
  
  return Array.from(new Set(variables));
}
