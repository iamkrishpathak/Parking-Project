# ParkBandhu KYC Verification System

## Overview
This document outlines the complete KYC (Know Your Customer) verification system for ParkBandhu, including file uploads, admin verification, and email notifications.

## Features

### 1. **File Upload for Parking Owners**
- **Location**: Parking Owner Dashboard → KYC Verification
- **Required Documents**:
  - Identity Proof (Aadhaar card) - Image or PDF
  - Address Proof (Electricity Bill) - Image or PDF
- **File Formats**: JPG, PNG, GIF, PDF
- **Max File Size**: 10MB per file

**Process**:
1. Parking owner uploads documents
2. System shows "Documents Uploaded!" modal with status
3. Owner notified to expect decision within 24 hours
4. Admin receives notification email

### 2. **Admin Dashboard**
- **Location**: `/admin`
- **Access**: Admin users only
- **Features**:
  - View all pending KYC requests
  - Search by name/email
  - Filter by user role
  - Review uploaded documents
  - Approve or Reject KYC
  - Request additional documents

**Admin Actions**:

#### Approve KYC
- Verification confirms all documents are valid
- User receives approval email
- User gets full access to platform features

#### Reject KYC
- Admin provides reason for rejection
- User receives rejection email with details
- User can resubmit corrected documents

#### Request Additional Documents
- Admin can request specific documents
- User receives email with detailed request
- User can upload additional docs via KYC page

### 3. **Security Features**
- **JWT Authentication**: All API routes protected with JWT tokens
- **Role-Based Access Control**: Only admins can access `/admin` endpoints
- **Admin Middleware**: Enhanced security verification for admin-only routes
- **Email Verification**: Transactional emails sent to users
- **File Validation**: 
  - File type validation (only images & PDFs)
  - File size limits (10MB max)
  - MIME type checking

### 4. **Email Notifications**

#### Emails Sent to Users:
1. **KYC Submitted** - Confirmation
2. **KYC Approved** - Access granted
3. **KYC Rejected** - Reason provided, resubmit option
4. **Document Request** - Specific documents needed

#### Emails Sent to Admin:
1. **New Submission Alert** - User details and link to review

### 5. **Database Schema**

**User Model Updates**:
```javascript
{
  kycStatus: 'pending' | 'approved' | 'rejected',
  kycSubmittedAt: Date,
  kycDocuments: [{
    type: 'aadhar' | 'pan' | 'driving_license' | 'other',
    url: String,
    filename: String,
    originalName: String,
    mimeType: String,
    uploadedAt: Date,
    status: 'pending' | 'approved' | 'rejected'
  }]
}
```

## API Endpoints

### Public Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Authenticated User Endpoints
- `PUT /api/auth/profile` - Update profile
- `POST /api/auth/kyc-upload` - Upload KYC documents (Host only)

### Admin-Only Endpoints
- `GET /api/auth/admin/pending-kyc` - Get all pending KYC requests
- `PUT /api/auth/admin/kyc/:kycId/status` - Update KYC status

## File Upload Details

### Upload Location
- Files stored in: `/server/uploads/`
- File naming: `{fieldname}-{timestamp}-{random}.{extension}`

### File Validation
```javascript
Allowed MIME types: image/jpeg, image/png, image/gif, application/pdf
Allowed Extensions: .jpg, .jpeg, .png, .gif, .pdf
Max Size: 10MB
```

## Email Configuration

### Setup Required
1. Update `.env` in `/server/` with:
```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@parkbandhu.com
ADMIN_EMAIL=admin@parkbandhu.com
CLIENT_URL=http://localhost:3000
```

2. For Gmail:
   - Enable 2-Factor Authentication
   - Generate App Password (not regular password)
   - Use App Password in EMAIL_PASSWORD

## User Journey

### Parking Owner
1. Complete registration
2. Navigate to Host Dashboard → KYC Verification
3. Upload Identity Proof & Address Proof
4. See success modal (24-hour timeline)
5. Wait for admin review
6. Receive email (approved/rejected/request)
7. If rejected: resubmit with corrections
8. Once approved: full access

### Admin
1. Login to admin account
2. Go to Admin Dashboard
3. See pending KYC requests in table
4. Click "Review" on any request
5. View all uploaded documents
6. Choose action:
   - **Approve**: Verify and approve
   - **Reject**: Provide rejection reason
   - **Request**: Ask for additional docs
7. User receives email notification
8. Track status in dashboard

## Admin Account

**Default Admin Credentials** (created automatically):
- Email: `admin@login.com`
- Password: `parkbandhu`

To create additional admins, update user role in database to `'admin'`.

## Error Handling

### Common Errors
- **"Both identity proof and address proof are required"** - Upload both files
- **"Only images and PDF files allowed"** - Check file format
- **"File size exceeds 10MB"** - Reduce file size
- **"Invalid or expired token"** - Login again
- **"Admin access required"** - Must be admin role

## Testing the System

### Test Steps
1. Register as Parking Owner
2. Login with owner credentials
3. Go to `/host-kyc` page
4. Upload sample documents
5. See success modal
6. Login as admin (admin@login.com / parkbandhu)
7. Go to `/admin` dashboard
8. View pending requests
9. Test approve/reject actions
10. Check emails in console

## Security Best Practices

- Never commit sensitive data (.env with real credentials)
- Use environment variables for all sensitive config
- Validate all file uploads server-side
- Implement rate limiting for file uploads
- Log all admin actions
- Use HTTPS in production
- Rotate JWT secrets regularly
- Implement email verification for sensitive changes

## Future Enhancements

- [ ] Bulk KYC upload
- [ ] Document status history
- [ ] Admin approval analytics
- [ ] Email templates customization
- [ ] Document expiry dates
- [ ] Two-factor authentication for admin
- [ ] Admin activity audit logs
- [ ] Scheduled email reminders
