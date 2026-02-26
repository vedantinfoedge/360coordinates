// Validation utility functions

/**
 * Sanitize input to prevent XSS attacks
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  // Remove HTML tags
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Validate Indian phone number
 */
export const validateIndianPhone = (phone) => {
  if (!phone) return { valid: false, message: 'Phone number is required' };
  
  const cleaned = phone.replace(/\D/g, '');
  const isValid = /^[6-9]\d{9}$/.test(cleaned);
  
  return {
    valid: isValid,
    message: isValid ? '' : 'Invalid Indian phone number (must be 10 digits starting with 6-9)',
    cleaned: cleaned
  };
};

/**
 * Validate email format
 */
export const validateEmail = (email) => {
  if (!email) return { valid: false, message: 'Email is required' };
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValid = emailRegex.test(email);
  
  return {
    valid: isValid,
    message: isValid ? '' : 'Invalid email format'
  };
};

/**
 * Validate GST number format
 */
export const validateGST = (gstNumber) => {
  if (!gstNumber) return { valid: true, message: '' }; // Optional field
  
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  const isValid = gstRegex.test(gstNumber.toUpperCase());
  
  return {
    valid: isValid,
    message: isValid ? '' : 'Invalid GST number format (15 alphanumeric characters)'
  };
};

/**
 * Validate URL format
 */
export const validateURL = (url) => {
  if (!url) return { valid: true, message: '' }; // Optional field
  
  try {
    // Add protocol if missing
    let urlToValidate = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      urlToValidate = 'https://' + url;
    }
    
    new URL(urlToValidate);
    return { valid: true, message: '' };
  } catch {
    return { valid: false, message: 'Invalid URL format' };
  }
};

/**
 * Validate latitude
 */
export const validateLatitude = (lat) => {
  if (!lat) return { valid: true, message: '' }; // Optional field
  
  const num = parseFloat(lat);
  const isValid = !isNaN(num) && num >= -90 && num <= 90;
  
  return {
    valid: isValid,
    message: isValid ? '' : 'Latitude must be between -90 and 90'
  };
};

/**
 * Validate longitude
 */
export const validateLongitude = (lng) => {
  if (!lng) return { valid: true, message: '' }; // Optional field
  
  const num = parseFloat(lng);
  const isValid = !isNaN(num) && num >= -180 && num <= 180;
  
  return {
    valid: isValid,
    message: isValid ? '' : 'Longitude must be between -180 and 180'
  };
};

/** Default max area (sq.ft) for built-up / non-plot properties */
export const DEFAULT_AREA_MAX_SQFT = 100000;
/** Max area (sq.ft) for Plot / Land - 5 lakh */
export const PLOT_LAND_AREA_MAX_SQFT = 500000;

/**
 * Validate area (sq.ft)
 */
export const validateArea = (area, min = 100, max = DEFAULT_AREA_MAX_SQFT) => {
  if (!area) return { valid: false, message: 'Area is required' };
  
  const num = parseFloat(area);
  if (isNaN(num) || num <= 0) {
    return { valid: false, message: 'Area must be a positive number' };
  }
  
  if (num < min) {
    return { valid: false, message: `Area must be at least ${min} sq.ft` };
  }
  
  if (num > max) {
    return { valid: false, message: `Area cannot exceed ${max} sq.ft` };
  }
  
  return { valid: true, message: '' };
};

/**
 * Validate price
 */
export const validatePrice = (price, status = 'sale') => {
  if (!price) return { valid: false, message: 'Price is required' };
  
  const num = parseFloat(price);
  if (isNaN(num) || num <= 0) {
    return { valid: false, message: 'Price must be greater than 0' };
  }
  
  if (status === 'sale' && num < 100000) {
    return { valid: false, message: 'Sale price must be at least ₹1,00,000' };
  }
  
  if (status === 'rent' && num < 5000) {
    return { valid: false, message: 'Rent must be at least ₹5,000/month' };
  }
  
  return { valid: true, message: '' };
};

/**
 * Validate text length
 */
export const validateTextLength = (text, min, max, fieldName = 'Field') => {
  if (!text || !text.trim()) {
    return { valid: false, message: `${fieldName} is required` };
  }
  
  const length = text.trim().length;
  
  if (min && length < min) {
    return { valid: false, message: `${fieldName} must be at least ${min} characters` };
  }
  
  if (max && length > max) {
    return { valid: false, message: `${fieldName} cannot exceed ${max} characters` };
  }
  
  return { valid: true, message: '' };
};

/**
 * Validate image file
 */
export const validateImageFile = (file) => {
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  if (!file) {
    return { valid: false, message: 'Please select an image file' };
  }
  
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, message: 'Invalid file type. Only JPG, PNG, and WEBP are allowed' };
  }
  
  if (file.size > MAX_SIZE) {
    return { valid: false, message: `File size exceeds 5MB. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB` };
  }
  
  return { valid: true, message: '' };
};

/**
 * Validate image dimensions
 */
export const validateImageDimensions = (file, minWidth = 200, minHeight = 200) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      if (img.width < minWidth || img.height < minHeight) {
        resolve({
          valid: false,
          message: `Image dimensions too small. Minimum: ${minWidth}x${minHeight}px. Current: ${img.width}x${img.height}px`
        });
      } else {
        resolve({ valid: true, message: '' });
      }
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      resolve({ valid: false, message: 'Invalid image file' });
    };
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Validate deposit amount for rent
 */
export const validateDeposit = (deposit, rent) => {
  if (!deposit) return { valid: true, message: '' }; // Optional field
  
  const depositNum = parseFloat(deposit);
  const rentNum = parseFloat(rent);
  
  if (isNaN(depositNum) || depositNum <= 0) {
    return { valid: false, message: 'Deposit must be a positive number' };
  }
  
  if (!isNaN(rentNum) && depositNum > rentNum * 12) {
    return { valid: false, message: 'Deposit cannot exceed 12 months rent' };
  }
  
  return { valid: true, message: '' };
};

/**
 * Validate carpet area vs built-up area
 */
export const validateCarpetArea = (carpetArea, builtUpArea) => {
  if (!carpetArea) return { valid: true, message: '' }; // Optional field
  
  const carpetNum = parseFloat(carpetArea);
  const builtUpNum = parseFloat(builtUpArea);
  
  if (isNaN(carpetNum) || carpetNum <= 0) {
    return { valid: false, message: 'Carpet area must be a positive number' };
  }
  
  if (!isNaN(builtUpNum) && carpetNum > builtUpNum) {
    return { valid: false, message: 'Carpet area cannot exceed built-up area' };
  }
  
  return { valid: true, message: '' };
};

/**
 * Validate floor number vs total floors (numbers only)
 */
export const validateFloors = (floor, totalFloors) => {
  if (!floor || !totalFloors) return { valid: true, message: '' }; // Optional fields

  const floorNum = parseInt(floor, 10);
  const totalNum = parseInt(totalFloors, 10);

  if (isNaN(floorNum) || !/^\d+$/.test(String(floor).trim())) {
    return { valid: false, message: 'Floor must be a number' };
  }
  if (isNaN(totalNum)) {
    return { valid: true, message: '' };
  }

  if (floorNum > totalNum) {
    return { valid: false, message: 'Floor number cannot exceed total floors' };
  }
  if (floorNum < 0) {
    return { valid: false, message: 'Floor number cannot be negative' };
  }

  return { valid: true, message: '' };
};
