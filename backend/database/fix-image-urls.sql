-- Fix Image URLs in Database
-- This script removes '/backend' from image URLs to match actual file locations
-- 
-- Files are saved to: /uploads/properties/{id}/{filename}
-- URLs should be: https://demo1.360coordinates.com/uploads/properties/{id}/{filename}
-- NOT: https://demo1.360coordinates.com/backend/uploads/properties/{id}/{filename}

-- Step 1: Check current URLs (for verification)
SELECT 
    id, 
    property_id, 
    image_url,
    CASE 
        WHEN image_url LIKE '%/backend/uploads/%' THEN 'NEEDS FIX'
        ELSE 'OK'
    END as status
FROM property_images
LIMIT 10;

-- Step 2: Fix property_images table
UPDATE property_images 
SET image_url = REPLACE(image_url, '/backend/uploads/', '/uploads/') 
WHERE image_url LIKE '%/backend/uploads/%';

-- Step 3: Fix properties table main_image/cover_image (if exists)
UPDATE properties 
SET main_image = REPLACE(main_image, '/backend/uploads/', '/uploads/') 
WHERE main_image LIKE '%/backend/uploads/%';

UPDATE properties 
SET cover_image = REPLACE(cover_image, '/backend/uploads/', '/uploads/') 
WHERE cover_image LIKE '%/backend/uploads/%';

-- Step 4: Verify the fix
SELECT 
    id, 
    property_id, 
    image_url,
    CASE 
        WHEN image_url LIKE '%/backend/uploads/%' THEN 'STILL WRONG'
        WHEN image_url LIKE '%/uploads/%' THEN 'FIXED'
        ELSE 'CHECK MANUALLY'
    END as status
FROM property_images
LIMIT 10;

-- Step 5: Count how many were fixed
SELECT 
    COUNT(*) as total_images,
    SUM(CASE WHEN image_url LIKE '%/backend/uploads/%' THEN 1 ELSE 0 END) as still_wrong,
    SUM(CASE WHEN image_url LIKE '%/uploads/%' AND image_url NOT LIKE '%/backend/%' THEN 1 ELSE 0 END) as fixed
FROM property_images;

