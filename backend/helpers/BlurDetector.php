<?php
/**
 * Blur Detection Helper
 * Detects blur in images using Laplacian variance method
 */

class BlurDetector {
    
    /**
     * Calculate blur score using Laplacian variance method
     * 
     * @param string $imagePath Path to image file
     * @return array ['blur_score' => float, 'is_blurry' => bool, 'quality_rating' => string]
     */
    public static function calculateBlurScore($imagePath) {
        try {
            if (!file_exists($imagePath)) {
                return [
                    'success' => false,
                    'blur_score' => 1.0,
                    'is_blurry' => true,
                    'quality_rating' => 'very_poor',
                    'error' => 'Image file not found'
                ];
            }
            
            // Check if GD extension is available
            if (!extension_loaded('gd')) {
                error_log("BlurDetector: GD extension not loaded, using fallback method");
                return self::fallbackBlurDetection($imagePath);
            }
            
            // Load image based on type
            $imageInfo = @getimagesize($imagePath);
            if ($imageInfo === false) {
                return [
                    'success' => false,
                    'blur_score' => 1.0,
                    'is_blurry' => true,
                    'quality_rating' => 'very_poor',
                    'error' => 'Invalid image file'
                ];
            }
            
            $mimeType = $imageInfo['mime'];
            $image = null;
            
            switch ($mimeType) {
                case 'image/jpeg':
                case 'image/jpg':
                    $image = @imagecreatefromjpeg($imagePath);
                    break;
                case 'image/png':
                    $image = @imagecreatefrompng($imagePath);
                    break;
                case 'image/webp':
                    if (function_exists('imagecreatefromwebp')) {
                        $image = @imagecreatefromwebp($imagePath);
                    }
                    break;
                default:
                    return [
                        'success' => false,
                        'blur_score' => 1.0,
                        'is_blurry' => true,
                        'quality_rating' => 'very_poor',
                        'error' => 'Unsupported image type'
                    ];
            }
            
            if ($image === false || $image === null) {
                return [
                    'success' => false,
                    'blur_score' => 1.0,
                    'is_blurry' => true,
                    'quality_rating' => 'very_poor',
                    'error' => 'Failed to load image'
                ];
            }
            
            // Convert to grayscale
            $width = imagesx($image);
            $height = imagesy($image);
            $grayImage = imagecreatetruecolor($width, $height);
            
            for ($x = 0; $x < $width; $x++) {
                for ($y = 0; $y < $height; $y++) {
                    $rgb = imagecolorat($image, $x, $y);
                    $r = ($rgb >> 16) & 0xFF;
                    $g = ($rgb >> 8) & 0xFF;
                    $b = $rgb & 0xFF;
                    $gray = (int)(0.299 * $r + 0.587 * $g + 0.114 * $b);
                    imagesetpixel($grayImage, $x, $y, imagecolorallocate($grayImage, $gray, $gray, $gray));
                }
            }
            
            // Apply Laplacian kernel (edge detection)
            // Laplacian kernel:
            // [ 0 -1  0]
            // [-1  4 -1]
            // [ 0 -1  0]
            $laplacianValues = [];
            
            for ($x = 1; $x < $width - 1; $x++) {
                for ($y = 1; $y < $height - 1; $y++) {
                    $center = imagecolorat($grayImage, $x, $y) & 0xFF;
                    $top = imagecolorat($grayImage, $x, $y - 1) & 0xFF;
                    $bottom = imagecolorat($grayImage, $x, $y + 1) & 0xFF;
                    $left = imagecolorat($grayImage, $x - 1, $y) & 0xFF;
                    $right = imagecolorat($grayImage, $x + 1, $y) & 0xFF;
                    
                    $laplacian = abs(4 * $center - $top - $bottom - $left - $right);
                    $laplacianValues[] = $laplacian;
                }
            }
            
            // Calculate variance
            $mean = array_sum($laplacianValues) / count($laplacianValues);
            $variance = 0;
            foreach ($laplacianValues as $value) {
                $variance += pow($value - $mean, 2);
            }
            $variance = $variance / count($laplacianValues);
            
            // Clean up
            imagedestroy($image);
            imagedestroy($grayImage);
            
            // Convert variance to blur score (0.0 = sharp, 1.0 = very blurry)
            // Lower variance = more blurry
            // Normalize: variance typically ranges from 0 to ~10000 for sharp images
            // We'll use a threshold-based approach
            $blurScore = 0.0;
            
            if ($variance < 100) {
                // Very blurry
                $blurScore = 0.8 + (100 - $variance) / 100 * 0.2;
            } elseif ($variance < 500) {
                // Blurry
                $blurScore = 0.5 + (500 - $variance) / 400 * 0.3;
            } elseif ($variance < 1000) {
                // Somewhat blurry
                $blurScore = 0.3 + (1000 - $variance) / 500 * 0.2;
            } elseif ($variance < 2000) {
                // Acceptable
                $blurScore = 0.1 + (2000 - $variance) / 1000 * 0.2;
            } else {
                // Sharp
                $blurScore = min(0.1, max(0.0, 0.1 - ($variance - 2000) / 10000));
            }
            
            // Clamp to 0-1 range
            $blurScore = max(0.0, min(1.0, $blurScore));
            
            // Determine quality rating based on variance
            $qualityRating = 'good';
            if ($variance < 100) {
                $qualityRating = 'very_poor';
            } elseif ($variance < 500) {
                $qualityRating = 'poor';
            } elseif ($variance < 1000) {
                $qualityRating = 'acceptable';
            }
            
            require_once __DIR__ . '/../config/moderation.php';
            
            // Blur decision logic:
            // IF variance < HIGH_BLUR_THRESHOLD: REJECT (highly blurry - motion blur / defocus)
            // ELSE: ACCEPT (includes medium blur and clear images)
            // 
            // Medium blur (50-100) is common for outdoor properties, landscape shots,
            // wide-angle photos, and mobile camera uploads - these are ACCEPTED
            
            $blurSeverity = 'LOW'; // Clear/sharp (default)
            $isBlurry = false;
            
            if ($variance < HIGH_BLUR_THRESHOLD) {
                // Highly blurry - reject (motion blur / defocus)
                $blurSeverity = 'HIGH';
                $isBlurry = true;
            } elseif ($variance < MEDIUM_BLUR_THRESHOLD) {
                // Medium blur - accept (visible edges and structures)
                $blurSeverity = 'MEDIUM';
                $isBlurry = false;
            } else {
                // Clear/sharp - accept
                $blurSeverity = 'LOW';
                $isBlurry = false;
            }
            
            // Log variance and severity for debugging (without exposing to user)
            error_log("BlurDetector: variance={$variance}, high_threshold=" . HIGH_BLUR_THRESHOLD . ", medium_threshold=" . MEDIUM_BLUR_THRESHOLD . ", severity={$blurSeverity}, is_blurry=" . ($isBlurry ? 'true' : 'false'));
            
            return [
                'success' => true,
                'blur_score' => round($blurScore, 3),  // Kept for backward compatibility/logging
                'is_blurry' => $isBlurry,
                'quality_rating' => $qualityRating,
                'variance' => round($variance, 2),
                'blur_severity' => $blurSeverity  // Internal use only - not exposed to user
            ];
            
        } catch (Exception $e) {
            error_log("BlurDetector::calculateBlurScore - Error: " . $e->getMessage());
            return [
                'success' => false,
                'blur_score' => 1.0,
                'is_blurry' => true,
                'quality_rating' => 'very_poor',
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Fallback blur detection method (simpler, less accurate)
     * Used when GD extension is not available
     */
    private static function fallbackBlurDetection($imagePath) {
        // Simple file size based heuristic (very rough)
        $fileSize = filesize($imagePath);
        $imageInfo = @getimagesize($imagePath);
        
        if ($imageInfo === false) {
            return [
                'blur_score' => 1.0,
                'is_blurry' => true,
                'quality_rating' => 'very_poor',
                'error' => 'Invalid image'
            ];
        }
        
        $width = $imageInfo[0];
        $height = $imageInfo[1];
        $pixels = $width * $height;
        
        // Rough estimate: very small files relative to dimensions might be low quality
        $bytesPerPixel = $fileSize / $pixels;
        
        // Very rough blur score based on compression
        if ($bytesPerPixel < 0.5) {
            $blurScore = 0.7; // Likely heavily compressed/blurry
        } elseif ($bytesPerPixel < 1.0) {
            $blurScore = 0.4;
        } elseif ($bytesPerPixel < 2.0) {
            $blurScore = 0.2;
        } else {
            $blurScore = 0.1;
        }
        
        require_once __DIR__ . '/../config/moderation.php';
        // Fallback method: use blur_score for decision (less accurate)
        // For fallback, we still use blur_score > 0.4 as it's a different heuristic
        $isBlurry = $blurScore > 0.4;
        
        // Log for debugging
        error_log("BlurDetector (fallback): blur_score={$blurScore}, is_blurry=" . ($isBlurry ? 'true' : 'false'));
        
        return [
            'success' => true,
            'blur_score' => round($blurScore, 3),
            'is_blurry' => $isBlurry,
            'quality_rating' => $isBlurry ? 'poor' : 'acceptable',
            'method' => 'fallback'
        ];
    }
}

