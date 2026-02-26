# 🚀 Welcome Email Production Deployment Checklist

## ✅ Pre-Deployment Checklist

### 1. Database Migration
- [ ] **Run migration script** in production database:
  ```sql
  -- Import: backend/database/welcome_email_migration.sql
  ```
- [ ] Verify `email_status` and `email_sent_at` columns exist in `users` table
- [ ] Verify `email_logs` table is created
- [ ] Check indexes are created (for performance)

### 2. MSG91 Configuration
- [ ] **Verify MSG91 Email API credentials** in `backend/config/admin-config.php`:
  - Auth Key: `MSG91_EMAIL_AUTH_KEY`
  - Template ID: `MSG91_WELCOME_TEMPLATE_ID` (should match your MSG91 dashboard)
  - Sender Email: `MSG91_EMAIL_FROM_EMAIL` (must be verified in MSG91)
  - Sender Name: `MSG91_EMAIL_FROM_NAME`

- [ ] **Set environment variables** (recommended for production):
  ```bash
  MSG91_EMAIL_AUTH_KEY=your_actual_auth_key
  MSG91_WELCOME_TEMPLATE_ID=welcome_template_34
  MSG91_EMAIL_FROM_EMAIL=noreply@demo1.360coordinates.com
  MSG91_EMAIL_FROM_NAME=IndiaPropertys Team
  ```

### 3. Server Requirements
- [ ] **PHP 7.4+** installed
- [ ] **exec() function enabled** (required for background worker)
  - Check with: `php -m | grep -i exec` or create test file
  - If disabled, contact hosting provider to enable it
- [ ] **PHP CLI available** in PATH or specify full path via `PHP_EXECUTABLE_PATH`
- [ ] **Permissions**: Worker script must be executable
  ```bash
  chmod +x backend/workers/send_welcome_email.php
  ```

### 4. File Permissions
- [ ] `backend/workers/` directory exists and is readable
- [ ] `backend/workers/send_welcome_email.php` is executable
- [ ] `backend/helpers/email_helper.php` is readable

### 5. Configuration Files
- [ ] Verify `backend/config/config.php` has worker path configuration
- [ ] Verify `backend/config/admin-config.php` has MSG91 Email API constants
- [ ] Test PHP executable path detection

---

## 🔍 Production Verification Steps

### Step 1: Test Worker Script Manually
```bash
# SSH into production server
cd /path/to/backend/workers
php send_welcome_email.php 1 "Test User" "test@example.com"

# Check output - should see logs in error log
tail -f /path/to/backend/logs/php_errors.log
```

### Step 2: Test Registration Flow
1. Register a new user via API
2. Check database:
   ```sql
   SELECT id, email, email_status, email_sent_at 
   FROM users 
   WHERE email = 'test@example.com';
   ```
3. Check email_logs:
   ```sql
   SELECT * FROM email_logs 
   WHERE user_id = <user_id> 
   ORDER BY created_at DESC;
   ```

### Step 3: Monitor Logs
- Check PHP error logs for email worker messages
- Verify email_status updates from 'PENDING' → 'SENT' or 'FAILED'
- Monitor email_logs table for successful/failed attempts

---

## ⚠️ Important Production Considerations

### 1. Shared Hosting Limitations
**If `exec()` is disabled on shared hosting:**
- Contact hosting provider to enable `exec()` function
- Alternative: Use cron job to process email queue (requires queue table)
- Current implementation requires `exec()` to work

### 2. PHP Executable Path
On some shared hosting, you may need to specify full PHP path:
```php
// Set in .htaccess or php.ini:
SetEnv PHP_EXECUTABLE_PATH /usr/bin/php

// Or add to config.php:
define('PHP_EXECUTABLE_PATH', '/usr/bin/php');
```

Common PHP paths:
- `/usr/bin/php`
- `/usr/local/bin/php`
- `/opt/alt/php74/usr/bin/php` (cPanel)
- `php` (if in PATH)

### 3. Error Handling
- ✅ Registration **always succeeds** even if email fails
- ✅ Email failures are logged but don't break user flow
- ✅ All email attempts are tracked in `email_logs` table

### 4. Performance
- ✅ Email sending is **non-blocking** (async)
- ✅ Registration responds immediately (< 500ms expected)
- ✅ Background worker runs independently

### 5. Security
- ✅ Input validation (email format, user ID)
- ✅ Shell argument escaping (`escapeshellarg()`)
- ✅ Prepared statements for database queries
- ✅ Error messages don't expose sensitive info

---

## 🐛 Troubleshooting

### Issue: Email not being sent
**Check:**
1. PHP error logs: `backend/logs/php_errors.log`
2. Database: `email_logs` table for error messages
3. MSG91 dashboard: Verify template ID and sender email
4. Server logs: Check if worker script is executing

### Issue: exec() function disabled
**Solution:**
- Contact hosting provider
- Check `php.ini`: `disable_functions` should not include `exec`
- Test with: `php -r "exec('echo test');"`

### Issue: Worker script not found
**Solution:**
- Verify `WORKER_WELCOME_EMAIL_SCRIPT` path in config.php
- Check file exists: `ls -la backend/workers/send_welcome_email.php`
- Verify absolute path resolution

### Issue: Email status stuck on 'PENDING'
**Solution:**
1. Check if worker script is executable
2. Verify PHP executable path is correct
3. Check PHP error logs for worker script errors
4. Test worker script manually via CLI

---

## 📊 Monitoring Recommendations

### Database Queries for Monitoring
```sql
-- Pending emails (should process quickly)
SELECT COUNT(*) FROM users WHERE email_status = 'PENDING';

-- Failed emails (needs attention)
SELECT u.id, u.email, u.email_status, el.error_message, el.created_at
FROM users u
LEFT JOIN email_logs el ON u.id = el.user_id
WHERE u.email_status = 'FAILED'
ORDER BY el.created_at DESC
LIMIT 20;

-- Email success rate
SELECT 
    status,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM email_logs), 2) as percentage
FROM email_logs
WHERE email_type = 'welcome'
GROUP BY status;
```

---

## ✅ Post-Deployment Verification

After deployment, verify:
- [ ] New user registrations create records with `email_status = 'PENDING'`
- [ ] Email status updates to 'SENT' or 'FAILED' within 30 seconds
- [ ] `email_logs` table has entries for each registration
- [ ] No errors in PHP error logs
- [ ] Users receive welcome emails (check MSG91 dashboard)

---

## 📝 Configuration Summary

**Required Constants (already configured):**
- ✅ `PHP_EXECUTABLE_PATH` - PHP CLI path
- ✅ `WORKER_WELCOME_EMAIL_SCRIPT` - Worker script path
- ✅ `MSG91_EMAIL_AUTH_KEY` - MSG91 API key
- ✅ `MSG91_EMAIL_SEND_URL` - MSG91 API endpoint
- ✅ `MSG91_WELCOME_TEMPLATE_ID` - Email template ID
- ✅ `MSG91_EMAIL_FROM_EMAIL` - Sender email
- ✅ `MSG91_EMAIL_FROM_NAME` - Sender name

**Database Tables:**
- ✅ `users.email_status` (ENUM: PENDING, SENT, FAILED)
- ✅ `users.email_sent_at` (DATETIME)
- ✅ `email_logs` (tracking table)

---

## 🎯 Success Criteria

✅ **Ready for production if:**
1. Database migration completed successfully
2. MSG91 credentials configured correctly
3. `exec()` function is enabled on server
4. Worker script is executable and paths are correct
5. Test registration creates email log entry
6. Email status updates within 30 seconds

🚨 **NOT ready if:**
- `exec()` is disabled (contact hosting provider)
- Database migration fails
- MSG91 credentials are incorrect
- Worker script path is incorrect

---

**Last Updated:** 2024
**Version:** 1.0

