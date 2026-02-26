// src/pages/AgentProperties.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProperty } from "./PropertyContext";
import AddPropertyPopup from "./AddPropertyPopup";
import AddUpcomingProjectPopup from "./AddUpcomingProjectPopup";
import DeletePropertyModal from "../../components/DeletePropertyModal/DeletePropertyModal";
import { API_BASE_URL } from "../../config/api.config";
import { sellerPropertiesAPI } from "../../services/api.service";
import "../styles/AgentProperties.css";

const PROJECT_STATUS_OPTIONS = [
  { value: "UNDER CONSTRUCTION", label: "Under Construction" },
  { value: "PRE-LAUNCH", label: "Pre-Launch" },
  { value: "COMPLETED", label: "Completed" }
];

const MAX_PROPERTIES = 25;

const AgentProperties = () => {
  const navigate = useNavigate();
  const { properties, deleteProperty, loading, error, refreshData } = useProperty();
  const [showForm, setShowForm] = useState(false);
  const [showUpcomingProjectPopup, setShowUpcomingProjectPopup] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [editProperty, setEditProperty] = useState(null); // Store property object for edit
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState(null);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);

  // Filter and sort properties
  const filteredProperties = properties
    .filter(p => {
      const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
      const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.location.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'oldest':
          return new Date(a.createdAt) - new Date(b.createdAt);
        case 'price-high':
          return parseFloat(b.price) - parseFloat(a.price);
        case 'price-low':
          return parseFloat(a.price) - parseFloat(b.price);
        default:
          return 0;
      }
    });

  // Split properties into normal properties and upcoming projects
  const normalProperties = filteredProperties.filter(p =>
    !p.projectType || p.projectType !== 'upcoming'
  );
  const upcomingProjects = filteredProperties.filter(p =>
    p.projectType === 'upcoming'
  );

  const openNew = () => {
    if (properties.length >= MAX_PROPERTIES) {
      alert(`You can add maximum ${MAX_PROPERTIES} properties.`);
      return;
    }
    setEditIndex(null);
    setEditProperty(null);
    setShowForm(true);
    setShowUpcomingProjectPopup(false);
  };

  const handleAddUpcomingProject = () => {
    if (properties.length >= MAX_PROPERTIES) {
      alert(`You can add maximum ${MAX_PROPERTIES} properties.`);
      return;
    }
    setEditProperty(null);
    setShowUpcomingProjectPopup(true);
    setShowForm(false);
  };

  const openEdit = (idx) => {
    const property = properties[idx];

    // Check if this is an upcoming project
    if (property && property.projectType === 'upcoming') {
      // Open upcoming project popup in edit mode
      setEditProperty(property);
      setShowUpcomingProjectPopup(true);
      setShowForm(false);
    } else {
      // Open normal property form
      setEditIndex(idx);
      setEditProperty(null);
      setShowForm(true);
      setShowUpcomingProjectPopup(false);
    }
  };

  const handleDeleteClick = (id) => {
    setPropertyToDelete(id);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!propertyToDelete) return;
    try {
      setDeletingId(propertyToDelete);
      await deleteProperty(propertyToDelete);
      // Data will be automatically refreshed by PropertyContext
      setPropertyToDelete(null);
    } catch (error) {
      console.error('Error deleting property:', error);
      alert(error.message || 'Failed to delete property. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleProjectStatusChange = async (propertyId, newStatus) => {
    const property = properties.find(p => p.id === propertyId);
    if (!property || property.projectType !== 'upcoming') return;
    let upcomingData = property.upcomingProjectData;
    if (typeof upcomingData === 'string') {
      try {
        upcomingData = JSON.parse(upcomingData);
      } catch {
        upcomingData = {};
      }
    }
    if (!upcomingData || typeof upcomingData !== 'object') {
      upcomingData = {};
    }
    const mergedData = { ...upcomingData, projectStatus: newStatus };
    try {
      setUpdatingStatusId(propertyId);
      const response = await sellerPropertiesAPI.update(propertyId, {
        upcoming_project_data: mergedData
      });
      if (response.success && refreshData) {
        await refreshData();
      } else {
        throw new Error(response.message || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating project status:', error);
      alert(error.message || 'Failed to update project status. Please try again.');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const getUpcomingProjectStatus = (property) => {
    const data = property.upcomingProjectData;
    if (!data) return 'UNDER CONSTRUCTION';
    const parsed = typeof data === 'string' ? (() => { try { return JSON.parse(data); } catch { return {}; } })() : data;
    return parsed.projectStatus || 'UNDER CONSTRUCTION';
  };

  const formatPrice = (price) => {
    const num = parseFloat(price);
    if (num >= 10000000) {
      return `₹${(num / 10000000).toFixed(2)} Cr`;
    } else if (num >= 100000) {
      return `₹${(num / 100000).toFixed(2)} Lac`;
    } else if (num >= 1000) {
      return `₹${(num / 1000).toFixed(1)}K`;
    }
    return `₹${num}`;
  };

  const getPropertyIndex = (propertyId) => {
    return properties.findIndex(p => p.id === propertyId);
  };

  const handleViewDetails = (propertyId) => {
    console.log('Navigating to property:', propertyId);
    // Find the property to check if it's an upcoming project
    const property = properties.find(p => p.id === propertyId);

    console.log('Found property:', property);
    console.log('Property projectType:', property?.projectType);
    console.log('Is upcoming?', property && property.projectType === 'upcoming');

    // Route to appropriate details page based on project type
    if (property && property.projectType === 'upcoming') {
      console.log('Navigating to upcoming project view');
      window.open(`/agent-dashboard/upcoming-project/${propertyId}`, '_blank', 'noopener,noreferrer');
    } else {
      console.log('Navigating to regular property view');
      window.open(`/agent-dashboard/details/${propertyId}`, '_blank', 'noopener,noreferrer');
    }
  };

  // Get property features based on property type
  const getPropertyFeatures = (property) => {
    const features = [];
    const propertyType = property.propertyType || '';

    // Residential properties (Apartment, Flat, Villa, Independent House, Row House, Penthouse)
    if (['Apartment', 'Flat', 'Villa', 'Independent House', 'Row House', 'Penthouse', 'Farm House'].includes(propertyType)) {
      if (property.bedrooms) features.push({ label: `${property.bedrooms} Beds`, icon: 'bed' });
      if (property.bathrooms) features.push({ label: `${property.bathrooms} Baths`, icon: 'bath' });
      if (property.area) features.push({ label: `${property.area} sqft`, icon: 'area' });
      if (property.floor && property.totalFloors) features.push({ label: `Floor ${property.floor}/${property.totalFloors}`, icon: 'floor' });
      if (property.furnishing) features.push({ label: property.furnishing, icon: 'furnishing' });
      if (property.balconies) features.push({ label: `${property.balconies} Balconies`, icon: 'balcony' });
    }
    // Studio Apartment
    else if (propertyType === 'Studio Apartment') {
      if (property.bathrooms) features.push({ label: `${property.bathrooms} Baths`, icon: 'bath' });
      if (property.area) features.push({ label: `${property.area} sqft`, icon: 'area' });
      if (property.floor && property.totalFloors) features.push({ label: `Floor ${property.floor}/${property.totalFloors}`, icon: 'floor' });
      if (property.furnishing) features.push({ label: property.furnishing, icon: 'furnishing' });
      if (property.balconies) features.push({ label: `${property.balconies} Balconies`, icon: 'balcony' });
    }
    // Commercial Office
    else if (propertyType === 'Commercial Office') {
      if (property.area) features.push({ label: `${property.area} sqft`, icon: 'area' });
      if (property.floor && property.totalFloors) features.push({ label: `Floor ${property.floor}/${property.totalFloors}`, icon: 'floor' });
      if (property.furnishing) features.push({ label: property.furnishing, icon: 'furnishing' });
      if (property.bathrooms) features.push({ label: `${property.bathrooms} Baths`, icon: 'bath' });
    }
    // Commercial Shop
    else if (propertyType === 'Commercial Shop') {
      if (property.area) features.push({ label: `${property.area} sqft`, icon: 'area' });
      if (property.floor && property.totalFloors) features.push({ label: `Floor ${property.floor}/${property.totalFloors}`, icon: 'floor' });
      if (property.facing) features.push({ label: property.facing, icon: 'facing' });
    }
    // Plot / Land
    else if (propertyType === 'Plot / Land') {
      if (property.area) features.push({ label: `${property.area} sqft`, icon: 'area' });
      if (property.facing) features.push({ label: property.facing, icon: 'facing' });
    }
    // PG / Hostel
    else if (propertyType === 'PG / Hostel') {
      if (property.bedrooms) features.push({ label: `${property.bedrooms} Beds`, icon: 'bed' });
      if (property.bathrooms) features.push({ label: `${property.bathrooms} Baths`, icon: 'bath' });
      if (property.area) features.push({ label: `${property.area} sqft`, icon: 'area' });
      if (property.floor && property.totalFloors) features.push({ label: `Floor ${property.floor}/${property.totalFloors}`, icon: 'floor' });
    }
    // Default fallback
    else {
      if (property.bedrooms) features.push({ label: `${property.bedrooms} Beds`, icon: 'bed' });
      if (property.bathrooms) features.push({ label: `${property.bathrooms} Baths`, icon: 'bath' });
      if (property.area) features.push({ label: `${property.area} sqft`, icon: 'area' });
    }

    return features;
  };

  return (
    <div className="seller-properties">
      {/* Header */}
      <div className="seller-props-header">
        <div className="seller-props-header-content">
          <div>
            <h1>My Properties</h1>
            <p className="seller-props-subtitle">
              {loading ? 'Loading...' : `${properties.length} properties listed`}
            </p>
          </div>
          <div className="seller-props-header-buttons">
            <button className="seller-props-add-btn" onClick={openNew}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Add Property
            </button>
            <button className="seller-props-add-btn" onClick={handleAddUpcomingProject}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span>Add New project</span>
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="seller-props-toolbar">
        <div className="seller-props-search-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
            <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Search properties..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="seller-props-toolbar-actions">
          <div className="seller-props-filter-group">
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">All Status</option>
              <option value="sale">For Sale</option>
              <option value="rent">For Rent</option>
            </select>

            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="price-high">Price: High to Low</option>
              <option value="price-low">Price: Low to High</option>
            </select>
          </div>
        </div>
      </div>

      {/* Properties Section */}
      <div className="agent-props-sections">
        {/* Section 1: Normal Properties */}
        <div className="agent-props-section">
          <h2 className="agent-props-section-heading">Properties</h2>
          {normalProperties.length === 0 ? (
            <div className="agent-props-empty-message">
              <p>No properties found</p>
            </div>
          ) : (
            <div className="agent-props-horizontal-scroll">
              {normalProperties.map((property, index) => (
                <div
                  key={property.id}
                  className="seller-props-card grid"
                  style={{ animationDelay: `${index * 0.05}s`, cursor: 'pointer', flexShrink: 0 }}
                  onClick={() => handleViewDetails(property.id)}
                >
                  <div className="seller-props-image">
                    <img
                      src={(() => {
                        // Prioritize display_image, then first image, then cover_image
                        const imageUrl = property.display_image
                          || property.images?.[0]
                          || property.cover_image;
                        if (!imageUrl) return 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=500';
                        if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
                          return imageUrl;
                        }
                        if (imageUrl.startsWith('/')) {
                          return `${API_BASE_URL.replace('/api', '')}${imageUrl}`;
                        }
                        return `${API_BASE_URL.replace('/api', '')}/uploads/${imageUrl}`;
                      })()}
                      alt={property.title}
                      onError={(e) => {
                        console.error('Image load failed for property:', property.id, 'URL:', e.target.src);
                        e.target.src = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=500';
                      }}
                    />
                    <div className="seller-props-image-overlay">
                      <button
                        className="seller-props-overlay-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(getPropertyIndex(property.id));
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" />
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" />
                        </svg>
                      </button>
                      <button
                        className="seller-props-overlay-btn delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(property.id);
                        }}
                        disabled={deletingId === property.id}
                        title={deletingId === property.id ? 'Deleting...' : 'Delete property'}
                      >
                        {deletingId === property.id ? (
                          <div style={{
                            width: '16px',
                            height: '16px',
                            border: '2px solid #fff',
                            borderTop: '2px solid transparent',
                            borderRadius: '50%',
                            animation: 'spin 0.6s linear infinite',
                            display: 'inline-block'
                          }}></div>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" stroke="currentColor" strokeWidth="2" />
                          </svg>
                        )}
                      </button>
                    </div>
                    <span className={`seller-props-badge ${property.status}`}>
                      {property.status === 'sale' ? 'For Sale' : 'For Rent'}
                    </span>
                    {property.projectType === 'upcoming' && (
                      <select
                        className="seller-props-project-status-select"
                        value={getUpcomingProjectStatus(property)}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleProjectStatusChange(property.id, e.target.value);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        disabled={updatingStatusId === property.id}
                        title="Change project status"
                      >
                        {PROJECT_STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    )}
                    {property.featured && (
                      <span className="seller-props-featured-badge">Featured</span>
                    )}
                  </div>

                  <div className="seller-props-content">
                    <h3 className="seller-props-title">{property.title}</h3>
                    <p className="seller-props-location">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" />
                        <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2" />
                      </svg>
                      {property.location}
                    </p>

                    <div className="seller-props-features">
                      {getPropertyFeatures(property).slice(0, 3).map((feat, idx) => (
                        <span key={idx} className="seller-props-feature">
                          {feat.icon === 'bed' && (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                              <path d="M3 22V8l9-6 9 6v14H3z" stroke="currentColor" strokeWidth="2" />
                              <path d="M9 22v-6h6v6" stroke="currentColor" strokeWidth="2" />
                            </svg>
                          )}
                          {feat.icon === 'bath' && (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                              <path d="M4 12h16v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5z" stroke="currentColor" strokeWidth="2" />
                              <path d="M6 12V5a2 2 0 012-2h2v9" stroke="currentColor" strokeWidth="2" />
                            </svg>
                          )}
                          {feat.icon === 'area' && (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                              <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                              <path d="M3 9h18M9 21V9" stroke="currentColor" strokeWidth="2" />
                            </svg>
                          )}
                          {feat.label}
                        </span>
                      ))}
                    </div>

                    <div className="seller-props-stats">
                      <div className="seller-props-stat-item" title={`${property.views || 0} people showed interest in this property`}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" />
                          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                        </svg>
                        <span>{property.views || 0} {property.views === 1 ? 'person' : 'people'} interested</span>
                      </div>
                      <div className="seller-props-stat-item">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="2" />
                        </svg>
                        <span>{property.inquiries || 0} inquiries</span>
                      </div>
                    </div>

                    <div className="seller-props-footer">
                      <div className="seller-props-price-section">
                        <span className="seller-props-price">{formatPrice(property.price)}</span>
                        {property.status === 'rent' && <span className="seller-props-per-month">/month</span>}
                      </div>
                      <div className="seller-props-action-btns">
                        <button
                          className="seller-props-view-details-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetails(property.id);
                          }}
                          title="View Details"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" />
                            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                          </svg>
                          View
                        </button>
                        <button
                          className="seller-props-edit-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(getPropertyIndex(property.id));
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" />
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" />
                          </svg>
                          Edit
                        </button>
                        <button
                          className="seller-props-delete-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(property.id);
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" stroke="currentColor" strokeWidth="2" />
                          </svg>
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Upcoming Projects */}
        <div className="agent-props-section">
          <h2 className="agent-props-section-heading">Projects</h2>
          {upcomingProjects.length === 0 ? (
            <div className="agent-props-empty-message">
              <p>No upcoming projects found</p>
            </div>
          ) : (
            <div className="agent-props-horizontal-scroll">
              {upcomingProjects.map((property, index) => (
                <div
                  key={property.id}
                  className="seller-props-card grid"
                  style={{ animationDelay: `${index * 0.05}s`, cursor: 'pointer', flexShrink: 0 }}
                  onClick={() => handleViewDetails(property.id)}
                >
                  <div className="seller-props-image">
                    <img
                      src={(() => {
                        // Prioritize display_image, then first image, then cover_image
                        const imageUrl = property.display_image
                          || property.images?.[0]
                          || property.cover_image;
                        if (!imageUrl) return 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=500';
                        if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
                          return imageUrl;
                        }
                        if (imageUrl.startsWith('/')) {
                          return `${API_BASE_URL.replace('/api', '')}${imageUrl}`;
                        }
                        return `${API_BASE_URL.replace('/api', '')}/uploads/${imageUrl}`;
                      })()}
                      alt={property.title}
                      onError={(e) => {
                        console.error('Image load failed for property:', property.id, 'URL:', e.target.src);
                        e.target.src = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=500';
                      }}
                    />
                    <div className="seller-props-image-overlay">
                      <button
                        className="seller-props-overlay-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(getPropertyIndex(property.id));
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" />
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" />
                        </svg>
                      </button>
                      <button
                        className="seller-props-overlay-btn delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(property.id);
                        }}
                        disabled={deletingId === property.id}
                        title={deletingId === property.id ? 'Deleting...' : 'Delete property'}
                      >
                        {deletingId === property.id ? (
                          <div style={{
                            width: '16px',
                            height: '16px',
                            border: '2px solid #fff',
                            borderTop: '2px solid transparent',
                            borderRadius: '50%',
                            animation: 'spin 0.6s linear infinite',
                            display: 'inline-block'
                          }}></div>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" stroke="currentColor" strokeWidth="2" />
                          </svg>
                        )}
                      </button>
                    </div>
                    <span className={`seller-props-badge ${property.status}`}>
                      {property.status === 'sale' ? 'For Sale' : 'For Rent'}
                    </span>
                    {property.projectType === 'upcoming' && (
                      <select
                        className="seller-props-project-status-select"
                        value={getUpcomingProjectStatus(property)}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleProjectStatusChange(property.id, e.target.value);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        disabled={updatingStatusId === property.id}
                        title="Change project status"
                      >
                        {PROJECT_STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    )}
                    {property.featured && (
                      <span className="seller-props-featured-badge">Featured</span>
                    )}
                  </div>

                  <div className="seller-props-content">
                    <h3 className="seller-props-title">{property.title}</h3>
                    <p className="seller-props-location">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" />
                        <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2" />
                      </svg>
                      {property.location}
                    </p>

                    <div className="seller-props-features">
                      {getPropertyFeatures(property).slice(0, 3).map((feat, idx) => (
                        <span key={idx} className="seller-props-feature">
                          {feat.icon === 'bed' && (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                              <path d="M3 22V8l9-6 9 6v14H3z" stroke="currentColor" strokeWidth="2" />
                              <path d="M9 22v-6h6v6" stroke="currentColor" strokeWidth="2" />
                            </svg>
                          )}
                          {feat.icon === 'bath' && (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                              <path d="M4 12h16v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5z" stroke="currentColor" strokeWidth="2" />
                              <path d="M6 12V5a2 2 0 012-2h2v9" stroke="currentColor" strokeWidth="2" />
                            </svg>
                          )}
                          {feat.icon === 'area' && (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                              <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                              <path d="M3 9h18M9 21V9" stroke="currentColor" strokeWidth="2" />
                            </svg>
                          )}
                          {feat.label}
                        </span>
                      ))}
                    </div>

                    <div className="seller-props-stats">
                      <div className="seller-props-stat-item" title={`${property.views || 0} people showed interest in this property`}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" />
                          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                        </svg>
                        <span>{property.views || 0} {property.views === 1 ? 'person' : 'people'} interested</span>
                      </div>
                      <div className="seller-props-stat-item">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="2" />
                        </svg>
                        <span>{property.inquiries || 0} inquiries</span>
                      </div>
                    </div>

                    <div className="seller-props-footer">
                      <div className="seller-props-price-section">
                        <span className="seller-props-price">{formatPrice(property.price)}</span>
                        {property.status === 'rent' && <span className="seller-props-per-month">/month</span>}
                      </div>
                      <div className="seller-props-action-btns">
                        <button
                          className="seller-props-view-details-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetails(property.id);
                          }}
                          title="View Details"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" />
                            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                          </svg>
                          View
                        </button>
                        <button
                          className="seller-props-edit-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(getPropertyIndex(property.id));
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" />
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" />
                          </svg>
                          Edit
                        </button>
                        <button
                          className="seller-props-delete-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(property.id);
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" stroke="currentColor" strokeWidth="2" />
                          </svg>
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Form - Normal Property */}
      {showForm && (
        <AddPropertyPopup
          onClose={() => {
            setShowForm(false);
            setEditIndex(null);
            setEditProperty(null);
          }}
          editIndex={editIndex}
          initialData={editIndex !== null ? properties[editIndex] : null}
        />
      )}

      {/* Add/Edit Form - Upcoming Project */}
      {showUpcomingProjectPopup && (
        <AddUpcomingProjectPopup
          onClose={() => {
            setShowUpcomingProjectPopup(false);
            setEditProperty(null);
          }}
          editData={editProperty}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeletePropertyModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setPropertyToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
};

export default AgentProperties;