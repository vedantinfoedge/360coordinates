import React, { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './PropertyUploadSuccessModal.css';

const PropertyUploadSuccessModal = ({ isOpen, onClose, redirectPath = '/agent-dashboard/properties' }) => {
  const navigate = useNavigate();

  const handleOK = useCallback(() => {
    onClose();
    // Redirect to My Properties / Dashboard
    navigate(redirectPath);
  }, [onClose, navigate, redirectPath]);

  // Handle Escape key press
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        handleOK();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, handleOK]);

  if (!isOpen) return null;

  return (
    <div className="property-upload-success-modal-overlay" onClick={handleOK}>
      <div className="property-upload-success-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="property-upload-success-modal-header">
          <h3>
            <span className="success-icon">✓</span>
            Property Uploaded Successfully
          </h3>
        </div>
        <div className="property-upload-success-modal-body">
          <p className="property-upload-success-description">
            You can edit this property only within 24 hours after upload.
          </p>
        </div>
        <div className="property-upload-success-modal-footer">
          <button
            className="property-upload-success-ok-btn"
            onClick={handleOK}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default PropertyUploadSuccessModal;

