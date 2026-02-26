# MSG91 401 Unauthorized Error - Troubleshooting Guide

## Current Status
- ✅ Configuration: Correct (auth key, template ID, domain, from email)
- ✅ Code: Correct (payload format, email fetching from database)
- ❌ API Response: HTTP 401 "Unauthorized"

## Most Common Causes

### 1. IP Whitelisting (Most Likely) ⚠️

MSG91 Email API requires your server's IP address to be whitelisted.

**Fix:**
1. Log in to MSG91 Dashboard
2. Go to: **Authkey Settings** or **API Settings**
3. Select your authkey: `481618A2cCSUpaZHTW6936c356P1`
4. Find **"IP Whitelisting"** or **"Allowed IPs"** section
5. Add your server's IP address:
   - If on Hostinger, check your server IP in cPanel or contact support
   - Add the IP to the whitelist
6. Save changes
7. Wait 2-5 minutes for changes to propagate

**To find your server IP:**
- Check Hostinger cPanel → Server Information
- Or create a test file: `<?php echo $_SERVER['SERVER_ADDR']; ?>`
- Or check error logs for your server's outbound IP

---

### 2. Wrong Auth Key for Email API

MSG91 Email API might use a **different auth key** than OTP API.

**Check:**
1. Go to MSG91 Dashboard → **Email** → **Settings** → **API Integration**
2. Look for **"Email API Auth Key"** or **"Transactional Email Auth Key"**
3. It might be different from your OTP auth key
4. If different, update `MSG91_EMAIL_AUTH_KEY` in `backend/config/admin-config.php`

---

### 3. Auth Key Permissions

Your auth key might not have **Email API permissions** enabled.

**Check:**
1. MSG91 Dashboard → **Authkey Settings**
2. Select your authkey
3. Check **"API Permissions"** or **"Enabled Services"**
4. Ensure **"Email API"** or **"Transactional Email"** is enabled
5. If disabled, enable it and save

---

### 4. Domain Verification

Ensure your domain `demo1.360coordinates.com` is verified in MSG91.

**Check:**
1. MSG91 Dashboard → **Email** → **Domains**
2. Verify `demo1.360coordinates.com` shows as **"Verified"**
3. If not verified, complete domain verification (DNS records)

---

### 5. Template Status

Ensure template `welcome_template_34` is **approved and active**.

**Check:**
1. MSG91 Dashboard → **Email** → **Templates**
2. Find template ID: `welcome_template_34`
3. Status should be **"Active"** or **"Approved"**
4. If pending/disabled, approve it

---

## Quick Diagnostic Steps

### Step 1: Verify IP Whitelisting
```php
// Create: backend/api/check-server-ip.php
<?php
echo "Server IP: " . ($_SERVER['SERVER_ADDR'] ?? 'Unknown') . "\n";
echo "Request IP: " . ($_SERVER['REMOTE_ADDR'] ?? 'Unknown') . "\n";
?>
```

### Step 2: Check MSG91 Dashboard Logs
1. MSG91 Dashboard → **Email** → **Logs** or **Reports**
2. Look for failed API calls
3. Check error messages for specific IP/authentication issues

### Step 3: Test with cURL (from server)
SSH into your server and run:
```bash
curl -X POST https://control.msg91.com/api/v5/email/send \
  -H "Content-Type: application/json" \
  -H "authkey: 481618A2cCSUpaZHTW6936c356P1" \
  -d '{
    "to": [{"name": "Test", "email": "your-email@example.com"}],
    "from": {"name": "IndiaPropertys Team", "email": "noreply@demo1.360coordinates.com"},
    "domain": "demo1.360coordinates.com",
    "template_id": "welcome_template_34"
  }'
```

This will show the exact error message from MSG91.

---

## Expected Solution

**Most likely:** IP whitelisting issue. Add your server IP to MSG91 whitelist.

**Next most likely:** Different auth key required for Email API. Check Email → Settings → API Integration in MSG91 dashboard.

---

## After Fixing

Once IP whitelisting/auth key is fixed:
1. Test again with: `test-welcome-email-direct.php?email=your-email@example.com`
2. Should get HTTP 200 response
3. Check email inbox
4. Verify registration flow works

---

## Code Status: ✅ READY

The code is correctly implemented:
- ✅ Fetches email from database after user registration
- ✅ Uses exact database values for email sending
- ✅ Proper error handling and logging
- ✅ Correct payload format with domain field

The only issue is MSG91 API authentication (401), which needs to be fixed in MSG91 dashboard settings.

