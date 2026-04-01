# Customer Data Flow Documentation
## Where Customer Data Comes From

---

## 🎯 Quick Answer

**Customer data is pulled from a MySQL database hosted on Digital Ocean.**

- **Database:** MySQL on Digital Ocean
- **Access Method:** Prisma ORM
- **Authentication:** Supabase (for login only)
- **Primary Table:** `project-data`
- **Related Tables:** `timeline`, `customer-sow`

---

## 📊 Data Flow Architecture

```
User Logs In (Supabase Auth)
         ↓
    Gets Email
         ↓
Frontend: ProjectsContext calls /api/projects
         ↓
API Route: /api/projects/route.ts
         ↓
Data Service Layer: /lib/data-service.ts (Feature Flag)
         ↓
MySQL Service: /lib/mysql/data-service.ts
         ↓
Prisma Client → MySQL Database (Digital Ocean)
         ↓
Field Mapper: Transforms MySQL data to Project types
         ↓
Returns to Frontend
```

---

## 🗄️ Database Details

### MySQL Database (Digital Ocean)
**Connection String:** From `DATABASE_URL` environment variable

```
mysql://velmkg:***@aveyo-podio-do-user-18015130-0.i.db.ondigitalocean.com:25060/avyomkng
```

**Database Name:** `avyomkng`

### Tables Used

#### 1. `project-data` (Primary Customer Data)
Contains all main project and customer information:
- Customer details (name, email, address, phone)
- Project specs (system size, panel count, etc.)
- System equipment (panels, inverters, batteries)
- Estimated production
- Financial data (contract price, lender info)
- Status and milestone data

**Key Fields:**
- `item_id` (Primary Key, BigInt)
- `email` (Customer identifier)
- `customer-name`, `first-name`, `last-name`
- `full-address`, `city`, `state`, `zip`
- `system-size`, `panel-count`, `estimated-yearly-production`
- `is_deleted` (Filter for active projects)

#### 2. `timeline` (Milestone Dates)
Contains all project milestone dates:
- Installation dates
- Permit dates
- Inspection dates
- System activation
- PTO received

**Key Fields:**
- `item_id` (Primary Key)
- `project-id` (Links to project-data)
- `contract-signed`, `site-survey-complete`
- `install-complete`, `pto-received`
- `system-active`, `project-complete`

#### 3. `customer-sow` (Customer Actions)
Contains customer statement of work and approval data:
- SOW status
- Approval forms
- Customer comments

**Key Fields:**
- `item_id` (Primary Key)
- `customer-approval`, `status`
- `link-to-scope-approval-form`

---

## 🔄 Data Retrieval Flow

### Step 1: Authentication (Supabase)
**File:** `/src/app/api/projects/route.ts`

```typescript
const { data: { session } } = await supabase.auth.getSession();
const userEmail = session.user.email;
```

- User must be logged in
- Email is extracted from Supabase session
- **Supabase only used for authentication**, not data storage

### Step 2: Feature Flag Check
**File:** `/src/lib/data-service.ts`

```typescript
const USE_MYSQL = process.env.NEXT_PUBLIC_USE_MYSQL !== 'false';

if (USE_MYSQL) {
  return MySQLService.getProjects(email);
} else {
  return SupabaseService.getProjects(email);
}
```

- Defaults to MySQL
- Can be switched back to Supabase by setting env var to `false`

### Step 3: Query MySQL Database
**File:** `/src/lib/mysql/data-service.ts`

```typescript
export async function getProjects(email: string): Promise<Project[]> {
  // 1. Fetch main project data
  const projectsData = await prisma.projectData.findMany({
    where: {
      email: email,
      isDeleted: false,
    },
  });

  // 2. Fetch related timeline data
  const timeline = await prisma.timeline.findFirst({
    where: {
      projectId: project.projectId,
      isDeleted: false,
    },
  });

  // 3. Fetch customer SOW data
  const customerSow = await prisma.customerSow.findMany({
    where: {
      itemId: project.itemId,
      isDeleted: false,
    },
  });

  // 4. Transform to Project type
  return mapProjectDataToProject(projectWithRelations);
}
```

**Query Filters:**
- ✅ `email` matches customer email
- ✅ `isDeleted` is `false`
- ✅ Ordered by `dataUpdatedTimestamp` (most recent first)

### Step 4: Data Transformation
**File:** `/src/lib/mysql/field-mapper.ts`

```typescript
export function mapProjectDataToProject(
  projectData: ProjectData & { timeline?: Timeline; customerSow?: CustomerSow[] }
): Project {
  // Transform MySQL column names to TypeScript interface
  return {
    id: projectData.itemId.toString(),
    name: `Solar Installation - ${projectData.customerName}`,
    address: projectData.fullAddress,
    customer_email: projectData.email,
    system_size: projectData.systemSize,
    estimated_yearly_production: projectData.estimatedYearlyProduction,
    milestone: mapTimelineToMilestone(projectData.timeline),
    // ... more fields
  };
}
```

**Transformations:**
- Snake-case → camelCase
- BigInt → String (for IDs)
- MySQL dates → ISO strings
- Nested timeline data → milestone object
- Raw data → calculated status

---

## 📍 Where Data is Used

### 1. Dashboard Page
**File:** `/src/app/(dashboard)/dashboard/page.tsx`

```typescript
const { projects } = useProjects(); // Gets data from ProjectsContext
```

**Displays:**
- Project cards with address
- Current stage and progress
- Next milestone
- Last updated date

### 2. Project Details Page
**File:** `/src/app/(dashboard)/dashboard/[id]/page.tsx`

```typescript
const project = projects.find(p => p.id === params.id);
```

**Displays:**
- Full project information
- Detailed milestone timeline
- System specifications
- Installation progress bar

### 3. Actions Page
**File:** `/src/app/(dashboard)/actions/page.tsx`

```typescript
const { actionItems } = useProjects();
```

**Displays:**
- Pending action items
- VWC forms
- SOW approvals

### 4. Annual Report (Future)
**File:** `/src/app/(dashboard)/annual-report/page.tsx`

**Will Display:**
- Customer name (from `firstName`/`lastName`)
- Address (from `fullAddress`)
- System specs (from `systemSize`, `panelCount`)
- Estimated production (from `estimatedYearlyProduction`)
- Activation year (from timeline `systemActive`)

---

## 🔑 Key Fields Mapping

### Customer Information
| Display Name | MySQL Column | Table | Notes |
|--------------|--------------|-------|-------|
| Customer Name | `customer-name` or `first-name` + `last-name` | `project-data` | Combined for display |
| Email | `email` | `project-data` | Used for authentication match |
| Address | `full-address` or `address` + `city` + `state` + `zip` | `project-data` | Formatted for display |
| Phone | `ph` | `project-data` | Customer phone number |

### System Information
| Display Name | MySQL Column | Table | Notes |
|--------------|--------------|-------|-------|
| System Size | `system-size` | `project-data` | Float (kW) |
| Panel Count | `panel-count` | `project-data` | Integer |
| Panel Brand | `panel-brand` | `project-data` | String |
| Panel Model | `panel-model` | `project-data` | String |
| Estimated Yearly Production | `estimated-yearly-production` | `project-data` | Integer (kWh) |

### Timeline/Dates
| Display Name | MySQL Column | Table | Notes |
|--------------|--------------|-------|-------|
| System Active | `system-active` | `timeline` | DateTime |
| Install Complete | `install-complete` | `timeline` | DateTime |
| PTO Received | `pto-received` | `timeline` | DateTime |
| Project Complete | `project-complete` | `timeline` | DateTime |

---

## 🔐 Security & Access

### How Users Access Their Data

1. **Login:** User logs in via Supabase authentication
2. **Email Match:** System uses their email to query MySQL
3. **Row-Level Filter:** Only returns projects where `email` matches
4. **Soft Delete:** Excludes projects where `isDeleted = true`

### No Direct Database Access
- Frontend never queries database directly
- All queries go through API routes (`/api/projects`)
- API routes verify authentication before querying
- Prisma handles SQL injection prevention

---

## 📝 Configuration

### Environment Variables

**Required in `.env.local`:**
```bash
# MySQL Connection
DATABASE_URL="mysql://user:pass@host:port/database?ssl-mode=REQUIRED"

# Feature Flag (defaults to true)
NEXT_PUBLIC_USE_MYSQL=true

# Supabase (for authentication only)
NEXT_PUBLIC_SUPABASE_URL=https://wpbewhesecvlnldhppwx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Prisma Schema
**File:** `/prisma/schema.prisma`

```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model ProjectData {
  itemId     BigInt    @id @map("item_id")
  email      String    @db.VarChar(255)
  // ... more fields
  
  @@map("project-data")
  @@index([email])
}
```

---

## 🚀 Data Source Migration (Feature Flag)

The system was built to support easy switching between data sources:

### Currently: MySQL (Production)
```typescript
NEXT_PUBLIC_USE_MYSQL=true
```
- Pulls from Digital Ocean MySQL
- Production-ready
- All features supported

### Fallback: Supabase (Legacy)
```typescript
NEXT_PUBLIC_USE_MYSQL=false
```
- Can revert to old Supabase storage
- Maintained for backup/rollback
- Not actively used

---

## 📊 Sample Data Query

When you fetch projects for `customer@example.com`:

```sql
-- Step 1: Get project data
SELECT * FROM `project-data`
WHERE email = 'customer@example.com'
AND is_deleted = false;

-- Step 2: Get timeline for each project
SELECT * FROM timeline
WHERE `project-id` = '<project-id>'
AND is_deleted = false;

-- Step 3: Get customer SOW
SELECT * FROM `customer-sow`
WHERE item_id = <item-id>
AND is_deleted = false;
```

---

## 🔍 Debugging Data Issues

### Check if email exists in database:
```sql
SELECT email, `customer-name`, `project-id`, is_deleted
FROM `project-data`
WHERE email = 'customer@example.com';
```

### Check for deleted projects:
```sql
SELECT COUNT(*) FROM `project-data`
WHERE email = 'customer@example.com'
AND is_deleted = true;
```

### View logs in API:
The `/api/projects` route logs extensive debugging info:
- Email being searched
- Number of projects found
- Sample of database records
- Warnings if no projects found

---

## 📈 Summary

**Source:** MySQL Database (Digital Ocean)  
**Tables:** `project-data`, `timeline`, `customer-sow`  
**Access:** Prisma ORM via API routes  
**Authentication:** Supabase (email-based)  
**Identifier:** Customer email address  
**Feature Flag:** Can switch between MySQL and Supabase

All customer data (projects, specs, timelines, action items) comes from MySQL, while Supabase is only used for user authentication and login management.
