<?php
/**
 * Moderation Decision Service
 * Evaluates Google Vision API responses and makes moderation decisions
 * 
 * Processing Flow (ENFORCED ORDER):
 * 1. File validation
 * 2. Dimension check
 * 3. Google Vision API call
 * 4. SafeSearch evaluation
 * 5. Human detection (face OR object localization only, NOT labels alone)
 * 6. Animal detection (object localization OR label+object, NOT labels alone)
 * 7. Property context scoring
 * 8. Final decision (approve / reject / manual review)
 */

require_once __DIR__ . '/../config/moderation.php';
require_once __DIR__ . '/../helpers/FileHelper.php';

// Ensure error message function is available
if (!function_exists('getErrorMessage')) {
    require_once __DIR__ . '/../config/moderation.php';
}

// Ensure moderation thresholds are defined (with fallback defaults)
if (!defined('MODERATION_ADULT_THRESHOLD')) {
    define('MODERATION_ADULT_THRESHOLD', 0.6);
}
if (!defined('MODERATION_VIOLENCE_THRESHOLD')) {
    define('MODERATION_VIOLENCE_THRESHOLD', 0.6);
}
if (!defined('MODERATION_RACY_THRESHOLD')) {
    define('MODERATION_RACY_THRESHOLD', 0.6);
}
if (!defined('MODERATION_FACE_THRESHOLD')) {
    define('MODERATION_FACE_THRESHOLD', 0.5);  // Strict threshold for human face detection
}
if (!defined('MODERATION_HUMAN_OBJECT_THRESHOLD')) {
    define('MODERATION_HUMAN_OBJECT_THRESHOLD', 0.5);  // Strict threshold for human object detection
}
if (!defined('MODERATION_HUMAN_LABEL_THRESHOLD')) {
    define('MODERATION_HUMAN_LABEL_THRESHOLD', 0.6);  // Threshold for human label detection
}
if (!defined('MODERATION_ANIMAL_OBJECT_THRESHOLD')) {
    define('MODERATION_ANIMAL_OBJECT_THRESHOLD', 0.5);  // Strict threshold for animal object detection
}
if (!defined('MODERATION_ANIMAL_LABEL_THRESHOLD')) {
    define('MODERATION_ANIMAL_LABEL_THRESHOLD', 0.6);  // Strict threshold for animal label detection
}
if (!defined('MIN_IMAGE_WIDTH')) {
    define('MIN_IMAGE_WIDTH', 400);
}
if (!defined('MIN_IMAGE_HEIGHT')) {
    define('MIN_IMAGE_HEIGHT', 300);
}
if (!defined('PROPERTY_CONTEXT_THRESHOLD')) {
    define('PROPERTY_CONTEXT_THRESHOLD', 0.3);
}

class ModerationDecisionService {
    
    /**
     * Evaluate vision API response and make moderation decision
     * 
     * @param array $visionResponse Response from GoogleVisionService
     * @param string $imagePath Path to image file for quality checks
     * @return array Decision with status, message, reason_code, and details
     */
    public function evaluate($visionResponse, $imagePath) {
        $details = [
            'detected_issue' => null,
            'image_dimensions' => null,
            'blur_score' => null,
            'human_detected' => false,
            'animal_detected' => false,
            'animal_labels' => [],
            'property_labels' => []
        ];
        
        // STEP 1: Check Image Quality First (Dimensions)
        $dimensions = FileHelper::getImageDimensions($imagePath);
        if ($dimensions) {
            $details['image_dimensions'] = $dimensions['width'] . 'x' . $dimensions['height'];
            
            // Check minimum dimensions
            if ($dimensions['width'] < MIN_IMAGE_WIDTH || $dimensions['height'] < MIN_IMAGE_HEIGHT) {
                return [
                    'status' => 'REJECTED',
                    'message' => getErrorMessage('low_quality', [
                        'width' => $dimensions['width'],
                        'height' => $dimensions['height']
                    ]),
                    'reason_code' => 'low_quality',
                    'details' => array_merge($details, [
                        'detected_issue' => "Image dimensions too small: {$dimensions['width']}x{$dimensions['height']}",
                        'required_dimensions' => MIN_IMAGE_WIDTH . 'x' . MIN_IMAGE_HEIGHT
                    ])
                ];
            }
        } else {
            // Could not read dimensions, but continue with other checks
            error_log("ModerationDecisionService: Could not read image dimensions for: {$imagePath}");
        }
        
        // STEP 2: Blur Detection - DISABLED
        // Blur detection has been removed from the moderation system
        
        // Check if API call was successful
        if (!$visionResponse['success']) {
            return [
                'status' => 'PENDING',
                'message' => 'Moderation service temporarily unavailable. Image will be reviewed manually.',
                'reason_code' => 'api_error',
                'details' => array_merge($details, [
                    'detected_issue' => 'Google Vision API error: ' . ($visionResponse['error'] ?? 'Unknown error')
                ])
            ];
        }
        
        // Reject images with phone, email, or visiting/business card (OCR-based)
        $hasPhone = !empty($visionResponse['has_phone']);
        $hasEmail = !empty($visionResponse['has_email']);
        $isVisitingCard = !empty($visionResponse['is_visiting_card']);
        if ($hasPhone || $hasEmail || $isVisitingCard) {
            $reasons = array_filter([
                $hasPhone ? 'phone number' : null,
                $hasEmail ? 'email address' : null,
                $isVisitingCard ? 'visiting/business card' : null
            ]);
            return [
                'status' => 'REJECTED',
                'message' => getErrorMessage('ocr_content_rejected'),
                'reason_code' => 'ocr_content_rejected',
                'details' => array_merge($details, [
                    'detected_issue' => 'OCR detected disallowed content: ' . implode(', ', $reasons),
                    'has_phone' => $hasPhone,
                    'has_email' => $hasEmail,
                    'is_visiting_card' => $isVisitingCard
                ])
            ];
        }
        
        // Reject images with high text content (e.g. documents, posters, heavy signage)
        if (!empty($visionResponse['is_high_text'])) {
            return [
                'status' => 'REJECTED',
                'message' => getErrorMessage('high_text_rejected'),
                'reason_code' => 'high_text_rejected',
                'details' => array_merge($details, [
                    'detected_issue' => 'Image contains too much text. Please upload only property photos without documents or text-heavy images.'
                ])
            ];
        }
        
        $scores = $visionResponse['safesearch_scores'] ?? [];
        $labels = $visionResponse['labels'] ?? [];
        $faces = $visionResponse['faces'] ?? [];
        $objects = $visionResponse['objects'] ?? [];
        
        $adult = $scores['adult'] ?? 0.0;
        $racy = $scores['racy'] ?? 0.0;
        $violence = $scores['violence'] ?? 0.0;
        
        // STEP 3: Check for HUMANS - STRICT MODE
        // Reject image STRICTLY IF:
        // - Face detection confidence ≥ 0.5 (STRICT threshold)
        // OR
        // - Object localization detects "Person" or "People" with confidence ≥ 0.5 (STRICT threshold)
        // OR
        // - Human label detected with confidence ≥ 0.6 AND (face OR object also detected)
        // This ensures comprehensive human detection
        
        // Check Face Detection (HIGHEST PRIORITY)
        if (!empty($faces)) {
            foreach ($faces as $face) {
                $faceConfidence = $face['detection_confidence'] ?? 0.0;
                if ($faceConfidence >= MODERATION_FACE_THRESHOLD) {
                    return [
                        'status' => 'REJECTED',
                        'message' => getErrorMessage('human_detected'),
                        'reason_code' => 'human_detected',
                        'details' => array_merge($details, [
                            'detected_issue' => "Human face detected (confidence: " . round($faceConfidence * 100, 1) . "%)",
                            'human_detected' => true,
                            'face_confidence' => round($faceConfidence * 100, 1),
                            'detection_method' => 'face_detection'
                        ])
                    ];
                }
            }
        }
        
        // Check Object Localization for Person/People
        if (!empty($objects)) {
            foreach ($objects as $object) {
                $objectName = strtolower($object['name'] ?? '');
                $objectScore = $object['score'] ?? 0.0;
                
                // Check if object is "Person" or "People" with confidence ≥ 0.6
                if (($objectName === 'person' || $objectName === 'people' || $objectName === 'human') && 
                    $objectScore >= MODERATION_HUMAN_OBJECT_THRESHOLD) {
                    return [
                        'status' => 'REJECTED',
                        'message' => getErrorMessage('human_detected'),
                        'reason_code' => 'human_detected',
                        'details' => array_merge($details, [
                            'detected_issue' => ucfirst($object['name']) . " detected (confidence: " . round($objectScore * 100, 1) . "%)",
                            'human_detected' => true,
                            'object_confidence' => round($objectScore * 100, 1),
                            'detection_method' => 'object_localization'
                        ])
                    ];
                }
            }
        }
        
        // Check Labels for humans (as backup detection - STRICT MODE)
        // Reject if human label detected with high confidence AND (face OR object also detected)
        $humanLabels = defined('HUMAN_LABELS') ? HUMAN_LABELS : [];
        $detectedHumanLabels = [];
        $hasHumanFace = !empty($faces);
        $hasHumanObject = false;
        
        // Check if we already detected human objects
        if (!empty($objects)) {
            foreach ($objects as $object) {
                $objectName = strtolower($object['name'] ?? '');
                if ($objectName === 'person' || $objectName === 'people' || $objectName === 'human') {
                    $hasHumanObject = true;
                    break;
                }
            }
        }
        
        foreach ($labels as $label) {
            $description = strtolower($label['description'] ?? '');
            $score = $label['score'] ?? 0.0;
            
            // Check if label matches any human label
            foreach ($humanLabels as $humanLabel) {
                $humanLabelLower = strtolower($humanLabel);
                if (stripos($description, $humanLabelLower) !== false || $description === $humanLabelLower) {
                    if ($score >= MODERATION_HUMAN_LABEL_THRESHOLD) {
                        $detectedHumanLabels[] = [
                            'name' => $label['description'],
                            'confidence' => round($score * 100, 1)
                        ];
                    }
                }
            }
        }
        
        // Reject if human label detected AND (face OR object also detected) - STRICT
        if (!empty($detectedHumanLabels) && ($hasHumanFace || $hasHumanObject)) {
            usort($detectedHumanLabels, function($a, $b) {
                return $b['confidence'] <=> $a['confidence'];
            });
            $topHumanLabel = $detectedHumanLabels[0];
            
            return [
                'status' => 'REJECTED',
                'message' => getErrorMessage('human_detected'),
                'reason_code' => 'human_detected',
                'details' => array_merge($details, [
                    'detected_issue' => "Human label detected: " . $topHumanLabel['name'] . " (confidence: " . $topHumanLabel['confidence'] . "%) with face/object confirmation",
                    'human_detected' => true,
                    'label_confidence' => $topHumanLabel['confidence'],
                    'detection_method' => 'label_with_face_or_object'
                ])
            ];
        }
        
        // STEP 4: Check for ANIMALS - STRICT MODE
        // Reject image STRICTLY IF:
        // - Object localization detects an animal with confidence ≥ 0.5 (STRICT threshold)
        // OR
        // - Animal label confidence ≥ 0.6 AND animal object is also detected (STRICT threshold)
        // This ensures comprehensive animal detection
        
        $animalLabels = defined('ANIMAL_LABELS') ? ANIMAL_LABELS : [];
        $detectedAnimalObjects = [];
        $detectedAnimalLabels = [];
        
        // First, check Object Localization for animals
        if (!empty($objects)) {
            foreach ($objects as $object) {
                $objectName = strtolower($object['name'] ?? '');
                $objectScore = $object['score'] ?? 0.0;
                
                // Check if object matches any animal label
                foreach ($animalLabels as $animalLabel) {
                    $animalLabelLower = strtolower($animalLabel);
                    if ($objectName === $animalLabelLower || stripos($objectName, $animalLabelLower) !== false) {
                        if ($objectScore >= MODERATION_ANIMAL_OBJECT_THRESHOLD) {
                            $detectedAnimalObjects[] = [
                                'name' => $object['name'],
                                'confidence' => round($objectScore * 100, 1)
                            ];
                        }
                    }
                }
            }
        }
        
        // Check Labels for animals (only used if combined with object detection)
        foreach ($labels as $label) {
            $description = strtolower($label['description'] ?? '');
            $score = $label['score'] ?? 0.0;
            
            // Check if label matches any animal label
            foreach ($animalLabels as $animalLabel) {
                $animalLabelLower = strtolower($animalLabel);
                if (stripos($description, $animalLabelLower) !== false || $description === $animalLabelLower) {
                    if ($score >= MODERATION_ANIMAL_LABEL_THRESHOLD) {
                        $detectedAnimalLabels[] = [
                            'name' => $label['description'],
                            'confidence' => round($score * 100, 1)
                        ];
                    }
                }
            }
        }
        
        // Reject if object detected with confidence ≥ 0.6
        if (!empty($detectedAnimalObjects)) {
            usort($detectedAnimalObjects, function($a, $b) {
                return $b['confidence'] <=> $a['confidence'];
            });
            $topAnimal = $detectedAnimalObjects[0];
            
            return [
                'status' => 'REJECTED',
                'message' => getErrorMessage('animal_detected', [
                    'animal_name' => $topAnimal['name']
                ]),
                'reason_code' => 'animal_detected',
                'details' => array_merge($details, [
                    'detected_issue' => ucfirst($topAnimal['name']) . " detected via object localization (confidence: {$topAnimal['confidence']}%)",
                    'animal_detected' => true,
                    'animal_labels' => array_map(function($a) { return $a['name']; }, $detectedAnimalObjects),
                    'animal_confidence' => $topAnimal['confidence'],
                    'detection_method' => 'object_localization'
                ])
            ];
        }
        
        // Reject if label ≥ 0.7 AND object also detected
        if (!empty($detectedAnimalLabels) && !empty($detectedAnimalObjects)) {
            usort($detectedAnimalLabels, function($a, $b) {
                return $b['confidence'] <=> $a['confidence'];
            });
            $topAnimalLabel = $detectedAnimalLabels[0];
            
            return [
                'status' => 'REJECTED',
                'message' => getErrorMessage('animal_detected', [
                    'animal_name' => $topAnimalLabel['name']
                ]),
                'reason_code' => 'animal_detected',
                'details' => array_merge($details, [
                    'detected_issue' => ucfirst($topAnimalLabel['name']) . " detected via label (confidence: {$topAnimalLabel['confidence']}%) with object confirmation",
                    'animal_detected' => true,
                    'animal_labels' => array_map(function($a) { return $a['name']; }, $detectedAnimalLabels),
                    'animal_confidence' => $topAnimalLabel['confidence'],
                    'detection_method' => 'label_with_object'
                ])
            ];
        }
        
        // STEP 5: Check SafeSearch (standardized thresholds: all 0.6)
        // SafeSearch checks must run AFTER image quality checks but BEFORE final approval
        if ($adult >= MODERATION_ADULT_THRESHOLD) {
            return [
                'status' => 'REJECTED',
                'message' => getErrorMessage('adult_content'),
                'reason_code' => 'adult_content',
                'details' => array_merge($details, [
                    'detected_issue' => "Adult content detected (score: {$adult})",
                    'confidence_scores' => $scores
                ])
            ];
        }
        
        if ($violence >= MODERATION_VIOLENCE_THRESHOLD) {
            return [
                'status' => 'REJECTED',
                'message' => getErrorMessage('violence_content'),
                'reason_code' => 'violence_content',
                'details' => array_merge($details, [
                    'detected_issue' => "Violent content detected (score: {$violence})",
                    'confidence_scores' => $scores
                ])
            ];
        }
        
        if ($racy >= MODERATION_RACY_THRESHOLD) {
            return [
                'status' => 'REJECTED',
                'message' => 'This image contains suggestive content and cannot be uploaded.',
                'reason_code' => 'racy_content',
                'details' => array_merge($details, [
                    'detected_issue' => "Suggestive content detected (score: {$racy})",
                    'confidence_scores' => $scores
                ])
            ];
        }
        
        // STEP 6: Check Property Context (score-based, not binary)
        // Property context must be score-based, not binary
        // Compute: propertyContextScore = (property-related detections) / (total meaningful detections)
        // If propertyContextScore >= 0.3 → Acceptable
        // If propertyContextScore < 0.3 → Flag for manual review
        // Do NOT auto-reject based only on missing property labels
        
        $propertyLabels = defined('PROPERTY_LABELS') ? PROPERTY_LABELS : [];
        $propertyLabelsFound = [];
        $propertyObjectsFound = [];
        $totalMeaningfulDetections = 0;
        
        // Count property-related labels
        foreach ($labels as $label) {
            $description = $label['description'] ?? '';
            $score = $label['score'] ?? 0.0;
            
            // Only count meaningful detections (score > 0.3)
            if ($score > 0.3) {
                $totalMeaningfulDetections++;
                
                foreach ($propertyLabels as $propertyLabel) {
                    if (stripos($description, $propertyLabel) !== false) {
                        $propertyLabelsFound[] = $description;
                        break;
                    }
                }
            }
        }
        
        // Count property-related objects
        if (!empty($objects)) {
            foreach ($objects as $object) {
                $objectName = strtolower($object['name'] ?? '');
                $objectScore = $object['score'] ?? 0.0;
                
                // Only count meaningful detections (score > 0.3)
                if ($objectScore > 0.3) {
                    $totalMeaningfulDetections++;
                    
                    // Check if object is property-related
                    $propertyObjectNames = ['building', 'house', 'room', 'interior', 'exterior', 'structure'];
                    foreach ($propertyObjectNames as $propObjName) {
                        if ($objectName === $propObjName || stripos($objectName, $propObjName) !== false) {
                            $propertyObjectsFound[] = $object['name'];
                            break;
                        }
                    }
                }
            }
        }
        
        $propertyDetections = count($propertyLabelsFound) + count($propertyObjectsFound);
        $propertyContextScore = $totalMeaningfulDetections > 0 
            ? ($propertyDetections / $totalMeaningfulDetections) 
            : 0.0;
        
        $details['property_labels'] = array_unique(array_merge($propertyLabelsFound, $propertyObjectsFound));
        $details['property_context_score'] = round($propertyContextScore, 3);
        
        // If property context score is too low, flag for manual review (but don't auto-reject)
        if ($propertyContextScore < PROPERTY_CONTEXT_THRESHOLD && $totalMeaningfulDetections > 0) {
            return [
                'status' => 'NEEDS_REVIEW',
                'message' => 'This image may not be a property photo. Under review.',
                'reason_code' => 'not_property',
                'details' => array_merge($details, [
                    'detected_issue' => "Low property context score: {$propertyContextScore} (threshold: " . PROPERTY_CONTEXT_THRESHOLD . ")",
                    'detected_labels' => array_slice(array_map(function($l) { return $l['description']; }, $labels), 0, 5),
                    'property_detections' => $propertyDetections,
                    'total_detections' => $totalMeaningfulDetections
                ])
            ];
        }
        
        // STEP 10: All checks passed - APPROVED
        return [
            'status' => 'APPROVED',
            'message' => 'Image approved successfully.',
            'reason_code' => 'approved',
            'details' => array_merge($details, [
                'detected_issue' => 'Image passed all moderation checks',
                'property_labels' => $propertyLabelsFound
            ])
        ];
    }
}
