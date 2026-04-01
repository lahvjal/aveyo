# KPI Data Source & Calculation Guide

This document explains **exactly** where each KPI gets its data from and how it's calculated.

---

## 📊 Database Overview

Your MySQL database has **6 main tables**:

| Table | Rows | Purpose |
|-------|------|---------|
| `project-data` | 6,055 | Financial data, milestones (M1/M2/M3), system specs, pricing |
| `timeline` | 6,055 | All project timeline dates (contract, install, PTO, etc.) |
| `work-orders` | 11,828 | Installation and inspection work orders |
| `contacts` | 6,771 | Customer contact information |
| `customer-sow` | 2,180 | Scope of work documents |
| `virtual-welcome-call` | 2,848 | Welcome call records |

**Primary relationship**: `project-data.project-id` = `timeline.project-id`

---

## 🎯 Section 1: Sales & Approval Pipeline

### 1.1 Total Sales

**What it shows**: Number of residential contracts signed in the period

**Data Source**:
- **Tables**: `timeline` + `project-data`
- **Key Fields**:
  - `timeline.contract-signed` (date field)
  - `project-data.project-status` (status field)

**Calculation Logic**:
```sql
SELECT COUNT(*) 
FROM timeline t
JOIN project-data pd ON t.project-id = pd.project-id
WHERE t.contract-signed IS NOT NULL          -- Has a signed date
  AND pd.project-status != 'Cancelled'       -- Not cancelled
  AND t.contract-signed >= '2025-12-15'      -- Period start
  AND t.contract-signed <= '2025-12-21'      -- Period end
```

**Example Result**: 
- Current week: **1 sale**
- Previous week: **8 sales**
- Trend: **-87.5%** ⬇️

**File Location**: `src/lib/kpi-service.ts` → `getTotalSales()`

---

### 1.2 Total Sales Goal

**What it shows**: Target number of sales for the period

**Data Source**: **Hardcoded** in code (not from database)

**Location**: `src/lib/kpi-service.ts` lines 95-130

```typescript
const GOALS = {
  total_sales: {
    current_week: 50,
    previous_week: 50,
    mtd: 200,
    ytd: 2400,
  }
}
```

**To Change**: Edit the `GOALS` object in `kpi-service.ts`

**Example Result**: **50** (weekly goal)

---

### 1.3 Aveyo Approved

**What it shows**: Sales that passed internal QA/validation (Perfect Packet approved)

**Data Source**:
- **Table**: `timeline`
- **Key Field**: `packet-approval` (date field)

**Calculation Logic**:
```sql
SELECT COUNT(*)
FROM timeline
WHERE packet-approval IS NOT NULL           -- Has been approved
  AND packet-approval >= '2025-12-15'       -- Within period
  AND packet-approval <= '2025-12-21'
```

**What "Perfect Packet" means**: 
- Design complete
- All documentation ready
- Ready to proceed to permitting

**Example Result**: **0** (current week)

**File Location**: `src/lib/kpi-service.ts` → `getAveyoApproved()`

---

### 1.4 Pull Through Rate

**What it shows**: Percentage of sales that get approved (efficiency metric)

**Data Source**: **Calculated** from KPIs 1.1 and 1.3

**Calculation Logic**:
```typescript
Pull Through Rate = (Aveyo Approved / Total Sales) × 100

Example:
- Total Sales: 1
- Aveyo Approved: 0
- Rate: 0 / 1 × 100 = 0%
```

**Interpretation**:
- **90%+** = Success ✅ (Green)
- **75-89%** = Warning ⚠️ (Yellow)
- **<75%** = Danger 🔴 (Red)

**File Location**: `src/lib/kpi-service.ts` → `getPullThroughRate()`

---

## 🔧 Section 2: Install Operations

### 2.1 Jobs Placed ON HOLD

**What it shows**: Installation jobs paused due to outstanding requirements

**Data Source**:
- **Table**: `work-orders`
- **Key Fields**:
  - `work-order-status` (status field)
  - `type` (work order type)

**Calculation Logic**:
```sql
SELECT COUNT(*)
FROM work-orders
WHERE work-order-status = 'On Hold'          -- Currently on hold
  AND type = 'Install'                       -- Install work orders only
  AND is_deleted = 0                         -- Not deleted
```

**Why jobs go on hold**:
- Missing equipment
- Customer not available
- Permit delays
- Weather issues

**Example Result**: Varies (snapshot at time of query)

**File Location**: `src/lib/kpi-service.ts` → `getJobsOnHold()`

---

### 2.2 Installs Complete

**What it shows**: Number of installations finished in the period

**Data Source**:
- **Table**: `timeline`
- **Key Field**: `install-complete` (date field)

**Calculation Logic**:
```sql
SELECT COUNT(*)
FROM timeline
WHERE install-complete IS NOT NULL           -- Install finished
  AND install-complete >= '2025-12-15'       -- Within period
  AND install-complete <= '2025-12-21'
```

**What "Install Complete" means**:
- Solar panels installed
- Electrical work done
- MPU (Main Panel Upgrade) complete if needed
- Ready for inspection

**Example Result**: **5 installs** (current week)

**File Location**: `src/lib/kpi-service.ts` → `getInstallsComplete()`

---

### 2.3 Install Completion Goal

**What it shows**: Target number of installs for the period

**Data Source**: **Hardcoded** in code

**Example Values**:
- Weekly: **40 installs**
- Monthly: **160 installs**
- Yearly: **1,920 installs**

**File Location**: `src/lib/kpi-service.ts` → `getInstallCompletionGoal()`

---

### 2.4 Install Complete NO PTO

**What it shows**: Installs finished but awaiting Permission to Operate (PTO)

**Data Source**:
- **Tables**: `timeline` + `project-data`
- **Key Fields**:
  - `timeline.install-complete` (date)
  - `timeline.pto-received` (date)
  - `project-data.project-status`

**Calculation Logic**:
```sql
SELECT COUNT(*)
FROM timeline t
JOIN project-data pd ON t.project-id = pd.project-id
WHERE t.install-complete IS NOT NULL         -- Install is done
  AND t.pto-received IS NULL                 -- No PTO yet
  AND pd.project-status != 'Cancelled'       -- Not cancelled
```

**Why this matters**: 
- High number = bottleneck in PTO process
- Money tied up (can't bill M3 without PTO)
- Customer can't use system yet

**Example Result**: **328 projects** 🔴 (Critical backlog!)

**File Location**: `src/lib/kpi-service.ts` → `getInstallCompleteNoPTO()`

---

### 2.5 Install Scheduled

**What it shows**: Future installations on the calendar

**Data Source**:
- **Tables**: `work-orders` + `project-data`
- **Key Fields**:
  - `work-orders.type`
  - `work-orders.site-visit-appointment` (scheduled date)

**Calculation Logic**:
```sql
SELECT COUNT(DISTINCT wo.project_ids)
FROM work-orders wo
WHERE wo.type = 'Install'
  AND wo.site-visit-appointment IS NOT NULL    -- Has scheduled date
  AND wo.site-visit-appointment >= '2025-12-15' -- In future/period
  AND wo.site-visit-appointment <= '2025-12-21'
  AND wo.is_deleted = 0
```

**Note**: Uses `DISTINCT` because one project can have multiple work orders

**File Location**: `src/lib/kpi-service.ts` → `getInstallScheduled()`

---

## ⏱️ Section 3: Cycle Times

These KPIs measure how long things take (speed of project progression).

### 3.1 Avg Days PP → Install Start

**What it shows**: Average time from Perfect Packet to install appointment

**Data Source**:
- **Table**: `timeline`
- **Key Fields**:
  - `packet-approval` (start date)
  - `install-appointment` (end date)

**Calculation Logic**:
```sql
SELECT AVG(DATEDIFF(install-appointment, packet-approval))
FROM timeline
WHERE packet-approval IS NOT NULL
  AND install-appointment IS NOT NULL
  AND install-appointment >= '2025-12-15'      -- Period filter
  AND install-appointment <= '2025-12-21'
```

**How it works**:
```
DATEDIFF calculates days between two dates:

Project A: 
- PP: Jan 1
- Install: Feb 15
- Days: 45

Project B:
- PP: Jan 5
- Install: Mar 1
- Days: 55

Average: (45 + 55) / 2 = 50 days
```

**Example Result**: **103 days** (Goal: 60 days) 🔴

**Why it matters**: Shows permitting and scheduling efficiency

**File Location**: `src/lib/kpi-service.ts` → `getAvgDaysPPToInstall()`

---

### 3.2 Avg Days Install → M2 Approved

**What it shows**: Time from install completion to M2 milestone approval

**Data Source**:
- **Tables**: `timeline` + `project-data`
- **Key Fields**:
  - `timeline.install-complete` (start date)
  - `project-data.m2-approved` (end date)

**Calculation Logic**:
```sql
SELECT AVG(DATEDIFF(pd.m2-approved, t.install-complete))
FROM timeline t
JOIN project-data pd ON t.project-id = pd.project-id
WHERE t.install-complete IS NOT NULL
  AND pd.m2-approved IS NOT NULL
  AND t.install-complete >= [period start]
```

**What M2 is**:
- Milestone 2 payment
- Triggered after install complete + inspection
- Usually 50-60% of contract value

**File Location**: `src/lib/kpi-service.ts` → `getAvgDaysInstallToM2()`

---

### 3.3 Avg Days PP → PTO

**What it shows**: Total time from Perfect Packet to Permission to Operate

**Data Source**:
- **Table**: `timeline`
- **Key Fields**:
  - `packet-approval` (start)
  - `pto-received` (end)

**Calculation Logic**:
```sql
SELECT AVG(DATEDIFF(pto-received, packet-approval))
FROM timeline
WHERE packet-approval IS NOT NULL
  AND pto-received IS NOT NULL
  AND pto-received >= [period start]
```

**This is the "total time" metric**:
```
Perfect Packet → Permitting → Install → Inspection → PTO

Goal: 90 days or less
Current: Varies by jurisdiction
```

**File Location**: `src/lib/kpi-service.ts` → `getAvgDaysPPToPTO()`

---

## 💰 Section 4: Residential Financials

### 4.1 A/R (M2/M3 Submitted Not Received)

**What it shows**: Money owed to you (accounts receivable)

**Data Source**:
- **Table**: `project-data`
- **Key Fields**:
  - `m2-submitted` (date submitted)
  - `m2-received-date` (date received)
  - `m3-submitted` (date submitted)
  - `m3-approved` (date approved)
  - `contract-price` (dollar amount)

**Calculation Logic**:
```sql
SELECT SUM(contract-price)
FROM project-data
WHERE (
    -- M2 submitted but not received
    (m2-submitted IS NOT NULL AND m2-received-date IS NULL)
    OR
    -- M3 submitted but not approved
    (m3-submitted IS NOT NULL AND m3-approved IS NULL)
  )
  AND project-status != 'Cancelled'
  AND is_deleted = 0
```

**How it works**:
```
Project 1: $50,000 - M2 submitted 12/1, not received
Project 2: $45,000 - M3 submitted 11/15, not approved
Project 3: $60,000 - M2 received ✓ (NOT included)

Total A/R: $50,000 + $45,000 = $95,000
```

**Example Result**: **$72,946,809** (across all projects)

**File Location**: `src/lib/kpi-service.ts` → `getARM2M3()`

---

### 4.2 Revenue Received

**What it shows**: Payments actually received in the period

**Data Source**:
- **Table**: `project-data`
- **Key Fields**:
  - `m1-received-date` (date)
  - `m2-received-date` (date)
  - `contract-price` (amount)

**Calculation Logic**:
```sql
SELECT SUM(contract-price)
FROM project-data
WHERE (
    -- M1 received in period
    (m1-received-date IS NOT NULL 
     AND m1-received-date >= [period start]
     AND m1-received-date <= [period end])
    OR
    -- M2 received in period
    (m2-received-date IS NOT NULL
     AND m2-received-date >= [period start]
     AND m2-received-date <= [period end])
  )
```

**Note**: Each project only counted once even if both M1 and M2 received

**What the milestones mean**:
- **M1**: Down payment (~20-30% of contract)
- **M2**: Install complete (~50-60% of contract)
- **M3**: PTO received (~10-20% of contract)

**File Location**: `src/lib/kpi-service.ts` → `getRevenueReceived()`

---

### 4.3 Install Complete M2 Not Approved

**What it shows**: Dollar value of installs done but M2 not approved (financial backlog)

**Data Source**:
- **Tables**: `timeline` + `project-data`
- **Key Fields**:
  - `timeline.install-complete`
  - `project-data.m2-approved`
  - `project-data.contract-price`

**Calculation Logic**:
```sql
SELECT SUM(pd.contract-price)
FROM timeline t
JOIN project-data pd ON t.project-id = pd.project-id
WHERE t.install-complete IS NOT NULL         -- Install is done
  AND pd.m2-approved IS NULL                 -- M2 not approved
  AND pd.project-status != 'Cancelled'
```

**Why this matters**:
- Work is complete
- Can't bill/receive M2 payment
- Cash flow issue

**File Location**: `src/lib/kpi-service.ts` → `getInstallM2NotApproved()`

---

### 4.4 Total Holdback Outstanding

**What it shows**: Money withheld by lenders until milestones complete

**Data Source**: ⚠️ **NOT AVAILABLE** in current database schema

**Current Status**: Returns **$0** (placeholder)

**What this should show**:
- Lenders hold back 10-20% until final inspection
- Released when all work verified

**Action Needed**: Clarify with stakeholders where this data lives

**File Location**: `src/lib/kpi-service.ts` → `getTotalHoldback()`

---

### 4.5 Total DCA Outstanding

**What it shows**: Amount in Document Control Audit

**Data Source**: ⚠️ **NOT AVAILABLE** in current database schema

**Current Status**: Returns **$0** (placeholder)

**What DCA is**:
- Document Control Audit
- Financial review process
- Holds up payment release

**Action Needed**: Clarify with stakeholders where this data lives

**File Location**: `src/lib/kpi-service.ts` → `getTotalDCA()`

---

## 🔄 Section 5: Active Pipeline

### 5.1 Active Pipeline (Active NO PTO)

**What it shows**: Number of active projects that haven't received PTO

**Data Source**:
- **Tables**: `project-data` + `timeline`
- **Key Fields**:
  - `project-data.project-status`
  - `timeline.pto-received`

**Calculation Logic**:
```sql
SELECT COUNT(*)
FROM project-data pd
JOIN timeline t ON pd.project-id = t.project-id
WHERE pd.project-status NOT IN ('Cancelled', 'Complete')  -- Active
  AND t.pto-received IS NULL                              -- No PTO
  AND pd.is_deleted = 0
```

**Example Result**: **1,067 projects**

**File Location**: `src/lib/kpi-service.ts` → `getActiveNoPTO()`

---

## ⚡ Section 6: Commercial Division

### 6.1 Total KW Scheduled

**What it shows**: KW capacity scheduled for installation

**Data Source**:
- **Tables**: `work-orders` + `project-data`
- **Key Fields**:
  - `work-orders.site-visit-appointment`
  - `project-data.system-size` (in KW)

**Calculation Logic**:
```sql
SELECT SUM(pd.system-size)
FROM work-orders wo
JOIN project-data pd ON wo.project_ids = pd.item_id
WHERE wo.type = 'Install'
  AND wo.site-visit-appointment IS NOT NULL
  AND wo.site-visit-appointment >= [period start]
  AND wo.site-visit-appointment <= [period end]
```

**How it works**:
```
Monday schedule:
- Project A: 8.5 KW
- Project B: 12.0 KW
- Project C: 6.2 KW

Total scheduled: 26.7 KW
```

**File Location**: `src/lib/kpi-service.ts` → `getTotalKWScheduled()`

---

### 6.2-6.6 Other Commercial KPIs

All follow similar patterns:

- **KW Scheduled Goal**: Hardcoded goal
- **Total KW Installed**: SUM of `system-size` where `install-complete` in period
- **KW Installed Goal**: Hardcoded goal
- **A/R (Commercial)**: Same as residential (no filter yet)
- **Revenue Received (Commercial)**: Same as residential (no filter yet)

**⚠️ Note**: Currently no way to distinguish commercial from residential in database

---

## 📅 Period Filtering

All date-based KPIs use these period definitions:

### Current Week
```sql
-- Monday to Sunday of current week
WHERE date_field >= '2025-12-15'  -- This Monday
  AND date_field <= '2025-12-21'  -- This Sunday
```

### Previous Week
```sql
WHERE date_field >= '2025-12-08'  -- Last Monday
  AND date_field <= '2025-12-14'  -- Last Sunday
```

### Month to Date (MTD)
```sql
WHERE date_field >= '2025-12-01'  -- First of month
  AND date_field <= '2025-12-16'  -- Today
```

### Year to Date (YTD)
```sql
WHERE date_field >= '2025-01-01'  -- Jan 1
  AND date_field <= '2025-12-16'  -- Today
```

### Next Week
```sql
WHERE date_field >= '2025-12-22'  -- Next Monday
  AND date_field <= '2025-12-28'  -- Next Sunday
```

**Code Location**: `src/lib/kpi-service.ts` → `getPeriodDateRange()`

---

## 🔢 Trend Calculations

Each KPI shows a trend (up/down/neutral) compared to previous period:

```typescript
// Example: Current Week vs Previous Week
Current Value: 5
Previous Value: 8

Change = ((5 - 8) / 8) × 100 = -37.5%

Display: ⬇️ -37.5%
Color: Red (down is bad for sales)
```

**Trend Logic**:
- **< 1% change**: Neutral (➖)
- **Positive change**: Up (⬆️ Green)
- **Negative change**: Down (⬇️ Red)

**Code Location**: `src/lib/kpi-service.ts` → `calculateTrend()`

---

## 🎯 Status Indicators

Each KPI with a goal shows a status:

```typescript
Percent of Goal = (Actual / Goal) × 100

Status:
- ≥100%: Success ✅ (Green)
- 80-99%: Warning ⚠️ (Yellow)
- <80%: Danger 🔴 (Red)
```

**Example**:
```
Installs Complete: 5
Goal: 40
Percent: 5/40 = 12.5%
Status: Danger 🔴
```

**Code Location**: `src/lib/kpi-service.ts` → `calculateStatus()`

---

## 🗄️ Database Schema Quick Reference

### project-data (Key fields for KPIs)
```
project-id              (text) - Primary key, links to timeline
project-status          (text) - Active, Complete, Cancelled
contract-price          (double) - Dollar amount of contract
system-size             (double) - KW capacity
m1-submitted            (date)
m1-approved             (date)
m1-received-date        (date)
m2-submitted            (date)
m2-approved             (date)
m2-received-date        (date)
m3-submitted            (date)
m3-approved             (date)
```

### timeline (Key fields for KPIs)
```
project-id              (text) - Links to project-data
contract-signed         (date) - When contract was signed
packet-approval         (date) - Perfect Packet approved
install-appointment     (date) - When install scheduled
install-complete        (date) - When install finished
pto-received            (date) - Permission to Operate received
```

### work-orders (Key fields for KPIs)
```
project_ids             (varchar) - Links to project-data.item_id
type                    (varchar) - Install, Inspection, etc.
work-order-status       (varchar) - On Hold, Complete, etc.
site-visit-appointment  (date) - Scheduled date
```

---

## 🔍 Testing Your Understanding

### Quiz: Where does this KPI get its data?

1. **"Total Sales"** 
   - Answer: `timeline.contract-signed` (date count)

2. **"Outstanding A/R"**
   - Answer: `project-data.contract-price` (SUM where M2/M3 submitted but not received)

3. **"Avg Days PP to Install"**
   - Answer: `timeline.install-appointment` - `timeline.packet-approval` (averaged)

4. **"Install Complete NO PTO"**
   - Answer: COUNT where `timeline.install-complete` exists but `timeline.pto-received` is NULL

5. **"Pull Through Rate"**
   - Answer: Calculated from Total Sales and Aveyo Approved

---

## 📂 File Reference

All KPI calculations are in: **`src/lib/kpi-service.ts`**

Line ranges:
- Date helpers: Lines 18-62
- Formatting: Lines 68-120
- Sales KPIs: Lines 193-270
- Install KPIs: Lines 277-390
- Cycle Times: Lines 397-485
- Financials: Lines 492-590
- Pipeline: Lines 597-620
- Commercial: Lines 627-730
- Main router: Lines 737-793

---

## 🎓 Summary

### Data Flows
```
Database (MySQL)
    ↓
Query Functions (kpi-service.ts)
    ↓
API Routes (/api/kpi)
    ↓
React Hook (use-kpi-data.ts)
    ↓
Dashboard Components
    ↓
Your Browser
```

### Key Concepts

1. **Most KPIs use COUNT or SUM**
   - Sales: COUNT of contract-signed
   - A/R: SUM of contract-price

2. **Cycle Times use DATEDIFF**
   - Calculates days between dates
   - Averaged across all projects

3. **Status comes from comparisons**
   - Actual vs Goal
   - Current vs Previous

4. **Caching saves time**
   - Results cached 15 minutes
   - Reduces database load

---

## 📞 Quick Help

**"Where is X KPI calculated?"**
→ Search `kpi-service.ts` for the function name

**"How do I change a goal?"**
→ Edit the `GOALS` object in `kpi-service.ts` lines 95-130

**"Why is a KPI showing 0?"**
→ Check if the data exists in the database
→ Run the SQL query manually to debug

**"How do I add a new KPI?"**
→ Add function to `kpi-service.ts`
→ Add case to `getKPIValue()` switch
→ Add definition to `types/kpi.ts`

---

**Need more detail on a specific KPI? Just ask!** 🚀
