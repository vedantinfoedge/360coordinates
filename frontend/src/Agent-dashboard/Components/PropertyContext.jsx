// src/context/PropertyContext.jsx
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { sellerPropertiesAPI, sellerInquiriesAPI } from "../../services/api.service";

const PropertyContext = createContext();

// Polling interval in milliseconds (30 seconds for real-time updates)
const POLLING_INTERVAL = 30000;

// Helper function to transform backend property to frontend format
const transformProperty = (prop) => ({
  id: prop.id,
  title: prop.title,
  location: prop.location,
  price: prop.price.toString(),
  bedrooms: prop.bedrooms,
  bathrooms: prop.bathrooms,
  area: prop.area.toString(),
  status: prop.status,
  propertyType: prop.property_type,
  projectType: prop.project_type || null, // Include project_type for upcoming projects
  upcomingProjectData: prop.upcoming_project_data || null, // Include upcoming_project_data
  furnishing: prop.furnishing || '',
  facing: prop.facing || '',
  floor: prop.floor || '',
  totalFloors: prop.total_floors || '',
  age: prop.age || '',
  amenities: Array.isArray(prop.amenities) ? prop.amenities : (prop.amenities ? prop.amenities.split(',') : []),
  description: prop.description || '',
  images: Array.isArray(prop.images) && prop.images.length > 0
    ? prop.images
    : (prop.cover_image ? [prop.cover_image] : []),
  createdAt: prop.created_at,
  views: prop.views_count || 0,
  inquiries: prop.inquiry_count || 0,
  featured: false,
  latitude: prop.latitude,
  longitude: prop.longitude,
  state: prop.state || null,
  additionalAddress: prop.additional_address || null,
  carpetArea: prop.carpet_area?.toString() || '',
  balconies: prop.balconies || '',
  priceNegotiable: prop.price_negotiable || false,
  maintenanceCharges: prop.maintenance_charges?.toString() || '',
  depositAmount: prop.deposit_amount?.toString() || '',
  seats: prop.seats || '',
  pricePerSeat: prop.price_per_seat?.toString() || '',
  videoUrl: prop.video_url,
  brochureUrl: prop.brochure_url
});

// Helper function to transform backend inquiry to frontend format
const transformInquiry = (inq) => {
  // Validate that inquiry object exists
  if (!inq || !inq.id) {
    console.warn('Invalid inquiry object:', inq);
    return null;
  }

  try {
    const buyerName = inq.buyer?.name || inq.name || 'Unknown';
    return {
      id: inq.id,
      propertyId: inq.property_id,
      buyerId: inq.buyer_id || inq.buyer?.id || null, // Add buyerId for Firebase chat
      propertyTitle: inq.property?.title || inq.property_title || 'Unknown Property',
      buyerName: buyerName,
      buyerEmail: inq.buyer?.email || inq.email || '',
      buyerPhone: inq.buyer?.phone || inq.mobile || '',
      message: inq.message || '',
      status: inq.status || 'new',
      createdAt: inq.created_at || new Date().toISOString(),
      avatar: buyerName[0].toUpperCase()
    };
  } catch (error) {
    console.error('Error transforming inquiry:', error, inq);
    return null;
  }
};

export const PropertyProvider = ({ children }) => {
  // Properties state - start with empty arrays (real-time data only)
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inquiries, setInquiries] = useState([]);
  const [inquiriesLoading, setInquiriesLoading] = useState(false);
  const [error, setError] = useState(null);
  const [inquiriesError, setInquiriesError] = useState(null);

  // Refs to track polling and prevent duplicate requests
  const pollingIntervalRef = useRef(null);
  const isFetchingPropertiesRef = useRef(false);
  const isFetchingInquiriesRef = useRef(false);

  // Fetch properties from backend
  const fetchProperties = useCallback(async (showLoading = true) => {
    // Prevent concurrent requests
    if (isFetchingPropertiesRef.current) {
      return;
    }

    try {
      isFetchingPropertiesRef.current = true;
      if (showLoading) {
        setLoading(true);
      }
      setError(null);

      const response = await sellerPropertiesAPI.list();

      if (response.success && response.data && response.data.properties) {
        const backendProperties = response.data.properties.map(transformProperty);
        setProperties(backendProperties);
        console.log('✅ Agent: Loaded', backendProperties.length, 'properties from backend');
      } else {
        setProperties([]);
        if (response.message) {
          setError(response.message);
        }
      }
    } catch (error) {
      console.error('Error fetching properties:', error);
      setProperties([]);
      setError(error.message || 'Failed to fetch properties. Please check your connection.');
    } finally {
      setLoading(false);
      isFetchingPropertiesRef.current = false;
    }
  }, []);

  // Fetch inquiries from backend
  const fetchInquiries = useCallback(async (showLoading = false) => {
    // Prevent concurrent requests
    if (isFetchingInquiriesRef.current) {
      return;
    }

    try {
      isFetchingInquiriesRef.current = true;
      if (showLoading) {
        setInquiriesLoading(true);
      }
      setInquiriesError(null);

      const response = await sellerInquiriesAPI.list();

      if (response.success && response.data && response.data.inquiries) {
        // Filter out null values from transformInquiry
        const backendInquiries = response.data.inquiries
          .map(transformInquiry)
          .filter(inq => inq !== null); // Remove any null/undefined inquiries
        setInquiries(backendInquiries);
        console.log('✅ Agent: Loaded', backendInquiries.length, 'inquiries from backend');
      } else {
        setInquiries([]);
        if (response.message) {
          setInquiriesError(response.message);
        }
      }
    } catch (error) {
      console.error('Error fetching inquiries:', error);
      setInquiries([]);
      // Handle error message extraction safely
      const errorMessage = error?.message || error?.data?.message || 'Failed to fetch inquiries. Please check your connection.';
      setInquiriesError(typeof errorMessage === 'string' ? errorMessage : 'Failed to fetch inquiries. Please check your connection.');
    } finally {
      setInquiriesLoading(false);
      isFetchingInquiriesRef.current = false;
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    fetchProperties(true);
    fetchInquiries(false);
  }, [fetchProperties, fetchInquiries]);

  // Set up polling for real-time updates
  useEffect(() => {
    // Only poll when component is mounted and user is active
    const startPolling = () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }

      pollingIntervalRef.current = setInterval(() => {
        // Only poll if tab is visible (save resources)
        if (!document.hidden) {
          // Refresh both properties and inquiries
          fetchProperties(false); // Don't show loading for polling
          fetchInquiries(false); // Don't show loading for polling
        }
      }, POLLING_INTERVAL);
    };

    // Handle visibility change - pause/resume polling
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Pause polling when tab is hidden
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      } else {
        // Resume polling when tab becomes visible, and immediately fetch
        fetchProperties(false);
        fetchInquiries(false);
        startPolling();
      }
    };

    startPolling();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchProperties, fetchInquiries]);

  // Refresh function to manually trigger data fetch
  const refreshData = useCallback(async () => {
    await Promise.all([
      fetchProperties(true),
      fetchInquiries(true)
    ]);
  }, [fetchProperties, fetchInquiries]);

  // Add new property - Save to backend
  const addProperty = async (property) => {
    try {
      const propertyData = {
        title: property.title,
        status: property.status,
        property_type: property.property_type || property.propertyType,
        location: property.location,
        latitude: property.latitude || null,
        longitude: property.longitude || null,
        state: property.state || null,
        additional_address: property.additional_address || property.additionalAddress || null,
        bedrooms: property.bedrooms || 0,
        bathrooms: property.bathrooms || 0,
        balconies: property.balconies || '',
        area: parseFloat(property.area) || 0,
        carpet_area: property.carpetArea ? parseFloat(property.carpetArea) : null,
        floor: property.floor || '',
        total_floors: property.totalFloors ? parseInt(property.totalFloors) : null,
        facing: property.facing || '',
        age: property.age || '',
        furnishing: property.furnishing || '',
        description: property.description,
        price: parseFloat(property.price) || 0,
        price_negotiable: property.priceNegotiable || false,
        maintenance_charges: property.maintenanceCharges ? parseFloat(property.maintenanceCharges) : null,
        deposit_amount: property.depositAmount ? parseFloat(property.depositAmount) : null,
        images: property.images || [],
        video_url: property.videoUrl || property.video_url || null,
        brochure_url: property.brochureUrl || property.brochure_url || null,
        amenities: property.amenities || [],
        // Upcoming project fields
        project_type: property.project_type || null,
        upcoming_project_data: property.upcoming_project_data || null,
        available_for_bachelors: property.availableForBachelors || false
      };

      console.log('PropertyContext: Sending property data:', propertyData);
      const response = await sellerPropertiesAPI.add(propertyData);
      console.log('PropertyContext: API response:', response);
      console.log('PropertyContext: Response success:', response.success);
      console.log('PropertyContext: Response data:', response.data);

      // Handle both success formats: {success: true} and direct data
      if (response.success === true || (response.data && response.data.property)) {
        // Always refresh from backend after successful add to get latest data
        await fetchProperties(false);
        return response.data?.property || response.property || null;
      } else {
        // Extract validation errors if available
        let errorMessage = response.message || 'Failed to add property';
        if (response.data?.errors) {
          const validationErrors = response.data.errors;
          const errorList = Object.values(validationErrors).join(', ');
          errorMessage = `Validation failed: ${errorList}`;
        }
        console.error('PropertyContext: API returned error:', response);
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('PropertyContext: Error adding property - Full error:', error);
      console.error('PropertyContext: Error details:', {
        message: error.message,
        status: error.status,
        errors: error.errors,
        data: error.data,
        response: error.response
      });

      // Extract validation errors from error object
      let errorMessage = 'Failed to save property to database. Please check your connection and try again.';

      // Check various error formats
      if (error.message) {
        errorMessage = error.message;
      } else if (error.errors && typeof error.errors === 'object') {
        const errorList = Object.values(error.errors).join(', ');
        errorMessage = `Validation failed: ${errorList}`;
      } else if (error.data?.errors && typeof error.data.errors === 'object') {
        const errorList = Object.values(error.data.errors).join(', ');
        errorMessage = `Validation failed: ${errorList}`;
      } else if (error.data?.message) {
        errorMessage = error.data.message;
      }

      console.error('PropertyContext: Final error message:', errorMessage);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Update property - Save to backend
  const updateProperty = async (id, updates) => {
    try {
      const propertyData = {
        title: updates.title,
        status: updates.status,
        property_type: updates.propertyType,
        location: updates.location,
        latitude: updates.latitude || null,
        longitude: updates.longitude || null,
        state: updates.state || null,
        additional_address: updates.additionalAddress || null,
        bedrooms: updates.bedrooms,
        bathrooms: updates.bathrooms,
        balconies: updates.balconies || '',
        area: updates.area ? parseFloat(updates.area) : null,
        carpet_area: updates.carpetArea ? parseFloat(updates.carpetArea) : null,
        floor: updates.floor || '',
        total_floors: updates.totalFloors ? parseInt(updates.totalFloors) : null,
        facing: updates.facing || '',
        age: updates.age || '',
        furnishing: updates.furnishing || '',
        description: updates.description,
        price: updates.price ? parseFloat(updates.price) : null,
        price_negotiable: updates.priceNegotiable,
        maintenance_charges: updates.maintenanceCharges ? parseFloat(updates.maintenanceCharges) : null,
        deposit_amount: updates.depositAmount ? parseFloat(updates.depositAmount) : null,
        images: updates.images || [],
        video_url: updates.videoUrl || null,
        brochure_url: updates.brochureUrl || null,
        amenities: updates.amenities || [],
        // Upcoming project fields
        project_type: updates.project_type || null,
        upcoming_project_data: updates.upcoming_project_data || null,
        available_for_bachelors: updates.availableForBachelors || false
      };

      const response = await sellerPropertiesAPI.update(id, propertyData);

      if (response.success) {
        // Refresh from backend after successful update to get latest data
        await fetchProperties(false);
      } else {
        throw new Error(response.message || 'Failed to update property');
      }
    } catch (error) {
      console.error('Error updating property:', error);
      setError(error.message || 'Failed to update property. Please try again.');
      throw error;
    }
  };

  // Delete property - Delete from backend
  const deleteProperty = async (id) => {
    try {
      const response = await sellerPropertiesAPI.delete(id);

      if (response.success) {
        // Refresh from backend after successful delete
        await fetchProperties(false);
        // Also refresh inquiries as they may be affected
        await fetchInquiries(false);
      } else {
        throw new Error(response.message || 'Failed to delete property');
      }
    } catch (error) {
      console.error('Error deleting property:', error);
      setError(error.message || 'Failed to delete property. Please try again.');
      throw error;
    }
  };

  // Update inquiry status - Save to backend
  const updateInquiryStatus = async (id, status) => {
    try {
      const response = await sellerInquiriesAPI.updateStatus(id, status);

      if (response.success) {
        // Optimistically update local state for immediate UI feedback
        setInquiries(prev =>
          prev.map(i => i.id === id ? { ...i, status } : i)
        );
        // Optionally refresh from backend to ensure consistency
        // await fetchInquiries(false);
      } else {
        throw new Error(response.message || 'Failed to update inquiry status');
      }
    } catch (error) {
      console.error('Error updating inquiry status:', error);
      setInquiriesError(error.message || 'Failed to update inquiry status. Please try again.');
      // Revert optimistic update on error
      await fetchInquiries(false);
      throw error;
    }
  };

  // Delete inquiry
  const deleteInquiry = (id) => {
    setInquiries(prev => prev.filter(i => i.id !== id));
  };

  // Get stats
  const getStats = () => {
    const totalProperties = properties.length;
    const forSale = properties.filter(p => p.status === 'sale').length;
    const forRent = properties.filter(p => p.status === 'rent').length;
    const totalViews = properties.reduce((sum, p) => sum + (p.views || 0), 0);
    const totalInquiries = inquiries.length;
    const newInquiries = inquiries.filter(i => i.status === 'new').length;

    return {
      totalProperties,
      forSale,
      forRent,
      totalViews,
      totalInquiries,
      newInquiries
    };
  };

  return (
    <PropertyContext.Provider value={{
      properties,
      setProperties,
      inquiries,
      setInquiries,
      addProperty,
      updateProperty,
      deleteProperty,
      updateInquiryStatus,
      deleteInquiry,
      getStats,
      loading,
      inquiriesLoading,
      error,
      inquiriesError,
      refreshData,
      fetchProperties,
      fetchInquiries
    }}>
      {children}
    </PropertyContext.Provider>
  );
};

export const useProperty = () => {
  const context = useContext(PropertyContext);
  if (!context) {
    throw new Error('useProperty must be used within a PropertyProvider');
  }
  return context;
};