# KYC System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (React)                           │
│                   http://localhost:3000                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Parking Owner Routes                                   │   │
│  │  ├── /host-kyc (File Upload Page)                     │   │
│  │  │   ├── Upload Identity Proof                        │   │
│  │  │   ├── Upload Address Proof                         │   │
│  │  │   ├── Success Modal (24hr timeline)               │   │
│  │  │   └── POST /api/auth/kyc-upload                   │   │
│  │  └── /host (Host Dashboard)                          │   │
│  │                                                         │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │  Admin Routes                                           │   │
│  │  └── /admin (Admin Dashboard)                          │   │
│  │      ├── Pending KYC Table                            │   │
│  │      │   ├── Search by name/email                    │   │
│  │      │   ├── Filter by role                          │   │
│  │      │   └── Review button                           │   │
│  │      └── KYC Verification Modal                      │   │
│  │          ├── View Documents                          │   │
│  │          ├── Approve KYC                             │   │
│  │          ├── Reject KYC                              │   │
│  │          └── Request Documents                       │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Components:                                                    │
│  ├── HostKYC.jsx - File upload form                           │
│  ├── AdminDashboard.jsx - KYC request list                    │
│  └── KYCVerificationModal.jsx - Review & action modal         │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
              │
              │ HTTP/REST API
              │ JWT Authentication
              ▼
┌──────────────────────────────────────────────────────────────────┐
│                      SERVER (Express.js)                         │
│                   http://localhost:5001                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │           Routes & Middleware Stack                    │    │
│  │                                                        │    │
│  │  POST /api/auth/register                              │    │
│  │    └─→ authController.register()                      │    │
│  │                                                        │    │
│  │  POST /api/auth/login                                 │    │
│  │    └─→ authController.login()                         │    │
│  │        └─→ Generate JWT Token                         │    │
│  │                                                        │    │
│  │  POST /api/auth/kyc-upload [Auth Required]            │    │
│  │    ├─→ authMiddleware (JWT verify)                    │    │
│  │    ├─→ multer (File upload)                           │    │
│  │    │   ├── Max 2 files                                │    │
│  │    │   ├── Max 10MB each                              │    │
│  │    │   └── Only JPG/PNG/GIF/PDF                       │    │
│  │    └─→ authController.uploadKYC()                     │    │
│  │        ├── Store files in /uploads                    │    │
│  │        ├── Update User.kycStatus = 'pending'          │    │
│  │        └── sendKYCSubmittedNotificationToAdmin()      │    │
│  │                                                        │    │
│  │  GET /api/auth/admin/pending-kyc [Admin Only]         │    │
│  │    ├─→ adminMiddleware (Role check)                   │    │
│  │    └─→ authController.getPendingKYC()                 │    │
│  │                                                        │    │
│  │  PUT /api/auth/admin/kyc/:kycId/status [Admin Only]   │    │
│  │    ├─→ adminMiddleware (Role check)                   │    │
│  │    └─→ authController.updateKYCStatus()               │    │
│  │        ├── Update kycStatus field                     │    │
│  │        └── Send approval/rejection email              │    │
│  │                                                        │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │           Middleware Stack                             │    │
│  │                                                        │    │
│  │  ├── authMiddleware.js                                │    │
│  │  │   ├── Verify JWT token                            │    │
│  │  │   ├── Extract user from token                     │    │
│  │  │   ├── Check role (if required)                    │    │
│  │  │   └── Attach req.user                             │    │
│  │  │                                                    │    │
│  │  ├── adminMiddleware.js                              │    │
│  │  │   ├── Verify JWT token                            │    │
│  │  │   ├── Verify user is admin                        │    │
│  │  │   ├── Log admin actions                           │    │
│  │  │   └── Attach req.user                             │    │
│  │  │                                                    │    │
│  │  └── uploadMiddleware.js (Multer)                     │    │
│  │      ├── Configure storage location                  │    │
│  │      ├── Validate file types                         │    │
│  │      ├── Enforce size limits                         │    │
│  │      └── Handle upload errors                        │    │
│  │                                                        │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              Utilities & Services                      │    │
│  │                                                        │    │
│  │  emailService.js                                      │    │
│  │  ├── sendKYCApprovedEmail()                          │    │
│  │  ├── sendKYCRejectedEmail()                          │    │
│  │  ├── sendDocumentRequestEmail()                      │    │
│  │  └── sendKYCSubmittedNotificationToAdmin()           │    │
│  │                                                        │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
              │
              │ Database Operations
              │ File Storage
              ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Data Layer                                    │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  MongoDB                                               │    │
│  │  mongodb://atlas...                                   │    │
│  │                                                        │    │
│  │  Collections:                                          │    │
│  │  ├── users                                            │    │
│  │  │   ├── _id, name, email, password (hashed)         │    │
│  │  │   ├── role: 'admin' | 'host' | 'driver'           │    │
│  │  │   ├── kycStatus: 'pending' | 'approved' | 'reject' │    │
│  │  │   ├── kycSubmittedAt: Date                         │    │
│  │  │   └── kycDocuments: [{                             │    │
│  │  │       type, url, filename, mimeType, uploadedAt   │    │
│  │  │     }]                                             │    │
│  │  │                                                    │    │
│  │  └── spaces, bookings, etc.                           │    │
│  │                                                        │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  File System                                           │    │
│  │  /server/uploads/                                     │    │
│  │  ├── identityProof-1234567890-xyz.jpg                │    │
│  │  ├── addressProof-1234567891-abc.pdf                 │    │
│  │  └── ...                                              │    │
│  │                                                        │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Email Service (Nodemailer)                           │    │
│  │  SMTP Configuration                                   │    │
│  │  ├── Host: smtp.gmail.com                            │    │
│  │  ├── Port: 587                                        │    │
│  │  └── Auth: EMAIL_USER / EMAIL_PASSWORD                │    │
│  │                                                        │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## Authentication Flow

```
┌─────────────────────────────────────────────────────────┐
│                  USER LOGIN PROCESS                     │
└─────────────────────────────────────────────────────────┘

  Client                          Server
    │                              │
    ├─ POST /login ───────────────>│
    │  {email, password}           │
    │                              ├─ Find user in DB
    │                              ├─ Verify password
    │                              ├─ Generate JWT
    │                              │  (expires 7 days)
    │<──────────── {token, user} ──┤
    │                              │
    ├─ Store in localStorage      │
    │  localStorage.parksetu_token │
    │                              │
    ├─ Subsequent requests ──────>│
    │  Header: Authorization:     │
    │  Bearer {token}             │
    │                              ├─ Verify JWT
    │                              ├─ Extract user ID
    │                              ├─ Check role
    │                              ├─ Process request
    │<─────── Response ────────────┤
    │                              │


┌─────────────────────────────────────────────────────────┐
│            KYC UPLOAD PROCESS                           │
└─────────────────────────────────────────────────────────┘

  1. User selects files
     ├── identityProof.jpg (5MB)
     └── addressProof.pdf (3MB)

  2. Client validates
     ├── File type check (JPG/PNG/GIF/PDF)
     └── File size check (< 10MB)

  3. Client uploads
     POST /api/auth/kyc-upload (multipart/form-data)
     Headers: {Authorization: Bearer token}
     Body: FormData with both files

  4. Server receives
     ├── authMiddleware: Verify JWT
     ├── Multer: Validate & store files
     │   ├── File 1 → /uploads/identityProof-xxx.jpg
     │   └── File 2 → /uploads/addressProof-xxx.pdf
     ├── Controller: Save references to DB
     │   └── User.kycDocuments = [{url, type, etc}]
     ├── Update: User.kycStatus = 'pending'
     └── Email: Send notification to admin

  5. Client receives
     ├── Success response
     ├── Show success modal
     └── Display 24-hour timeline


┌─────────────────────────────────────────────────────────┐
│            KYC APPROVAL FLOW                            │
└─────────────────────────────────────────────────────────┘

  Admin Dashboard                 Server
        │                            │
        ├─ GET /admin ──────────────>│
        │                            ├─ GET pending KYC
        │<──── List of requests ─────┤
        │                            │
        ├─ Review document ──────────>│ (View only)
        │                            │
        ├─ Choose action            │
        │  ├─ Approve                │
        │  ├─ Reject                 │
        │  └─ Request Docs           │
        │                            │
        ├─ PUT /kyc/{id}/status ────>│
        │  {status: 'approved'}      │
        │                            ├─ Update DB
        │                            ├─ Send email
        │<──── Confirmation ─────────┤
        │                            │
        
  Admin Email Sent ──> sendKYCApprovedEmail()
                        ├── To: user email
                        ├── Subject: KYC Approved
                        └── Body: HTML template
```

## Security Architecture

```
┌─────────────────────────────────────────────────────────┐
│              SECURITY LAYERS                            │
└─────────────────────────────────────────────────────────┘

  Layer 1: Network Level
  ├── CORS: Only localhost:3000 allowed
  ├── HTTPS: (in production)
  └── Timeout: Request timeouts configured

  Layer 2: Authentication
  ├── JWT Token: 7-day expiration
  ├── Password: Bcrypt hashing (10 salt rounds)
  └── Session: No session stored (stateless)

  Layer 3: Authorization
  ├── Role Check: user.role field verified
  ├── Admin Middleware: Only admin role allowed
  └── User Check: User exists in DB

  Layer 4: Input Validation
  ├── File Type: Whitelist JPG/PNG/GIF/PDF
  ├── File Size: Max 10MB
  ├── MIME Type: Server-side validation
  ├── Email: Format validation
  └── Password: Min length check

  Layer 5: Data Protection
  ├── Passwords: Hashed immediately
  ├── Sensitive Data: Removed from responses
  ├── Logs: Admin actions logged
  └── Storage: Files stored separately

  Layer 6: Error Handling
  ├── Generic Errors: Don't leak internal info
  ├── Logging: All errors logged
  └── Monitoring: Email service failures handled gracefully


┌─────────────────────────────────────────────────────────┐
│           FILE UPLOAD SECURITY                          │
└─────────────────────────────────────────────────────────┘

  Client-Side                    Server-Side
  ├── File type check           ├── Multer validation
  ├── Size check                ├── MIME type check
  ├── Preview generation        ├── File size limit
  └── UX validation            ├── Extension check
                               ├── Unique filename
                               ├── Secure storage
                               └── DB reference
```

## Data Models

```javascript
User Schema {
  _id: ObjectId,
  name: String (required),
  email: String (unique, required),
  password: String (hashed, required),
  phone: String,
  role: 'admin' | 'host' | 'driver' (default: 'driver'),
  
  // KYC Fields
  kycStatus: 'pending' | 'approved' | 'rejected' (default: 'pending'),
  kycSubmittedAt: Date (null),
  kycDocuments: [{
    type: 'aadhar' | 'pan' | 'driving_license' | 'other',
    url: String (file path),
    filename: String,
    originalName: String,
    mimeType: String,
    status: 'pending' | 'approved' | 'rejected',
    uploadedAt: Date
  }],
  
  // Other fields
  createdAt: Date,
  updatedAt: Date
}
```

## Request/Response Examples

```javascript
// KYC Upload Request
POST /api/auth/kyc-upload
Headers: {
  Authorization: "Bearer eyJhbGci..."
}
Body: FormData {
  identityProof: File (jpg, 5MB),
  addressProof: File (pdf, 3MB)
}

Response (200 OK):
{
  success: true,
  message: "KYC documents uploaded successfully...",
  user: {
    _id: "xxx",
    name: "John",
    email: "john@example.com",
    kycStatus: "pending",
    kycSubmittedAt: "2026-03-13T10:30:00Z",
    kycDocuments: [
      {
        type: "aadhar",
        url: "/uploads/identityProof-xxx.jpg",
        filename: "identityProof-xxx.jpg",
        uploadedAt: "2026-03-13T10:30:00Z"
      },
      ...
    ]
  }
}

---

// Admin Get Pending KYC
GET /api/auth/admin/pending-kyc
Headers: {
  Authorization: "Bearer eyJhbGci..."
}

Response (200 OK):
[
  {
    _id: "user123",
    name: "John Parkway",
    email: "owner@example.com",
    role: "host",
    kycStatus: "pending",
    kycSubmittedAt: "2026-03-13T10:30:00Z",
    kycDocuments: [...]
  },
  ...
]

---

// Admin Update KYC Status
PUT /api/auth/admin/kyc/user123/status
Headers: {
  Authorization: "Bearer eyJhbGci..."
  Content-Type: "application/json"
}
Body: {
  status: "approved" | "rejected",
  rejectionReason: "Reason..." (if rejected)
}

Response (200 OK):
{
  message: "KYC status updated to approved",
  user: { ... }
}
```

---

This architecture ensures secure, scalable, and user-friendly KYC verification!
