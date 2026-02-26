<?php
/**
 * Watermark Service
 * Adds "360coordinates" watermark to approved images
 * Similar to NoBroker style - diagonal repeating pattern + bottom-right corner
 */

require_once __DIR__ . '/../config/moderation.php';

class WatermarkService {
    
    /**
     * Add watermark to image
     * 
     * @param string $imagePath Path to image file
     * @return bool True on success, false on failure
     */
    public static function addWatermark($imagePath) {
        try {
            if (!file_exists($imagePath)) {
                error_log("WatermarkService: Image file not found: {$imagePath}");
                return false;
            }
            
            // Check if GD extension is available
            if (!extension_loaded('gd')) {
                error_log("WatermarkService: GD extension not loaded");
                return false;
            }
            
            // Get image info
            $imageInfo = @getimagesize($imagePath);
            if ($imageInfo === false) {
                error_log("WatermarkService: Invalid image file: {$imagePath}");
                return false;
            }
            
            $width = $imageInfo[0];
            $height = $imageInfo[1];
            $mimeType = $imageInfo['mime'];
            
            // Load image based on type
            $image = null;
            switch ($mimeType) {
                case 'image/jpeg':
                case 'image/jpg':
                    $image = @imagecreatefromjpeg($imagePath);
                    break;
                case 'image/png':
                    $image = @imagecreatefrompng($imagePath);
                    // Preserve transparency
                    imagealphablending($image, false);
                    imagesavealpha($image, true);
                    break;
                case 'image/webp':
                    if (function_exists('imagecreatefromwebp')) {
                        $image = @imagecreatefromwebp($imagePath);
                    }
                    break;
                default:
                    error_log("WatermarkService: Unsupported image type: {$mimeType}");
                    return false;
            }
            
            if ($image === false || $image === null) {
                error_log("WatermarkService: Failed to load image: {$imagePath}");
                return false;
            }
            
            // GD alpha: 0 = opaque, 127 = transparent. Higher = more transparent
            $alpha = defined('WATERMARK_OPACITY') ? (int) WATERMARK_OPACITY : 70;
            $alpha = max(0, min(127, $alpha));
            $watermarkColor = imagecolorallocatealpha(
                $image,
                defined('WATERMARK_COLOR_R') ? WATERMARK_COLOR_R : 255,
                defined('WATERMARK_COLOR_G') ? WATERMARK_COLOR_G : 255,
                defined('WATERMARK_COLOR_B') ? WATERMARK_COLOR_B : 255,
                $alpha
            );
            
            // Scale factor: smaller watermark (scale 1–2 instead of 2–4)
            $scale = max(1, min(2, (int)(min($width, $height) / 280)));
            $fontSize = defined('WATERMARK_FONT_SIZE') ? (int) WATERMARK_FONT_SIZE : 16;
            
            // Add diagonal repeating watermark pattern
            self::addDiagonalWatermark($image, $width, $height, $watermarkColor, $fontSize, $scale);
            
            // Add bottom-right corner watermark (larger, always visible)
            self::addCornerWatermark($image, $width, $height, $watermarkColor, $fontSize, $scale);
            
            // Save image
            $success = false;
            switch ($mimeType) {
                case 'image/jpeg':
                case 'image/jpg':
                    $success = @imagejpeg($image, $imagePath, 90); // 90% quality
                    break;
                case 'image/png':
                    $success = @imagepng($image, $imagePath, 9); // 9 = highest compression
                    break;
                case 'image/webp':
                    if (function_exists('imagewebp')) {
                        $success = @imagewebp($image, $imagePath, 90);
                    }
                    break;
            }
            
            // Clean up
            imagedestroy($image);
            
            if (!$success) {
                error_log("WatermarkService: Failed to save watermarked image: {$imagePath}");
                return false;
            }
            
            return true;
            
        } catch (Exception $e) {
            error_log("WatermarkService::addWatermark - Error: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
            return false;
        }
    }
    
    /**
     * Add diagonal repeating watermark pattern (scaled text for visibility)
     */
    private static function addDiagonalWatermark($image, $width, $height, $color, $fontSize, $scale = 2) {
        $text = WATERMARK_TEXT;
        $angle = WATERMARK_ANGLE;
        $maxDiagonalWatermarks = 5;
        $font = 5;
        $tw = imagefontwidth($font) * strlen($text);
        $th = imagefontheight($font);
        $textWidth = $tw * $scale;
        $textHeight = $th * $scale;
        $marginX = $width * 0.1;
        $marginY = $height * 0.1;
        $usableWidth = $width - 2 * $marginX;
        $usableHeight = $height - 2 * $marginY;
        $positions = [
            [0.2, 0.3], [0.5, 0.3], [0.8, 0.3],
            [0.2, 0.7], [0.5, 0.7], [0.8, 0.7]
        ];
        for ($i = 0; $i < $maxDiagonalWatermarks && $i < count($positions); $i++) {
            list($xRatio, $yRatio) = $positions[$i];
            $baseX = $marginX + $xRatio * $usableWidth;
            $baseY = $marginY + $yRatio * $usableHeight;
            $rad = deg2rad($angle);
            $cx = $width / 2;
            $cy = $height / 2;
            $dx = $baseX - $cx;
            $dy = $baseY - $cy;
            $posX = (int) ($cx + ($dx * cos($rad) - $dy * sin($rad)) - $textWidth / 2);
            $posY = (int) ($cy + ($dx * sin($rad) + $dy * cos($rad)) - $textHeight / 2);
            $posX = max(0, min($posX, $width - $textWidth));
            $posY = max(0, min($posY, $height - $textHeight));
            self::drawScaledString($image, $posX, $posY, $text, $color, $font, $scale);
        }
    }
    
    /**
     * Add bottom-right corner watermark (scaled for visibility)
     */
    private static function addCornerWatermark($image, $width, $height, $color, $fontSize, $scale = 2) {
        $text = WATERMARK_TEXT;
        $font = 5;
        $tw = imagefontwidth($font) * strlen($text);
        $th = imagefontheight($font);
        $textWidth = $tw * $scale;
        $textHeight = $th * $scale;
        $padding = 20;
        $posX = max(0, $width - $textWidth - $padding);
        $posY = max(0, $height - $textHeight - $padding);
        self::drawScaledString($image, $posX, $posY, $text, $color, $font, $scale);
    }
    
    /**
     * Draw text scaled up so it is visible on large images (built-in font is ~8px).
     * Uses a small canvas, scales it, then copies only the text pixels to avoid black rectangles on JPEG.
     */
    private static function drawScaledString($image, $destX, $destY, $text, $color, $font, $scale) {
        $scale = max(1, min(5, (int) $scale));
        $w = imagefontwidth($font) * strlen($text);
        $h = imagefontheight($font);
        $dstW = $w * $scale;
        $dstH = $h * $scale;
        $imgW = imagesx($image);
        $imgH = imagesy($image);
        $canvas = @imagecreatetruecolor($w, $h);
        if ($canvas === false) {
            imagestring($image, $font, $destX, $destY, $text, $color);
            return;
        }
        $black = imagecolorallocate($canvas, 0, 0, 0);
        $white = imagecolorallocate($canvas, 255, 255, 255);
        imagefill($canvas, 0, 0, $black);
        imagestring($canvas, $font, 0, 0, $text, $white);
        $scaled = @imagecreatetruecolor($dstW, $dstH);
        if ($scaled === false) {
            imagedestroy($canvas);
            imagestring($image, $font, $destX, $destY, $text, $color);
            return;
        }
        imagecopyresampled($scaled, $canvas, 0, 0, 0, 0, $dstW, $dstH, $w, $h);
        imagedestroy($canvas);
        for ($dy = 0; $dy < $dstH; $dy++) {
            for ($dx = 0; $dx < $dstW; $dx++) {
                $px = $destX + $dx;
                $py = $destY + $dy;
                if ($px < 0 || $px >= $imgW || $py < 0 || $py >= $imgH) {
                    continue;
                }
                $rgb = @imagecolorat($scaled, $dx, $dy);
                $r = ($rgb >> 16) & 0xFF;
                $g = ($rgb >> 8) & 0xFF;
                $b = $rgb & 0xFF;
                if ($r > 200 && $g > 200 && $b > 200) {
                    imagesetpixel($image, $px, $py, $color);
                }
            }
        }
        imagedestroy($scaled);
    }
}

