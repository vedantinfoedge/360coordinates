import React, { useState, useEffect, useRef } from 'react';
import {
  validateIndianPhone,
  validateEmail,
  validateGST,
  validateURL,
  validateTextLength,
  sanitizeInput,
  validateImageFile
} from '../../utils/validation';
import { sellerProfileAPI } from '../../services/api.service';
import { useProperty } from './PropertyContext';
import { useAuth } from '../../context/AuthContext';
import '../styles/SellerProfile.css';

const SellerProfile = () => {
  const { getStats } = useProperty();
  const { user } = useAuth();
  const stats = getStats();
  const [activeTab, setActiveTab] = useState('personal');
  const [isEditing, setIsEditing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [profileImage, setProfileImage] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [memberSince, setMemberSince] = useState(null);
  const [sellerVerified, setSellerVerified] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showImageMenu, setShowImageMenu] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [cameraFacingMode, setCameraFacingMode] = useState('environment'); // 'environment' (rear) or 'user' (front)
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const imageMenuRef = useRef(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    whatsappNumber: '',
    alternateMobile: '',
    agencyName: '',
    agencyAddress: '',
    gstNumber: '',
    reraNumber: '',
    address: '',
    website: '',
    facebook: '',
    instagram: '',
    linkedin: ''
  });


  // Track isEditing state changes for debugging
  useEffect(() => {
    console.log('isEditing state changed to:', isEditing);
  }, [isEditing]);

  // Fetch profile data from backend
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await sellerProfileAPI.get();
        
        if (response.success && response.data && response.data.profile) {
          const profile = response.data.profile;
          
          // Split full_name into firstName and lastName
          const nameParts = (profile.full_name || '').split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';
          
          // Parse social_links
          let socialLinks = profile.social_links || {};
          if (typeof socialLinks === 'string') {
            try {
              socialLinks = JSON.parse(socialLinks);
            } catch (e) {
              socialLinks = {};
            }
          }
          
          // Set profile image (from users table)
          setProfileImage(profile.profile_image || '');
          
          // Set member since date from created_at
          if (profile.created_at) {
            setMemberSince(profile.created_at);
          }
          
          // Store seller verified status (using agent_verified field from backend)
          setSellerVerified(profile.agent_verified === 1 || profile.agent_verified === true);
          
          console.log('Initial profile load - WhatsApp number:', profile.whatsapp_number);
          console.log('Initial profile load - Alternate mobile:', profile.alternate_mobile);
          setFormData({
            firstName: firstName,
            lastName: lastName,
            email: profile.email || '',
            phone: profile.phone || '',
            whatsappNumber: profile.whatsapp_number || '',
            alternateMobile: profile.alternate_mobile || '',
            agencyName: profile.company_name || '',
            agencyAddress: profile.address || '',
            gstNumber: profile.gst_number || '',
            reraNumber: profile.license_number || '',
            address: profile.address || '',
            website: profile.website || '',
            facebook: socialLinks.facebook || '',
            instagram: socialLinks.instagram || '',
            linkedin: socialLinks.linkedin || ''
          });
          console.log('Initial formData set with profile values');
        } else {
          // If no profile, fall back to auth context user data
          if (user) {
            console.log('⚠️ No seller profile found, using auth context user data');
            const nameParts = (user.full_name || user.name || '').split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';
            
            setFormData({
              firstName: firstName,
              lastName: lastName,
              email: user.email || '',
              phone: user.phone || '',
              whatsappNumber: '',
              alternateMobile: '',
              agencyName: '',
              agencyAddress: '',
              gstNumber: '',
              reraNumber: '',
              address: '',
              website: '',
              facebook: '',
              instagram: '',
              linkedin: ''
            });
            setProfileImage(user.profile_image || '');
            if (user.created_at) {
              setMemberSince(user.created_at);
            }
          } else {
            // If no profile and no user, set empty values
            setProfileImage('');
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        // Fall back to auth context user data when API fails (e.g., for buyers)
        if (user) {
          console.log('⚠️ Profile API failed, using auth context user data as fallback');
          const nameParts = (user.full_name || user.name || '').split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';
          
          setFormData({
            firstName: firstName,
            lastName: lastName,
            email: user.email || '',
            phone: user.phone || '',
            whatsappNumber: '',
            alternateMobile: '',
            agencyName: '',
            agencyAddress: '',
            gstNumber: '',
            reraNumber: '',
            address: '',
            website: '',
            facebook: '',
            instagram: '',
            linkedin: ''
          });
          setProfileImage(user.profile_image || '');
          if (user.created_at) {
            setMemberSince(user.created_at);
          }
        } else {
          // Keep default empty values on error if no user
          setProfileImage('');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // Format member since date
  const formatMemberSince = (dateString) => {
    if (!dateString) return 'Member since recently';
    
    try {
      const date = new Date(dateString);
      const month = date.toLocaleDateString('en-US', { month: 'long' });
      const year = date.getFullYear();
      return `Member since ${month} ${year}`;
    } catch (error) {
      return 'Member since recently';
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let sanitizedValue = value;
    
    // Log changes to WhatsApp and alternate mobile for debugging
    if (name === 'whatsappNumber' || name === 'alternateMobile') {
      console.log(`Field ${name} changed:`, value);
    }
    
    // Convert firstName and lastName to uppercase, but keep email as is
    if (name === 'firstName' || name === 'lastName') {
      sanitizedValue = sanitizeInput(value.toUpperCase());
    } else if (['address', 'agencyName', 'agencyAddress'].includes(name)) {
      sanitizedValue = sanitizeInput(value);
    }
    // For WhatsApp and alternate mobile, keep the value as-is (user can type with formatting)
    // Backend will normalize it to digits only
    
    setFormData({
      ...formData,
      [name]: sanitizedValue
    });
    
    // Clear error when user makes changes
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };
  
  const validateProfile = () => {
    console.log('=== validateProfile called ===');
    console.log('Current formData for validation:', formData);
    const newErrors = {};
    
    // First Name validation
    const firstNameValidation = validateTextLength(formData.firstName, 2, 50, 'First name');
    console.log('First name validation:', firstNameValidation);
    if (!firstNameValidation.valid) {
      newErrors.firstName = firstNameValidation.message;
    } else if (!/^[a-zA-Z\s]+$/.test(formData.firstName)) {
      newErrors.firstName = 'First name should contain only letters';
    }
    
    // Last Name validation
    const lastNameValidation = validateTextLength(formData.lastName, 2, 50, 'Last name');
    if (!lastNameValidation.valid) {
      newErrors.lastName = lastNameValidation.message;
    } else if (!/^[a-zA-Z\s]+$/.test(formData.lastName)) {
      newErrors.lastName = 'Last name should contain only letters';
    }
    
    // Email validation
    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.valid) {
      newErrors.email = emailValidation.message;
    }
    
    // Phone validation - SKIPPED: Login mobile number cannot be changed and should not be validated
    // The phone field is read-only and excluded from profile updates
    
    // WhatsApp Number validation (optional)
    console.log('Validating WhatsApp number:', formData.whatsappNumber);
    if (formData.whatsappNumber) {
      const whatsappValidation = validateIndianPhone(formData.whatsappNumber);
      console.log('WhatsApp validation result:', whatsappValidation);
      if (!whatsappValidation.valid) {
        newErrors.whatsappNumber = whatsappValidation.message;
      }
    } else {
      console.log('WhatsApp number is empty/undefined - skipping validation (optional field)');
    }
    
    // Alternate Mobile validation (optional)
    console.log('Validating Alternate mobile:', formData.alternateMobile);
    if (formData.alternateMobile) {
      const altMobileValidation = validateIndianPhone(formData.alternateMobile);
      console.log('Alternate mobile validation result:', altMobileValidation);
      if (!altMobileValidation.valid) {
        newErrors.alternateMobile = altMobileValidation.message;
      }
    } else {
      console.log('Alternate mobile is empty/undefined - skipping validation (optional field)');
    }
    
    // Agency Name validation
    if (formData.agencyName) {
      const agencyValidation = validateTextLength(formData.agencyName, 2, 100, 'Agency name');
      if (!agencyValidation.valid) {
        newErrors.agencyName = agencyValidation.message;
      }
    }
    
    // GST validation
    if (formData.gstNumber) {
      const gstValidation = validateGST(formData.gstNumber);
      if (!gstValidation.valid) {
        newErrors.gstNumber = gstValidation.message;
      }
    }
    
    // Website validation
    if (formData.website) {
      const urlValidation = validateURL(formData.website);
      if (!urlValidation.valid) {
        newErrors.website = urlValidation.message;
      }
    }
    
    // Social media URL validations
    if (formData.facebook) {
      const fbValidation = validateURL(formData.facebook);
      if (!fbValidation.valid) {
        newErrors.facebook = 'Invalid Facebook URL';
      }
    }
    
    if (formData.instagram) {
      const igValidation = validateURL(formData.instagram);
      if (!igValidation.valid) {
        newErrors.instagram = 'Invalid Instagram URL';
      }
    }
    
    if (formData.linkedin) {
      const liValidation = validateURL(formData.linkedin);
      if (!liValidation.valid) {
        newErrors.linkedin = 'Invalid LinkedIn URL';
      }
    }
    
    // Address validation
    if (formData.address) {
      const addressValidation = validateTextLength(formData.address, 0, 500, 'Address');
      if (!addressValidation.valid) {
        newErrors.address = addressValidation.message;
      }
    }
    
    console.log('Validation errors found:', newErrors);
    console.log('Validation passed:', Object.keys(newErrors).length === 0);
    setErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0;
    console.log('=== validateProfile completed, returning:', isValid, '===');
    return isValid;
  };


  const handleImageSelect = () => {
    setShowImageMenu(false);
    fileInputRef.current?.click();
  };

  // Handle camera capture - Open camera modal
  const handleCameraCapture = async () => {
    setShowImageMenu(false);
    
    try {
      // Check if MediaDevices API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Camera is not supported on this device. Please use gallery upload instead.');
        return;
      }

      // Request camera access - default to back camera on mobile
      const constraints = {
        video: {
          facingMode: { exact: 'environment' }, // Try exact back camera first
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (exactError) {
        // If exact back camera fails, fallback to any environment camera
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: 'environment',
              width: { ideal: 1920 },
              height: { ideal: 1080 }
            }
          });
        } catch (fallbackError) {
          // If environment fails, try any available camera
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1920 },
              height: { ideal: 1080 }
            }
          });
        }
      }
      
      streamRef.current = stream;
      setCameraFacingMode('environment'); // Reset to back camera
      setShowCameraModal(true);
      
      // Set video stream when modal opens
      setTimeout(() => {
        if (videoRef.current && stream) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch (error) {
      console.error('Error accessing camera:', error);
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        alert('Camera permission denied. Please allow camera access and try again.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        alert('No camera found on this device. Please use gallery upload instead.');
      } else {
        alert('Failed to access camera. Please try again or use gallery upload.');
      }
    }
  };

  // Flip camera between front and back
  const flipCamera = async () => {
    const newFacingMode = cameraFacingMode === 'environment' ? 'user' : 'environment';
    
    // Stop current stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Start new stream with flipped camera
    try {
      const constraints = {
        video: {
          facingMode: { exact: newFacingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (exactError) {
        // Fallback to non-exact facingMode
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: newFacingMode,
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        });
      }

      setCameraFacingMode(newFacingMode);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (error) {
      console.error('Error flipping camera:', error);
      alert('Failed to switch camera. Please try again.');
    }
  };

  // Capture photo from camera
  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      
      // Convert to blob
      canvas.toBlob((blob) => {
        if (blob) {
          // Create a File object from blob
          const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
          setCapturedImage(file);
        }
      }, 'image/jpeg', 0.9);
    }
  };

  // Use captured photo
  const useCapturedPhoto = () => {
    if (capturedImage) {
      uploadProfileImage(capturedImage);
      closeCameraModal();
    }
  };

  // Retake photo
  const retakePhoto = () => {
    setCapturedImage(null);
  };

  // Close camera modal and stop stream
  const closeCameraModal = () => {
    // Stop video stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Clear video source
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setShowCameraModal(false);
    setCapturedImage(null);
  };

  // Upload profile image
  const uploadProfileImage = async (file) => {
    if (!file) return;

    // Validate image
    const validation = validateImageFile(file);
    if (!validation.valid) {
      alert(validation.message);
      return;
    }

    setUploadingImage(true);
    setImageError(false);

    try {
      // Upload image to backend
      const response = await sellerProfileAPI.uploadProfileImage(file);
      
      if (response.success && response.data && response.data.url) {
        setProfileImage(response.data.url);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        alert(response.message || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert(error.message || 'Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      if (cameraInputRef.current) {
        cameraInputRef.current.value = '';
      }
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadProfileImage(file);
    }
  };

  // Handle camera input change
  const handleCameraChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadProfileImage(file);
    }
  };

  // Close image menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showImageMenu && imageMenuRef.current && !imageMenuRef.current.contains(event.target)) {
        setShowImageMenu(false);
      }
    };
    
    // Use both mousedown and click to ensure menu closes properly
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showImageMenu]);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, []);

  const handleSave = async () => {
    console.log('=== handleSave function called ===');
    console.log('Current formData:', formData);
    console.log('Current isEditing state:', isEditing);
    
    // Close image menu if open
    if (showImageMenu) {
      console.log('Closing image menu');
      setShowImageMenu(false);
    }
    
    console.log('Validating profile...');
    const isValid = validateProfile();
    console.log('Validation result:', isValid);
    console.log('Validation errors:', errors);
    
    if (!isValid) {
      console.log('Validation failed - returning without saving');
      return; // Don't save if validation fails
    }
    
    try {
      console.log('Setting isEditing to false');
      setIsEditing(false);
      
      // Prepare data for backend
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      console.log('Full name prepared:', fullName);
      
      // Prepare address - use address field, fallback to agencyAddress, or empty string
      const addressValue = (formData.address || formData.agencyAddress || '').trim();
      console.log('Address prepared:', addressValue);
      
      // Prepare WhatsApp and Alternate Mobile numbers
      const whatsappValue = formData.whatsappNumber ? formData.whatsappNumber.trim() : '';
      const alternateMobileValue = formData.alternateMobile ? formData.alternateMobile.trim() : '';
      
      console.log('WhatsApp number raw:', formData.whatsappNumber);
      console.log('WhatsApp number prepared:', whatsappValue);
      console.log('Alternate mobile raw:', formData.alternateMobile);
      console.log('Alternate mobile prepared:', alternateMobileValue);
      
      // Exclude email and phone from update - they cannot be changed after login
      const updateData = {
        full_name: fullName,
        address: addressValue, // Always send address, even if empty, so it can be cleared
        whatsapp_number: whatsappValue,
        alternate_mobile: alternateMobileValue
      };
      
      console.log('=== Sending update data to API ===');
      console.log('Update data:', updateData);
      console.log('API endpoint: sellerProfileAPI.update');
      
      const response = await sellerProfileAPI.update(updateData);
      
      console.log('=== API Response received ===');
      console.log('Update response:', response);
      console.log('Response success:', response?.success);
      
      if (response.success) {
        console.log('Update successful! Showing success message');
        setShowSuccess(true);
        // Hide toast after 3 seconds with fade-out effect
        setTimeout(() => {
          setShowSuccess(false);
        }, 3000);
        
        // Refetch profile to ensure we have the latest data
        console.log('Refetching profile to get latest data...');
        try {
          const profileResponse = await sellerProfileAPI.get();
          console.log('Profile refetch response:', profileResponse);
          if (profileResponse.success && profileResponse.data && profileResponse.data.profile) {
            const profile = profileResponse.data.profile;
            console.log('Refetched profile data:', profile);
            
            // Split full_name into firstName and lastName
            const nameParts = (profile.full_name || '').split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';
            
            // Parse social_links if needed
            let socialLinks = profile.social_links || {};
            if (typeof socialLinks === 'string') {
              try {
                socialLinks = JSON.parse(socialLinks);
              } catch (e) {
                socialLinks = {};
              }
            }
            
            // Update all form data with fresh data from backend
            console.log('Updating formData with refetched profile');
            console.log('Refetched WhatsApp number:', profile.whatsapp_number);
            console.log('Refetched Alternate mobile:', profile.alternate_mobile);
            setFormData(prev => ({
              ...prev,
              firstName: firstName,
              lastName: lastName,
              address: profile.address || '',
              email: profile.email || prev.email,
              phone: profile.phone || prev.phone,
              whatsappNumber: profile.whatsapp_number || '',
              alternateMobile: profile.alternate_mobile || '',
              agencyName: profile.company_name || '',
              agencyAddress: profile.address || '',
              gstNumber: profile.gst_number || '',
              reraNumber: profile.license_number || '',
              website: profile.website || '',
              facebook: socialLinks.facebook || '',
              instagram: socialLinks.instagram || '',
              linkedin: socialLinks.linkedin || ''
            }));
            console.log('FormData updated with refetched values');
            
            // Update profile image if returned
            if (profile.profile_image) {
              setProfileImage(profile.profile_image);
            }
            
            console.log('Profile update completed successfully');
          }
        } catch (fetchError) {
          console.error('Error refetching profile:', fetchError);
          // Still update with response data if refetch fails
          if (response.data && response.data.profile) {
            const profile = response.data.profile;
            const nameParts = (profile.full_name || '').split(' ');
            setFormData(prev => ({
              ...prev,
              firstName: nameParts[0] || '',
              lastName: nameParts.slice(1).join(' ') || '',
              address: profile.address || prev.address || ''
            }));
          }
        }
      } else {
        console.error('Update failed - response.success is false');
        console.error('Response message:', response.message);
        console.error('Full response:', response);
        alert(response.message || 'Failed to update profile');
        console.log('Re-enabling editing mode');
        setIsEditing(true); // Re-enable editing on error
      }
    } catch (error) {
      console.error('=== Error in handleSave ===');
      console.error('Error updating profile:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      alert(error.message || 'Failed to update profile. Please try again.');
      console.log('Re-enabling editing mode due to error');
      setIsEditing(true); // Re-enable editing on error
    }
    console.log('=== handleSave function completed ===');
  };

  const tabs = [
    { id: 'personal', label: 'Personal Info', icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" stroke="currentColor" strokeWidth="2"/>
      </svg>
    )}
  ];

  if (loading) {
    return (
      <div className="seller-profile" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #003B73',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <p>Loading profile...</p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <div className="seller-profile">
      {/* Success Toast */}
      {showSuccess && (
        <div className="seller-profile-success-toast">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Profile updated successfully!
        </div>
      )}

      {/* Header */}
      <div className="seller-profile-header">
        <h1>Profile Settings</h1>
        <p className="seller-profile-subtitle">Manage your account information and preferences</p>
      </div>

      <div className="seller-profile-layout">
        {/* Profile Card */}
        <div className="seller-profile-card">
          <div className="seller-profile-cover"></div>
          <div className="seller-seller-profile-avatar-img-section">
            <div className="seller-seller-profile-avatar-img-wrapper" ref={imageMenuRef}>
              {/* Hidden file inputs */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
              <input
                type="file"
                ref={cameraInputRef}
                accept="image/*"
                capture="environment"
                onChange={handleCameraChange}
                style={{ display: 'none' }}
              />
              
              {profileImage && !imageError ? (
                <img 
                  src={profileImage} 
                  alt="Profile" 
                  className="seller-profile-avatar-img"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="seller-profile-avatar-initials">
                  {formData.firstName ? formData.firstName.charAt(0).toUpperCase() : ''}
                  {formData.lastName ? formData.lastName.charAt(0).toUpperCase() : ''}
                  {!formData.firstName && !formData.lastName ? 'U' : ''}
                </div>
              )}
              
              {/* Upload button with dropdown menu */}
              <div className="seller-avatar-upload-wrapper">
                <button 
                  className="seller-profile-avatar-seller-profile-edit-btn"
                  onClick={() => setShowImageMenu(!showImageMenu)}
                  disabled={uploadingImage}
                  title="Change profile photo"
                >
                  {uploadingImage ? (
                    <div className="spinner-small"></div>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke="currentColor" strokeWidth="2"/>
                      <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  )}
                </button>
                
                {/* Dropdown menu */}
                {showImageMenu && !uploadingImage && (
                  <div className="seller-image-upload-menu">
                    <button 
                      onClick={handleImageSelect}
                      className="seller-upload-menu-item"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>Upload from Device</span>
                    </button>
                    <button 
                      onClick={handleCameraCapture}
                      className="seller-upload-menu-item"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke="currentColor" strokeWidth="2"/>
                        <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      <span>Take Photo</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            <h2>
              {formData.firstName || formData.lastName 
                ? `${formData.firstName} ${formData.lastName}`.trim() 
                : 'Your Name'}
            </h2>
            <p className="seller-profile-role">Seller</p>
            
            {sellerVerified && (
              <div className="seller-profile-badges">
                <span className="seller-profile-badge verified">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                  Verified
                </span>
              </div>
            )}
          </div>

          <div className="seller-profile-stats-grid">
            <div className="seller-profile-stat-box">
              <span className="seller-profile-stat-value">{stats.totalProperties || 0}</span>
              <span className="seller-profile-stat-label">Listed</span>
            </div>
            <div className="seller-profile-stat-box">
              <span className="seller-profile-stat-value">{stats.totalInquiries || 0}</span>
              <span className="seller-profile-stat-label">Inquiries</span>
            </div>
          </div>

          <div className="seller-profile-member-since">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
              <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            {formatMemberSince(memberSince)}
          </div>
        </div>

        {/* Settings Content */}
        <div className="seller-profile-settings-content">
          {/* Tabs */}
          <div className="seller-profile-settings-tabs">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`seller-profile-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="seller-profile-tab-content">
            {activeTab === 'personal' && (
              <div className="seller-profile-settings-section">
                <div className="seller-profile-section-header">
                  <h3>Personal Information</h3>
                  {!isEditing && (
                    <button 
                      className="seller-profile-edit-btn" 
                      onClick={() => {
                        console.log('Edit button clicked - Setting isEditing to true');
                        setIsEditing(true);
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2"/>
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      Edit
                    </button>
                  )}
                </div>

                <div className="seller-profile-form-grid">
                  <div className="seller-profile-form-group">
                    <label>First Name</label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className={errors.firstName ? 'error' : ''}
                    />
                    {errors.firstName && <span className="seller-profile-error-text">{errors.firstName}</span>}
                  </div>

                  <div className="seller-profile-form-group">
                    <label>Last Name</label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className={errors.lastName ? 'error' : ''}
                    />
                    {errors.lastName && <span className="seller-profile-error-text">{errors.lastName}</span>}
                  </div>

                  <div className="seller-profile-form-group">
                    <label>Email Address</label>
                    <div className="seller-profile-input-with-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2"/>
                        <path d="M22 6l-10 7L2 6" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        readOnly
                        disabled
                        style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
                        className={errors.email ? 'error' : ''}
                      />
                    </div>
                  </div>

                  <div className="seller-profile-form-group">
                    <label>Phone Number</label>
                    <div className="seller-profile-input-with-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        readOnly
                        disabled
                        style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
                        className={errors.phone ? 'error' : ''}
                        placeholder="+917276*****"
                      />
                    </div>
                    <small style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                      Login mobile number (cannot be changed)
                    </small>
                  </div>

                  <div className="seller-profile-form-group">
                    <label>WhatsApp Number <span style={{ color: '#6b7280', fontWeight: 'normal' }}>(Optional)</span></label>
                    <div className="seller-profile-input-with-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      <input
                        type="tel"
                        name="whatsappNumber"
                        value={formData.whatsappNumber}
                        onChange={handleChange}
                        disabled={!isEditing}
                        placeholder="+917276*****"
                        className={errors.whatsappNumber ? 'error' : ''}
                      />
                    </div>
                    {errors.whatsappNumber && <span className="seller-profile-error-text">{errors.whatsappNumber}</span>}
                  </div>

                  <div className="seller-profile-form-group">
                    <label>Alternate Mobile Number <span style={{ color: '#6b7280', fontWeight: 'normal' }}>(Optional)</span></label>
                    <div className="seller-profile-input-with-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      <input
                        type="tel"
                        name="alternateMobile"
                        value={formData.alternateMobile}
                        onChange={handleChange}
                        disabled={!isEditing}
                        placeholder="+917276*****"
                        className={errors.alternateMobile ? 'error' : ''}
                      />
                    </div>
                    {errors.alternateMobile && <span className="seller-profile-error-text">{errors.alternateMobile}</span>}
                  </div>

                  <div className="seller-profile-form-group seller-profile-full-width">
                    <label>Address</label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      disabled={!isEditing}
                      rows={3}
                      className={errors.address ? 'error' : ''}
                    />
                    {errors.address && <span className="seller-profile-error-text">{errors.address}</span>}
                  </div>
                </div>

                {isEditing && (
                  <div className="seller-profile-form-actions">
                    <button 
                      type="button" 
                      className="seller-profile-cancel-btn" 
                      onClick={() => {
                        console.log('Cancel button clicked - Setting isEditing to false');
                        setIsEditing(false);
                      }}
                    >
                      Cancel
                    </button>
                    <button 
                      type="button" 
                      className="seller-profile-save-btn" 
                      onClick={() => {
                        console.log('Save Changes button clicked');
                        console.log('Current formData:', formData);
                        console.log('Current isEditing state:', isEditing);
                        handleSave();
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="2"/>
                        <path d="M17 21v-8H7v8M7 3v5h8" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      Save Changes
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Camera Modal */}
      {showCameraModal && (
        <div className="seller-camera-modal-overlay" onClick={closeCameraModal}>
          <div className="seller-camera-modal" onClick={(e) => e.stopPropagation()}>
            <div className="seller-camera-modal-header">
              <h3>Take Photo</h3>
              <button 
                className="seller-camera-close-btn"
                onClick={closeCameraModal}
                aria-label="Close camera"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            
            <div className="seller-camera-content">
              {!capturedImage ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="seller-camera-video"
                  />
                  <div className="seller-camera-controls">
                    <button 
                      className="seller-camera-flip-btn"
                      onClick={flipCamera}
                      aria-label="Flip camera"
                      title="Flip camera"
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M17 1l4 4-4 4M21 5H11M7 23l-4-4 4-4M3 19h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 12a3 3 0 11-6 0 3 3 0 016 0z" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                    </button>
                    <button 
                      className="seller-camera-capture-btn"
                      onClick={capturePhoto}
                      aria-label="Capture photo"
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2"/>
                        <circle cx="12" cy="12" r="4" fill="white"/>
                      </svg>
                    </button>
                    <button 
                      className="seller-camera-cancel-btn"
                      onClick={closeCameraModal}
                      aria-label="Cancel"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <img 
                    src={URL.createObjectURL(capturedImage)} 
                    alt="Captured" 
                    className="seller-camera-preview"
                  />
                  <div className="seller-camera-preview-controls">
                    <button 
                      className="seller-camera-retake-btn"
                      onClick={retakePhoto}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      Retake
                    </button>
                    <button 
                      className="seller-camera-use-btn"
                      onClick={useCapturedPhoto}
                      disabled={uploadingImage}
                    >
                      {uploadingImage ? (
                        <div className="spinner-small"></div>
                      ) : (
                        <>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Use Photo
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerProfile;