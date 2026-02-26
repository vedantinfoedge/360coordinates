# Quick Setup Guide

## Step-by-Step Setup Instructions

### 1. Database Setup
1. Open XAMPP Control Panel
2. Start Apache and MySQL
3. Open phpMyAdmin: http://localhost/phpmyadmin
4. Click "Import" tab
5. Select file: `backend/database/schema.sql`
6. Click "Go" to import

### 2. Verify Database
- Database name: `indiapropertys_db`
- Default admin: `admin` / `admin123` (change in production!)

### 3. Configure Backend
1. Edit `backend/config/config.php`
   - Update `BASE_URL` if needed
   - Update `JWT_SECRET` (use a strong random string)
   - Update SMTP settings for email OTP
   - Update MSG91 settings for SMS OTP

2. Edit `backend/config/database.php` (if needed)
   - Default: `root` / no password
   - Update if you have different MySQL credentials

### 4. Set File Permissions
- Ensure `backend/uploads/` directory exists and is writable
- Create subdirectories if needed:
  - `uploads/properties/images/`
  - `uploads/properties/videos/`
  - `uploads/properties/brochures/`
  - `uploads/users/profiles/`

### 5. Test API
1. Open browser: http://localhost/Fullstack/backend/api/
2. You should see API information

### 6. Test Login
Use Postman or similar tool:
```
POST http://localhost/Fullstack/backend/api/auth/login.php
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123",
  "userType": "buyer"
}
```

## Common Issues

### CORS Errors
- Check `.htaccess` files in `backend/` and `backend/api/`
- Verify frontend URL matches CORS headers

### Database Connection Failed
- Check MySQL is running in XAMPP
- Verify database name: `indiapropertys_db`
- Check credentials in `database.php`

### File Upload Errors
- Check `uploads/` directory permissions
- Verify PHP upload limits in `php.ini`:
  - `upload_max_filesize = 50M`
  - `post_max_size = 50M`

### 404 Errors
- Verify `.htaccess` is enabled in Apache
- Check `mod_rewrite` is enabled
- Verify file paths are correct

## Next Steps

1. Test all API endpoints
2. Integrate with frontend
3. Configure email/SMS services
4. Set up production environment
5. Update security settings

## Support

Refer to `backend/README.md` for detailed documentation.

