# Annual Report Data Analysis
## Comparing Report Fields vs Available Database Data

---

## ✅ DATA AVAILABLE IN DATABASE

### Customer Information
| Report Field | Database Source | Table | Field Name |
|--------------|----------------|-------|------------|
| **Customer Name** | ✅ Available | `project-data` | `firstName`, `lastName`, or `customerName` |
| **Address** | ✅ Available | `project-data` | `fullAddress` or `address` |
| **City** | ✅ Available | `project-data` | `city` |
| **State** | ✅ Available | `project-data` | `state` |
| **Zip Code** | ✅ Available | `project-data` | `zip` |
| **Email** | ✅ Available | `project-data` | `email` |

### System Information
| Report Field | Database Source | Table | Field Name |
|--------------|----------------|-------|------------|
| **System Size** (8.5 kW) | ✅ Available | `project-data` | `systemSize` (Float) |
| **Panel Count** (24 Panels) | ✅ Available | `project-data` | `panelCount` (Int) |
| **Panel Brand** | ✅ Available | `project-data` | `panelBrand` |
| **Panel Model** | ✅ Available | `project-data` | `panelModel` |
| **Inverter Brand** | ✅ Available | `project-data` | `inverterBrand` |
| **Inverter Model** | ✅ Available | `project-data` | `inverterModel` |
| **Inverter Count** | ✅ Available | `project-data` | `inverterCount` (Int) |
| **Battery Model** | ✅ Available | `project-data` | `batteryModel` |
| **Battery Count** | ✅ Available | `project-data` | `batteryCount` (Int) |

### Timeline/Dates
| Report Field | Database Source | Table | Field Name |
|--------------|----------------|-------|------------|
| **System Activation Year** | ✅ Available | `timeline` | `systemActive` (DateTime) |
| **Contract Signed** | ✅ Available | `timeline` | `contractSigned` (DateTime) |
| **Install Complete** | ✅ Available | `timeline` | `installComplete` (DateTime) |
| **PTO Received** | ✅ Available | `timeline` | `ptoReceived` (DateTime) |
| **Project Complete** | ✅ Available | `timeline` | `projectComplete` (DateTime) |

### Estimated Data
| Report Field | Database Source | Table | Field Name |
|--------------|----------------|-------|------------|
| **Estimated Yearly Production** | ✅ Available | `project-data` | `estimatedYearlyProduction` (Int) - in kWh |

**Note:** This is an *estimated* value from system design, NOT actual production data.

---

## ❌ DATA NOT AVAILABLE IN DATABASE

### Energy Production (Real/Actual)
| Report Field | Status | Notes |
|--------------|--------|-------|
| **Actual Energy Produced** (3,646 kWh) | ❌ NOT Available | No monitoring/production tracking in DB |
| **Monthly Production** | ❌ NOT Available | No time-series production data |
| **Lifetime Production** (7,892 kWh) | ❌ NOT Available | No cumulative production tracking |
| **Daily Production** | ❌ NOT Available | No granular production data |

### System Performance
| Report Field | Status | Notes |
|--------------|--------|-------|
| **System Efficiency** (94.2%) | ❌ NOT Available | No monitoring data |
| **System Uptime** | ❌ NOT Available | No monitoring data |
| **Performance Ratio** | ❌ NOT Available | No monitoring data |

### Environmental Impact (Calculated)
| Report Field | Status | Notes |
|--------------|--------|-------|
| **Trees Planted Equivalent** (42) | ⚠️ Can Calculate | IF we have actual production data |
| **CO₂ Offset** (2.8 tons) | ⚠️ Can Calculate | IF we have actual production data |
| **Estimated Savings** ($487) | ⚠️ Can Calculate | IF we have actual production + utility rates |

### Financial Data
| Report Field | Status | Table | Notes |
|--------------|--------|-------|-------|
| **Actual Utility Savings** | ❌ NOT Available | N/A | No utility bill integration |
| **Contract Price** | ✅ Available | `project-data` | `contractPrice` (Float) |
| **Financing Type** | ✅ Available | `project-data` | `financeType` |
| **Lender** | ✅ Available | `project-data` | `lender` |

---

## 📊 RECOMMENDED APPROACH

### Phase 1: Use Available Data (Current)
Use the fields we HAVE in the database:

```typescript
const reportData = {
  // From project-data table
  customerName: project.firstName + ' ' + project.lastName,
  address: project.fullAddress || `${project.address}, ${project.city}, ${project.state} ${project.zip}`,
  city: project.city,
  state: project.state,
  zip: project.zip,
  
  // System specs
  systemSize: project.systemSize, // e.g., 8.5
  panelCount: project.panelCount, // e.g., 24
  panelBrand: project.panelBrand,
  panelModel: project.panelModel,
  inverterBrand: project.inverterBrand,
  inverterModel: project.inverterModel,
  batteryModel: project.batteryModel,
  
  // From timeline table
  systemActivationYear: new Date(timeline.systemActive).getFullYear(),
  installCompleteDate: timeline.installComplete,
  ptoReceivedDate: timeline.ptoReceived,
  
  // Use ESTIMATED yearly production (from design)
  estimatedYearlyProduction: project.estimatedYearlyProduction, // This is the design estimate
};
```

### Phase 2: Calculate Derived Metrics (from Estimates)
Use the **estimated** yearly production to calculate environmental impact:

```typescript
// Environmental calculations (based on EPA standards)
const estimatedAnnualProduction = project.estimatedYearlyProduction; // in kWh

const environmentalImpact = {
  treesEquivalent: Math.round(estimatedAnnualProduction * 0.0115), // ~0.0115 trees per kWh
  co2Offset: (estimatedAnnualProduction * 0.000744).toFixed(1), // ~0.744 kg CO2 per kWh
  estimatedSavings: Math.round(estimatedAnnualProduction * 0.12), // Assuming $0.12/kWh average rate
};
```

### Phase 3: Future Enhancement - Real Production Data
To show **actual** production data, you would need to:

1. **Integrate with monitoring system:**
   - Enphase Enlighten API
   - SolarEdge Monitoring API
   - Tesla Powerwall API
   - Other inverter manufacturer APIs

2. **Create new database tables:**
   ```sql
   -- Production data table
   CREATE TABLE production_data (
     id BIGINT PRIMARY KEY,
     project_id VARCHAR(255),
     date DATE,
     daily_production_kwh DECIMAL(10,2),
     monthly_production_kwh DECIMAL(10,2),
     lifetime_production_kwh DECIMAL(10,2),
     system_efficiency DECIMAL(5,2),
     created_at TIMESTAMP,
     FOREIGN KEY (project_id) REFERENCES project_data(project_id)
   );
   ```

3. **Scheduled data sync:**
   - Daily/hourly cron job to fetch production data from monitoring APIs
   - Store in new `production_data` table
   - Calculate environmental impact from real data

---

## 🎯 IMMEDIATE ACTION ITEMS

### Update Annual Report to Use Real Database Data

1. **Fetch project data from MySQL** instead of hardcoded placeholders
2. **Use available fields:**
   - Customer name (firstName/lastName)
   - Full address
   - System size
   - Panel count
   - System activation date
   - **Estimated** yearly production (clearly labeled as estimate)

3. **Update labels to be accurate:**
   - Change "Your system produced" → "Your system is estimated to produce"
   - Change "Lifetime Production" → "Estimated Annual Production"
   - Add disclaimer: "Based on system design estimates"

4. **Remove fields we don't have:**
   - ❌ Actual monthly production chart (keep placeholder or remove)
   - ❌ System efficiency percentage (or calculate theoretical)
   - ❌ Actual savings (or use estimate based on local utility rates)

---

## 💡 SAMPLE UPDATED REPORT DATA

```typescript
// annual-report/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useProjects } from '@/context/ProjectsContext';

export default function AnnualReportPage() {
  const { user } = useAuth();
  const { projects } = useProjects();
  const [reportData, setReportData] = useState(null);

  useEffect(() => {
    if (projects.length > 0) {
      const project = projects[0]; // Or let user select project
      const timeline = project.milestone; // Timeline data
      
      // Calculate years as customer
      const activationDate = timeline?.['system-active'] 
        ? new Date(timeline['system-active']) 
        : null;
      const yearsAsCustomer = activationDate 
        ? new Date().getFullYear() - activationDate.getFullYear()
        : 0;

      // Calculate environmental impact from ESTIMATED production
      const estimatedProduction = project.estimated_yearly_production || 0;
      const treesEquivalent = Math.round(estimatedProduction * 0.0115);
      const co2Offset = (estimatedProduction * 0.000744).toFixed(1);
      const estimatedSavings = Math.round(estimatedProduction * 0.12);

      setReportData({
        customerName: project.customer_email?.split('@')[0] || 'Customer',
        year: new Date().getFullYear(),
        address: project.address,
        systemSize: project.system_size,
        panelCount: project.podio_data?.raw_payload?.['panel-count'],
        estimatedYearlyProduction: estimatedProduction,
        systemActivationYear: activationDate?.getFullYear(),
        yearsAsCustomer: yearsAsCustomer,
        environmentalImpact: {
          trees: treesEquivalent,
          co2: co2Offset,
          savings: estimatedSavings,
        },
      });
    }
  }, [projects]);

  // ... rest of component
}
```

---

## 📝 SUMMARY

**Can Use Now (Available in DB):**
- ✅ Customer name, address, contact info
- ✅ System specifications (size, panel count, brands)
- ✅ System activation date
- ✅ **Estimated** yearly production (from design)

**Cannot Use (Not in DB):**
- ❌ **Actual** energy production data
- ❌ Real-time or historical monitoring data
- ❌ System efficiency metrics
- ❌ Actual utility savings

**Recommendation:**
1. Update the annual report to pull from MySQL database immediately
2. Clearly label all metrics as "estimates" where applicable
3. Plan future integration with monitoring APIs for real production data

