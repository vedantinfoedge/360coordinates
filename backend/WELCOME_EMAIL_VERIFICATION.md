# ✅ Welcome Email Registration Flow Verification

## Current Implementation Status

### ✅ **Code Flow is Complete:**

1. **Registration API** (`backend/api/auth/register.php`):
   - ✅ Includes `email_helper.php` (line 12)
   - ✅ Calls `sendWelcomeEmailAsync()` after user creation (line 360)
   - ✅ Error handling in place (doesn't block registration)

2. **Email Helper** (`backend/helpers/email_helper.php`):
   - ✅ Validates inputs
   - ✅ Builds background command
   - ✅ Executes worker script asynchronously
   - ✅ Detailed logging for debugging

3. **Worker Script** (`backend/workers/send_welcome_email.php`):
   - ✅ Sends email via MSG91 API
   - ✅ Updates `email_status` in database
   - ✅ Logs to `email_logs` table

4. **Database Configuration**:
   - ✅ Uses production database (u449667423_lastdata)
   - ✅ Works for both web API and CLI worker

---

## ⚠️ Pre-requisites Checklist

Before testing, ensure:

### 1. Database Migration ✅
```sql
-- Run this migration first:
backend/database/welcome_email_migration.sql
```

**Verify:**
- `users.email_status` column exists (default: 'PENDING')
- `users.email_sent_at` column exists
- `email_logs` table exists

### 2. MSG91 Configuration ✅
**Check** `backend/config/admin-config.php`:
- `MSG91_EMAIL_AUTH_KEY` = `481618A2cCSUpaZHTW6936c356P1`
- `MSG91_WELCOME_TEMPLATE_ID` = `welcome_template_34`
- `MSG91_EMAIL_FROM_EMAIL` = `noreply@demo1.360coordinates.com`

**Important:** 
- Template ID must match your MSG91 dashboard
- Sender email must be verified in MSG91

### 3. Server Requirements ⚠️
- `exec()` function must be enabled in PHP
- PHP CLI must be accessible
- Worker script must be readable/executable

---

## 🔍 Testing Steps

### Step 1: Test Registration
1. Register a new user via your registration API
2. Check response - should say "Registration successful. Welcome email sent."
3. Registration should complete successfully (even if email fails)

### Step 2: Check Database
```sql
-- Check user was created with email_status
SELECT id, email, email_status, email_sent_at, created_at 
FROM users 
WHERE email = 'your-test-email@example.com';

-- Expected: email_status should be 'PENDING' initially
-- Then change to 'SENT' or 'FAILED' within 30 seconds
```

### Step 3: Check Email Logs
```sql
-- Check if worker executed and logged attempt
SELECT * FROM email_logs 
WHERE user_id = <your_user_id> 
ORDER BY created_at DESC;

-- Should have an entry within 30 seconds of registration
```

### Step 4: Check PHP Error Logs
Look for log messages:
- `sendWelcomeEmailAsync: Executing command: ...`
- `sendWelcomeEmailAsync: Background worker triggered for user ID: ...`
- `Welcome Email Worker: Starting welcome email worker...`
- `Welcome Email Worker: SUCCESS: Welcome email sent...`

---

## 🐛 Troubleshooting

### Issue: email_status stays "PENDING"

**Possible Causes:**
1. `exec()` function is disabled
   - **Check:** Run debug script: `backend/api/debug-welcome-email.php`
   - **Fix:** Enable `exec()` in php.ini

2. Worker script not executing
   - **Check:** PHP error logs for "sendWelcomeEmailAsync" messages
   - **Fix:** Verify worker script path is correct

3. PHP executable not found
   - **Check:** Error logs will show command that failed
   - **Fix:** Set `PHP_EXECUTABLE_PATH` in config.php

4. Database connection fails in worker
   - **Check:** Worker script error logs
   - **Fix:** Database config should now use production DB

### Issue: No entries in email_logs

**Possible Causes:**
1. Worker script not running at all
   - Check exec() function availability
   - Check PHP error logs

2. Database connection issue in worker
   - Verify database.php uses production DB
   - Check worker script can connect to DB

### Issue: email_status = "FAILED"

**Possible Causes:**
1. MSG91 API error
   - Check `email_logs.error_message` column
   - Verify MSG91 credentials
   - Verify template ID exists in MSG91

2. Invalid email address
   - Check email format
   - Check MSG91 allows the email domain

---

## ✅ Expected Behavior

**When registration is successful:**

1. **Immediate (0-1 second):**
   - User record created in database
   - `email_status` = 'PENDING'
   - API returns success response
   - Background worker command executed

2. **Within 30 seconds:**
   - Worker script executes
   - Email sent via MSG91
   - `email_status` updates to 'SENT' or 'FAILED'
   - Entry added to `email_logs` table

3. **Email Delivery:**
   - User receives welcome email (if status = 'SENT')
   - Check MSG91 dashboard for delivery status

---

## 🧪 Manual Testing

### Test Worker Script Directly:
```bash
cd backend/workers
php send_welcome_email.php 1 "Test User" "test@example.com"
```

**Expected Output:**
- Check PHP error logs for success messages
- Database `email_status` should update
- Entry in `email_logs` table

### Test Debug Script:
```
Visit: http://your-domain/backend/api/debug-welcome-email.php
```

**This will show:**
- ✅/❌ exec() function available
- ✅/❌ PHP executable path
- ✅/❌ Worker script exists
- ✅/❌ Database connection
- ✅/❌ Command test execution

---

## 📊 Success Indicators

✅ **Everything works if:**
1. User registration completes successfully
2. `email_status` changes from 'PENDING' → 'SENT' within 30 seconds
3. Entry appears in `email_logs` table
4. User receives welcome email
5. No errors in PHP error logs

❌ **Issue exists if:**
1. `email_status` stays 'PENDING' after 1 minute
2. No entry in `email_logs` table
3. Error messages in PHP logs about exec() or worker script
4. User doesn't receive email (and status is 'SENT')

---

**Last Updated:** Current
**Status:** Ready for Testing ✅

