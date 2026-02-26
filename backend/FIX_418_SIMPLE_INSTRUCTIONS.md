# Fix Error 418 - Simple Instructions

## The Problem
Error 418 = Your server IP is not whitelisted in MSG91 dashboard.

## Quick Fix (5 Steps)

### Step 1: Get Your Server IP

**Option A: Use PHP file**
- Visit: `https://your-domain.com/backend/api/get-server-ip-simple.php`
- Or create a file: `get-ip.php` with this code:
```php
<?php
echo $_SERVER['SERVER_ADDR'];
?>
```
- Visit it in browser - it will show your server IP

**Option B: Check from SSH/cPanel**
- Check your server IP in cPanel or Hostinger control panel
- Look for "Server Information" or "IP Address"

**Option C: Check error logs**
- Your server IP is usually in PHP error logs

### Step 2: Log into MSG91
- Go to: https://control.msg91.com
- Log in

### Step 3: Go to Authkey Settings
- Click your **username** (top right corner)
- Select **"Authkey"** from dropdown
- Verify with OTP if asked

### Step 4: Find Your Authkey
- Find: `481618A2cCSUpaZHTW6936c356P1`
- Click the **arrow** or **edit** icon under "Actions" column

### Step 5: Add IP to Whitelist
1. Find **"API Security"** section
2. Turn ON "API Security" (if it's off)
3. Find **"Whitelisted IPs"** section
4. Click **"Add IP"** or **"+"** button
5. Paste your server IP (from Step 1)
6. Click **Save**
7. Wait **2-5 minutes**
8. Test again

---

## Alternative: Disable IP Whitelisting (Less Secure)

If you can't find where to add IPs:
1. Go to Authkey Settings
2. Find "API Security" toggle
3. Turn it **OFF** (disables IP whitelisting - allows all IPs)
4. Save
5. Wait 2-5 minutes
6. Test again

---

## Test After Fixing

Test URL: `https://your-domain.com/backend/api/test-welcome-email-direct.php?email=your-email@example.com`

Should get:
- HTTP Code: **200** (not 401)
- Success message
- Email received

---

## Still Not Working?

Contact MSG91 Support:
- Email: support@msg91.com
- Phone: 1800-1212-911
- Tell them: "I'm getting Error 418, need to whitelist my server IP for Email API"

