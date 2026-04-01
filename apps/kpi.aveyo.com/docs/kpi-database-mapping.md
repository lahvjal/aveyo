# KPI to Database Mapping

This document maps each KPI to the specific database tables and SQL logic needed.

## Key Tables

- **project-data** (6,055 rows): Financial data, milestones (M1/M2/M3), project info, system specs
- **timeline** (6,055 rows): All project timeline dates and statuses
- **work-orders** (11,828 rows): Installation and inspection scheduling/completion

## KPI Mappings

### 1. Sales & Approval Pipeline

#### 1.1 Total Sales
- **Description**: Number of residential contracts sold
- **Table**: `project-data`
- **Logic**: 
  ```sql
  SELECT COUNT(*) 
  FROM `project-data`
  WHERE `contract-signed` IS NOT NULL
    AND `project-status` != 'Cancelled'
    AND [period_filter]
  ```
- **Period Field**: Based on contract signed date from `timeline.contract-signed`

#### 1.2 Total Sales Goal
- **Description**: Sales targets by period
- **Table**: Hardcoded goals (no table)
- **Logic**: Static configuration by period (weekly/monthly/yearly targets)

#### 1.3 Aveyo Approved
- **Description**: Sales that passed internal QA/validation (Perfect Packet)
- **Table**: `timeline`
- **Logic**:
  ```sql
  SELECT COUNT(*)
  FROM `timeline`
  WHERE `packet-approval` IS NOT NULL
    AND [period_filter on packet-approval date]
  ```

#### 1.4 Pull Through Rate
- **Description**: (Aveyo Approved / Total Sales) × 100
- **Logic**: Calculated from 1.1 and 1.3

---

### 2. Install Operations

#### 2.1 Jobs Placed ON HOLD
- **Description**: Jobs paused due to outstanding requirements
- **Table**: `work-orders`
- **Logic**:
  ```sql
  SELECT COUNT(*)
  FROM `work-orders`
  WHERE `work-order-status` = 'On Hold'
    AND `type` = 'Install'
    AND [period_filter]
  ```

#### 2.2 Installs Complete
- **Description**: Total installations completed
- **Table**: `timeline`
- **Logic**:
  ```sql
  SELECT COUNT(*)
  FROM `timeline`
  WHERE `install-complete` IS NOT NULL
    AND [period_filter on install-complete date]
  ```

#### 2.3 Install Completion Goal
- **Description**: Installation targets
- **Table**: Hardcoded goals
- **Logic**: Static configuration

#### 2.4 Install Complete NO PTO
- **Description**: Installs finished but awaiting Permission to Operate
- **Table**: `timeline`
- **Logic**:
  ```sql
  SELECT COUNT(*)
  FROM `timeline`
  WHERE `install-complete` IS NOT NULL
    AND `pto-received` IS NULL
    AND `project-status` != 'Cancelled'
  ```

#### 2.5 Install Scheduled
- **Description**: Future installations on calendar
- **Table**: `work-orders`
- **Logic**:
  ```sql
  SELECT COUNT(*)
  FROM `work-orders`
  WHERE `type` = 'Install'
    AND `site-visit-appointment` IS NOT NULL
    AND `site-visit-appointment` >= CURDATE()
    AND [period_filter on site-visit-appointment]
  ```

---

### 3. Cycle Times

#### 3.1 Avg Days PP → Install Start
- **Description**: Time from Perfect Packet to install start
- **Tables**: `timeline`
- **Logic**:
  ```sql
  SELECT AVG(DATEDIFF(`install-appointment`, `packet-approval`))
  FROM `timeline`
  WHERE `packet-approval` IS NOT NULL
    AND `install-appointment` IS NOT NULL
    AND [period_filter]
  ```

#### 3.2 Avg Days Install → M2 Approved
- **Description**: Time from install completion to M2 milestone
- **Tables**: `timeline`, `project-data`
- **Logic**:
  ```sql
  SELECT AVG(DATEDIFF(pd.`m2-approved`, t.`install-complete`))
  FROM `timeline` t
  JOIN `project-data` pd ON t.`project-id` = pd.`project-id`
  WHERE t.`install-complete` IS NOT NULL
    AND pd.`m2-approved` IS NOT NULL
    AND [period_filter]
  ```

#### 3.3 Avg Days PP → PTO
- **Description**: Total time from PP submission to PTO
- **Tables**: `timeline`
- **Logic**:
  ```sql
  SELECT AVG(DATEDIFF(`pto-received`, `packet-approval`))
  FROM `timeline`
  WHERE `packet-approval` IS NOT NULL
    AND `pto-received` IS NOT NULL
    AND [period_filter]
  ```

---

### 4. Residential Financials

#### 4.1 A/R (M2/M3 Submitted Not Received)
- **Description**: Outstanding accounts receivable
- **Table**: `project-data`
- **Logic**:
  ```sql
  SELECT SUM(`contract-price`)
  FROM `project-data`
  WHERE (
    (`m2-submitted` IS NOT NULL AND `m2-received-date` IS NULL)
    OR (`m3-submitted` IS NOT NULL AND `m3-approved` IS NULL)
  )
  AND `project-status` != 'Cancelled'
  ```

#### 4.2 Revenue Received
- **Description**: Payments received in period
- **Table**: `project-data`
- **Logic**:
  ```sql
  SELECT SUM(`contract-price`)
  FROM `project-data`
  WHERE (
    (`m1-received-date` IS NOT NULL AND [period_filter on m1-received-date])
    OR (`m2-received-date` IS NOT NULL AND [period_filter on m2-received-date])
  )
  ```

#### 4.3 Install Complete M2 Not Approved
- **Description**: Financial backlog - install done but M2 incomplete
- **Tables**: `timeline`, `project-data`
- **Logic**:
  ```sql
  SELECT SUM(pd.`contract-price`)
  FROM `timeline` t
  JOIN `project-data` pd ON t.`project-id` = pd.`project-id`
  WHERE t.`install-complete` IS NOT NULL
    AND pd.`m2-approved` IS NULL
    AND pd.`project-status` != 'Cancelled'
  ```

#### 4.4 Total Holdback Outstanding
- **Description**: Money withheld until milestones pass
- **Table**: Not available in schema - will need clarification
- **Logic**: TBD - may need to calculate based on milestone payment structure

#### 4.5 Total DCA Outstanding
- **Description**: Amount in Document Control Audit
- **Table**: Not available in schema - will need clarification
- **Logic**: TBD

---

### 5. Active Pipeline

#### 5.1 Active Pipeline (Active NO PTO)
- **Description**: Active jobs that haven't achieved PTO
- **Table**: `project-data`, `timeline`
- **Logic**:
  ```sql
  SELECT COUNT(*)
  FROM `project-data` pd
  JOIN `timeline` t ON pd.`project-id` = t.`project-id`
  WHERE pd.`project-status` = 'Active'
    AND t.`pto-received` IS NULL
  ```

---

### 6. Commercial Division

**Note**: The current schema appears to be primarily residential. Commercial projects might be:
- A subset filtered by a field (need to identify)
- In a separate table not yet visible
- Tracked via `system-size` (kW-based)

#### 6.1 Total KW Scheduled
- **Description**: KW capacity scheduled
- **Table**: `work-orders`, `project-data`
- **Logic**:
  ```sql
  SELECT SUM(pd.`system-size`)
  FROM `work-orders` wo
  JOIN `project-data` pd ON wo.`project_ids` = pd.`item_id`
  WHERE wo.`type` = 'Install'
    AND wo.`site-visit-appointment` IS NOT NULL
    AND [period_filter]
  ```

#### 6.2 KW Scheduled Goal
- **Description**: Commercial KW targets
- **Table**: Hardcoded goals

#### 6.3 Total KW Installed
- **Description**: KW capacity actually installed
- **Tables**: `timeline`, `project-data`
- **Logic**:
  ```sql
  SELECT SUM(pd.`system-size`)
  FROM `timeline` t
  JOIN `project-data` pd ON t.`project-id` = pd.`project-id`
  WHERE t.`install-complete` IS NOT NULL
    AND [period_filter on install-complete]
  ```

#### 6.4 KW Installed Goal
- **Description**: Installation KW targets
- **Table**: Hardcoded goals

#### 6.5 A/R (Commercial)
- **Description**: Outstanding commercial receivables
- **Logic**: Similar to 4.1 but filtered for commercial projects

#### 6.6 Revenue Received (Commercial)
- **Description**: Commercial revenue collected
- **Logic**: Similar to 4.2 but filtered for commercial projects

---

## Period Filters

```sql
-- Current Week (Monday start)
WHERE DATE >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
  AND DATE < DATE_ADD(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL 7 DAY)

-- Previous Week
WHERE DATE >= DATE_SUB(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL 7 DAY)
  AND DATE < DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)

-- Month to Date
WHERE DATE >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
  AND DATE <= CURDATE()

-- Year to Date
WHERE DATE >= DATE_FORMAT(CURDATE(), '%Y-01-01')
  AND DATE <= CURDATE()

-- Next Week
WHERE DATE >= DATE_ADD(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL 7 DAY)
  AND DATE < DATE_ADD(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL 14 DAY)
```

---

## Notes

1. **Commercial vs Residential**: Need to determine how to distinguish commercial projects
2. **Goals**: Need actual goal values for each period
3. **Holdback & DCA**: These fields don't exist in the schema - need to clarify data source
4. **Project Status**: Need to verify which statuses constitute "Active" vs "Complete"
5. **Join Keys**: `project-data.project-id` = `timeline.project-id` = parsed from `work-orders.project`
