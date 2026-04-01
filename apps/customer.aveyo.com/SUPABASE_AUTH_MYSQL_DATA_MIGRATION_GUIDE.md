# Migration Guide: Supabase Auth + MySQL Data Architecture
## Implementing Split Authentication & Data Storage for Ava App

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture Comparison](#architecture-comparison)
3. [Prerequisites](#prerequisites)
4. [Environment Variables](#environment-variables)
5. [Database Setup](#database-setup)
6. [Prisma Configuration](#prisma-configuration)
7. [Authentication Flow](#authentication-flow)
8. [Data Service Layer](#data-service-layer)
9. [API Routes](#api-routes)
10. [Frontend Integration](#frontend-integration)
11. [Testing & Verification](#testing--verification)
12. [Migration Checklist](#migration-checklist)
13. [Troubleshooting](#troubleshooting)

---

## 📖 Overview

### Current State (Ava App)
```
Supabase
   ├── Authentication ✅
   └── Project Data ❌ (needs to move)
```

### Target State (Customer Portal Pattern)
```
Supabase
   └── Authentication ✅ (login, sessions, user management)

MySQL (Digital Ocean)
   └── Project Data ✅ (customer info, projects, timelines)
```

### Why This Architecture?

✅ **Separation of Concerns:** Auth and data are decoupled  
✅ **Scalability:** MySQL handles large project datasets better  
✅ **Centralized Data:** One source of truth for all apps  
✅ **Flexibility:** Can switch auth providers without affecting data  
✅ **Security:** Row-level auth via email matching

---

## 🏗️ Architecture Comparison

### Before (All Supabase)
```typescript
User Login
    ↓
Supabase Auth
    ↓
Supabase Database (podio_data table)
    ↓
Return Projects
```

### After (Split Architecture)
```typescript
User Login
    ↓
Supabase Auth (gets email)
    ↓
API Route (authenticated)
    ↓
MySQL Database via Prisma
    ↓
Query by email
    ↓
Return Projects
```

---

## ✅ Prerequisites

### Required Packages
```bash
npm install @prisma/client
npm install -D prisma
npm install @supabase/auth-helpers-nextjs
npm install @supabase/supabase-js
```

### Database Access
- [ ] MySQL database credentials from Digital Ocean
- [ ] VPN/IP whitelisting configured (if required)
- [ ] Database connection string
- [ ] Test connection from local machine

---

## 🔐 Environment Variables

### Complete `.env.local` Configuration

```bash
# ==========================================
# SUPABASE AUTHENTICATION (Existing)
# ==========================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# ==========================================
# MYSQL DATABASE (NEW - Add These)
# ==========================================
# Full connection string
DATABASE_URL="mysql://<username>:<password>@<host>:<port>/<database>?ssl-mode=REQUIRED"

# Feature flag to enable MySQL (set to true)
NEXT_PUBLIC_USE_MYSQL=true

# ==========================================
# OPTIONAL: For Local Development/Testing
# ==========================================
# If you want to test with local MySQL first
# DATABASE_URL="mysql://root:password@localhost:3306/aveyo_local"

# ==========================================
# APP CONFIGURATION
# ==========================================
NEXT_PUBLIC_SITE_URL=http://localhost:3000
# or your production URL
# NEXT_PUBLIC_SITE_URL=https://ava-ai-chatbot.vercel.app
```

### Connection String Breakdown

```
mysql://[username]:[password]@[host]:[port]/[database]?[options]
```

**Components:**
- `username`: `velmkg`
- `password`: `<password>`
- `host`: `aveyo-podio-do-user-18015130-0.i.db.ondigitalocean.com`
- `port`: `25060`
- `database`: `avyomkng`
- `options`: `ssl-mode=REQUIRED` (IMPORTANT for Digital Ocean)

### Environment Variable Security

**⚠️ NEVER commit these values to git!**

```gitignore
# .gitignore
.env
.env.local
.env.*.local
```

---

## 🗄️ Database Setup

### 1. Create Prisma Directory

```bash
mkdir prisma
cd prisma
```

### 2. Initialize Prisma

```bash
npx prisma init --datasource-provider mysql
```

### 3. Create `prisma/schema.prisma`

```prisma
// Prisma schema file for Ava App
// MySQL Database hosted on Digital Ocean

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
  relationMode = "prisma"
}

// Main project data table
model ProjectData {
  itemId                      BigInt    @id @map("item_id")
  projectTitle                String?   @map("project-title") @db.Text
  projectId                   String?   @map("project-id")
  sentToSupabaseDate          DateTime? @map("sent-to-supabase-date")
  projectDataUpdatedDate      DateTime? @map("project-data-updated-date")
  lastSync                    DateTime? @map("last-sync")
  customerId                  String?   @map("customer-id")
  projectStatus               String?   @map("project-status")
  milestone                   String?   @db.Text
  fasttrack                   String?
  customerName                String?   @map("customer-name")
  firstName                   String?   @map("first-name")
  lastName                    String?   @map("last-name")
  fullAddress                 String?   @map("full-address") @db.Text
  address                     String?   @db.Text
  city                        String?
  state                       String?
  zip                         String?
  ph                          String?
  email                       String    @db.VarChar(255)
  projectManager              String?   @map("project-manager")
  projectManager2             String?   @map("project-manager-2")
  salesChannelId              String?   @map("sales-channel-id")
  salesRepName                String?   @map("sales-rep-name")
  repDevId                    String?   @map("rep-dev-id")
  salesRepId                  String?   @map("sales-rep-id")
  salesRepEmail               String?   @map("sales-rep-email")
  setterName                  String?   @map("setter-name")
  setterDevId                 String?   @map("setter-dev-id")
  setterId                    String?   @map("setter-id")
  setterEmail                 String?   @map("setter-email")
  utilityCompany              String?   @map("utility-company")
  utilityCompanyDevId         String?   @map("utility-company-dev-id")
  ahj                         String?
  ahjDevId                    String?   @map("ahj-dev-id")
  adders                      String?   @db.Text
  installer                   String?
  installBranch               String?   @map("install-branch")
  contractPrice               Float?    @map("contract-price")
  contractPriceCur            String?   @map("contract-price_cur")
  lender                      String?
  lenderDevId                 String?   @map("lender-dev-id")
  financeId                   String?   @map("finance-id")
  financeType                 String?   @map("finance-type")
  fundingStatus               String?   @map("funding-status")
  grossPpw                    Float?    @map("gross-ppw")
  netPpw                      Float?    @map("net-ppw")
  m1Submitted                 DateTime? @map("m1-submitted")
  m1Approved                  DateTime? @map("m1-approved")
  m1EarnedDate                DateTime? @map("m1-earned-date")
  m1ReceivedDate              DateTime? @map("m1-received-date")
  m2Submitted                 DateTime? @map("m2-submitted")
  m2Approved                  DateTime? @map("m2-approved")
  m2EarnedDate                DateTime? @map("m2-earned-date")
  m2ReceivedDate              DateTime? @map("m2-received-date")
  m3Submitted                 DateTime? @map("m3-submitted")
  m3Approved                  DateTime? @map("m3-approved")
  inverterBrand               String?   @map("inverter-brand")
  inverterModel               String?   @map("inverter-model")
  inverterCount               Int?      @map("inverter-count")
  panelBrand                  String?   @map("panel-brand")
  panelModel                  String?   @map("panel-model")
  panelCount                  Int?      @map("panel-count")
  batteryModel                String?   @map("battery-model")
  batteryCount                Int?      @map("battery-count")
  systemSize                  Float?    @map("system-size")
  estimatedYearlyProduction   Int?      @map("estimated-yearly-production")
  latitude                    Float?
  longitude                   Float?
  vwcStatus                   String?   @map("vwc-status")
  vwcFormUrl                  String?   @map("vwc-form-url") @db.Text
  vwcCompleteDate             DateTime? @map("vwc-complete-date")
  customerSowStatus           String?   @map("customer-sow-status")
  customerSowFormUrl          String?   @map("customer-sow-form-url") @db.Text
  customerSowDueDate          DateTime? @map("customer-sow-due-date")
  customerSowCompleteDate     DateTime? @map("customer-sow-complete-date")
  projectDevId                String?   @map("project-dev-id")
  dataUpdatedTimestamp        DateTime? @map("data-updated-timestamp")
  errors                      String?   @db.Text
  payload                     String?   @db.LongText
  isDeleted                   Boolean   @default(false) @map("is_deleted")
  delCheck                    Int?      @map("del_check")

  @@map("project-data")
  @@index([email])
  @@index([projectId])
}

// Timeline table for milestone data
model Timeline {
  itemId                      BigInt    @id @map("item_id")
  projectTitle                String?   @map("project-title") @db.Text
  projectId                   String?   @map("project-id")
  cancellationDate            DateTime? @map("cancellation-date")
  cancellationReason          String?   @map("cancellation-reason") @db.Text
  contractSigned              DateTime? @map("contract-signed")
  ntpComplete                 DateTime? @map("ntp-complete")
  packetApproval              DateTime? @map("packet-approval")
  siteSurveyStatus            String?   @map("site-survey-status")
  siteSurveyAppointment       DateTime? @map("site-survey-appointment")
  siteSurveyComplete          DateTime? @map("site-survey-complete")
  designStatus                String?   @map("design-status")
  cadComplete                 DateTime? @map("cad-complete")
  engineeringComplete         DateTime? @map("engineering-complete")
  repScopeApprovalStatus      String?   @map("rep-scope-approval-status")
  repScopeApproved            DateTime? @map("rep-scope-approved")
  utilityStatus               String?   @map("utility-status")
  utilityApplicationSubmitted DateTime? @map("utility-application-submitted")
  utilityApplicationApproved  DateTime? @map("utility-application-approved")
  permitStatus                String?   @map("permit-status")
  buildingPermitSubmitted     DateTime? @map("building-permit-submitted")
  buildingPermitApproved      DateTime? @map("building-permit-approved")
  electriclaPermitSubmitted   DateTime? @map("electricla-permit-submitted")
  electricalPermitApproved    DateTime? @map("electrical-permit-approved")
  zoningPermitSubmitted       DateTime? @map("zoning-permit-submitted")
  zoningPermitApproved        DateTime? @map("zoning-permit-approved")
  additionalPermitSubmitted   DateTime? @map("additional-permit-submitted")
  additionalPermitApproved    DateTime? @map("additional-permit-approved")
  allPermitsComplete          DateTime? @map("all-permits-complete")
  equipmentOrdered            DateTime? @map("equipment-ordered")
  installReady                String?   @map("install-ready")
  installReadyDate            DateTime? @map("install-ready-date")
  hoaYesNo                    String?   @map("hoa-yes-no")
  hoaStatus                   String?   @map("hoa-status")
  hoaApprovedDate             DateTime? @map("hoa-approved-date")
  installStageStatus          String?   @map("install-stage-status")
  estimatedInstallDate        DateTime? @map("estimated-install-date")
  installAppointment          DateTime? @map("install-appointment")
  panelInstallComplete        DateTime? @map("panel-install-complete")
  electricalWorkStatus        String?   @map("electrical-work-status")
  mpuComplete                 DateTime? @map("mpu-complete")
  electricalWorkComplete      DateTime? @map("electrical-work-complete")
  installComplete             DateTime? @map("install-complete")
  photoAudit                  String?   @map("photo-audit")
  inspectionStatus            String?   @map("inspection-status")
  ahjInspectionAppointment    DateTime? @map("ahj-inspection-appointment")
  ahjInspectionComplete       DateTime? @map("ahj-inspection-complete")
  ptoStatus                   String?   @map("pto-status")
  ptoSubmitted                DateTime? @map("pto-submitted")
  ptoReceived                 DateTime? @map("pto-received")
  energizeStatus              String?   @map("energize-status")
  systemActive                DateTime? @map("system-active")
  energizeCompleteDate        DateTime? @map("energize-complete-date")
  projectComplete             DateTime? @map("project-complete")
  projectDevId                String?   @map("project-dev-id")
  isDeleted                   Boolean   @default(false) @map("is_deleted")
  delCheck                    Int?      @map("del_check")

  @@map("timeline")
  @@index([itemId])
  @@index([projectId])
}

// Customer SOW table
model CustomerSow {
  itemId                      BigInt    @id @map("item_id")
  title                       String?   @db.Text
  status                      String?
  customerComment             String?   @map("customer-comment") @db.Text
  designDoc                   String?   @map("design-doc") @db.Text
  sendToCustomer              Boolean?  @map("send-to-customer")
  sendEmailToCustomer         Boolean?  @map("send-email-to-customer")
  sentToCustomerDatetime      DateTime? @map("sent-to-customer-datetime")
  customerInformation         String?   @map("customer-information") @db.Text
  systemSpecs                 String?   @map("system-specs") @db.Text
  adders                      String?   @db.Text
  fileAttachmentUrl           String?   @map("file-attachment-url") @db.Text
  createdDate                 DateTime? @map("created-date")
  customerComments            String?   @map("customer-comments") @db.Text
  approveRejectedDate         DateTime? @map("approverejected-date")
  sowSentTimestamp            DateTime? @map("sow-sent-timestamp")
  customerApproval            String?   @map("customer-approval")
  sowApprovedTimestamp        DateTime? @map("sow-approved-timestamp")
  sowRejectionReason          String?   @map("sow-rejection-reason") @db.Text
  rejectionTimestamp          DateTime? @map("rejection-timestamp")
  linkToScopeOfWork           String?   @map("link-to-scope-of-work") @db.Text
  linkToScopeOfWorkIds        String?   @map("link-to-scope-of-work_ids")
  linkToScopeApprovalForm     String?   @map("link-to-scope-approval-form") @db.Text
  linkToScopeApprovalFormIds  String?   @map("link-to-scope-approval-form_ids")
  customerPortalSowStatus     String?   @map("customer-portal-sow-status")
  customerSowDueDate          DateTime? @map("customer-sow-due-date")
  deliveryLocationPhotoUrl    String?   @map("delivery-location-photo-url") @db.Text
  isDeleted                   Boolean   @default(false) @map("is_deleted")
  delCheck                    Int?      @map("del_check")
  linkToWebform               String?   @map("link-to-webform") @db.Text
  customerViewOnlyWebform     String?   @map("customer-view-only-webform") @db.Text
  salesRepViewOnlyWebform     String?   @map("sales-rep-view-only-webform") @db.Text

  @@map("customer-sow")
  @@index([itemId])
}
```

### 4. Generate Prisma Client

```bash
npx prisma generate
```

This creates the TypeScript types for your database.

### 5. Test Database Connection

```bash
npx prisma db pull
```

This verifies connection and syncs schema with database.

---

## 🔧 Prisma Configuration

### Create Prisma Client Singleton

**File:** `lib/mysql/client.ts`

```typescript
// MySQL Prisma Client Instance
// Singleton pattern to prevent connection exhaustion

import { PrismaClient } from '@prisma/client';

// Attach to global object in development for hot reload
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Helper function to check database connection
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$connect();
    console.log('✅ MySQL database connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to MySQL database:', error);
    return false;
  }
}

// Gracefully disconnect on shutdown
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
```

---

## 🔐 Authentication Flow

### Supabase Auth Setup (No Changes Needed)

**File:** `lib/supabase/client.ts`

```typescript
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export const supabase = createClientComponentClient();
```

### Authentication Stays the Same
- ✅ User login through Supabase
- ✅ Session management via Supabase
- ✅ Email/password authentication
- ✅ Magic link authentication
- ✅ OAuth providers (Google, etc.)

**Only Change:** After authentication, use email to query MySQL instead of Supabase tables.

---

## 📦 Data Service Layer

### Create MySQL Data Service

**File:** `lib/mysql/data-service.ts`

```typescript
// MySQL Data Service
// Fetches project data from MySQL using Prisma

import { prisma } from './client';
import type { Prisma } from '@prisma/client';

// Type inference
type ProjectData = Prisma.ProjectDataGetPayload<{}>;

/**
 * Get all projects for a customer by email
 */
export async function getProjects(email: string) {
  try {
    console.log(`[MySQL] Fetching projects for email: "${email}"`);

    // Fetch project data
    const projectsData = await prisma.projectData.findMany({
      where: {
        email: email,
        isDeleted: false,
      },
      orderBy: {
        dataUpdatedTimestamp: 'desc',
      },
    });

    console.log(`[MySQL] Found ${projectsData.length} projects`);

    // Fetch related timeline data for each project
    const projectsWithRelations = await Promise.all(
      projectsData.map(async (project: ProjectData) => {
        const timeline = project.projectId 
          ? await prisma.timeline.findFirst({
              where: {
                projectId: project.projectId,
                isDeleted: false,
              },
            })
          : null;

        const customerSow = await prisma.customerSow.findMany({
          where: {
            itemId: project.itemId,
            isDeleted: false,
          },
        });

        return {
          ...project,
          timeline,
          customerSow,
        };
      })
    );

    // Transform to your app's format
    return projectsWithRelations.map(transformProjectData);
  } catch (error) {
    console.error('[MySQL] Error fetching projects:', error);
    throw error;
  }
}

/**
 * Get single project by ID
 */
export async function getProjectById(id: string) {
  try {
    const project = await prisma.projectData.findUnique({
      where: {
        itemId: BigInt(id),
      },
    });

    if (!project) return null;

    // Fetch related data
    const timeline = project.projectId
      ? await prisma.timeline.findFirst({
          where: {
            projectId: project.projectId,
            isDeleted: false,
          },
        })
      : null;

    return transformProjectData({ ...project, timeline });
  } catch (error) {
    console.error('[MySQL] Error fetching project:', error);
    throw error;
  }
}

/**
 * Transform MySQL data to your app's format
 */
function transformProjectData(data: any) {
  return {
    id: data.itemId.toString(),
    projectId: data.projectId,
    customerName: data.customerName || `${data.firstName} ${data.lastName}`,
    email: data.email,
    address: data.fullAddress || `${data.address}, ${data.city}, ${data.state} ${data.zip}`,
    phone: data.ph,
    systemSize: data.systemSize,
    panelCount: data.panelCount,
    estimatedProduction: data.estimatedYearlyProduction,
    status: data.projectStatus,
    // Timeline data
    installDate: data.timeline?.installComplete,
    ptoReceived: data.timeline?.ptoReceived,
    systemActive: data.timeline?.systemActive,
    // Add more fields as needed for Ava
  };
}
```

### Create Feature Flag Service

**File:** `lib/data-service.ts`

```typescript
// Main Data Service with Feature Flag
// Allows switching between MySQL and Supabase

const USE_MYSQL = process.env.NEXT_PUBLIC_USE_MYSQL !== 'false';

import * as MySQLService from './mysql/data-service';
import * as SupabaseService from './supabase/data-service'; // Your existing service

console.log(`📊 Data Source: ${USE_MYSQL ? 'MySQL' : 'Supabase'}`);

export async function getProjects(email: string) {
  if (USE_MYSQL) {
    console.log('[data-service] Using MySQL');
    return MySQLService.getProjects(email);
  }
  console.log('[data-service] Using Supabase');
  return SupabaseService.getProjects(email);
}

export async function getProjectById(id: string) {
  if (USE_MYSQL) {
    return MySQLService.getProjectById(id);
  }
  return SupabaseService.getProjectById(id);
}

// Add more functions as needed
```

---

## 🛣️ API Routes

### Create Protected API Route

**File:** `app/api/projects/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { getProjects } from '@/lib/data-service';

export async function GET() {
  try {
    // Get authenticated user from Supabase
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userEmail = session.user.email;
    
    if (!userEmail) {
      return NextResponse.json({ error: 'Email not found' }, { status: 400 });
    }
    
    console.log('Fetching projects for:', userEmail);
    
    // Fetch from MySQL using email
    const projects = await getProjects(userEmail);
    
    console.log(`Returning ${projects.length} projects`);
    
    return NextResponse.json(projects);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
```

### Key Points:
1. ✅ Supabase validates session
2. ✅ Extract email from session
3. ✅ Use email to query MySQL
4. ✅ Return data

---

## 💻 Frontend Integration

### Update Your Data Fetching

**Before (Direct Supabase):**
```typescript
const { data } = await supabase
  .from('podio_data')
  .select('*')
  .eq('customer_email', email);
```

**After (API Route):**
```typescript
const response = await fetch('/api/projects');
const projects = await response.json();
```

### Example React Hook

```typescript
// hooks/useProjects.ts
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

export function useProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchProjects() {
      try {
        setLoading(true);
        
        // Check authentication
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          throw new Error('Not authenticated');
        }
        
        // Fetch from API
        const response = await fetch('/api/projects');
        
        if (!response.ok) {
          throw new Error('Failed to fetch projects');
        }
        
        const data = await response.json();
        setProjects(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchProjects();
  }, []);

  return { projects, loading, error };
}
```

---

## 🧪 Testing & Verification

### 1. Test Database Connection

```bash
# Test Prisma connection
npx prisma db pull

# Check if schema matches database
npx prisma validate
```

### 2. Test API Route

```bash
# Start dev server
npm run dev

# Test endpoint (with authentication)
curl http://localhost:3000/api/projects \
  -H "Cookie: sb-access-token=YOUR_TOKEN"
```

### 3. Verify Data Flow

**Add Logging:**
```typescript
console.log('1. User authenticated:', session.user.email);
console.log('2. Querying MySQL for:', userEmail);
console.log('3. Found projects:', projects.length);
console.log('4. Returning data');
```

### 4. Compare Data

Query same email in both systems to verify data matches:

```sql
-- MySQL
SELECT * FROM `project-data` 
WHERE email = 'test@example.com' 
AND is_deleted = false;

-- Supabase
SELECT * FROM podio_data 
WHERE customer_email = 'test@example.com';
```

---

## ✅ Migration Checklist

### Phase 1: Setup (Day 1)
- [ ] Install Prisma packages
- [ ] Add `DATABASE_URL` to `.env.local`
- [ ] Add `NEXT_PUBLIC_USE_MYSQL=false` (keep Supabase for now)
- [ ] Create `prisma/schema.prisma`
- [ ] Run `npx prisma generate`
- [ ] Test connection with `npx prisma db pull`
- [ ] Create `lib/mysql/client.ts`
- [ ] Create `lib/mysql/data-service.ts`

### Phase 2: API Layer (Day 2)
- [ ] Create `lib/data-service.ts` with feature flag
- [ ] Update API routes to use new data service
- [ ] Test API routes return same data
- [ ] Add comprehensive logging
- [ ] Verify authentication still works

### Phase 3: Frontend Update (Day 3)
- [ ] Update data fetching to use API routes
- [ ] Remove direct Supabase database calls
- [ ] Test all pages load correctly
- [ ] Verify all features work

### Phase 4: Switch to MySQL (Day 4)
- [ ] Set `NEXT_PUBLIC_USE_MYSQL=true`
- [ ] Test thoroughly with real users
- [ ] Monitor for errors
- [ ] Compare data quality

### Phase 5: Cleanup (Day 5)
- [ ] Remove Supabase data service (keep auth)
- [ ] Update documentation
- [ ] Remove feature flag (if confident)
- [ ] Deploy to production

---

## 🚨 Troubleshooting

### Connection Issues

**Error:** "Can't reach database server"
```bash
# Check network access
ping aveyo-podio-do-user-18015130-0.i.db.ondigitalocean.com

# Verify SSL requirement
# Make sure connection string has: ?ssl-mode=REQUIRED
```

**Error:** "Access denied"
```bash
# Verify credentials
# Check username and password in DATABASE_URL
# Confirm IP whitelist includes your IP
```

### Prisma Issues

**Error:** "Prisma Client not generated"
```bash
npx prisma generate
```

**Error:** "Schema sync issues"
```bash
npx prisma db pull
npx prisma generate
```

### Data Mismatch

**Check Data Types:**
```typescript
// BigInt fields need conversion
itemId: BigInt → .toString()

// Dates might be strings
installDate: string → new Date(installDate)
```

### Authentication Issues

**Session not found:**
```typescript
// Make sure cookies are being sent
const { data: { session } } = await supabase.auth.getSession();
console.log('Session:', session); // Should not be null
```

---

## 📚 Additional Resources

### Official Documentation
- [Prisma MySQL Guide](https://www.prisma.io/docs/getting-started/setup-prisma/start-from-scratch/relational-databases/connect-your-database-typescript-mysql)
- [Supabase Auth Helpers](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)
- [Digital Ocean MySQL](https://docs.digitalocean.com/products/databases/mysql/)

### Customer Portal Reference
- Check `src/lib/mysql/` for full implementation
- Review `src/app/api/projects/route.ts` for API patterns
- See `src/context/ProjectsContext.tsx` for React patterns

---

## 🎯 Quick Start Commands

```bash
# 1. Install dependencies
npm install @prisma/client
npm install -D prisma

# 2. Initialize Prisma
npx prisma init --datasource-provider mysql

# 3. Add DATABASE_URL to .env.local
echo 'DATABASE_URL="mysql://<username>:<password>@<host>:<port>/<database>?ssl-mode=REQUIRED"' >> .env.local

# 4. Generate Prisma Client
npx prisma generate

# 5. Test connection
npx prisma db pull

# 6. Start development
npm run dev
```

---

## 💡 Best Practices

1. **Always use email for queries** - It's the unique identifier across both systems
2. **Keep authentication in Supabase** - Don't move user auth to MySQL
3. **Use feature flags** - Allow easy rollback during migration
4. **Add extensive logging** - Debug issues quickly
5. **Test with real data** - Verify transformations work correctly
6. **Handle BigInt carefully** - Convert to string for IDs
7. **Check isDeleted flag** - Filter out deleted records
8. **Use singleton pattern** - Prevent connection exhaustion

---

## 📧 Support

If you encounter issues:
1. Check logs in console
2. Verify environment variables
3. Test database connection
4. Compare with customer portal code
5. Reach out to team for help

---

**Last Updated:** February 7, 2026  
**Author:** Aveyo Development Team  
**For:** Ava AI Chatbot Migration
