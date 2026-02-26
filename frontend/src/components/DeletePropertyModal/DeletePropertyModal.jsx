import React, { useState } from 'react';
import './DeletePropertyModal.css';

const DeletePropertyModal = ({ isOpen, onClose, onConfirm }) => {
  const [isChecked, setIsChecked] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (isChecked) {
      onConfirm();
      setIsChecked(false);
      onClose();
    }
  };

  const handleClose = () => {
    setIsChecked(false);
    onClose();
  };

  return (
    <div className="delete-property-modal-overlay" onClick={handleClose}>
      <div className="delete-property-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="delete-property-modal-header">
          <h3>⚠️ Delete Property?</h3>
        </div>
        <div className="delete-property-modal-body">
          <p className="delete-property-warning-text">
            This action is permanent. All data will be lost and cannot be restored. You'll need to add the property again from scratch.
          </p>
          <label className="delete-property-checkbox-label">
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(e) => setIsChecked(e.target.checked)}
              className="delete-property-checkbox"
            />
            <span>I agree to permanently delete this property.</span>
          </label>
        </div>
        <div className="delete-property-modal-footer">
          <button
            className={`delete-property-cancel-btn ${!isChecked ? 'primary' : ''}`}
            onClick={handleClose}
          >
            Cancel
          </button>
          <button
            className={`delete-property-confirm-btn ${isChecked ? 'destructive' : ''}`}
            onClick={handleConfirm}
            disabled={!isChecked}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeletePropertyModal;

