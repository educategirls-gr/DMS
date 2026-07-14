# DMS-UP-Shiksha — Project Context for Claude Code

## Live URLs
- **Web App:** https://dms.dataimpact.in
- **Web App (GAS direct):** https://script.google.com/macros/s/AKfycbxpUe9Q9rjqosTf9JBad7KYreB_l215m4i38YD663p_AFMTcUYTXPFLXj0BSVbRIllWgw/exec
- **Script Editor:** https://script.google.com/home/projects/1or17GBvY1VZD3AAELgboCRx309D2nKHZxCtcIt9vmwnDG8FMDyEOq9EI/edit
- **Sheet:** https://docs.google.com/spreadsheets/d/110GnDeFCrE9PijXhrBAWYpXQ6iZNXy1ON6cNfnyh6Ik/edit
- **Drive Folder:** https://drive.google.com/drive/folders/1VXGx0oZmCSxG7uAta2m0XXlzhLsONCzW

---

## Project Overview
**Document Management System** for UP Shiksha Vibhag team.
Organization: **Educate Girls** (educategirls.ngo)
Developer: **Alok Mohan** — alok.mohan@educategirls.ngo (IT Manager)
Platform: Google Apps Script + Google Workspace + Google Drive + Sheets

---

## Tech Stack
- **Backend**: Google Apps Script (.gs files), runtime V8
- **Frontend**: HTML Service (`.html` files with inline CSS/JS)
- **Database**: Google Sheets (single spreadsheet, multiple tabs)
- **File Storage**: Google Drive (structured folders)
- **Email/OTP**: Gmail via `MailApp`
- **Sync**: Clasp (VS Code ↔ GAS)
- **Version Control**: Git + GitHub (private repo)

---

## Team & Roles

| Person | Role in System | Access |
|---|---|---|
| State Manager | `super_admin` | Full access — all documents, user management, approve |
| Team Lead | `team_lead` | All managers' docs, verify/reject, own upload |
| Alok Mohan (IT) | `manager` | Own docs only |
| Shreya Singh (Prayagraj) | `manager` | Own docs only |
| Academic Managers (3) | `manager` | Own docs only |
| Vocational Manager | `manager` | Own docs only |
| Civil Engineer | `manager` | Own docs only |

---

## Role Permissions Matrix

| Feature | manager | team_lead | super_admin |
|---|---|---|---|
| Upload document | ✅ | ✅ | ✅ |
| View own docs | ✅ | ✅ | ✅ |
| View all managers' docs | ❌ | ✅ | ✅ |
| Verify / Reject docs | ❌ | ✅ | ✅ |
| Approve docs (final) | ❌ | ❌ | ✅ |
| Download own docs | ✅ | ✅ | ✅ |
| Download any doc | ❌ | ✅ | ✅ |
| Bulk download | ❌ | ✅ | ✅ |
| Upload Circulars & Orders | ❌ | ✅ | ✅ |
| View + Download Circulars | ✅ (read only) | ✅ | ✅ |
| Acknowledge Circular | ✅ | ❌ | ❌ |
| View Circular Acknowledgement Status | ❌ | ✅ | ✅ |
| Manage dropdowns | ❌ | ❌ | ✅ |
| User management | ❌ | ❌ | ✅ |
| View audit log | ❌ | ❌ | ✅ |
| Export reports | ❌ | ❌ | ✅ |

---

## Circulars & Orders — Special Flow

Team Lead uploads circulars received from Govt/State. This is separate from normal document upload.

**Upload Flow (Team Lead):**
1. TL selects "Circular" type upload
2. Fills: Title, Reference Number (optional), Date, Remarks
3. Attaches file (PDF)
4. System sends email notification to ALL managers:
   > "Naya Circular: [Title] — Please acknowledge receipt"

**Manager Dashboard — Circulars Section:**
- List of all circulars (newest first)
- Status badge: `Acknowledged ✅` / `Pending ⏳`
- [View/Download] button
- [Maine padh liya ✅] button — one-time, cannot undo

**TL Dashboard — Circular Tracker:**

| Circular Title | Date | Total | Acknowledged | Pending | Action |
|---|---|---|---|---|---|
| Exam Schedule 2025 | Apr 2025 | 7 | 5 | 2 | [View Details] |

Detail view dikhata hai: kaun-kaun ne acknowledge kiya, kaun-kaun pending hai (naam ke saath).

**Super Admin:** Same view as TL — full visibility.

---

## Document Lifecycle / Status Flow

```
Pending → TL_Verified → Admin_Approved → Archived
       ↘ TL_Rejected              ↘ Admin_Rejected
```

Status values: `pending`, `tl_verified`, `tl_rejected`, `admin_approved`, `admin_rejected`, `archived`

---

## Google Sheets Structure

**Spreadsheet name**: `DMS_Database`

### Tab: Users
```
email | name | role | folder_id | created_at | is_active
```

### Tab: Documents
```
doc_id | uploader_email | uploader_name | component | sub_component |
subject | description | file_name | drive_link | year | month |
status | tl_verified_by | tl_verified_at | tl_remark |
admin_approved_by | admin_approved_at | admin_remark | uploaded_at
```

### Tab: Dropdowns
```
component | sub_component | description | template_link
```
*(Managed by super_admin — all dropdowns cascade from here)*

### Tab: AuditLog
```
timestamp | user_email | user_name | action | doc_id | file_name | ip_note
```

### Tab: Circulars
```
circular_id | title | ref_number | uploaded_by | drive_link |
file_name | remarks | uploaded_at | total_managers
```

### Tab: CircularAck (Acknowledgements)
```
circular_id | manager_email | manager_name | acknowledged_at
```

### Tab: OTPStore (temporary, cleared after use)
```
email | otp | expires_at | used
```

---

## Drive Folder Structure

```
DMS_Documents/  (root folder)
├── Alok_Mohan/
│   └── 2025/
│       ├── April/
│       └── May/
├── Shreya_Singh/
│   └── 2025/
│       └── ...
└── [Manager_Name]/
```

Folders auto-created on first upload — never manually.

---

## File Naming Convention

```
[Component]_[SubComponent]_[Month]_[Year]_[UploaderName].pdf
Example: ICT_Hardware_April_2025_Alok.pdf
```

Auto-generated at upload time — user does not type the filename.

---

## Authentication Flow

1. User enters email (must be educategirls.ngo domain)
2. Sheet check: is user registered in Users tab?
3. Generate 6-digit OTP → send via MailApp
4. OTP expiry: **10 minutes**
5. OTP verified → PropertiesService session token created
6. Role detected → role-specific dashboard shown

---

## Login / Session Rules

- Domain restricted: `educategirls.ngo` only
- Session stored in `PropertiesService` (user-scoped)
- Session token expires after inactivity
- OTP is single-use (marked `used=true` after verification)

---

## Upload Flow

1. Manager selects **Component** (from Dropdowns sheet)
2. **Sub-component** auto-loads (filtered cascade)
3. **Description** auto-fills (editable)
4. **Subject** typed manually by user
5. File attached (PDF/DOCX/image)
6. Auto file name generated
7. Script finds/creates Drive folder: `Root/UploaderName/Year/Month/`
8. File uploaded to Drive
9. Entry added to Documents sheet
10. AuditLog entry written
11. Confirmation shown to user

---

## Download Logic

- **Single download**: Direct Drive link → opens/downloads file
- **Bulk download** (TL + Admin): Selected files → temp shared Drive folder → share link
- **Metadata export** (Admin only): Documents sheet filtered data → Excel/CSV download
- All downloads logged in AuditLog

---

## Verification Flow (Team Lead)

- TL sees list of `pending` documents from all managers
- Each row has **[Verify ✅]** and **[Reject ❌]** buttons
- Reject requires mandatory remark/reason text
- On verify: status → `tl_verified`, manager gets email notification
- On reject: status → `tl_rejected`, manager gets email with TL's remark

---

## Search & Filter Logic

Filters available on document list:
- **Year** (dropdown)
- **Month** (dropdown)
- **Component** (dropdown)
- **Sub-component** (dropdown, filtered by component)
- **Status** (dropdown)
- **Free text search** (matches subject or file_name)
- **Uploader** (visible to TL and Admin only)

All filtering is client-side JS using data fetched from Sheets.

---

## Notification Triggers

| Event | Who Gets Notified |
|---|---|
| Manager uploads doc | Team Lead gets email |
| TL verifies doc | Manager gets confirmation email |
| TL rejects doc | Manager gets rejection reason email |
| Admin approves doc | Manager + TL get email |
| Admin rejects doc | Manager + TL get email |

---

## Source File Structure

```
DMS-UP-Shiksha/
├── CLAUDE.md                    ← This file
├── .clasp.json                  ← GAS Script ID (gitignored)
├── appsscript.json              ← GAS manifest
├── .gitignore
│
├── src/
│   ├── auth/
│   │   ├── Login.gs             ← OTP generation + email
│   │   └── Session.gs           ← Session create/validate/destroy
│   │
│   ├── modules/
│   │   ├── Upload.gs            ← Upload logic + Drive folder create
│   │   ├── Download.gs          ← Single + bulk + export
│   │   ├── Verify.gs            ← TL verify/reject workflow
│   │   ├── Search.gs            ← Filter + search helpers
│   │   └── Dropdown.gs          ← Component cascade logic
│   │
│   ├── admin/
│   │   ├── UserManager.gs       ← Add/edit/deactivate users
│   │   ├── AuditLog.gs          ← Write + read audit entries
│   │   └── Reports.gs           ← Stats, export functions
│   │
│   ├── ui/
│   │   ├── Dashboard.html       ← Role-based main dashboard
│   │   ├── Login.html           ← OTP login page
│   │   ├── UploadForm.html      ← Upload form with cascade dropdowns
│   │   ├── DocumentList.html    ← List view with filters + search
│   │   ├── VerifyList.html      ← TL verify queue
│   │   └── styles.css           ← Shared CSS
│   │
│   └── utils/
│       ├── Constants.gs         ← CONFIG object (Sheet ID, Folder ID, etc.)
│       ├── Helpers.gs           ← Shared utility functions
│       ├── DriveManager.gs      ← All Drive API operations
│       └── SheetManager.gs      ← All Sheets read/write operations
│
└── docs/
    ├── architecture.md
    └── setup-guide.md
```

---

## Constants.gs — CONFIG Object Template

```javascript
const CONFIG = {
  SHEET_ID: 'REPLACE_WITH_ACTUAL_SHEET_ID',
  ROOT_FOLDER_ID: 'REPLACE_WITH_ACTUAL_FOLDER_ID',
  DOMAIN: 'educategirls.ngo',
  OTP_EXPIRY_MINUTES: 10,
  SYSTEM_NAME: 'DMS — UP Shiksha Vibhag',
  TABS: {
    USERS: 'Users',
    DOCUMENTS: 'Documents',
    DROPDOWNS: 'Dropdowns',
    AUDIT_LOG: 'AuditLog',
    OTP_STORE: 'OTPStore'
  },
  ROLES: {
    SUPER_ADMIN: 'super_admin',
    TEAM_LEAD: 'team_lead',
    MANAGER: 'manager'
  },
  STATUS: {
    PENDING: 'pending',
    TL_VERIFIED: 'tl_verified',
    TL_REJECTED: 'tl_rejected',
    ADMIN_APPROVED: 'admin_approved',
    ADMIN_REJECTED: 'admin_rejected',
    ARCHIVED: 'archived'
  }
};
```

---

## appsscript.json

```json
{
  "timeZone": "Asia/Kolkata",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "webapp": {
    "executeAs": "USER_ACCESSING",
    "access": "DOMAIN"
  },
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/script.external_request"
  ]
}
```

---

## Key Rules for Code Generation

1. **Never hardcode Sheet ID or Folder ID** — always use `CONFIG` from Constants.gs
2. **All Drive operations** go through `DriveManager.gs`
3. **All Sheet read/write** goes through `SheetManager.gs`
4. **Session validation** at the top of every server-side function
5. **AuditLog entry** written for every upload, verify, reject, approve, download
6. **Error handling**: catch errors, log to console, return `{success: false, message: '...'}` to UI
7. **OTP**: 6-digit numeric, single-use, 10-minute expiry
8. **File naming**: auto-generate, never trust user-provided filename
9. **Domain check**: reject any email not ending in `@educategirls.ngo`
10. **Role check**: enforce permissions server-side, not just UI-side
