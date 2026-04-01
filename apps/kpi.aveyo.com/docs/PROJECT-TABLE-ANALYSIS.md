# PROJECT Table Analysis for Financial KPIs

## Overview

The `project` table contains **6,044 projects** with comprehensive contract and financial data. This table should be used alongside `timeline` and `project-data` tables for complete financial KPI calculations.

---

## 📊 Table Statistics

| Metric | Count |
|--------|-------|
| **Total Projects** | 6,044 |
| **With Contract Price** | 5,993 (99.2%) |
| **With Signed Date** | 6,041 (99.9%) |
| **With Dealer Fee** | 423 (7%) |
| **Active Projects** | 739 |
| **Cancelled Projects** | 2,247 |
| **Completed Projects** | 679 |

---

## 💰 Key Financial Columns in PROJECT Table

### Contract & Pricing
| Column | Type | Description | Usage for KPI |
|--------|------|-------------|---------------|
| **`contract-price`** | double | Total contract value | Revenue calculations, A/R |
| **`contract-signed-date`** | date | When contract was signed | Total Sales by period |
| **`contract-price_cur`** | varchar(5) | Currency code (e.g., USD) | Currency validation |
| **`dealer-fee`** | double | Dealer fee amount | Cost calculations |
| **`dealer-fee_cur`** | varchar(5) | Dealer fee currency | Currency validation |

### Pricing Metrics
| Column | Type | Description | Usage for KPI |
|--------|------|-------------|---------------|
| **`gross-ppw`** | double | Gross price per watt | Profitability analysis |
| **`net-ppw`** | double | Net price per watt | Profitability analysis |

### Financial Status
| Column | Type | Description | Usage for KPI |
|--------|------|-------------|---------------|
| **`funding-status`** | varchar | M1 Approved, M2 Approved, etc. | Payment milestone tracking |
| **`lender`** | text | Financing company | Lender analysis |
| **`loan-type`** | varchar | Type of loan | Finance type breakdown |
| **`finance-id`** | text | Finance tracking ID | Payment reconciliation |

### Project Status
| Column | Type | Description | Usage for KPI |
|--------|------|-------------|---------------|
| **`project-status`** | varchar | Active, Cancelled, Pre-Approvals | Filter active projects |
| **`milestone-status`** | varchar | Current milestone | Track progress |
| **`project-complete-date`** | date | Completion date | Revenue recognition timing |
| **`cancellation-date`** | date | When cancelled | Exclude from calculations |
| **`on-hold-date`** | date | When put on hold | Jobs on hold tracking |

---

## 📅 Date Columns Available

| Column | Purpose |
|--------|---------|
| `contract-signed-date` | **Total Sales tracking** - Use for "Total Sales" KPI by period |
| `project-complete-date` | **Completion tracking** - Revenue recognition timing |
| `on-hold-date` | **Jobs on hold** - Track projects paused |
| `cancellation-date` | **Exclusion filter** - Don't count cancelled projects |

---

## 🔗 Related Tables for Complete Financial Picture

### TIMELINE Table
Contains milestone submission and completion dates:
- `m1-submitted`, `m1-approved`, `m1-earned-date`, `m1-received-date`
- `m2-submitted`, `m2-approved`, `m2-earned-date`, `m2-received-date`
- `m3-submitted`, `m3-approved`, `m3-earned-date`, `m3-received-date`
- `install-complete`, `pto-received`
- `packet-approval` (Perfect Packet approval)

### PROJECT-DATA Table
Contains additional milestone dates:
- `m1-submitted`, `m1-approved`, `m1-earned-date`, `m1-received-date`
- `m2-submitted`, `m2-approved`, `m2-earned-date`, `m2-received-date`
- `m3-submitted`, `m3-approved`
- `contract-price` (duplicate for verification)

---

## 💡 KPI Calculation Guide

### 1. Total Sales
**Data Source**: `project` table  
**Key Columns**:
- `contract-signed-date` - Filter by period
- `project-status` - Exclude 'Cancelled'
- `is_deleted` = 0

**Query Pattern**:
```sql
SELECT COUNT(*) as total_sales
FROM project
WHERE `contract-signed-date` >= 'start_date'
  AND `contract-signed-date` <= 'end_date'
  AND `project-status` != 'Cancelled'
  AND `is_deleted` = 0
```

### 2. Accounts Receivable (A/R)
**Data Sources**: `project` + `project-data` (for M2/M3 status)  
**Key Columns**:
- `contract-price` - Amount owed
- `funding-status` - Payment milestone status
- M2/M3 submitted/received dates from `project-data`

**Logic**:
```sql
-- Projects where M2 or M3 submitted but not received
SELECT SUM(p.`contract-price`) as ar_total
FROM project p
LEFT JOIN `project-data` pd ON p.item_id = pd.item_id
WHERE (
  (pd.`m2-submitted` IS NOT NULL AND pd.`m2-received-date` IS NULL)
  OR (pd.`m3-submitted` IS NOT NULL AND pd.`m3-approved` IS NULL)
)
AND p.`project-status` != 'Cancelled'
AND p.`is_deleted` = 0
```

### 3. Revenue Received
**Data Sources**: `project` + `project-data` (for payment dates)  
**Key Columns**:
- `contract-price` - Amount received
- M1/M2/M3 `received-date` columns from `project-data`

**Logic**:
```sql
-- Sum contract prices where M1 or M2 received in period
SELECT SUM(p.`contract-price`) as revenue_received
FROM project p
JOIN `project-data` pd ON p.item_id = pd.item_id
WHERE (
  (pd.`m1-received-date` >= 'start_date' AND pd.`m1-received-date` <= 'end_date')
  OR (pd.`m2-received-date` >= 'start_date' AND pd.`m2-received-date` <= 'end_date')
)
AND p.`is_deleted` = 0
```

### 4. Total Holdback Outstanding
**Data Sources**: `project` table  
**Key Columns**:
- `contract-price` - Base amount
- `funding-status` - Current payment status
- May need calculation: contract_price * holdback_percentage

**Note**: Holdback percentage rules need to be defined (typically 10-20% held until final completion)

### 5. Jobs on Hold
**Data Source**: `project` table  
**Key Columns**:
- `project-status` = 'On Hold' (if exists)
- `on-hold-date` - When placed on hold
- `on-hold-reason` - Why it's on hold

**Query Pattern**:
```sql
SELECT COUNT(*) as jobs_on_hold
FROM project
WHERE `on-hold-date` IS NOT NULL
  AND `project-complete-date` IS NULL
  AND `cancellation-date` IS NULL
  AND `is_deleted` = 0
```

---

## 🎯 Recommended Query Patterns

### Join PROJECT with TIMELINE for Complete Data
```sql
SELECT 
  p.item_id,
  p.`contract-price`,
  p.`contract-signed-date`,
  p.`project-status`,
  p.`funding-status`,
  t.`m1-submitted`,
  t.`m1-received-date`,
  t.`m2-submitted`,
  t.`m2-received-date`,
  t.`install-complete`,
  t.`pto-received`
FROM project p
LEFT JOIN timeline t ON p.item_id = t.item_id
WHERE p.`is_deleted` = 0
```

### Filter Active Projects Only
```sql
WHERE p.`project-status` NOT IN ('Cancelled', 'Complete')
  AND p.`cancellation-date` IS NULL
  AND p.`is_deleted` = 0
```

### Get Projects by Funding Status
```sql
-- Projects at M1 stage
WHERE p.`funding-status` LIKE '%M1%'

-- Projects awaiting M2
WHERE p.`funding-status` LIKE '%M2%'
  AND pd.`m2-received-date` IS NULL
```

---

## ⚠️ Important Considerations

### 1. Data Quality
- **99.2%** of projects have contract price (51 missing)
- **7%** have dealer fee data (5,621 missing)
- Always check `is_deleted` = 0
- Exclude `project-status` = 'Cancelled'

### 2. Date Handling
- All dates are stored in DATE format
- Contract signed dates are nearly 100% populated
- Use date ranges for period filtering

### 3. Currency
- Most contracts in USD (contract-price_cur field)
- Verify currency before calculations
- Dealer fees may have different currency

### 4. Multiple Tables Required
- **CONTRACT DATA**: `project` table
- **MILESTONE DATES**: `timeline` or `project-data` tables
- **JOIN KEY**: `item_id` field

---

## 📋 Sample Financial Data

Recent projects (Dec 2025):
```
┌─────────┬────────────┬────────────────┬──────────────────────────┬────────────────┐
│ item_id │ contract-  │ contract-      │ funding-      │ lender       │
│         │ price      │ signed-date    │ status        │              │
├─────────┼────────────┼────────────────┼───────────────┼──────────────┤
│3219331473│ $39,441.60 │ 2025-12-18    │ New Deal      │ LightReach   │
│3218830310│ $24,604.10 │ 2025-12-17    │ New Deal      │ LightReach   │
│3218289512│ $89,667.00 │ 2025-12-16    │ New Deal      │ LightReach   │
│3218154801│ $73,000.00 │ 2025-12-16    │ M1 Approved   │ Cash         │
│3217510394│ $18,040.00 │ 2025-12-15    │ New Deal      │ GoodLeap     │
└─────────┴────────────┴────────────────┴───────────────┴──────────────┘
```

---

## 🔄 Next Steps

### 1. Update KPI Queries
- Modify `getTotalSales()` to use `project` table
- Update `getARM2M3()` to join `project` + `project-data`
- Update `getRevenueReceived()` to use payment dates
- Add `getTotalHoldback()` calculation logic

### 2. Test Data Accuracy
- Compare `project` vs `timeline` vs `project-data` counts
- Verify M1/M2/M3 data consistency
- Test date range filtering

### 3. Performance Optimization
- Add indexes on `contract-signed-date`
- Add indexes on `funding-status`
- Cache commonly used queries

---

## 📊 Table Relationships

```
┌───────────────────┐
│  PROJECT          │
│  ===============  │
│  - item_id (PK)   │◄─────┐
│  - contract-price │      │
│  - signed-date    │      │
│  - funding-status │      │
└───────────────────┘      │
                           │ JOIN ON item_id
                           │
┌───────────────────┐      │
│  TIMELINE         │      │
│  ===============  │      │
│  - item_id ───────┼──────┘
│  - m1-received    │
│  - m2-received    │
│  - install-complete│
└───────────────────┘

┌───────────────────┐      │
│  PROJECT-DATA     │      │
│  ===============  │      │
│  - item_id ───────┼──────┘
│  - m1-received-date│
│  - m2-received-date│
│  - m3-approved    │
└───────────────────┘
```

---

**Analysis Date**: December 16, 2025  
**Total Projects Analyzed**: 6,044  
**Data Quality**: High (99%+ for key fields)  
**Status**: ✅ Ready for KPI Implementation
