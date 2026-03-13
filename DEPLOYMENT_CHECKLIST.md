# Deployment & Testing Checklist

## Pre-Deployment Verification

### Backend Setup ✓
- [x] MongoDB connection configured
- [x] JWT secret configured  
- [x] Multer installed and configured
- [x] Nodemailer installed
- [x] Upload directory created (`/server/uploads/`)
- [x] Environment variables set in `.env`
- [x] Admin user auto-created on startup

### Frontend Setup ✓
- [x] API endpoint configured (`REACT_APP_API_URL`)
- [x] Authentication context working
- [x] React Router configured
- [x] File upload component working
- [x] Admin dashboard component built
- [x] All routes accessible

### API Endpoints ✓
- [x] `POST /api/auth/register` - User registration
- [x] `POST /api/auth/login` - User login with JWT
- [x] `PUT /api/auth/profile` - Update profile
- [x] `POST /api/auth/kyc-upload` - File upload
- [x] `GET /api/auth/admin/pending-kyc` - Get pending requests
- [x] `PUT /api/auth/admin/kyc/:id/status` - Update KYC status

---

## Testing Checklist

### Authentication Tests
- [ ] User can register new account
  ```
  Action: POST /api/auth/register
  Email: test@example.com
  Password: password123
  Expected: Success with JWT token
  ```

- [ ] User can login
  ```
  Action: POST /api/auth/login  
  Email: test@example.com
  Password: password123
  Expected: Success with JWT token
  ```

- [ ] JWT token stored in localStorage
  ```
  DevTools → Application → Local Storage
  Key: parksetu_token
  Expected: Token present
  ```

- [ ] Token expires after 7 days
  ```
  Check JWT payload: exp claim
  Expected: Current timestamp + 7 days
  ```

### File Upload Tests

- [ ] File validation works
  ```
  Test 1: Upload file > 10MB
  Expected: Error - "File size exceeds 10MB"
  
  Test 2: Upload .exe file
  Expected: Error - "Only images and PDF files allowed"
  
  Test 3: Upload JPG file
  Expected: Success
  ```

- [ ] Both files required
  ```
  Test 1: Upload only identity proof
  Expected: Error - "Both documents required"
  
  Test 2: Upload both files
  Expected: Success modal
  ```

- [ ] Files stored correctly
  ```
  Location: /server/uploads/
  Check: Both files present with unique names
  Expected: identityProof-xxx.jpg, addressProof-xxx.pdf
  ```

- [ ] Database updated
  ```
  Check: users.kycStatus = 'pending'
  Check: users.kycSubmittedAt = current time
  Check: users.kycDocuments array populated
  Expected: All fields set correctly
  ```

- [ ] Success modal shows
  ```
  After upload, check UI
  Expected: Modal with checkmark, 24-hour timeline, status
  ```

### Admin Dashboard Tests

- [ ] Admin can only access `/admin`
  ```
  Test 1: Logged out user visits /admin
  Expected: Redirect to login
  
  Test 2: Parking owner visits /admin
  Expected: Access denied or redirect
  
  Test 3: Admin visits /admin
  Expected: Full dashboard access
  ```

- [ ] Admin sees pending requests
  ```
  Login as admin
  Go to /admin
  Expected: Table with all pending KYC requests
  Columns: Name, Email, Role, Submitted, Status
  ```

- [ ] Search functionality works
  ```
  Test 1: Search by name "John"
  Expected: Only requests with "John" shown
  
  Test 2: Search by email "test@"
  Expected: Only matching emails shown
  ```

- [ ] Filter by role works
  ```
  Test 1: Filter = "Parking Owner"
  Expected: Only host role shown
  
  Test 2: Filter = "Driver"
  Expected: Only driver role shown
  
  Test 3: Filter = "All"
  Expected: All roles shown
  ```

- [ ] Review modal opens
  ```
  Click "Review" button
  Expected: Modal with user info, documents, actions
  ```

- [ ] Can approve KYC
  ```
  Click "Approve KYC"
  Click confirm
  Expected: Success message, request removed from table
  Check DB: kycStatus = 'approved'
  Expected email: Approval email sent to user
  ```

- [ ] Can reject KYC
  ```
  Click "Reject KYC"
  Enter reason: "Documents are unclear"
  Expected: Success message, request removed
  Check DB: kycStatus = 'rejected'
  Expected email: Rejection email with reason
  ```

- [ ] Can request documents
  ```
  Click "Request Documents"
  Select: "Passport", "Bank Statement"
  Message: "Please provide..."
  Expected: Email sent to user with request
  ```

### Email Tests

- [ ] Email service handles missing config gracefully
  ```
  Without EMAIL_USER/PASSWORD
  Expected: Warning in console, operations continue
  ```

- [ ] Can send emails (with valid config)
  ```
  With valid SMTP credentials
  Expected: Emails sent, console logs show success
  ```

- [ ] Email content is correct
  ```
  Check email subject, body, links
  Expected: Professional formatting, correct info
  ```

### Security Tests

- [ ] Passwords are hashed
  ```
  Check DB user.password
  Expected: Hash like $2b$10$... (bcrypt format)
  ```

- [ ] Unauthorized access blocked
  ```
  Test 1: Call /admin/pending-kyc without token
  Expected: 401 Unauthorized
  
  Test 2: Call /admin/pending-kyc with invalid token  
  Expected: 401 Unauthorized
  
  Test 3: Call /admin/pending-kyc as non-admin
  Expected: 403 Forbidden
  ```

- [ ] File upload validates MIME types
  ```
  Test 1: Upload .exe disguised as .jpg
  Expected: Blocked by server
  
  Test 2: Upload valid image
  Expected: Accepted
  ```

- [ ] Sensitive data removed from responses
  ```
  After login/register, check response
  Expected: No password field in user object
  ```

---

## Performance Testing

### Load Testing
- [ ] Server handles 10 concurrent uploads
  ```
  Expected: All complete successfully
  Time: < 30 seconds total
  ```

- [ ] Admin can load 100 pending requests
  ```
  Expected: Page loads in < 2 seconds
  Table scrolls smoothly
  ```

- [ ] Search responds instantly
  ```
  Expected: Results update as user types
  No lag or delay
  ```

### Database Performance
- [ ] User queries optimized
  ```
  Query time for pending KYC: < 100ms
  Expected with indexes on role, kycStatus
  ```

### File Operations
- [ ] Upload 10MB file
  ```
  Expected time: < 3 seconds
  File accessible immediately after
  ```

---

## Production Deployment Checklist

### Environment Configuration
- [ ] Update `.env` with production values
  ```
  DATABASE: Production MongoDB URL
  JWT_SECRET: Long random string (> 32 chars)
  EMAIL_*: Real SMTP credentials
  NODE_ENV: production
  ```

- [ ] Update CORS settings
  ```
  Allow: https://yourdomain.com
  Deny: localhost
  ```

- [ ] Enable HTTPS/SSL
  ```
  Get SSL certificate
  Configure in Node/Nginx
  ```

### Database Preparation
- [ ] Create database backups
  ```
  Backup MongoDB before deployment
  ```

- [ ] Create indexes
  ```
  Create index on users.email
  Create index on users.kycStatus  
  Create index on users.role
  ```

- [ ] Migrate data if needed
  ```
  Test migration script
  Run on staging first
  ```

### File Storage
- [ ] Configure file storage location
  ```
  Option 1: Local disk (ensure writable)
  Option 2: AWS S3 / Cloud storage
  Option 3: CDN for delivery
  ```

- [ ] Set up file cleanup (if needed)
  ```
  Remove old uploads periodically
  Archive completed cases
  ```

- [ ] Enable file backups
  ```
  Backup /uploads directory
  Frequency: Daily
  ```

### Email Service
- [ ] Configure real SMTP
  ```
  Gmail, SendGrid, AWS SES, etc.
  Test with real account
  ```

- [ ] Set up bounce handling
  ```
  Monitor bounced emails
  Retry logic configured
  ```

- [ ] Create email templates
  ```
  Branding applied
  Links use production domain
  ```

### Monitoring & Logging
- [ ] Set up error logging
  ```
  Tool: Winston, Sentry, LogRocket
  Capture: All errors
  Alert: Critical errors
  ```

- [ ] Set up performance monitoring
  ```
  Tool: New Relic, DataDog, PM2
  Monitor: Response times, CPU, Memory
  Alert: Thresholds exceeded
  ```

- [ ] Enable access logging
  ```
  Tool: Morgan, Bunyan
  Log: All API requests
  Retention: 30 days
  ```

### Security Hardening
- [ ] Enable rate limiting
  ```
  Limit: 100 requests/minute per IP
  Endpoint: /api/auth/login
  Limit: 10 uploads per hour per user
  ```

- [ ] Set security headers
  ```
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Strict-Transport-Security: max-age=...
  ```

- [ ] Implement CSRF protection
  ```
  Add CSRF tokens to forms
  Verify on sensitive endpoints
  ```

- [ ] Configure firewall
  ```
  Only allow necessary ports
  Block suspicious traffic
  Enable DDoS protection
  ```

### Testing in Production
- [ ] Smoke tests
  ```
  Register user
  Upload KYC
  Approve/Reject
  All operations complete
  ```

- [ ] Integration tests
  ```
  Database operations
  Email sending
  File storage
  ```

- [ ] User acceptance testing
  ```
  Real users test flow
  Feedback collected
  Issues documented
  ```

---

## Maintenance Checklist

### Monthly Tasks
- [ ] Review error logs
  ```
  Identify patterns
  Fix common issues
  ```

- [ ] Check file storage usage
  ```
  Disk space available
  Archive old uploads
  ```

- [ ] Update dependencies
  ```
  npm audit
  npm update
  Test after update
  ```

### Quarterly Tasks
- [ ] Review security
  ```
  Check for vulnerabilities
  Update JWT secret (rotate)
  Review access logs
  ```

- [ ] Database maintenance
  ```
  Reindex collections
  Analyze query performance
  Backup and test restore
  ```

- [ ] Performance review
  ```
  Analyze slow queries
  Check API response times
  Optimize bottlenecks
  ```

### Annually
- [ ] Security audit
  ```
  Penetration testing
  Code review
  Dependency audit
  ```

- [ ] Capacity planning
  ```
  Project growth
  Scale infrastructure
  Optimize costs
  ```

---

## Rollback Procedure

If issues occur after deployment:

1. **Stop new deployments**
   ```
   Don't push more changes
   Focus on diagnosis
   ```

2. **Identify issue**
   ```
   Check error logs
   Check monitoring
   Reproduce issue
   ```

3. **Rollback database** (if needed)
   ```
   Restore from backup
   Verify data integrity
   ```

4. **Rollback code**
   ```
   Revert to previous version
   Restart services
   ```

5. **Test thoroughly**
   ```
   Verify all functions work
   Check data consistency
   ```

6. **Root cause analysis**
   ```
   Identify what failed
   Implement fix
   Test in staging
   ```

7. **Re-deploy carefully**
   ```
   Deploy to staging first
   Run full test suite
   Deploy to production
   Monitor closely
   ```

---

## Support Contacts

- **Database**: MongoDB support (Atlas)
- **Email**: SMTP provider support
- **Hosting**: Server provider support
- **Monitoring**: Monitoring service support
- **Team Lead**: [Your contact]
- **Emergency**: [Emergency number]

---

## Sign-Off

- [ ] Dev Lead: ___________  Date: _____
- [ ] QA Lead: ___________  Date: _____
- [ ] Ops Lead: ___________  Date: _____
- [ ] Product: ___________  Date: _____

**Deployment cleared for production: YES / NO**

---

**Last Updated**: March 13, 2026
**Version**: 1.0
**Status**: Ready for testing
