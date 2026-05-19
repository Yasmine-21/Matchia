# MATCHIA SAAS PLATFORM - DATABASE DESIGN EXTRACTION
## Comprehensive Analysis from Frontend DTOs, Types, and UI

---

## A. DOMAIN ANALYSIS

### Functional Domains Identified:

1. **Authentication & Authorization**
   - User management with role-based access
   - Multi-tenant isolation by bank
   - Demo account support

2. **Tenant Management (Banks)**
   - Bank registration and onboarding
   - Bank status lifecycle (pending → active → suspended)
   - Bank metadata and statistics

3. **Branding & Customization**
   - Per-bank visual branding (colors, logos, images)
   - Per-bank content customization (homepage, welcome text, footer)
   - Bank marketplace theming

4. **Global Catalog**
   - Global stores (Vehicle, Mobile, Medical, Real-Estate, etc.)
   - Global modules (Simulator, Comparator, Blog, Ads, Matchia Bot, etc.)
   - Catalog management by SaaS Admin

5. **Tenant Configuration**
   - Bank activation/deactivation of stores
   - Bank activation/deactivation of modules per store
   - Visibility and enabled/disabled flags

6. **Request Management**
   - Bank join requests (new tenant onboarding)
   - Store activation requests
   - Module activation requests
   - Request approval workflow with priority levels

7. **User Management**
   - Platform admins (SUPER_ADMIN)
   - Bank admins (ADMIN role)
   - Bank managers (MANAGER role)
   - Bank users (USER role)
   - Per-bank user isolation

8. **Marketplace Front-Office**
   - Bank-specific marketplace
   - Store browsing and filtering
   - Module execution (Simulator, Comparator, Blog, Ads, Bot)
   - Loan offers and financing products (implied by UI showing "Popular Offers")

9. **Analytics & Monitoring**
   - Usage counts per store/module
   - User statistics per bank
   - Request statistics

---

## B. PROPOSED DATABASE TABLES

### TABLE: users
**Purpose:** Store all users (Super Admin, Bank Admins, Managers, End Users) with role-based access control and tenant isolation.

**Columns:**
- `id` : UUID [PRIMARY KEY]
- `name` : VARCHAR(255) NOT NULL
- `email` : VARCHAR(255) UNIQUE NOT NULL
- `password_hash` : VARCHAR(255) [nullable - for demo accounts]
- `role` : ENUM('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'USER') NOT NULL
- `bank_id` : UUID [FOREIGN KEY → banks.id] [nullable - NULL for SUPER_ADMIN]
- `status` : ENUM('active', 'inactive') NOT NULL DEFAULT 'active'
- `created_at` : TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
- `updated_at` : TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
- `created_by` : UUID [FOREIGN KEY → users.id] [nullable]
- `updated_by` : UUID [FOREIGN KEY → users.id] [nullable]

**Constraints:**
- UNIQUE(email)
- CHECK(role = 'SUPER_ADMIN' OR bank_id IS NOT NULL) -- SUPER_ADMIN has no bank_id
- INDEX ON (bank_id, status)
- INDEX ON (email)
- INDEX ON (role)

**Relationships:**
- FOREIGN KEY (bank_id) → banks.id
- FOREIGN KEY (created_by) → users.id
- FOREIGN KEY (updated_by) → users.id
- One User can have many bank users (if created_by/updated_by)

---

### TABLE: banks
**Purpose:** Store tenant information - each bank is a separate tenant in the SaaS platform.

**Columns:**
- `id` : UUID [PRIMARY KEY]
- `name` : VARCHAR(255) NOT NULL
- `slug` : VARCHAR(100) UNIQUE NOT NULL
- `logo_url` : TEXT [nullable]
- `country` : VARCHAR(100) NOT NULL
- `description` : TEXT [nullable]
- `website_url` : VARCHAR(255) [nullable]
- `established_year` : INTEGER [nullable]
- `status` : ENUM('pending', 'active', 'suspended') NOT NULL DEFAULT 'pending'
- `total_users` : INTEGER NOT NULL DEFAULT 0
- `rating` : DECIMAL(3,2) [nullable] DEFAULT 0.0
- `created_at` : TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
- `updated_at` : TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
- `created_by` : UUID [FOREIGN KEY → users.id]
- `updated_by` : UUID [FOREIGN KEY → users.id] [nullable]

**Constraints:**
- UNIQUE(slug)
- INDEX ON (status)
- INDEX ON (country)
- INDEX ON (created_at)

**Relationships:**
- FOREIGN KEY (created_by) → users.id
- FOREIGN KEY (updated_by) → users.id
- One Bank has Many Users (users.bank_id)
- One Bank has One BankBranding (1:1)
- One Bank has Many BankStores (1:N)
- One Bank has Many BankStoreModules through BankStores

---

### TABLE: bank_brandings
**Purpose:** Store per-bank branding and customization for front-office marketplace - colors, content, images, themes.

**Columns:**
- `id` : UUID [PRIMARY KEY]
- `bank_id` : UUID UNIQUE NOT NULL [FOREIGN KEY → banks.id]
- `primary_color` : VARCHAR(7) NOT NULL (hex color)
- `secondary_color` : VARCHAR(7) NOT NULL (hex color)
- `homepage_title` : VARCHAR(500) NOT NULL
- `welcome_text` : TEXT NOT NULL
- `banner_image_url` : TEXT [nullable]
- `footer_text` : TEXT NOT NULL
- `logo_image_url` : TEXT [nullable]
- `created_at` : TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
- `updated_at` : TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
- `created_by` : UUID [FOREIGN KEY → users.id]
- `updated_by` : UUID [FOREIGN KEY → users.id] [nullable]

**Constraints:**
- UNIQUE(bank_id)
- FOREIGN KEY (bank_id) → banks.id ON DELETE CASCADE
- INDEX ON (bank_id)

**Relationships:**
- FOREIGN KEY (bank_id) → banks.id (1:1)
- FOREIGN KEY (created_by) → users.id
- FOREIGN KEY (updated_by) → users.id

---

### TABLE: stores (GLOBAL CATALOG)
**Purpose:** Global catalog of available stores for all banks. SaaS Admin manages these. Each bank can enable/disable them independently.

**Columns:**
- `id` : UUID [PRIMARY KEY]
- `name` : VARCHAR(100) UNIQUE NOT NULL (e.g., 'vehicle', 'mobile', 'medical')
- `label` : VARCHAR(255) NOT NULL (e.g., 'Véhicule', 'Mobile', 'Médical')
- `description` : TEXT [nullable]
- `icon` : VARCHAR(100) [nullable] (icon name or key: 'Car', 'Smartphone', 'Heart', 'Home')
- `status` : ENUM('active', 'inactive') NOT NULL DEFAULT 'active'
- `usage_count` : INTEGER NOT NULL DEFAULT 0
- `created_at` : TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
- `updated_at` : TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
- `created_by` : UUID [FOREIGN KEY → users.id]
- `updated_by` : UUID [FOREIGN KEY → users.id] [nullable]

**Constraints:**
- UNIQUE(name)
- INDEX ON (status)

**Relationships:**
- FOREIGN KEY (created_by) → users.id
- FOREIGN KEY (updated_by) → users.id
- One Store has Many BankStores (1:N)
- One Store has Many Modules through StoreModules (N:M via store_modules)

---

### TABLE: modules (GLOBAL CATALOG)
**Purpose:** Global catalog of available modules for all stores. SaaS Admin manages these. Each bank can enable/disable them per store.

**Columns:**
- `id` : UUID [PRIMARY KEY]
- `name` : VARCHAR(100) UNIQUE NOT NULL (e.g., 'simulator', 'comparator', 'blog', 'ads', 'bot')
- `label` : VARCHAR(255) NOT NULL (e.g., 'Simulateur', 'Comparateur', 'Blog')
- `description` : TEXT [nullable]
- `icon` : VARCHAR(100) [nullable] (icon name: 'Calculator', 'BarChart3', 'FileText', 'Target', 'Bot')
- `status` : ENUM('active', 'inactive') NOT NULL DEFAULT 'active'
- `usage_count` : INTEGER NOT NULL DEFAULT 0
- `created_at` : TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
- `updated_at` : TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
- `created_by` : UUID [FOREIGN KEY → users.id]
- `updated_by` : UUID [FOREIGN KEY → users.id] [nullable]

**Constraints:**
- UNIQUE(name)
- INDEX ON (status)

**Relationships:**
- FOREIGN KEY (created_by) → users.id
- FOREIGN KEY (updated_by) → users.id
- One Module has Many StoreModules (1:N)
- One Module has Many BankStoreModules (1:N)

---

### TABLE: store_modules (GLOBAL MANY-TO-MANY)
**Purpose:** Define which modules are available for each store at the global catalog level (NOT tenant-specific). This junction table controls the store→modules hierarchy.

**Columns:**
- `id` : UUID [PRIMARY KEY]
- `store_id` : UUID NOT NULL [FOREIGN KEY → stores.id]
- `module_id` : UUID NOT NULL [FOREIGN KEY → modules.id]
- `display_order` : INTEGER [nullable]
- `created_at` : TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP

**Constraints:**
- UNIQUE(store_id, module_id)
- FOREIGN KEY (store_id) → stores.id ON DELETE CASCADE
- FOREIGN KEY (module_id) → modules.id ON DELETE CASCADE
- INDEX ON (store_id)
- INDEX ON (module_id)

**Relationships:**
- Many-to-Many between stores and modules
- FOREIGN KEY (store_id) → stores.id
- FOREIGN KEY (module_id) → modules.id

---

### TABLE: bank_stores (TENANT-SPECIFIC MANY-TO-MANY CONFIG)
**Purpose:** Track which stores are assigned/activated for a specific bank. Stores the activation status and visibility per bank. This is where tenant configuration happens.

**Columns:**
- `id` : UUID [PRIMARY KEY]
- `bank_id` : UUID NOT NULL [FOREIGN KEY → banks.id]
- `store_id` : UUID NOT NULL [FOREIGN KEY → stores.id]
- `enabled` : BOOLEAN NOT NULL DEFAULT false
- `visible` : BOOLEAN NOT NULL DEFAULT false
- `activated_at` : TIMESTAMP [nullable]
- `deactivated_at` : TIMESTAMP [nullable]
- `created_at` : TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
- `updated_at` : TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
- `created_by` : UUID [FOREIGN KEY → users.id]
- `updated_by` : UUID [FOREIGN KEY → users.id] [nullable]

**Constraints:**
- UNIQUE(bank_id, store_id)
- FOREIGN KEY (bank_id) → banks.id ON DELETE CASCADE
- FOREIGN KEY (store_id) → stores.id
- CHECK(visible = false OR enabled = true) -- visible implies enabled
- INDEX ON (bank_id, enabled)
- INDEX ON (bank_id, visible)

**Relationships:**
- Many-to-Many between banks and stores
- FOREIGN KEY (bank_id) → banks.id
- FOREIGN KEY (store_id) → stores.id
- One BankStore has Many BankStoreModules (1:N)

---

### TABLE: bank_store_modules (TENANT-SPECIFIC MODULE CONFIG)
**Purpose:** Track module activation for a specific bank's specific store. Stores whether a module is enabled/visible per bank-store combination.

**Columns:**
- `id` : UUID [PRIMARY KEY]
- `bank_store_id` : UUID NOT NULL [FOREIGN KEY → bank_stores.id]
- `module_id` : UUID NOT NULL [FOREIGN KEY → modules.id]
- `enabled` : BOOLEAN NOT NULL DEFAULT false
- `visible` : BOOLEAN NOT NULL DEFAULT false
- `activated_at` : TIMESTAMP [nullable]
- `deactivated_at` : TIMESTAMP [nullable]
- `created_at` : TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
- `updated_at` : TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
- `created_by` : UUID [FOREIGN KEY → users.id]
- `updated_by` : UUID [FOREIGN KEY → users.id] [nullable]

**Constraints:**
- UNIQUE(bank_store_id, module_id)
- FOREIGN KEY (bank_store_id) → bank_stores.id ON DELETE CASCADE
- FOREIGN KEY (module_id) → modules.id
- CHECK(visible = false OR enabled = true)
- INDEX ON (bank_store_id, enabled)
- INDEX ON (bank_store_id, visible)

**Relationships:**
- FOREIGN KEY (bank_store_id) → bank_stores.id
- FOREIGN KEY (module_id) → modules.id

---

### TABLE: requests
**Purpose:** Track all request types: bank join requests, store activation requests, module activation requests. Supports approval workflow.

**Columns:**
- `id` : UUID [PRIMARY KEY]
- `request_type` : ENUM('join', 'store', 'module') NOT NULL
- `status` : ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending'
- `priority` : ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium'
- `bank_id` : UUID [FOREIGN KEY → banks.id] [nullable - NULL for 'join' requests of new banks]
- `store_id` : UUID [FOREIGN KEY → stores.id] [nullable - for 'store' type requests]
- `module_id` : UUID [FOREIGN KEY → modules.id] [nullable - for 'module' type requests]
- `created_by` : UUID NOT NULL [FOREIGN KEY → users.id]
- `approved_by` : UUID [FOREIGN KEY → users.id] [nullable]
- `approval_date` : TIMESTAMP [nullable]
- `rejection_reason` : TEXT [nullable]
- `notes` : TEXT [nullable]
- `created_at` : TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
- `updated_at` : TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP

**Constraints:**
- FOREIGN KEY (bank_id) → banks.id ON DELETE SET NULL
- FOREIGN KEY (store_id) → stores.id ON DELETE SET NULL
- FOREIGN KEY (module_id) → modules.id ON DELETE SET NULL
- FOREIGN KEY (created_by) → users.id
- FOREIGN KEY (approved_by) → users.id
- CHECK(request_type = 'join' OR bank_id IS NOT NULL) -- non-join requests must have bank_id
- CHECK(request_type = 'store' OR store_id IS NULL)
- CHECK(request_type = 'module' OR module_id IS NULL)
- CHECK(status != 'approved' OR approved_by IS NOT NULL)
- INDEX ON (status)
- INDEX ON (request_type)
- INDEX ON (bank_id, status)
- INDEX ON (created_at)

**Relationships:**
- FOREIGN KEY (bank_id) → banks.id
- FOREIGN KEY (store_id) → stores.id
- FOREIGN KEY (module_id) → modules.id
- FOREIGN KEY (created_by) → users.id
- FOREIGN KEY (approved_by) → users.id

---

## C. RELATIONSHIPS

### One-to-One Relationships:
1. **Bank ↔ BankBranding** (1:1)
   - Each bank has exactly one branding configuration
   - Foreign key: bank_branding.bank_id → banks.id (UNIQUE)

### One-to-Many Relationships:
1. **Bank → Users** (1:N)
   - Each bank has many users
   - Foreign key: users.bank_id → banks.id

2. **Bank → BankStores** (1:N)
   - Each bank can have many stores assigned
   - Foreign key: bank_stores.bank_id → banks.id

3. **Store → BankStores** (1:N)
   - Each global store can be assigned to many banks
   - Foreign key: bank_stores.store_id → stores.id

4. **BankStore → BankStoreModules** (1:N)
   - Each bank-store assignment has many module configurations
   - Foreign key: bank_store_modules.bank_store_id → bank_stores.id

5. **Module → BankStoreModules** (1:N)
   - Each module can be configured for many bank-stores
   - Foreign key: bank_store_modules.module_id → modules.id

6. **User → Requests (created_by)** (1:N)
   - Each user can create many requests
   - Foreign key: requests.created_by → users.id

7. **User → Requests (approved_by)** (1:N)
   - Each user (admin) can approve many requests
   - Foreign key: requests.approved_by → users.id

### Many-to-Many Relationships:

1. **Stores ↔ Modules** (via store_modules junction table)
   - Many stores can have many modules
   - Many modules can be assigned to many stores
   - Junction table: store_modules (store_id, module_id)

2. **Banks ↔ Stores** (via bank_stores junction table)
   - Many banks can use many stores (with configuration)
   - Many stores can be activated in many banks
   - Junction table: bank_stores (bank_id, store_id, enabled, visible)

3. **Banks ↔ Modules** (indirectly via BankStores → BankStoreModules → Modules)
   - Each bank can have modules enabled per store
   - Not a direct M:N but mediated through the store context

### Junction Tables:
1. **store_modules** - Global store-module assignments
2. **bank_stores** - Tenant-specific store activation (with configuration)
3. **bank_store_modules** - Tenant-specific module activation per store (with configuration)

---

## D. MULTI-TENANT STRUCTURE

### Global Tables (Shared across all tenants):
- `stores` - Global catalog of stores
- `modules` - Global catalog of modules
- `store_modules` - Global store-module assignments
- `users` - Contains all users (including SUPER_ADMIN)

### Tenant-Specific Tables (Have bank_id or derived tenant context):
- `banks` - Tenant definition itself
- `bank_brandings` - Per-bank branding/customization
- `bank_stores` - Per-bank store activation
- `bank_store_modules` - Per-bank module activation per store

### Shared Tables with Tenant Context:
- `users` - Has bank_id for bank users; NULL for SUPER_ADMIN
- `requests` - Has bank_id to track requests per bank

### Data Isolation Strategy:

**For SaaS Admin (SUPER_ADMIN):**
- Can see ALL stores and modules (global catalog)
- Can see ALL banks
- Can see ALL users across all banks
- Can create/approve/reject requests

**For Bank Admin (ADMIN/MANAGER):**
- Can ONLY see stores/modules assigned to their bank (via bank_stores + bank_store_modules)
- Can ONLY see users in their bank (users WHERE bank_id = current_bank_id)
- Can create requests for additional stores/modules
- Cannot see other banks' data

**Query Pattern for Multi-Tenancy:**
```sql
-- Get stores available to a bank
SELECT s.* FROM stores s
INNER JOIN bank_stores bs ON s.id = bs.store_id
WHERE bs.bank_id = ? AND bs.enabled = true;

-- Get modules for a bank's store
SELECT m.* FROM modules m
INNER JOIN bank_store_modules bsm ON m.id = bsm.module_id
INNER JOIN bank_stores bs ON bsm.bank_store_id = bs.id
WHERE bs.bank_id = ? AND bs.store_id = ? AND bsm.enabled = true;

-- Enforce user access
SELECT * FROM users WHERE bank_id = ? OR role = 'SUPER_ADMIN';
```

### Separation of Concerns:
- **stores & modules tables** = Global platform catalog (managed by SaaS)
- **store_modules table** = Global assignments (which modules go with which stores)
- **bank_stores table** = Tenant decisions (which stores does THIS bank want)
- **bank_store_modules table** = Tenant module decisions (which modules for THIS bank's stores)

This allows:
- SaaS can manage global catalog independently
- Banks can enable/disable items independently
- Full tenant isolation with no data leakage
- Flexible catalog expansion without affecting existing banks

---

## E. ENUMS / STATUS FIELDS

### User Roles:
```
SUPER_ADMIN  → Platform administrator, full access to all tenants
ADMIN        → Bank administrator, full access to assigned bank only
MANAGER      → Bank manager, limited access to assigned bank
USER         → Bank end-user, no admin access
```

### Bank Status:
```
pending     → New bank, awaiting approval and setup
active      → Bank is active and can use platform
suspended   → Bank is temporarily suspended (non-payment, violations, etc.)
```

### Store Status:
```
active      → Store is available in global catalog
inactive    → Store is disabled globally (no bank can use it)
```

### Module Status:
```
active      → Module is available in global catalog
inactive    → Module is disabled globally (no bank can use it)
```

### Request Status:
```
pending     → Request awaiting approval
approved    → Request has been approved by SUPER_ADMIN
rejected    → Request has been rejected with reason
```

### Request Type:
```
join        → Bank application to join platform
store       → Bank request to activate a new store
module      → Bank request to activate a new module for a store
```

### Request Priority:
```
low         → Can be processed in standard time
medium      → Should be processed within 24 hours
high        → Urgent, should be processed ASAP
```

### User Status:
```
active      → User account is active and can login
inactive    → User account is deactivated (soft delete)
```

### BankStore Enabled/Visible:
```
enabled     → Store is operational for this bank
visible     → Store is visible in marketplace (only if enabled=true)
```

### BankStoreModule Enabled/Visible:
```
enabled     → Module is operational for this bank-store
visible     → Module is shown in store (only if enabled=true)
```

---

## F. AUDIT & OPERATIONAL FIELDS

### Present in Most Tables:
- `created_at` : TIMESTAMP - When record was created
- `updated_at` : TIMESTAMP - When record was last modified
- `created_by` : UUID FK → users.id - Who created it
- `updated_by` : UUID FK → users.id - Who last modified it

### Soft Deletes:
- Not explicitly used in DTOs, but recommend for:
  - Users (use `status` flag instead)
  - Banks (use `status` field instead)
  - Stores/Modules (use `status` field instead)
  - Historical requests (keep all records, use `status`)

### Tracking Specific Events:
- **bank_stores.activated_at** - When bank activated this store
- **bank_stores.deactivated_at** - When bank deactivated this store
- **bank_store_modules.activated_at** - When bank activated this module
- **bank_store_modules.deactivated_at** - When bank deactivated this module
- **requests.approval_date** - When request was approved
- **requests.rejection_reason** - Why request was rejected

---

## G. INDEXES FOR PERFORMANCE

### Critical Indexes:
```
-- User queries
INDEX(users, bank_id, status)
INDEX(users, email) -- UNIQUE already indexes this
INDEX(users, role)

-- Bank queries
INDEX(banks, status)
INDEX(banks, country)
INDEX(banks, created_at)
INDEX(banks, slug) -- UNIQUE already indexes this

-- Tenant-specific queries
INDEX(bank_stores, bank_id, enabled)
INDEX(bank_stores, bank_id, visible)
INDEX(bank_store_modules, bank_store_id, enabled)
INDEX(bank_store_modules, bank_store_id, visible)

-- Request queries
INDEX(requests, status)
INDEX(requests, request_type)
INDEX(requests, bank_id, status)
INDEX(requests, created_at)

-- Catalog queries
INDEX(stores, status)
INDEX(modules, status)
```

---

## H. FINAL CONSOLIDATED TABLE LIST

### AUTHENTICATION & USERS (2 tables)
1. **users** - All users (Super Admin, Bank Admins, Bank Users)
2. **N/A** (Password reset/sessions handled by auth system, not DB)

### TENANT MANAGEMENT (2 tables)
1. **banks** - Bank tenant definitions
2. **bank_brandings** - Per-bank branding and customization (1:1 with banks)

### GLOBAL CATALOG (3 tables)
1. **stores** - Global store catalog
2. **modules** - Global module catalog
3. **store_modules** - Global store-module assignments (M:N junction)

### TENANT CONFIGURATION (2 tables)
1. **bank_stores** - Bank-specific store activation/configuration (M:N junction)
2. **bank_store_modules** - Bank-specific module activation per store (M:N junction)

### REQUEST MANAGEMENT (1 table)
1. **requests** - All requests (join, store, module) with approval workflow

---

## TOTAL: 11 CORE TABLES

### Optional Tables (Not in DTOs but could be useful):

**Optional: analytics / activity_logs**
- Track usage, API calls, user activity per bank

**Optional: bank_offers**
- For loan offers shown in "Popular Offers" section in MarketplaceStore
- Fields: id, bank_id, store_id, title, description, rate, duration, created_at, updated_at

**Optional: bank_ads**
- For promotional content in ads module
- Fields: id, bank_id, store_id, title, image_url, link, active, created_at, updated_at

**Optional: user_notifications / email_logs**
- For notification history and email tracking

---

## SUMMARY TABLE STRUCTURE

```
USERS & AUTH (Shared)
├── users (id, name, email, role, bank_id, status, created_at, updated_at, created_by, updated_by)

TENANT MANAGEMENT (Per-tenant + shared)
├── banks (id, name, slug, logo_url, country, description, website_url, established_year, status, total_users, rating, created_at, updated_at, created_by, updated_by)
└── bank_brandings (id, bank_id [UNIQUE], primary_color, secondary_color, homepage_title, welcome_text, banner_image_url, footer_text, logo_image_url, created_at, updated_at, created_by, updated_by)

GLOBAL CATALOG (Shared)
├── stores (id, name [UNIQUE], label, description, icon, status, usage_count, created_at, updated_at, created_by, updated_by)
├── modules (id, name [UNIQUE], label, description, icon, status, usage_count, created_at, updated_at, created_by, updated_by)
└── store_modules (id, store_id [FK], module_id [FK], display_order, created_at) [M:N JUNCTION]

TENANT CONFIGURATION (Per-tenant)
├── bank_stores (id, bank_id [FK], store_id [FK], enabled, visible, activated_at, deactivated_at, created_at, updated_at, created_by, updated_by) [M:N JUNCTION]
└── bank_store_modules (id, bank_store_id [FK], module_id [FK], enabled, visible, activated_at, deactivated_at, created_at, updated_at, created_by, updated_by) [M:N JUNCTION]

REQUEST MANAGEMENT (Shared)
└── requests (id, request_type [ENUM], status [ENUM], priority [ENUM], bank_id [FK], store_id [FK], module_id [FK], created_by [FK], approved_by [FK], approval_date, rejection_reason, notes, created_at, updated_at)
```

---

## ENTITY RELATIONSHIP DIAGRAM (Text)

```
                              users
                               |
                  (SUPER_ADMIN is null bank_id)
                               |
                    (bank users have bank_id)
                               |
                ┌──────────────┴──────────────┐
                |                             |
             banks                      (created_by FK)
                |
                ├── bank_brandings (1:1)
                |
                ├── bank_stores (1:N) ─────► stores (global catalog)
                |        |                      |
                |        |                      ├── store_modules ──► modules
                |        |                      |
                |   bank_store_modules (1:N)   (global)
                |        |
                └────────┴──► modules (global catalog)

            requests
              |
              ├── bank_id ──► banks
              ├── store_id ──► stores
              ├── module_id ──► modules
              ├── created_by ──► users
              └── approved_by ──► users
```

---

## VALIDATION RULES & CONSTRAINTS

1. **SUPER_ADMIN users:** bank_id MUST be NULL
2. **Non-SUPER_ADMIN users:** bank_id MUST NOT be NULL
3. **BankStore visibility:** visible=true ONLY if enabled=true
4. **BankStoreModule visibility:** visible=true ONLY if enabled=true
5. **Non-join requests:** MUST have bank_id
6. **Store requests:** MUST have store_id
7. **Module requests:** MUST have module_id
8. **Approved requests:** MUST have approved_by user
9. **Each bank-store pair:** UNIQUE combination (no duplicates)
10. **Each bank-store-module trio:** UNIQUE combination (no duplicates)

---

## SCALING CONSIDERATIONS

1. **Partitioning:** Consider partitioning requests and bank_stores by bank_id for large datasets
2. **Archive:** Old requests (>1 year) can be archived to separate tables
3. **Read Replicas:** Put heavy analytics queries on read replicas
4. **Caching:** Cache global catalog (stores, modules) - rarely changes
5. **Denormalization:** Consider caching total_users count in banks table (updated async)

---

END OF DATABASE DESIGN EXTRACTION
