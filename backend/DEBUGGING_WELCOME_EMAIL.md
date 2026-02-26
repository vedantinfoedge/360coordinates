# 🔍 Welcome Email Not Working - Debugging Guide

## Step-by-Step Debugging

### Step 1: Check Database Status

```sql
-- Check user's email status
SELECT id, email, email_status, email_sent_at, created_at 
FROM users 
WHERE email = 'your-email@example.com';
```

**Possible Results:**
- `email_status = 'PENDING'` → Background worker didn't execute
- `email_status = 'FAILED'` → Worker ran but email failed (check email_logs)
- `email_status = 'SENT'` → Email sent successfully (check MSG91 dashboard)

```sql
-- Check email logs for error messages
SELECT * FROM email_logs 
WHERE user_id = (SELECT id FROM users WHERE email = 'your-email@example.com')
ORDER BY created_at DESC;
```

---

### Step 2: Test MSG91 API Directly

**Visit in browser:**
```
https://demo1.360coordinates.com/backend/api/test-welcome-email-direct.php?email=YOUR_EMAIL&name=Test User
```

**This will show:**
- ✅/❌ MSG91 configuration
- ✅/❌ API request/response
- ✅/❌ Error messages from MSG91

**Common MSG91 Errors:**
- `Invalid template_id` → Template ID doesn't exist in MSG91 dashboard
- `Unauthorized` → Auth key is incorrect
- `Invalid sender email` → Sender email not verified in MSG91
- `Invalid recipient` → Email address format issue

---

### Step 3: Check Background Worker Execution

**Run debug script:**
```
https://demo1.360coordinates.com/backend/api/debug-welcome-email.php
```

**Check for:**
- ✅/❌ `exec()` function available
- ✅/❌ PHP executable path correct
- ✅/❌ Worker script exists
- ✅/❌ Database connection works

---

### Step 4: Check PHP Error Logs

**Location:** `backend/logs/php_errors.log`

**Look for:**
```
sendWelcomeEmailAsync: Executing command: ...
sendWelcomeEmailAsync: Background worker triggered for user ID: ...
Welcome Email Worker: Starting welcome email worker...
Welcome Email Worker: SUCCESS: Welcome email sent...
```

**If you see:**
- No logs → `exec()` might be disabled or worker not running
- "exec() function is not available" → Enable exec() in php.ini
- "Worker script not found" → Check file path
- "Failed to send welcome email" → Check MSG91 API errors

---

## 🔧 Common Issues & Fixes

### Issue 1: email_status stays "PENDING"

**Cause:** Background worker not executing

**Solutions:**
1. **Check if exec() is enabled:**
   - Run: `backend/api/debug-welcome-email.php`
   - If disabled, enable in php.ini: `disable_functions = ...` (remove exec)

2. **Check PHP executable path:**
   - Worker needs to find PHP CLI
   - Check error logs for path issues
   - May need to set `PHP_EXECUTABLE_PATH` in config

3. **Check worker script permissions:**
   - Ensure `backend/workers/send_welcome_email.php` is readable
   - Check file exists and path is correct

---

### Issue 2: email_status = "FAILED"

**Cause:** Worker executed but MSG91 API call failed

**Solutions:**
1. **Check email_logs table:**
   ```sql
   SELECT error_message FROM email_logs 
   WHERE user_id = YOUR_USER_ID 
   ORDER BY created_at DESC LIMIT 1;
   ```

2. **Verify MSG91 credentials:**
   - Auth Key: `481618A2cCSUpaZHTW6936c356P1`
   - Template ID: `welcome_template_34` (must match MSG91 dashboard)
   - Sender Email: `noreply@demo1.360coordinates.com` (must be verified in MSG91)

3. **Test MSG91 API directly:**
   - Use: `backend/api/test-welcome-email-direct.php`
   - This will show exact error from MSG91

---

### Issue 3: email_status = "SENT" but no email received

**Cause:** Email sent to MSG91 but delivery issue

**Solutions:**
1. **Check MSG91 Dashboard:**
   - Login to MSG91 control panel
   - Check email delivery reports
   - Verify email was actually sent

2. **Check spam/junk folder:**
   - MSG91 emails sometimes go to spam
   - Check email filtering rules

3. **Verify email address:**
   - Check if email address is correct
   - Test with a different email address

4. **Check MSG91 account limits:**
   - Verify you haven't exceeded email quota
   - Check account status in MSG91 dashboard

---

### Issue 4: Template ID Error

**Error:** `Invalid template_id` or `Template not found`

**Solution:**
1. Login to MSG91 Dashboard
2. Go to Email → Templates
3. Find your welcome email template
4. Copy the exact Template ID
5. Update in `backend/config/admin-config.php`:
   ```php
   define('MSG91_WELCOME_TEMPLATE_ID', 'your-actual-template-id');
   ```

---

### Issue 5: Sender Email Not Verified

**Error:** `Invalid sender email` or `Sender not verified`

**Solution:**
1. Login to MSG91 Dashboard
2. Go to Email → Verified Senders
3. Verify `noreply@demo1.360coordinates.com` is added and verified
4. If not verified, add and verify the email domain

---

## ✅ Quick Verification Checklist

Before reporting an issue, verify:

- [ ] Database migration ran successfully
- [ ] `email_status` column exists in users table
- [ ] `email_logs` table exists
- [ ] `exec()` function is enabled
- [ ] PHP CLI is accessible
- [ ] Worker script exists at `backend/workers/send_welcome_email.php`
- [ ] MSG91 Auth Key is correct
- [ ] MSG91 Template ID matches dashboard
- [ ] Sender email is verified in MSG91
- [ ] Test email with `test-welcome-email-direct.php` works

---

## 🧪 Testing Order

1. **First:** Test MSG91 API directly
   - `test-welcome-email-direct.php`
   - This isolates MSG91 issues

2. **Second:** Test background worker
   - `debug-welcome-email.php`
   - This checks exec() and paths

3. **Third:** Check database
   - `check-email-status.php`
   - This shows what actually happened

4. **Fourth:** Check error logs
   - `backend/logs/php_errors.log`
   - This shows detailed execution flow

---

## 📞 Need More Help?

If none of the above works, provide:
1. Output from `test-welcome-email-direct.php`
2. Output from `debug-welcome-email.php`
3. Database query results (email_status and email_logs)
4. Relevant PHP error log entries

