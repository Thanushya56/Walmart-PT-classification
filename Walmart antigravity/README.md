# Walmart PT Classification Library — Enterprise Workspace

Enterprise multi-tenant classification reference archive and collaboration workspace with Role-Based Access Control (**Admin**, **Editor**, **Viewer**), cryptographically secure team invitation system, smart perceptual image search, and official Walmart Product Type taxonomy (6,980+ PTs).

---

## Architecture & Features

1. **Role-Based Access Control (RBAC)**
   - **ADMIN (Workspace Owner)**: Complete control over the workspace, products, PT groups, users, invitations, and permissions. Permanent workspace owner protection: database trigger `prevent_last_admin_removal` actively prevents deleting or demoting the only admin.
   - **EDITOR**: Contributor role. Allowed to upload single or bulk products, paste images for visual classification, edit existing product names and PTs, and record classification notes. Restricted from inviting users, deleting products, changing permissions, or accessing workspace settings.
   - **VIEWER**: Read-only reference library access. Allowed to browse PT groups, view product galleries, search products and PT names, filter categories, and paste images for visual similarity matching. All mutation operations (add, edit, delete, export) are strictly blocked at the backend API with HTTP 403 Forbidden.

2. **Secure Team Invitation System**
   - Cryptographically random 24-byte hex tokens hashed using **SHA-256** before database storage (`invitation_token_hash`).
   - Raw tokens are never exposed in plaintext in the database.
   - Invitations expire automatically after 7 days (configurable in Admin Settings).
   - Only the designated email address can accept the invitation.
   - Teammate accounts are not created or granted permissions until the invitation is accepted.
   - Admin can review Pending, Accepted, Expired, and Cancelled invitations, resend invitations, or revoke pending invitations at any time.

3. **Smart Image Search & Visual Classification**
   - **Ctrl + V Clipboard Paste**: Paste product photos directly from clipboard anywhere on the screen.
   - **Exact & Similar Image Matching**: Perceptual hashing and difference hashing (`dHash`) against the workspace catalog.
   - **Previous PT Recommendation**: Returns matched items and previously classified PTs with confidence ratings.

4. **Official Walmart Taxonomy**
   - Seeded with 6,980+ official Walmart Product Types, categories, families, and detailed definition text parsed from `D:\Walmart files\Taxonomy csv.csv`.

---

## Directory Structure

```
d:\Walmart antigravity\
├── dist/                              # Compiled production SPA assets
├── server/
│   ├── api.js                         # REST API server & static asset host
│   ├── db.js                          # RBAC engine, data store & audit logger
│   ├── imageSearch.js                 # Perceptual hasher & image similarity engine
│   ├── index.js                       # Main server entrypoint
│   └── taxonomy.js                    # Walmart taxonomy indexer (6,980+ PTs)
├── src/
│   ├── components/
│   │   ├── ConfirmModal.jsx           # Destruction confirmation modal
│   │   ├── InviteModal.jsx            # Teammate email invitation dialog
│   │   ├── Navbar.jsx                 # Header bar with search & role pill
│   │   ├── RoleBadge.jsx              # Admin / Editor / Viewer badges
│   │   └── Sidebar.jsx                # Collapsible enterprise navigation
│   ├── pages/
│   │   ├── AcceptInvitation.jsx       # Teammate onboarding invitation landing
│   │   ├── AddProduct.jsx             # Single product intake with Ctrl+V paste
│   │   ├── Categories.jsx             # Walmart retail categories explorer
│   │   ├── ClassificationHistory.jsx  # Audit log of PT decisions
│   │   ├── ImportExport.jsx           # CSV bulk upload and dataset export
│   │   ├── MyProfile.jsx              # User identity & permission matrix
│   │   ├── Overview.jsx               # Main executive KPI dashboard
│   │   ├── ProductLibrary.jsx         # Catalog table with filters & actions
│   │   ├── PtGroups.jsx               # Visual gallery grouped by Walmart PT
│   │   ├── SmartImageSearch.jsx       # Visual similarity matching engine
│   │   └── WorkspaceSettings.jsx      # Admin control panel & storage quotas
│   ├── services/
│   │   └── api.js                     # Unified frontend client API
│   ├── App.jsx                        # Root SPA router
│   ├── index.css                      # Tailwind base styling & scrollbars
│   ├── main.jsx                       # Application bootstrap
│   └── tailwind-built.css             # Compiled Tailwind production CSS
├── supabase/
│   ├── functions/
│   │   ├── accept-invitation/index.ts # Deno serverless edge function for acceptance
│   │   └── invite-member/index.ts     # Deno serverless edge function for invitation
│   └── migrations/
│       ├── 20260224_initial_schema.sql    # Full PostgreSQL schema with RLS & triggers
│       └── 20260224_storage_policies.sql  # Supabase storage bucket policies
├── tests/
│   └── rbac_security.test.js          # 31 automated security & permission tests
├── .env.example                       # Environment configuration template
├── package.json                       # Scripts and dependencies
├── start.bat                          # One-click Windows startup script
├── test.bat                           # One-click test runner
├── tailwind.config.js                 # Dark theme design system configuration
└── vite.config.js                     # Vite build configuration
```

---

## Quick Start (Local Run)

### 1. Launch the Server
Double-click `start.bat` or execute in PowerShell:
```powershell
$env:ELECTRON_RUN_AS_NODE = "1"
$env:NODE_PATH = "C:\Users\Dell\AppData\Local\Programs\Antigravity IDE\resources\app\node_modules"
$node = "C:\Users\Dell\AppData\Local\Programs\Antigravity IDE\Antigravity IDE.exe"
& $node server/index.js
```

The unified server will start on:
```
http://localhost:3001
```
Open `http://localhost:3001` in your browser.

### 2. Run the Security & Permission Test Suite
Double-click `test.bat` or run:
```powershell
$env:ELECTRON_RUN_AS_NODE = "1"
$env:NODE_PATH = "C:\Users\Dell\AppData\Local\Programs\Antigravity IDE\resources\app\node_modules"
$node = "C:\Users\Dell\AppData\Local\Programs\Antigravity IDE\Antigravity IDE.exe"
& $node tests/rbac_security.test.js
```
Expected output: **31 PASSED, 0 FAILED**.

---

## Supabase Setup & Production Cloud Deployment

### 1. Run Database Migrations
1. Log in to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Create a new project (e.g. `walmart-pt-classification`).
3. Open **SQL Editor** from the left navigation.
4. Copy and execute the contents of:
   ```
   supabase/migrations/20260224_initial_schema.sql
   ```
5. Next, execute the contents of:
   ```
   supabase/migrations/20260224_storage_policies.sql
   ```
This provisions:
- `profiles`, `workspaces`, `workspace_members`, `workspace_invitations`, `categories`, `product_types`, `products`, `product_images`, `classification_history`, `activity_logs`.
- Row Level Security (RLS) policies on every table.
- Trigger `prevent_last_admin_removal` to protect the workspace owner.
- Storage bucket `product-images` with member upload policies.

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your Supabase credentials:
```env
PORT=3001
APP_URL=https://your-domain.com

VITE_SUPABASE_URL=https://<your-project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key-keep-private>
```

### 3. Deploy Supabase Edge Functions
To deploy the serverless edge functions for invitations:
```bash
supabase functions deploy invite-member --no-verify-jwt
supabase functions deploy accept-invitation --no-verify-jwt
```
Set environment variables in Supabase Secrets:
```bash
supabase secrets set APP_URL=https://your-domain.com
```

### 4. Email Invitation Configuration (Supabase SMTP / Resend)
To send real emails to teammates:
1. In your Supabase Dashboard, go to **Project Settings > Authentication > Email Settings**.
2. Enable **Custom SMTP**.
3. Enter your SMTP provider credentials (e.g., [Resend](https://resend.com) or SendGrid):
   - **Sender email**: `invites@yourdomain.com`
   - **Sender name**: `Walmart PT Classification`
   - **Host**: `smtp.resend.com`
   - **Port**: `587`
   - **Username**: `resend`
   - **Password**: `<your-resend-api-key>`
4. When you click **Invite Member** in Team Management, teammates receive the invitation email containing their personalized one-click acceptance link.

---

## Role & Permission Matrix

| Capability | Admin (Workspace Owner) | Editor | Viewer |
| :--- | :---: | :---: | :---: |
| **Browse Product Library & Search** | Yes | Yes | Yes |
| **View PT Groups & Galleries** | Yes | Yes | Yes |
| **Smart Image Search (Exact / Visual)** | Yes | Yes | Yes |
| **Upload Single Products** | Yes | Yes | Blocked (403) |
| **Bulk CSV Product Upload** | Yes | Yes | Blocked (403) |
| **Edit Product Names & Classifications** | Yes | Yes | Blocked (403) |
| **Add Classification Rationale Notes** | Yes | Yes | Blocked (403) |
| **Delete Products** | Yes | Blocked (403) | Blocked (403) |
| **Invite Teammates by Email** | Yes | Blocked (403) | Blocked (403) |
| **Change Member Roles (Editor <-> Viewer)**| Yes | Blocked (403) | Blocked (403) |
| **Remove Team Members** | Yes | Blocked (403) | Blocked (403) |
| **Cancel / Resend Invitations** | Yes | Blocked (403) | Blocked (403) |
| **View Audit / Activity Logs** | Yes | Blocked (403) | Blocked (403) |
| **Manage Workspace Settings & Quotas** | Yes | Blocked (403) | Blocked (403) |
| **Export Dataset to CSV** | Yes | Yes | Configurable by Admin |

---

## Verification & Test Results (Part 13)

The automated test suite (`tests/rbac_security.test.js`) executes 31 rigorous assertions verifying all 8 security requirements:

- **TEST 1**: Admin invites an Editor. Editor accepts invitation with valid token, receives `editor` role, and can upload & edit products. (**PASS**)
- **TEST 2**: Admin invites a Viewer. Viewer accepts invitation and can search and browse products. (**PASS**)
- **TEST 3**: Viewer attempts to update a Product Type via API. Backend immediately rejects with HTTP 403 Forbidden. (**PASS**)
- **TEST 4**: Editor attempts to invite another teammate. Backend blocks the request with HTTP 403 Forbidden. (**PASS**)
- **TEST 5**: Admin changes Editor to Viewer. Restrictions apply immediately; subsequent attempts to upload are rejected. (**PASS**)
- **TEST 6**: Admin removes a teammate. Workspace access is revoked immediately and audited in activity logs. (**PASS**)
- **TEST 7**: Admin attempts to remove or demote the only remaining Admin. Operation is blocked by `prevent_last_admin_removal`. (**PASS**)
- **TEST 8**: Multi-workspace isolation. Workspace 1 members cannot view or modify confidential products in Workspace 2. (**PASS**)
- **TEST 9**: Taxonomy search (6,980+ Walmart PTs loaded) and perceptual image signature matching. (**PASS**)
