import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authAPI, buyerProfileAPI, sellerProfileAPI } from '../../services/api.service';
import PropertyCard, { FavoritesManager, PropertyHistoryManager } from '../components/PropertyCard';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL, API_ENDPOINTS } from '../../config/api.config';
import BuyerProfileOverlay from '../components/BuyerProfileOverlay';
import '../styles/BuyerProfile.css';


const BuyerProfile = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showImageMenu, setShowImageMenu] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [profileImage, setProfileImage] = useState(
    user?.profile_image && user.profile_image.trim() !== '' ? user.profile_image : null
  );
  
  // Initialize form data with user data or empty
  const [formData, setFormData] = useState({
    firstName: user?.full_name?.split(' ')[0] || user?.first_name || '',
    lastName: user?.full_name?.split(' ').slice(1).join(' ') || user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    whatsappNumber: '',
    alternateMobile: '',
    address: ''
  });
  
  const [saving, setSaving] = useState(false);
  
  // Load user profile data on mount
  useEffect(() => {
    const loadProfile = async () => {
      if (user) {
        try {
          const response = await buyerProfileAPI.get();
          if (response.success && response.data && response.data.profile) {
            const profile = response.data.profile;
            const nameParts = profile.full_name?.split(' ') || [];
            setFormData({
              firstName: nameParts[0] || profile.first_name || '',
              lastName: nameParts.slice(1).join(' ') || profile.last_name || '',
              email: profile.email || '',
              phone: profile.phone || '',
              whatsappNumber: profile.whatsapp_number || '',
              alternateMobile: profile.alternate_mobile || '',
              address: profile.address || ''
            });
            setProfileImage(profile.profile_image && profile.profile_image.trim() !== '' ? profile.profile_image : null);
          } else {
            // Fallback to user data if profile API fails
            const nameParts = user.full_name?.split(' ') || [];
            setFormData({
              firstName: nameParts[0] || user.first_name || '',
              lastName: nameParts.slice(1).join(' ') || user.last_name || '',
              email: user.email || '',
              phone: user.phone || '',
              whatsappNumber: '',
              alternateMobile: '',
              address: ''
            });
            setProfileImage(user.profile_image && user.profile_image.trim() !== '' ? user.profile_image : null);
          }
        } catch (error) {
          console.error('Error loading profile:', error);
          // Fallback to user data
          const nameParts = user.full_name?.split(' ') || [];
          setFormData({
            firstName: nameParts[0] || user.first_name || '',
            lastName: nameParts.slice(1).join(' ') || user.last_name || '',
            email: user.email || '',
            phone: user.phone || '',
            address: ''
          });
          setProfileImage(user.profile_image || null);
        }
      }
    };
    
    loadProfile();
  }, [user]);
  
  // Handle image selection from device
  const handleImageSelect = () => {
    fileInputRef.current?.click();
  };
  
  // Handle camera capture - Open camera modal
  const handleCameraCapture = async () => {
    setShowImageMenu(false);
    
    try {
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment' // Use back camera by default, fallback to front
        } 
      });
      
      streamRef.current = stream;
      setShowCameraModal(true);
      
      // Set video stream when modal opens
      setTimeout(() => {
        if (videoRef.current && stream) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (error) {
      console.error('Error accessing camera:', error);
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        alert('Camera access denied. Please allow camera permission in your browser settings.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        alert('No camera found on this device.');
      } else {
        alert('Unable to access camera. Please try using "Upload from Device" instead.');
      }
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
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please select a valid image file (JPEG, PNG, or WebP)');
      return;
    }
    
    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      alert('Image size should be less than 5MB');
      return;
    }
    
    setUploadingImage(true);
    setShowImageMenu(false);
    
    try {
      // Reuse sellerProfileAPI.uploadProfileImage which now supports Firebase
      const data = await sellerProfileAPI.uploadProfileImage(file);
      
      if (data.success && data.data && data.data.url) {
        const imageUrl = data.data.url.trim();
        setProfileImage(imageUrl !== '' ? imageUrl : null);
        
        // Update user in localStorage
        if (user) {
          const updatedUser = { ...user, profile_image: data.data.url };
          localStorage.setItem('userData', JSON.stringify(updatedUser));
        }
        
        // Refresh user data from backend to ensure consistency
        try {
          const verifyResponse = await authAPI.verifyToken();
          if (verifyResponse.success && verifyResponse.data) {
            // AuthContext will update user data
          }
        } catch (error) {
          console.error('Error refreshing user data:', error);
        }
        
        alert('Profile image uploaded successfully!');
      } else {
        throw new Error(data.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert(error.message || 'Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      if (cameraInputRef.current) {
        cameraInputRef.current.value = '';
      }
    }
  };
  
  // Handle file input change
  const handleFileChange = (e) => {
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

  // Favorites state
  const [favoriteProperties, setFavoriteProperties] = useState([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  
  // History state
  const [viewHistory, setViewHistory] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date()); // For dynamic timestamp updates
  
  const [activeSection, setActiveSection] = useState('profile'); // 'profile', 'favorites', or 'history'

  // Load favorites on mount and when section changes to favorites
  useEffect(() => {
    if (activeSection === 'favorites') {
      loadFavorites();
    }
  }, [activeSection, user]);

  // Load history on mount and when section changes to history
  useEffect(() => {
    loadHistory(); // Always load history to show accurate count in button
  }, [user]);

  useEffect(() => {
    if (activeSection === 'history') {
      loadHistory(); // Reload when switching to history tab
    }
  }, [activeSection]);

  // Update current time every minute for dynamic timestamp display
  useEffect(() => {
    if (activeSection === 'history' && viewHistory.length > 0) {
      const interval = setInterval(() => {
        setCurrentTime(new Date());
      }, 60000); // Update every minute

      return () => clearInterval(interval);
    }
  }, [activeSection, viewHistory.length]);

  const loadHistory = async () => {
    try {
      const history = await PropertyHistoryManager.getHistory();
      // Sort by created_at (most recent first) - should already be sorted, but ensure it
      // Use ONLY created_at from history records (exact time when property was added to history)
      const sortedHistory = [...history].sort((a, b) => {
        const timeA = new Date(a.created_at || 0);
        const timeB = new Date(b.created_at || 0);
        return timeB - timeA;
      });
      setViewHistory(sortedHistory);
    } catch (error) {
      console.error('Error loading history:', error);
      setViewHistory([]);
    }
  };

  // Format timestamp for display with dynamic updates
  // Uses ONLY created_at from history records (exact time when property was added to history)
  const formatHistoryDate = (timestamp) => {
    try {
      // Validate timestamp exists and is valid
      if (!timestamp) {
        console.warn('Missing created_at timestamp in history entry');
        return 'Recently';
      }

      const date = new Date(timestamp);
      
      // Validate date is valid
      if (isNaN(date.getTime())) {
        console.warn('Invalid created_at timestamp:', timestamp);
        return 'Recently';
      }

      const now = currentTime; // Use currentTime state for dynamic updates
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      // Check if it's today
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      const dateOnly = new Date(date);
      dateOnly.setHours(0, 0, 0, 0);
      const isToday = dateOnly.getTime() === today.getTime();

      // Check if it's yesterday
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const isYesterday = dateOnly.getTime() === yesterday.getTime();

      if (diffMins < 1) {
        return 'Just now';
      } else if (diffMins < 60) {
        return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
      } else if (diffHours < 24 && isToday) {
        return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
      } else if (isYesterday) {
        return 'Yesterday';
      } else if (diffDays < 7) {
        return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
      } else {
        // Format as "12 Sep 2026" (day month year)
        const day = date.getDate();
        const month = date.toLocaleDateString('en-US', { month: 'short' });
        const year = date.getFullYear();
        return `${day} ${month} ${year}`;
      }
    } catch (error) {
      console.error('Error formatting history date:', error);
      return 'Recently';
    }
  };

  // Format action type for display
  const formatActionType = (actionType) => {
    if (actionType === 'chat_with_owner') {
      return 'Chatted with Owner';
    } else if (actionType === 'viewed_owner_details') {
      return 'Viewed Owner Details';
    }
    return 'Contacted Owner';
  };

  // Handle navigation to property details - open in new tab
  const handleViewProperty = (propertyId) => {
    window.open(`/details/${propertyId}`, '_blank', 'noopener,noreferrer');
  };

  const loadFavorites = async () => {
    if (!user) {
      setFavoriteProperties([]);
      return;
    }

    setFavoritesLoading(true);
    try {
      // Fetch favorites from API
      const { favoritesAPI } = await import('../../services/api.service');
      const response = await favoritesAPI.list();
      
      if (response.success && response.data) {
        // API returns properties array (not favorites array)
        const properties = response.data.properties || response.data.favorites || [];
        
        // Format properties from API response
        const formattedProperties = properties.map(prop => ({
          id: prop.id || prop.property_id,
          title: prop.title,
          location: prop.location,
          price: parseFloat(prop.price) || 0,
          image: prop.cover_image || (prop.images && Array.isArray(prop.images) && prop.images.length > 0 ? prop.images[0] : (typeof prop.images === 'string' ? prop.images : null)),
          images: Array.isArray(prop.images) ? prop.images : (prop.images ? [prop.images] : []),
          bedrooms: prop.bedrooms,
          bathrooms: prop.bathrooms,
          area: parseFloat(prop.area) || 0,
          status: prop.status === 'sale' ? 'For Sale' : prop.status === 'rent' ? 'For Rent' : (prop.status || 'For Sale')
        }));
        
        setFavoriteProperties(formattedProperties);
      } else {
        // Fallback: try to get from localStorage and fetch properties
        const favoriteIds = FavoritesManager.getFavorites();
        if (favoriteIds.length > 0) {
          try {
            const { propertiesAPI } = await import('../../services/api.service');
            const propertyPromises = favoriteIds.map(id => 
              propertiesAPI.getDetails(id).catch(() => null)
            );
            const propertyResponses = await Promise.all(propertyPromises);
            const validProperties = propertyResponses
              .filter(res => res && res.success && res.data && res.data.property)
              .map(res => {
                const prop = res.data.property;
                return {
                  id: prop.id,
                  title: prop.title,
                  location: prop.location,
                  price: parseFloat(prop.price) || 0,
                  image: prop.cover_image || (prop.images && Array.isArray(prop.images) && prop.images.length > 0 ? prop.images[0] : null),
                  images: Array.isArray(prop.images) ? prop.images : [],
                  bedrooms: prop.bedrooms,
                  bathrooms: prop.bathrooms,
                  area: parseFloat(prop.area) || 0,
                  status: prop.status === 'sale' ? 'For Sale' : prop.status === 'rent' ? 'For Rent' : 'For Sale'
                };
              });
            setFavoriteProperties(validProperties);
          } catch (error) {
            console.error('Error fetching favorite properties:', error);
            setFavoriteProperties([]);
          }
        } else {
          setFavoriteProperties([]);
        }
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
      setFavoriteProperties([]);
    } finally {
      setFavoritesLoading(false);
    }
  };

  const handleFavoriteToggle = () => {
    // Reload favorites when a favorite is toggled
    loadFavorites();
  };

  // Format member since date
  const formatMemberSince = (dateString) => {
    try {
      // If no dateString provided, use current date
      const date = dateString ? new Date(dateString) : new Date();
      
      // Validate date
      if (isNaN(date.getTime())) {
        // If invalid date, use current date
        const currentDate = new Date();
        const month = currentDate.toLocaleDateString('en-US', { month: 'long' });
        const year = currentDate.getFullYear();
        return `Member since ${month} ${year}`;
      }
      
      const month = date.toLocaleDateString('en-US', { month: 'long' });
      const year = date.getFullYear();
      return `Member since ${month} ${year}`;
    } catch (error) {
      // Fallback to current date if any error occurs
      const currentDate = new Date();
      const month = currentDate.toLocaleDateString('en-US', { month: 'long' });
      const year = currentDate.getFullYear();
      return `Member since ${month} ${year}`;
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Convert firstName and lastName to uppercase, but keep email as is
    const processedValue = (name === 'firstName' || name === 'lastName') 
      ? value.toUpperCase() 
      : value;
    setFormData({
      ...formData,
      [name]: processedValue
    });
  };

  const handleSave = async () => {
    setSaving(true);
    
    try {
      // Prepare profile data for API (exclude email and phone - cannot be changed after login)
      const profileData = {
        full_name: `${formData.firstName} ${formData.lastName}`.trim(),
        address: formData.address,
        whatsapp_number: formData.whatsappNumber.trim() || '',
        alternate_mobile: formData.alternateMobile.trim() || ''
      };
      
      // Call API to update profile
      const response = await buyerProfileAPI.update(profileData);
      
      if (response.success) {
        // Update user data in localStorage (preserve email and phone - they cannot be changed)
        if (user) {
          const updatedUser = {
            ...user,
            full_name: profileData.full_name
          };
          localStorage.setItem('userData', JSON.stringify(updatedUser));
        }
        
        // Refresh user data from backend
        try {
          const verifyResponse = await authAPI.verifyToken();
          if (verifyResponse.success && verifyResponse.data) {
            // User data will be updated in AuthContext automatically
          }
        } catch (error) {
          console.error('Error refreshing user data:', error);
        }
        
        alert('Profile updated successfully!');
      } else {
        throw new Error(response.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert(error.message || 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  
  // Close image menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showImageMenu && !event.target.closest('.buyer-avatar-upload-wrapper')) {
        setShowImageMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
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

  const isAuthenticated = !!user;

  return (
    <div className="buyer-seller-profile">
      <div className={`buyer-profile-wrapper ${!isAuthenticated ? 'buyer-profile-blurred' : ''}`}>
        <div className="buyer-profile-header">
        <h1>Profile Settings</h1>
        
        {/* Section Toggle Buttons */}
        <div className="buyer-profile-section-toggle">
          <button 
            className={`buyer-section-btn ${activeSection === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveSection('profile')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"/>
            </svg>
            Profile Info
          </button>
          <button 
            className={`buyer-section-btn ${activeSection === 'favorites' ? 'active' : ''}`}
            onClick={() => setActiveSection('favorites')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            My Favorites ({favoriteProperties.length})
          </button>
          <button 
            className={`buyer-section-btn ${activeSection === 'history' ? 'active' : ''}`}
            onClick={() => setActiveSection('history')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
            History ({viewHistory.length})
          </button>
        </div>
      </div>

      {activeSection === 'profile' ? (
        <div className="buyer-profile-content">
          {/* Profile Card */}
          <div className="buyer-profile-card">
            <div className="buyer-profile-avatar-section">
              <div className="buyer-avatar-container">
                {/* Hidden file inputs */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                {/* Camera input kept for fallback on older devices */}
                <input
                  type="file"
                  ref={cameraInputRef}
                  accept="image/*"
                  capture="environment"
                  onChange={handleCameraChange}
                  style={{ display: 'none' }}
                />
                
                <img 
                  src={profileImage && profileImage.trim() !== '' ? profileImage : `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || user?.first_name || 'User')}&background=886ace&color=fff&size=200`}
                  alt="Profile" 
                  className="buyer-profile-avatar"
                  onError={(e) => {
                    // Fallback to default avatar if image fails to load
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || user?.first_name || 'User')}&background=886ace&color=fff&size=200`;
                  }}
                />
                
                {/* Upload button with dropdown menu */}
                <div className="buyer-avatar-upload-wrapper">
                  <button 
                    className="buyer-avatar-upload-btn"
                    onClick={() => setShowImageMenu(!showImageMenu)}
                    disabled={uploadingImage}
                    title="Change profile photo"
                  >
                    {uploadingImage ? (
                      <div className="buyer-upload-spinner"></div>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke="white" strokeWidth="2"/>
                        <circle cx="12" cy="13" r="4" stroke="white" strokeWidth="2"/>
                      </svg>
                    )}
                  </button>
                  
                  {/* Dropdown menu */}
                  {showImageMenu && !uploadingImage && (
                    <div className="buyer-image-upload-menu">
                      <button 
                        onClick={handleImageSelect}
                        className="buyer-upload-menu-item"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span>Upload from Device</span>
                      </button>
                      <button 
                        onClick={handleCameraCapture}
                        className="buyer-upload-menu-item"
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
              
              <div className="buyer-profile-name-section">
                <h2>{user?.full_name || user?.first_name + ' ' + user?.last_name || 'User'}</h2>
                <p className="buyer-profile-role">
                  {user?.user_type === 'buyer' ? 'Buyer' : 
                   user?.user_type === 'seller' ? 'Seller' : 
                   user?.user_type === 'agent' ? 'Agent' : 'User'}
                </p>
                <div className="buyer-profile-badges">
                  {user?.email_verified && <span className="buyer-badge buyer-verified">Verified</span>}
                  {user?.user_type === 'agent' && <span className="buyer-badge buyer-pro-agent">Pro Agent</span>}
                </div>
              </div>
            </div>

            <div className="buyer-profile-member-since">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              {formatMemberSince(user?.created_at)}
            </div>
          </div>

          {/* Personal Information Form */}
          <div className="buyer-profile-form-card">
            <h3>Personal Information</h3>
            
            <div className="buyer-form-row">
              <div className="buyer-form-group">
                <label>First Name</label>
                <div className="buyer-input-wrapper">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  <input 
                    type="text" 
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="buyer-form-group">
                <label>Last Name</label>
                <div className="buyer-input-wrapper">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  <input 
                    type="text" 
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            <div className="buyer-form-row">
              <div className="buyer-form-group">
                <label>Email Address</label>
                <div className="buyer-input-wrapper buyer-disabled-wrapper">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2"/>
                    <path d="M22 6l-10 7L2 6" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  <input 
                    type="email" 
                    name="email"
                    value={formData.email}
                    readOnly
                    disabled
                    className="buyer-disabled-input"
                  />
                </div>
              </div>

              <div className="buyer-form-group">
                <label>Phone Number</label>
                <div className="buyer-input-wrapper buyer-disabled-wrapper">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  <input 
                    type="tel" 
                    name="phone"
                    value={formData.phone}
                    readOnly
                    disabled
                    className="buyer-disabled-input"
                  />
                </div>
                <small style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                  Login mobile number (cannot be changed)
                </small>
              </div>

              <div className="buyer-form-group">
                <label>WhatsApp Number <span style={{ color: '#6b7280', fontWeight: 'normal' }}>(Optional)</span></label>
                <div className="buyer-input-wrapper">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  <input 
                    type="tel" 
                    name="whatsappNumber"
                    value={formData.whatsappNumber}
                    onChange={handleChange}
                    placeholder="+917276*****"
                  />
                </div>
              </div>

              <div className="buyer-form-group">
                <label>Alternate Mobile Number <span style={{ color: '#6b7280', fontWeight: 'normal' }}>(Optional)</span></label>
                <div className="buyer-input-wrapper">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  <input 
                    type="tel" 
                    name="alternateMobile"
                    value={formData.alternateMobile}
                    onChange={handleChange}
                    placeholder="+917276*****"
                  />
                </div>
              </div>
            </div>

            <div className="buyer-form-group buyer-full-width">
              <label>Address</label>
              <div className="buyer-input-wrapper">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="currentColor" strokeWidth="2"/>
                  <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2"/>
                </svg>
                <input 
                  type="text" 
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Enter your address"
                />
              </div>
            </div>

            <div className="buyer-form-actions">
              <button className="buyer-cancel-btn" onClick={() => {
                // Reset form to original values
                const nameParts = user?.full_name?.split(' ') || [];
                setFormData({
                  firstName: nameParts[0] || user?.first_name || '',
                  lastName: nameParts.slice(1).join(' ') || user?.last_name || '',
                  email: user?.email || '',
                  phone: user?.phone || '',
                  whatsappNumber: '',
                  alternateMobile: '',
                  address: ''
                });
              }}>Cancel</button>
              <button 
                className="buyer-save-btn" 
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <div className="buyer-upload-spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke="white" strokeWidth="2"/>
                      <path d="M17 21v-8H7v8M7 3v5h8" stroke="white" strokeWidth="2"/>
                    </svg>
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : activeSection === 'favorites' ? (
        /* FAVORITES SECTION */
        <div className="buyer-favorites-section">
          {favoritesLoading ? (
            <div className="buyer-empty-favorites">
              <div className="buyer-upload-spinner" style={{ width: '40px', height: '40px', borderWidth: '4px', margin: '0 auto 1rem' }}></div>
              <p>Loading favorites...</p>
            </div>
          ) : favoriteProperties.length === 0 ? (
            <div className="buyer-empty-favorites">
              <svg 
                width="80" 
                height="80" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="#cbd5e0" 
                strokeWidth="1.5"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
              <h3>No Favorites Yet</h3>
              <p>Start exploring properties and add them to your favorites by clicking the heart icon</p>
            </div>
          ) : (
            <div className="buyer-favorites-grid">
              {favoriteProperties.map(property => (
                <PropertyCard 
                  key={property.id} 
                  property={property}
                  onFavoriteToggle={handleFavoriteToggle}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* HISTORY SECTION */
        <div className="buyer-history-section">
          {viewHistory.length === 0 ? (
            <div className="buyer-empty-history">
              <svg 
                width="80" 
                height="80" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="#cbd5e0" 
                strokeWidth="1.5"
              >
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6l4 2"/>
              </svg>
              <h3>No Property History Yet</h3>
              <p>You have not contacted any property owners yet.</p>
            </div>
          ) : (
            <>
              <h2 className="buyer-history-heading">Contacted Properties History</h2>
              <ol className="buyer-history-list">
                {viewHistory.map((entry, index) => (
                  <li key={`${entry.propertyId}-${index}`} className="buyer-history-item">
                    <div className="buyer-history-grid">
                      <span className="buyer-history-property-title">{entry.propertyTitle}</span>
                      <span className="buyer-history-separator">|</span>
                      <span className="buyer-history-owner-name">{entry.ownerName || 'Not available'}</span>
                      <span className="buyer-history-separator">|</span>
                      <span className="buyer-history-owner-phone">
                        {entry.ownerContactNumber ? (
                          <a href={`tel:${entry.ownerContactNumber}`} className="buyer-history-link">
                            {entry.ownerContactNumber}
                          </a>
                        ) : (
                          <span className="buyer-history-empty">—</span>
                        )}
                      </span>
                      <span className="buyer-history-separator">|</span>
                      <span className="buyer-history-owner-email">
                        {entry.ownerEmail ? (
                          <a href={`mailto:${entry.ownerEmail}`} className="buyer-history-link">
                            {entry.ownerEmail}
                          </a>
                        ) : (
                          <span className="buyer-history-empty">—</span>
                        )}
                      </span>
                      <span className="buyer-history-separator">|</span>
                      <span className="buyer-history-timestamp">{formatHistoryDate(entry.created_at)}</span>
                      <button 
                        className="buyer-history-view-btn"
                        onClick={() => handleViewProperty(entry.propertyId)}
                      >
                        View Details
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      )}
      
      {/* Camera Modal */}
      {showCameraModal && (
        <div className="buyer-camera-modal-overlay" onClick={closeCameraModal}>
          <div className="buyer-camera-modal" onClick={(e) => e.stopPropagation()}>
            <div className="buyer-camera-modal-header">
              <h3>Take Photo</h3>
              <button 
                className="buyer-camera-close-btn"
                onClick={closeCameraModal}
                aria-label="Close camera"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            
            <div className="buyer-camera-content">
              {!capturedImage ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="buyer-camera-video"
                  />
                  <div className="buyer-camera-controls">
                    <button 
                      className="buyer-camera-capture-btn"
                      onClick={capturePhoto}
                      aria-label="Capture photo"
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2"/>
                        <circle cx="12" cy="12" r="4" fill="white"/>
                      </svg>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <img 
                    src={URL.createObjectURL(capturedImage)} 
                    alt="Captured" 
                    className="buyer-camera-preview"
                  />
                  <div className="buyer-camera-preview-controls">
                    <button 
                      className="buyer-camera-retake-btn"
                      onClick={retakePhoto}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      Retake
                    </button>
                    <button 
                      className="buyer-camera-use-btn"
                      onClick={useCapturedPhoto}
                      disabled={uploadingImage}
                    >
                      {uploadingImage ? (
                        <div className="buyer-upload-spinner"></div>
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

        {/* Blur Overlay - Only show when user is not authenticated (just backdrop blur, no content) */}
        {!isAuthenticated && (
          <div className="buyer-profile-blur-overlay"></div>
        )}
      </div>

      {/* Profile Overlay Popup - Only show when user is not authenticated */}
      {!isAuthenticated && (
        <BuyerProfileOverlay 
          isOpen={true} 
          onClose={() => navigate('/buyer-dashboard')} 
        />
      )}
    </div>
  );
};

export default BuyerProfile;