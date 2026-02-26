# Hostinger SMTP Setup Guide

## Overview
This project uses Hostinger SMTP for sending email OTPs during user registration.

## Configuration

### 1. Update SMTP Password
Edit `backend/config/config.php` and add your Hostinger SMTP password:

```php
define('SMTP_PASS', 'your-actual-smtp-password'); // Add your password here
```

### 2. Install PHPMailer (Recommended)

PHPMailer provides better email delivery and error handling. To install:

#### Option A: Using Composer (Recommended)
```bash
cd backend
composer require phpmailer/phpmailer
```

#### Option B: Manual Installation
1. Download PHPMailer from: https://github.com/PHPMailer/PHPMailer
2. Extract to `backend/vendor/PHPMailer/PHPMailer/`
3. The mailer utility will automatically detect and use it

### 3. Fallback Option
If PHPMailer is not available, the system will fall back to native PHP `mail()` function. However, this is less reliable and may not work on all servers.

## Testing Email Sending

### Test Email OTP
1. Go to registration page
2. Enter email address
3. Click "Send OTP"
4. Check your email inbox (and spam folder)
5. Enter the OTP to verify

### Troubleshooting

#### Emails Not Sending
1. **Check SMTP credentials**: Verify username and password in `config.php`
2. **Check server logs**: Look for errors in PHP error log
3. **Test SMTP connection**: Use a tool like `telnet smtp.hostinger.com 587`
4. **Check firewall**: Ensure port 587 is not blocked

#### PHPMailer Errors
- Check that Composer autoload is working
- Verify PHPMailer is installed correctly
- Check PHP version (PHPMailer requires PHP 5.5+)

#### Native Mail Fallback
- Ensure `mail()` function is enabled in PHP
- Check server mail configuration
- Verify sendmail path in `php.ini`

## Email Template

The OTP email uses a professional HTML template located in `backend/utils/mailer.php` in the `generateOTPEmailTemplate()` function. You can customize:
- Colors and styling
- Logo and branding
- Email content
- Footer information

## Production Checklist

- [ ] Update SMTP password in `config.php`
- [ ] Install PHPMailer via Composer
- [ ] Test email delivery
- [ ] Remove OTP from API response (already handled - only shows in dev mode)
- [ ] Update email template with your branding
- [ ] Test on production server
- [ ] Monitor email delivery rates

## Current Configuration

- **SMTP Host**: smtp.hostinger.com
- **SMTP Port**: 587
- **SMTP User**: info@demo1.360coordinates.com
- **From Email**: info@demo1.360coordinates.com
- **From Name**: IndiaPropertys
- **Encryption**: STARTTLS

## Support

For Hostinger SMTP issues, contact Hostinger support or check their documentation:
https://www.hostinger.com/tutorials/how-to-use-smtp

