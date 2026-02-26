# IndiaPropertys Backend API

Complete PHP backend for IndiaPropertys real estate platform.

## 📋 Table of Contents

- [Setup Instructions](#setup-instructions)
- [Database Setup](#database-setup)
- [API Endpoints](#api-endpoints)
- [Configuration](#configuration)
- [File Structure](#file-structure)
- [Features](#features)

## 🚀 Setup Instructions

### Prerequisites
- XAMPP (PHP 7.4+ and MySQL)
- Apache Web Server
- MySQL Database

### Installation Steps

1. **Place Backend Folder**
   - Copy the `backend` folder to `C:\xampp\htdocs\Fullstack\backend`

2. **Database Setup**
   ```sql
   -- Open phpMyAdmin (http://localhost/phpmyadmin)
   -- Import the schema file:
   -- backend/database/schema.sql
   ```

3. **Configure Database**
   - Edit `backend/config/database.php`
   - Update credentials if needed (default: root, no password)

4. **Configure Application**
   - Edit `backend/config/config.php`
   - Update base URLs, file paths, and API keys

5. **Set Permissions**
   - Ensure `uploads/` directory is writable
   - Create upload directories if they don't exist

6. **Start Services**
   - Start Apache and MySQL in XAMPP Control Panel

## 📊 Database Setup

1. Open phpMyAdmin: `http://localhost/phpmyadmin`
2. Click "Import" tab
3. Select `backend/database/schema.sql`
4. Click "Go" to import

The schema will create:
- `users` - User accounts
- `properties` - Property listings
- `property_images` - Property images
- `property_amenities` - Property amenities
- `inquiries` - Buyer inquiries
- `favorites` - User favorites
- `otp_verifications` - OTP records
- `user_profiles` - Extended user profiles
- `subscriptions` - User subscriptions
- `admin_users` - Admin accounts
- `user_sessions` - User sessions

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/login.php` - User login
- `POST /api/auth/register.php` - User registration
- `GET /api/auth/verify.php` - Verify token

### OTP Verification
- `POST /api/otp/send-email.php` - Send email OTP
- `POST /api/otp/verify-email.php` - Verify email OTP
- `POST /api/otp/send-sms.php` - Send SMS OTP
- `POST /api/otp/verify-sms.php` - Verify SMS OTP
- `POST /api/otp/resend-sms.php` - Resend SMS OTP

### Seller/Agent Properties
- `GET /api/seller/properties/list.php` - List properties
- `POST /api/seller/properties/add.php` - Add property
- `PUT /api/seller/properties/update.php?id={id}` - Update property
- `DELETE /api/seller/properties/delete.php?id={id}` - Delete property

### Seller Dashboard
- `GET /api/seller/dashboard/stats.php` - Get dashboard statistics

### Seller Inquiries
- `GET /api/seller/inquiries/list.php` - List inquiries
- `PUT /api/seller/inquiries/updateStatus.php?id={id}` - Update inquiry status

### Seller Profile
- `GET /api/seller/profile/get.php` - Get profile
- `PUT /api/seller/profile/update.php` - Update profile

### Buyer Properties
- `GET /api/buyer/properties/list.php` - List all properties (with filters)
- `GET /api/buyer/properties/details.php?id={id}` - Get property details

### Buyer Inquiries
- `POST /api/buyer/inquiries/send.php` - Send inquiry

### Buyer Favorites
- `POST /api/buyer/favorites/toggle.php` - Toggle favorite
- `GET /api/buyer/favorites/list.php` - List favorites

## ⚙️ Configuration

### Database Configuration (`config/database.php`)
```php
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'indiapropertys_db');
```

### Application Configuration (`config/config.php`)
- `BASE_URL` - Base URL of the application
- `UPLOAD_DIR` - File upload directory
- `JWT_SECRET` - Secret key for token generation
- `SMTP_*` - Email configuration
- `MSG91_*` - SMS configuration

### Important Settings to Update:
1. **JWT_SECRET** - Change to a secure random string
2. **SMTP credentials** - Add your email service credentials
3. **MSG91 credentials** - Add your SMS service credentials
4. **Base URLs** - Update if using different paths

## 📁 File Structure

```
backend/
├── api/                    # API endpoints
│   ├── auth/              # Authentication endpoints
│   ├── otp/               # OTP endpoints
│   ├── seller/             # Seller/Agent endpoints
│   │   ├── properties/    # Property management
│   │   ├── inquiries/     # Inquiry management
│   │   ├── dashboard/     # Dashboard stats
│   │   └── profile/       # Profile management
│   └── buyer/             # Buyer endpoints
│       ├── properties/    # Property browsing
│       ├── inquiries/     # Send inquiries
│       └── favorites/     # Favorites management
├── config/                # Configuration files
│   ├── config.php         # Application config
│   └── database.php       # Database config
├── database/              # Database files
│   └── schema.sql        # Database schema
├── utils/                 # Utility functions
│   ├── auth.php          # Authentication helpers
│   ├── response.php      # Response helpers
│   ├── upload.php        # File upload helpers
│   └── validation.php    # Validation helpers
├── uploads/              # Uploaded files
│   ├── properties/       # Property files
│   │   ├── images/       # Property images
│   │   ├── videos/       # Property videos
│   │   └── brochures/    # Property brochures
│   └── users/            # User files
│       └── profiles/     # Profile images
└── README.md             # This file
```

## ✨ Features

### Implemented Features:
- ✅ User authentication (Login, Register, Token verification)
- ✅ OTP verification (Email & SMS)
- ✅ Property CRUD operations
- ✅ Property search and filtering
- ✅ Inquiries management
- ✅ Favorites system
- ✅ User profiles
- ✅ Dashboard statistics
- ✅ File uploads (Images, Videos, Brochures)
- ✅ Google Maps coordinates support
- ✅ Role-based access control
- ✅ Subscription-based property limits

### Future Features (To be implemented):
- 🔲 Real-time chat system
- 🔲 Email notifications
- 🔲 SMS notifications
- 🔲 Google Maps integration
- 🔲 Payment gateway integration
- 🔲 Advanced analytics
- 🔲 Admin dashboard APIs

## 🔐 Security Features

- Password hashing (bcrypt)
- JWT-like token authentication
- SQL injection prevention (PDO prepared statements)
- XSS protection (input sanitization)
- CORS configuration
- File upload validation
- Role-based access control

## 📝 API Request/Response Format

### Request Headers
```
Content-Type: application/json
Authorization: Bearer {token}
```

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "data": {
    "errors": { ... }
  }
}
```

## 🧪 Testing

### Test Endpoints
1. **Login**: `POST http://localhost/Fullstack/backend/api/auth/login.php`
   ```json
   {
     "email": "test@example.com",
     "password": "password123",
     "userType": "buyer"
   }
   ```

2. **Register**: `POST http://localhost/Fullstack/backend/api/auth/register.php`
   ```json
   {
     "fullName": "John Doe",
     "email": "john@example.com",
     "phone": "+919876543210",
     "password": "password123",
     "userType": "buyer",
     "emailOtp": "123456",
     "phoneOtp": "123456"
   }
   ```

## 🐛 Troubleshooting

### Common Issues:

1. **CORS Errors**
   - Check `.htaccess` files
   - Verify frontend URL in CORS headers

2. **Database Connection Failed**
   - Verify MySQL is running
   - Check database credentials
   - Ensure database exists

3. **File Upload Errors**
   - Check directory permissions
   - Verify upload limits in `php.ini`
   - Check file size limits

4. **Token Verification Failed**
   - Check JWT_SECRET in config
   - Verify Authorization header format
   - Check token expiration

## 📞 Support

For issues or questions, please contact the development team.

## 📄 License

This project is proprietary software.

