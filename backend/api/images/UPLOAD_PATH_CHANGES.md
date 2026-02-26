# Upload Path Configuration Changes

## Summary
Updated the upload system to store images in `public_html/demo1/uploads/` instead of `public_html/demo1/backend/uploads/`.

## Changes Made

### 1. `backend/config/moderation.php`
- ✅ Added detailed logging for path resolution
- ✅ Improved error handling for directory creation
- ✅ Added verification logging for all upload directories

**Key Constants:**
- `UPLOAD_TEMP_PATH`: `{demo1}/uploads/temp/`
- `UPLOAD_PROPERTIES_PATH`: `{demo1}/uploads/properties/`
- `UPLOAD_REVIEW_PATH`: `{demo1}/uploads/review/`
- `UPLOAD_REJECTED_PATH`: `{demo1}/uploads/rejected/`

### 2. `backend/config/config.php`
- ✅ Added logging for `UPLOAD_DIR` verification
- ✅ Ensured `UPLOAD_BASE_URL` points to `/uploads` (not `/backend/uploads`)

**Key Constants:**
- `UPLOAD_DIR`: `{demo1}/uploads/`
- `UPLOAD_BASE_URL`: `https://demo1.360coordinates.com/uploads`

### 3. `backend/api/images/moderate-and-upload.php`
- ✅ **CRITICAL FIX**: Changed `move_uploaded_file()` to `rename()` for moving from temp to final location
- ✅ Added fallback to `copy()` + `unlink()` if `rename()` fails
- ✅ Improved error logging

**Why this fix was needed:**
- `move_uploaded_file()` only works for files in `$_FILES['tmp_name']`
- After the first move to temp, the file is no longer in PHP's upload temp location
- Using `rename()` is the correct approach for moving files between directories

## File Storage Structure

```
public_html/demo1/
├── uploads/
│   ├── temp/              # Temporary uploads (before moderation)
│   ├── properties/       # Approved property images
│   │   └── {property_id}/
│   │       └── {filename}
│   ├── review/           # Images pending manual review
│   ├── rejected/         # Rejected images
│   ├── properties/videos/
│   ├── properties/brochures/
│   └── users/profiles/
└── backend/
    └── ...
```

## URL Structure

- **Base URL**: `https://demo1.360coordinates.com/uploads`
- **Property Images**: `https://demo1.360coordinates.com/uploads/properties/{property_id}/{filename}`
- **User Profiles**: `https://demo1.360coordinates.com/uploads/users/profiles/{filename}`

## Testing

### Test Script 1: JSON API (for programmatic testing)
**URL**: `https://demo1.360coordinates.com/backend/api/images/test-upload-paths.php`

**Returns**: JSON with all test results

**Usage**:
```bash
curl https://demo1.360coordinates.com/backend/api/images/test-upload-paths.php
```

### Test Script 2: HTML Interface (for browser testing)
**URL**: `https://demo1.360coordinates.com/backend/api/images/test-upload-paths-html.php`

**Features**:
- Visual test results
- Color-coded pass/fail indicators
- Detailed path information
- File operation tests
- Critical issue warnings

## What the Tests Check

1. ✅ **Constants Definition**: All required constants are defined
2. ✅ **Directory Existence**: All upload directories exist
3. ✅ **Directory Permissions**: Directories are writable
4. ✅ **Path Resolution**: Paths resolve correctly
5. ✅ **URL Generation**: URLs are generated correctly
6. ✅ **File Operations**: Write, read, and delete operations work
7. ✅ **FileHelper Methods**: Helper methods work correctly

## Troubleshooting

### Issue: "UPLOAD_PROPERTIES_PATH directory does not exist"
**Solution**: 
```bash
mkdir -p /home/u449667423/domains/360coordinates.com/public_html/demo1/uploads/properties
chmod -R 755 /home/u449667423/domains/360coordinates.com/public_html/demo1/uploads
```

### Issue: "Directory is not writable"
**Solution**:
```bash
chmod -R 775 /home/u449667423/domains/360coordinates.com/public_html/demo1/uploads
chown -R www-data:www-data /home/u449667423/domains/360coordinates.com/public_html/demo1/uploads
```

### Issue: "Failed to move file to property folder"
**Possible Causes**:
1. Directory doesn't exist
2. Insufficient permissions
3. Disk space full
4. Path resolution incorrect

**Check**:
- Run the test script to verify paths
- Check error logs: `tail -f /path/to/php_errors.log`
- Verify directory exists and is writable

## Verification Steps

1. **Run Test Script**: Access `test-upload-paths-html.php` in browser
2. **Check All Tests Pass**: All tests should show ✓ (green)
3. **Test Actual Upload**: Upload an image through the application
4. **Verify File Location**: Check that file exists in `uploads/properties/{property_id}/`
5. **Verify URL**: Check that image URL is accessible in browser

## Expected Results

### Successful Configuration:
- ✅ All constants defined
- ✅ All directories exist and are writable
- ✅ Paths resolve to `public_html/demo1/uploads/`
- ✅ URLs point to `https://demo1.360coordinates.com/uploads/`
- ✅ File operations work correctly

### Example Successful Upload:
- **Physical Path**: `/home/u449667423/domains/360coordinates.com/public_html/demo1/uploads/properties/123/img_1234567890_abc123.jpg`
- **URL**: `https://demo1.360coordinates.com/uploads/properties/123/img_1234567890_abc123.jpg`

## Notes

- Paths use `dirname(__DIR__, 2)` to automatically resolve to `demo1/` directory
- This works from any file in the `backend/` directory structure
- On localhost, paths will resolve differently but should still work
- All paths use forward slashes (`/`) which work on both Linux and Windows

## Support

If issues persist:
1. Check PHP error logs
2. Run test scripts
3. Verify file permissions
4. Check disk space
5. Verify web server can write to upload directories

