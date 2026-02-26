# Image Moderation System Setup Guide

This guide explains how to set up and use the automatic image moderation system using Google Cloud Vision API.

## Overview

The image moderation system automatically checks uploaded property images for:
- Explicit, pornographic, violent, or racy content
- Images containing animals (dogs, cats, pets, wildlife, birds, fish)
- Accepts only relevant property and land images (houses, rooms, interiors, exteriors, gardens)

Images are processed within 2-5 seconds and users receive instant feedback.

## Prerequisites

1. **Google Cloud Account** with a project created
2. **Cloud Vision API** enabled in your Google Cloud project
3. **Service Account** created with Vision API permissions
4. **JSON Key File** downloaded from the service account

## Setup Steps

### 1. Database Migration

Run the database migration to create the necessary tables:

```sql
-- Run this file:
backend/database/image_moderation_migration.sql
```

This will:
- Add moderation columns to the existing `property_images` table
- Create the `moderation_review_queue` table

### 2. Install Dependencies

Install the Google Cloud Vision PHP package:

```bash
cd backend
composer install
```

This will install `google/cloud-vision` package.

### 3. Configure Google Cloud Credentials

1. Place your Google Cloud service account JSON key file in a secure location on your server
2. Update the `GOOGLE_APPLICATION_CREDENTIALS` environment variable or update the default path in `backend/config/config.php`:

```php
// In config.php, update this line:
define('GOOGLE_APPLICATION_CREDENTIALS', '/path/to/your/google-cloud-credentials.json');
```

**Security Note:** Never commit the JSON key file to version control. Keep it outside the web root if possible.

### 4. Environment Variables (Optional)

You can set these environment variables to customize moderation thresholds:

```bash
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
MODERATION_ADULT_THRESHOLD=0.6
MODERATION_RACY_THRESHOLD=0.7
MODERATION_VIOLENCE_THRESHOLD=0.5
MODERATION_MEDICAL_THRESHOLD=0.6
MODERATION_ANIMAL_THRESHOLD=0.7
MAX_IMAGE_SIZE_MB=5
ALLOWED_IMAGE_TYPES=jpg,jpeg,png,webp
```

### 5. Folder Structure

The following folders are automatically created:
- `/uploads/temp/` - Temporary storage during moderation
- `/uploads/properties/` - Approved images (with subfolders per property)
- `/uploads/review/` - Images waiting for manual review
- `/uploads/rejected/` - Archive of rejected images

Ensure these folders have write permissions (755 or 775).

## API Endpoints

### Upload and Moderate Image

**Endpoint:** `POST /api/images/moderate-and-upload.php`

**Authentication:** Required (Bearer token)

**Request:**
- `image` (file): Image file to upload
- `property_id` (form data): Property ID

**Response:**
```json
{
  "success": true,
  "message": "Image approved",
  "data": {
    "status": "success",
    "image_id": 123,
    "image_url": "http://example.com/uploads/properties/123/image.jpg",
    "message": "Image approved"
  }
}
```

**Status Values:**
- `success` - Image approved and saved
- `pending_review` - Image needs manual review
- `error` - Image rejected

### Admin Moderation Queue

**List Queue:** `GET /api/admin/moderation-queue/list.php?page=1&limit=20`

**Approve:** `POST /api/admin/moderation-queue/approve.php?id={queue_id}`

**Reject:** `POST /api/admin/moderation-queue/reject.php?id={queue_id}`

All admin endpoints require admin authentication (session-based).

## React Components

### ModeratedImageUpload Component

Use this component in your property forms:

```jsx
import ModeratedImageUpload from './components/ModeratedImageUpload';

<ModeratedImageUpload
  propertyId={propertyId}
  onImagesChange={(approvedImages) => {
    // Handle approved images
  }}
  maxImages={10}
/>
```

### Admin Moderation Dashboard

Access the admin moderation queue at:
- Route: `/admin/moderation-queue`
- Menu: "Image Moderation" in admin sidebar

## Moderation Logic

### SafeSearch Detection

The system checks for:
- **Adult Content** (threshold: 0.6) - Explicit sexual content
- **Racy Content** (threshold: 0.7) - Suggestive content
- **Violence** (threshold: 0.5) - Violent or graphic content
- **Medical** (threshold: 0.6) - Medical or graphic medical content

### Animal Detection

Blocks images containing:
- Dog, Cat, Pet, Animal, Wildlife, Bird, Fish, Reptile, Mammal
- Puppy, Kitten, Canine, Feline, Horse, Cow, Livestock
- Insect, Spider

### Borderline Cases

Images with scores in borderline ranges are flagged for manual review:
- Adult: 0.4 - 0.6
- Racy: 0.5 - 0.7
- Violence: 0.3 - 0.5

### Property Context

Positive signals (property-related labels):
- House, Building, Room, Interior, Exterior, Garden
- Kitchen, Bedroom, Bathroom, Living Room
- Property, Real Estate, Architecture, Home, Apartment
- Floor, Wall, Ceiling, Door, Window, Furniture
- Land, Plot

## Troubleshooting

### API Credentials Error

**Error:** "Google Cloud credentials file not found"

**Solution:** 
1. Check that the JSON key file exists at the configured path
2. Verify file permissions (should be readable by PHP)
3. Check the `GOOGLE_APPLICATION_CREDENTIALS` path in config.php

### API Call Fails

**Error:** "Failed to analyze image"

**Solution:**
1. Verify Cloud Vision API is enabled in Google Cloud Console
2. Check service account has Vision API permissions
3. Verify billing is enabled for your Google Cloud project
4. Check API quotas haven't been exceeded

### Images Not Uploading

**Error:** "File upload error"

**Solution:**
1. Check folder permissions (uploads/temp, uploads/properties, etc.)
2. Verify PHP upload limits in php.ini:
   - `upload_max_filesize = 5M`
   - `post_max_size = 10M`
3. Check disk space on server

### Database Errors

**Error:** "Table doesn't exist"

**Solution:** Run the migration file: `backend/database/image_moderation_migration.sql`

## Testing

### Test Image Upload

1. Use the React component in a property form
2. Upload a test image
3. Check the response status
4. Verify image appears in correct folder based on status

### Test Admin Queue

1. Upload an image that triggers borderline detection
2. Log in as admin
3. Navigate to `/admin/moderation-queue`
4. Approve or reject the image
5. Verify image moves to correct folder

## Security Considerations

1. **Credentials:** Never expose Google Cloud credentials in code or version control
2. **File Permissions:** Ensure upload directories have proper permissions (755)
3. **File Validation:** Always validate file types and sizes on both client and server
4. **SQL Injection:** All database queries use prepared statements
5. **Authentication:** All endpoints require proper authentication

## Performance

- Image moderation typically takes 2-5 seconds
- Large images may take longer
- Consider implementing async processing for high-volume scenarios
- Monitor API quotas to avoid rate limiting

## Support

For issues or questions:
1. Check error logs: `backend/logs/php_errors.log`
2. Review Google Cloud Vision API documentation
3. Check database for moderation records in `property_images` table

## Future Enhancements

Potential improvements:
- Add AWS Rekognition as a second provider
- Implement batch processing for multiple images
- Add email notifications for rejected images
- Create analytics dashboard for moderation statistics
- Add custom label training for property-specific detection

