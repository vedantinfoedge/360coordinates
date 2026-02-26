import React, { useState, useRef } from 'react';
import { API_BASE_URL } from '../config/api.config';
import './ImageUploadWithModeration.css';

/**
 * Image Upload Component with Moderation
 * Handles uploading property images with Google Vision API moderation
 * Shows specific error messages for rejected images
 * 
 * Props:
 * - propertyId (required): Property ID to associate images with
 * - onUploadComplete (optional): Callback when all uploads complete
 */
const ImageUploadWithModeration = ({ propertyId, onUploadComplete }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadStatus, setUploadStatus] = useState({});
  const [errorMessages, setErrorMessages] = useState({});
  const [errorCodes, setErrorCodes] = useState({});
  const [errorDetails, setErrorDetails] = useState({});
  const [isUploading, setIsUploading] = useState(false);
  const [previews, setPreviews] = useState({});
  const fileInputRef = useRef(null);

  // Handle file selection
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    
    // Validate files
    const validFiles = [];
    const errors = {};
    
    files.forEach((file) => {
      // Check file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        errors[file.name] = 'Invalid file type. Only JPG, PNG, and WebP are allowed.';
        return;
      }
      
      // Check file size (5MB max)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        errors[file.name] = 'Image file is too large. Maximum size is 5MB.';
        return;
      }
      
      validFiles.push(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviews(prev => ({
          ...prev,
          [file.name]: e.target.result
        }));
      };
      reader.readAsDataURL(file);
    });
    
    // Update state
    setSelectedFiles(prev => [...prev, ...validFiles]);
    setErrorMessages(prev => ({ ...prev, ...errors }));
    setUploadStatus(prev => {
      const newStatus = { ...prev };
      validFiles.forEach(file => {
        newStatus[file.name] = 'pending';
      });
      return newStatus;
    });
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove file from selection
  const removeFile = (filename) => {
    setSelectedFiles(prev => prev.filter(file => file.name !== filename));
    setUploadStatus(prev => {
      const newStatus = { ...prev };
      delete newStatus[filename];
      return newStatus;
    });
    setErrorMessages(prev => {
      const newStatus = { ...prev };
      delete newStatus[filename];
      return newStatus;
    });
    setErrorCodes(prev => {
      const newStatus = { ...prev };
      delete newStatus[filename];
      return newStatus;
    });
    setErrorDetails(prev => {
      const newStatus = { ...prev };
      delete newStatus[filename];
      return newStatus;
    });
    setPreviews(prev => {
      const newStatus = { ...prev };
      delete newStatus[filename];
      return newStatus;
    });
  };

  // Upload single file
  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('property_id', propertyId);

    try {
      setUploadStatus(prev => ({ ...prev, [file.name]: 'uploading' }));
      setErrorMessages(prev => {
        const newStatus = { ...prev };
        delete newStatus[file.name];
        return newStatus;
      });
      setErrorCodes(prev => {
        const newStatus = { ...prev };
        delete newStatus[file.name];
        return newStatus;
      });
      setErrorDetails(prev => {
        const newStatus = { ...prev };
        delete newStatus[file.name];
        return newStatus;
      });

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/images/moderate-and-upload.php`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      // CRITICAL: Check moderation_status explicitly, not just response status
      // Backend returns: { status: "success", data: { moderation_status: "PENDING" | "NEEDS_REVIEW" | "SAFE" } }
      const moderationStatus = data.data?.moderation_status;
      
      // Only mark as approved when moderation_status is explicitly "SAFE"
      if (moderationStatus === 'SAFE') {
        setUploadStatus(prev => ({ ...prev, [file.name]: 'approved' }));
        return { success: true, data };
      } 
      // Handle PENDING or NEEDS_REVIEW - mark as reviewing, NOT approved
      else if (moderationStatus === 'PENDING' || moderationStatus === 'NEEDS_REVIEW' || data.status === 'pending_review') {
        setUploadStatus(prev => ({ ...prev, [file.name]: 'reviewing' }));
        return { success: true, data, pending: true };
      }
      // Legacy support: If status is success but no moderation_status, treat as pending (not approved)
      else if (data.status === 'success') {
        console.warn('Response missing moderation_status, treating as pending review');
        setUploadStatus(prev => ({ ...prev, [file.name]: 'reviewing' }));
        return { success: true, data, pending: true };
      } 
      else if (data.status === 'error') {
        setUploadStatus(prev => ({ ...prev, [file.name]: 'rejected' }));
        setErrorMessages(prev => ({
          ...prev,
          [file.name]: data.message || 'Upload failed'
        }));
        setErrorCodes(prev => ({
          ...prev,
          [file.name]: data.error_code || 'unknown'
        }));
        setErrorDetails(prev => ({
          ...prev,
          [file.name]: data.details || {}
        }));
        return { success: false, error: data.message, errorCode: data.error_code, details: data.details };
      } else {
        setUploadStatus(prev => ({ ...prev, [file.name]: 'rejected' }));
        setErrorMessages(prev => ({
          ...prev,
          [file.name]: data.message || 'Upload failed'
        }));
        return { success: false, error: data.message || 'Upload failed' };
      }
    } catch (error) {
      setUploadStatus(prev => ({ ...prev, [file.name]: 'rejected' }));
      setErrorMessages(prev => ({
        ...prev,
        [file.name]: error.message || 'Network error occurred'
      }));
      return { success: false, error: error.message };
    }
  };

  // Upload all files
  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      return;
    }

    setIsUploading(true);

    // Upload files one by one
    const results = [];
    for (const file of selectedFiles) {
      const result = await uploadFile(file);
      results.push({ file: file.name, ...result });
    }

    setIsUploading(false);

    // Call completion callback
    if (onUploadComplete) {
      onUploadComplete(results);
    }
  };

  // Get status icon
  const getStatusIcon = (status, errorCode) => {
    switch (status) {
      case 'uploading':
        return <div className="status-spinner"></div>;
      case 'approved':
        return <span className="status-icon approved">✓</span>;
      case 'rejected':
        // Show specific icon based on error code
        if (errorCode === 'animal_detected') {
          return <span className="status-icon rejected animal">🐾</span>;
        } else if (errorCode === 'blur_detected') {
          return <span className="status-icon rejected blur">📷</span>;
        } else if (errorCode === 'low_quality') {
          return <span className="status-icon rejected quality">📐</span>;
        }
        return <span className="status-icon rejected">✗</span>;
      case 'reviewing':
        return <span className="status-icon reviewing">⏱</span>;
      default:
        return null;
    }
  };

  // Get status text
  const getStatusText = (status) => {
    switch (status) {
      case 'uploading':
        return 'Checking image...';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      case 'reviewing':
        return 'Under Review';
      default:
        return 'Pending';
    }
  };

  // Get error icon for display
  const getErrorIcon = (errorCode) => {
    switch (errorCode) {
      case 'animal_detected':
        return '🐾';
      case 'blur_detected':
        return '📷';
      case 'low_quality':
        return '📐';
      case 'adult_content':
      case 'violence_content':
      case 'racy_content':
        return '🚫';
      default:
        return '❌';
    }
  };

  return (
    <div className="image-upload-moderation">
      <div className="upload-header">
        <h3>Upload Property Images</h3>
        <p className="upload-hint">
          Upload clear property images (JPG, PNG, WebP, max 5MB each). 
          Images will be automatically checked for quality and content.
        </p>
      </div>

      <div className="file-input-wrapper">
        <input
          type="file"
          ref={fileInputRef}
          accept="image/jpeg,image/jpg,image/png,image/webp"
          multiple
          onChange={handleFileSelect}
          className="file-input"
          id="image-upload-input"
        />
        <label htmlFor="image-upload-input" className="file-input-label">
          <span className="upload-icon">📷</span>
          <span>Select Images</span>
        </label>
      </div>

      {selectedFiles.length > 0 && (
        <div className="selected-files">
          <div className="files-list">
            {selectedFiles.map((file) => {
              const isRejected = uploadStatus[file.name] === 'rejected';
              const errorCode = errorCodes[file.name];
              const errorDetail = errorDetails[file.name];
              
              return (
                <div key={file.name} className={`file-item ${isRejected ? 'rejected' : ''}`}>
                  <div className="file-preview">
                    {previews[file.name] && (
                      <img src={previews[file.name]} alt={file.name} />
                    )}
                  </div>
                  <div className="file-info">
                    <div className="file-name">{file.name}</div>
                    <div className="file-size">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                    <div className="file-status">
                      {getStatusIcon(uploadStatus[file.name], errorCode)}
                      <span className={`status-text ${uploadStatus[file.name] || 'pending'}`}>
                        {getStatusText(uploadStatus[file.name])}
                      </span>
                    </div>
                    {isRejected && errorMessages[file.name] && (
                      <div className="file-error-box">
                        <div className="error-header">
                          <span className="error-icon">{getErrorIcon(errorCode)}</span>
                          <span className="error-title">REJECTED</span>
                        </div>
                        <div className="error-message">
                          {errorMessages[file.name]}
                        </div>
                        {errorDetail && errorDetail.detected_issue && (
                          <div className="error-detail">
                            {errorDetail.detected_issue}
                          </div>
                        )}
                        {errorDetail && errorDetail.animal_confidence && (
                          <div className="error-detail">
                            Confidence: {errorDetail.animal_confidence}%
                          </div>
                        )}
                      </div>
                    )}
                    {uploadStatus[file.name] === 'reviewing' && (
                      <div className="file-review-box">
                        <span className="review-icon">⏱</span>
                        <span className="review-message">
                          Your image is being reviewed and will be approved shortly.
                        </span>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="remove-file-btn"
                    onClick={() => removeFile(file.name)}
                    disabled={uploadStatus[file.name] === 'uploading'}
                    title="Remove image"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            className="upload-btn"
            onClick={handleUpload}
            disabled={isUploading || selectedFiles.length === 0}
          >
            {isUploading ? 'Uploading...' : `Upload ${selectedFiles.length} Image(s)`}
          </button>
        </div>
      )}
    </div>
  );
};

export default ImageUploadWithModeration;
