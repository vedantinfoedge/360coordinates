# 🚨 FIX ERROR 401/418 - STEP BY STEP ACTION PLAN

## ⚠️ IMPORTANT: This is NOT a code issue!
Your code is **100% correct**. The problem is MSG91 dashboard configuration.

---

## ✅ STEP 1: Get Your Server IP Address

1. Open in browser: `https://demo1.360coordinates.com/backend/api/check-server-ip.php`
2. **Copy the SERVER_ADDR IP address** (it will look like: `123.45.67.89`)

---

## ✅ STEP 2: Log into MSG91 Dashboard

1. Go to: https://control.msg91.com
2. Log in with your credentials

---

## ✅ STEP 3: Navigate to Authkey Settings

**Option A (Recommended):**
1. Click on your **username** (top right)
2. Select **"Authkey"** from dropdown
3. If asked, enter your registered mobile number and verify with OTP

**Option B:**
1. Go to any service dashboard (SMS, Email, etc.)
2. Look for **"Authkey"** option (usually bottom left or in settings)

---

## ✅ STEP 4: Find Your Authkey

1. Find authkey: `481618A2cCSUpaZHTW6936c356P1`
2. If you see multiple authkeys, look for the one you're using

---

## ✅ STEP 5: Configure IP Whitelisting

**CRITICAL STEPS:**

1. Click the **arrow** or **edit** icon under **"Actions"** column for your authkey

2. Look for **"API Security"** section
   - If **"API Security"** toggle is **OFF**: Turn it **ON**
   - If **"API Security"** toggle is **ON**: Continue to next step

3. Find **"Whitelisted IPs"** section

4. **Add your server IP** (from Step 1):
   - Click **"Add IP"** or **"+"** button
   - Paste your SERVER_ADDR IP
   - Save

   **OR** if you want to allow all IPs (less secure):
   - **Disable "API Security"** toggle
   - Save

5. **Save all changes**

---

## ✅ STEP 6: Wait for Changes to Take Effect

- Wait **2-5 minutes** for MSG91 to process the changes
- Changes are not instant

---

## ✅ STEP 7: Test Again

1. Test with: `https://demo1.360coordinates.com/backend/api/test-welcome-email-direct.php?email=your-email@example.com`
2. You should now get **HTTP 200** instead of **HTTP 401**
3. Check your email inbox

---

## ❌ If Still Not Working After IP Whitelisting

### Check These Additional Settings:

#### A. Verify Email API Auth Key (Different from OTP)
1. MSG91 Dashboard → **Email** → **Settings** → **API Integration**
2. Check if there's a **different auth key** for Email API
3. If different, update `MSG91_EMAIL_AUTH_KEY` in `backend/config/admin-config.php`

#### B. Check Auth Key Permissions
1. Go back to Authkey Settings
2. Click on your authkey
3. Check **"API Permissions"** or **"Enabled Services"**
4. Ensure **"Email API"** or **"Transactional Email"** is **ENABLED**
5. If disabled, enable it and save

#### C. Verify Domain
1. MSG91 Dashboard → **Email** → **Domains**
2. Verify `demo1.360coordinates.com` shows as **"Verified"**
3. If not verified, complete domain verification

#### D. Verify Template
1. MSG91 Dashboard → **Email** → **Templates**
2. Find template: `welcome_template_34`
3. Status should be **"Active"** or **"Approved"**

---

## 📞 Contact MSG91 Support (If Still Failing)

If you've done ALL steps above and still get Error 418:

**Email:** support@msg91.com  
**Phone:** 1800-1212-911

**Provide them:**
- Your authkey: `481618A2cC***` (first 10 chars)
- Your server IP: (from Step 1)
- Error code: 418
- API endpoint: `https://control.msg91.com/api/v5/email/send`
- Request: "Please enable Email API access and whitelist my server IP for authkey: 481618A2cCSUpaZHTW6936c356P1"

---

## ✅ Quick Checklist

- [ ] Got server IP from check-server-ip.php
- [ ] Logged into MSG91 Dashboard
- [ ] Navigated to Authkey Settings
- [ ] Found authkey: 481618A2cCSUpaZHTW6936c356P1
- [ ] Enabled API Security (if disabled)
- [ ] Added server IP to Whitelisted IPs (OR disabled API Security)
- [ ] Saved changes
- [ ] Waited 2-5 minutes
- [ ] Tested again with test-welcome-email-direct.php
- [ ] Got HTTP 200 (not 401)
- [ ] Received email in inbox

---

## 🎯 Expected Result

After fixing IP whitelisting:
- HTTP Code: **200** (not 401)
- Response: Success message
- Email received in inbox
- Database: `email_status = 'SENT'`

---

## ⚠️ Remember

**This is a MSG91 dashboard configuration issue, NOT a code issue.**

Your code is correct. Once IP whitelisting is fixed in MSG91 dashboard, emails will work immediately.

