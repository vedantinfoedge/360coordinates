// src/pages/AgentOverview.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useProperty } from "./PropertyContext";
import { useAuth } from "../../context/AuthContext";
import { authAPI, sellerDashboardAPI } from "../../services/api.service";
import { API_BASE_URL } from "../../config/api.config";
import { getUserChatRooms } from "../../services/firebase.service";
import AddPropertyPopup from "./AddPropertyPopup";
import AddUpcomingProjectPopup from "./AddUpcomingProjectPopup";
import "../styles/AgentOverview.css";

const MAX_PROPERTIES = 25;

const AgentOverview = ({ onNavigate }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    properties, 
    inquiries, 
    getStats, 
    loading, 
    error, 
    inquiriesLoading, 
    inquiriesError,
    refreshData 
  } = useProperty();
  const [showPopup, setShowPopup] = useState(false);
  const [showUpcomingProjectPopup, setShowUpcomingProjectPopup] = useState(false);
  const [userName, setUserName] = useState('');
  const [viewsPercentageChange, setViewsPercentageChange] = useState(0);
  const [firebaseChatRooms, setFirebaseChatRooms] = useState([]);
  const [chatRoomsLoading, setChatRoomsLoading] = useState(false);

  useEffect(() => {
    const user = authAPI.getUser();
    if (user && user.full_name) {
      const nameParts = user.full_name.split(' ');
      setUserName(nameParts[0] || 'User');
    } else {
      setUserName('User');
    }
  }, []);

  // Fetch dashboard stats to get views percentage change
  useEffect(() => {
    const fetchViewsPercentage = async () => {
      try {
        const response = await sellerDashboardAPI.getStats();
        if (response.success && response.data && response.data.views_percentage_change !== undefined) {
          setViewsPercentageChange(response.data.views_percentage_change);
        }
      } catch (error) {
        console.error('Error fetching views percentage:', error);
        // Keep default 0 if error
      }
    };
    
    fetchViewsPercentage();
    // Refresh every 5 minutes
    const interval = setInterval(fetchViewsPercentage, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Firebase chat rooms to include chat-only conversations in inquiry count
  useEffect(() => {
    if (!user) {
      setFirebaseChatRooms([]);
      return;
    }

    const fetchChatRooms = async () => {
      try {
        setChatRoomsLoading(true);
        const chatRooms = await getUserChatRooms(user.id);
        // Filter chat rooms where user is the receiver (agent/seller)
        const agentChatRooms = chatRooms.filter(room => 
          room.receiverId === String(user.id) || room.receiverId === user.id
        );
        setFirebaseChatRooms(agentChatRooms);
        console.log('[AgentOverview] Loaded', agentChatRooms.length, 'Firebase chat rooms');
      } catch (error) {
        console.error('[AgentOverview] Error fetching chat rooms:', error);
        setFirebaseChatRooms([]);
      } finally {
        setChatRoomsLoading(false);
      }
    };

    fetchChatRooms();
    // Refresh chat rooms every 30 seconds
    const interval = setInterval(fetchChatRooms, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Calculate enriched inquiries count (database inquiries + chat-only conversations)
  // This matches the deduplication logic in AgentInquiries (one inquiry per conversation key)
  const enrichedInquiriesCount = useMemo(() => {
    // Deduplicate inquiries by conversation key (buyer+property)
    // Keep only the most recent inquiry per conversation key to match AgentInquiries behavior
    const inquiryMap = new Map();
    inquiries.forEach(inquiry => {
      const conversationKey = inquiry.conversationKey || `${inquiry.buyerId || 'guest'}_${inquiry.propertyId}`;
      const existing = inquiryMap.get(conversationKey);
      
      if (!existing) {
        inquiryMap.set(conversationKey, inquiry);
      } else {
        // Multiple inquiries for same conversation - keep the most recent one
        const existingDate = new Date(existing.createdAt || 0);
        const currentDate = new Date(inquiry.createdAt || 0);
        if (currentDate > existingDate) {
          inquiryMap.set(conversationKey, inquiry);
        }
      }
    });

    const uniqueInquiriesCount = inquiryMap.size;

    if (!user || !firebaseChatRooms.length) {
      // If no Firebase data, return deduplicated database inquiries count
      return uniqueInquiriesCount;
    }

    // Count unique chat rooms that don't have corresponding inquiries
    const chatOnlyCount = firebaseChatRooms.filter(room => {
      const conversationKey = `${room.buyerId || 'guest'}_${room.propertyId}`;
      return !inquiryMap.has(conversationKey);
    }).length;

    // Total = unique database inquiries + chat-only conversations
    return uniqueInquiriesCount + chatOnlyCount;
  }, [inquiries, firebaseChatRooms, user]);

  // Calculate enriched new inquiries count
  // This matches the deduplication logic in AgentInquiries
  const enrichedNewInquiriesCount = useMemo(() => {
    // Deduplicate inquiries by conversation key (same as total count)
    const inquiryMap = new Map();
    inquiries.forEach(inquiry => {
      const conversationKey = inquiry.conversationKey || `${inquiry.buyerId || 'guest'}_${inquiry.propertyId}`;
      const existing = inquiryMap.get(conversationKey);
      
      if (!existing) {
        inquiryMap.set(conversationKey, inquiry);
      } else {
        const existingDate = new Date(existing.createdAt || 0);
        const currentDate = new Date(inquiry.createdAt || 0);
        if (currentDate > existingDate) {
          inquiryMap.set(conversationKey, inquiry);
        }
      }
    });

    // Count unique inquiries with 'new' status
    const newInquiriesFromDB = Array.from(inquiryMap.values()).filter(i => i.status === 'new').length;
    
    if (!user || !firebaseChatRooms.length) {
      return newInquiriesFromDB;
    }

    // Count chat-only conversations with 'new' status
    const newChatOnlyCount = firebaseChatRooms.filter(room => {
      const conversationKey = `${room.buyerId || 'guest'}_${room.propertyId}`;
      if (inquiryMap.has(conversationKey)) {
        return false; // Has inquiry, skip
      }
      
      // Check if chat room has 'new' status for this user
      if (room.readStatus && typeof room.readStatus === 'object') {
        const userStatus = room.readStatus[String(user.id)];
        return userStatus === 'new' || !userStatus; // 'new' or undefined (defaults to new)
      }
      
      return true; // No status info, default to new
    }).length;

    return newInquiriesFromDB + newChatOnlyCount;
  }, [inquiries, firebaseChatRooms, user]);

  const baseStats = getStats();
  // Override totalInquiries and newInquiries with enriched counts
  const stats = {
    ...baseStats,
    totalInquiries: enrichedInquiriesCount,
    newInquiries: enrichedNewInquiriesCount
  };

  const handleAddProperty = () => {
    if (properties.length >= MAX_PROPERTIES) {
      alert(`You can add maximum ${MAX_PROPERTIES} properties.`);
      return;
    }
    setShowPopup(true);
  };

  const handleAddUpcomingProject = () => {
    if (properties.length >= MAX_PROPERTIES) {
      alert(`You can add maximum ${MAX_PROPERTIES} properties.`);
      return;
    }
    setShowUpcomingProjectPopup(true);
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

  const formatNumber = (num) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num;
  };

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const recentInquiries = inquiries
    .filter(i => i.status === 'new')
    .slice(0, 4);

  return (
    <div className="agent-overview">
      {/* Welcome Header */}
      <div className="agent-overview-header">
        <div className="agent-overview-header-content">
          <div className="agent-overview-greeting">
            <h1>Welcome Back, {userName}<span style={{color: 'red'}}>❤️</span></h1>
            <p className="agent-overview-subtitle">
              {loading ? 'Loading dashboard...' : "Here's what's happening with your properties today"}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {(error || inquiriesError) && (
              <button 
                onClick={refreshData}
                title="Refresh data"
                style={{ 
                  padding: '8px 12px', 
                  background: '#f0f0f0', 
                  border: '1px solid #ddd', 
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                🔄 Refresh
              </button>
            )}
            <button className="agent-overview-add-btn" onClick={handleAddProperty}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <span>Add New Property</span>
            </button>
            <button className="agent-overview-add-btn" onClick={handleAddUpcomingProject}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <span>Add New project</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Messages */}
      {error && (
        <div style={{ 
          margin: '16px', 
          padding: '12px', 
          background: '#fee', 
          border: '1px solid #fcc', 
          borderRadius: '6px',
          color: '#c33'
        }}>
          ⚠️ {error}
        </div>
      )}
      {inquiriesError && (
        <div style={{ 
          margin: '16px', 
          padding: '12px', 
          background: '#fee', 
          border: '1px solid #fcc', 
          borderRadius: '6px',
          color: '#c33'
        }}>
          ⚠️ Inquiries: {inquiriesError}
        </div>
      )}

      {/* Stats Grid */}
      <div className="agent-overview-stats-grid">
        <div className="agent-overview-stat-card agent-overview-stat-primary">
          <div className="agent-overview-stat-icon-wrapper">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="2"/>
              <polyline points="9,22 9,12 15,12 15,22" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
          <div className="agent-overview-stat-content">
            <span className="agent-overview-stat-label">Total Properties</span>
            <div className="agent-overview-stat-value-row">
              <span className="agent-overview-stat-value">{stats.totalProperties}</span>
              <span className="agent-overview-stat-badge agent-overview-badge-success">Active</span>
            </div>
          </div>
        </div>

        <div className="agent-overview-stat-card">
          <div className="agent-overview-stat-icon-wrapper agent-overview-icon-blue">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2"/>
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
          <div className="agent-overview-stat-content">
            <span className="agent-overview-stat-label">Total Views</span>
            <div className="agent-overview-stat-value-row">
              <span className="agent-overview-stat-value">{formatNumber(stats.totalViews)}</span>
              {viewsPercentageChange !== 0 && (
                <span className={`agent-overview-stat-change ${viewsPercentageChange >= 0 ? 'agent-overview-change-positive' : 'agent-overview-change-negative'}`}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    {viewsPercentageChange >= 0 ? (
                      <path d="M18 15l-6-6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    ) : (
                      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    )}
                  </svg>
                  {Math.abs(viewsPercentageChange)}%
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="agent-overview-stat-card">
          <div className="agent-overview-stat-icon-wrapper agent-overview-icon-green">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
          <div className="agent-overview-stat-content">
            <span className="agent-overview-stat-label">Total Inquiries</span>
            <div className="agent-overview-stat-value-row">
              <span className="agent-overview-stat-value">{stats.totalInquiries}</span>
              {stats.newInquiries > 0 && (
                <span className="agent-overview-stat-badge agent-overview-badge-warning">{stats.newInquiries} New</span>
              )}
            </div>
          </div>
        </div>

        <div className="agent-overview-stat-card">
          <div className="agent-overview-stat-icon-wrapper agent-overview-icon-orange">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="agent-overview-stat-content">
            <span className="agent-overview-stat-label">Listing Status</span>
            <div className="agent-overview-status-pills">
              <span className="agent-overview-status-pill agent-overview-pill-sale">{stats.forSale} Sale</span>
              <span className="agent-overview-status-pill agent-overview-pill-rent">{stats.forRent} Rent</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="agent-overview-quick-actions">
        <h2 className="agent-overview-section-title">Quick Actions</h2>
        <div className="agent-overview-actions-grid">
          <button className="agent-overview-action-card" onClick={handleAddProperty}>
            <div className="agent-overview-action-icon agent-overview-action-add">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="agent-overview-action-title">Add New Property</span>
            <span className="agent-overview-action-desc">List a new property for sale or rent</span>
          </button>

          <button className="agent-overview-action-card" onClick={() => onNavigate && onNavigate('properties')}>
            <div className="agent-overview-action-icon agent-overview-action-manage">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="agent-overview-action-title">Manage Properties</span>
            <span className="agent-overview-action-desc">Edit, update or remove listings</span>
          </button>

          <button className="agent-overview-action-card" onClick={() => onNavigate && onNavigate('inquiries')}>
            <div className="agent-overview-action-icon agent-overview-action-inquiries">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="agent-overview-action-title">View Inquiries</span>
            <span className="agent-overview-action-desc">Respond to buyer inquiries</span>
          </button>

          <button className="agent-overview-action-card" onClick={() => onNavigate && onNavigate('profile')}>
            <div className="agent-overview-action-icon agent-overview-action-profile">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="agent-overview-action-title">Update Profile</span>
            <span className="agent-overview-action-desc">Manage your account settings</span>
          </button>

          <button
            type="button"
            className="agent-overview-action-card agent-leads-stat-btn"
            onClick={() => navigate('/agent-dashboard/inquiries')}
            title="View leads from buyers who viewed your contact details"
          >
            <div className="agent-overview-action-icon agent-overview-action-leads">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2"/>
                <circle cx="8.5" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                <path d="M20 8v6M23 11h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="agent-overview-action-title">Leads</span>
            <span className="agent-overview-action-desc">View leads from buyers who viewed your contact details</span>
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="agent-overview-content-grid">
        {/* Recent Properties */}
        <div className="agent-overview-properties-section">
          <div className="agent-overview-section-header">
            <h2 className="agent-overview-section-title">Your Properties</h2>
            <button className="agent-overview-view-all-btn" onClick={() => onNavigate && onNavigate('properties')}>
              View All
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          <div className="agent-overview-properties-list">
            {loading && properties.length === 0 ? (
              <div className="agent-overview-loading-state">
                <div className="agent-overview-loading-spinner"></div>
                <h3>Loading Properties...</h3>
                <p>Please wait while we fetch your properties</p>
              </div>
            ) : properties.length === 0 ? (
              <div className="agent-overview-empty-state">
                <div className="agent-overview-empty-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M9 22V12h6v10" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                </div>
                <h3>No Properties Listed</h3>
                <p>Start by adding your first property</p>
                <button className="agent-overview-empty-action-btn" onClick={handleAddProperty}>
                  Add Property
                </button>
              </div>
            ) : (
              properties.slice(0, 3).map((property, index) => (
                <div 
                  className="agent-overview-property-item" 
                  key={property.id}
                  style={{ animationDelay: `${index * 0.1}s`, cursor: 'pointer' }}
                  onClick={() => window.open(`/agent-dashboard/details/${property.id}`, '_blank', 'noopener,noreferrer')}
                >
                  <div className="agent-overview-property-thumbnail">
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
                    <span className={`agent-overview-property-badge ${property.status === 'sale' ? 'agent-overview-badge-sale' : 'agent-overview-badge-rent'}`}>
                      {property.status === 'sale' ? 'For Sale' : 'For Rent'}
                    </span>
                  </div>
                  <div className="agent-overview-property-info">
                    <h4 className="agent-overview-property-title">{property.title}</h4>
                    <p className="agent-overview-property-location">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="currentColor" strokeWidth="2"/>
                        <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      {property.location}
                    </p>
                    <div className="agent-overview-property-stats">
                      <span className="agent-overview-property-stat-item">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2"/>
                          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                        {property.views || 0}
                      </span>
                      <span className="agent-overview-property-stat-item">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                        {property.inquiries || 0}
                      </span>
                    </div>
                  </div>
                  <div className="agent-overview-property-price">
                    <span className="agent-overview-price">{formatPrice(property.price)}</span>
                    {property.status === 'rent' && <span className="agent-overview-per-month">/month</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Inquiries */}
        <div className="agent-overview-inquiries-section">
          <div className="agent-overview-section-header">
            <h2 className="agent-overview-section-title">
              Recent Inquiries
              {stats.newInquiries > 0 && (
                <span className="agent-overview-title-badge">{stats.newInquiries}</span>
              )}
            </h2>
            <button className="agent-overview-view-all-btn" onClick={() => onNavigate && onNavigate('inquiries')}>
              View All
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          <div className="agent-overview-inquiries-list">
            {inquiriesLoading && inquiries.length === 0 ? (
              <div className="agent-overview-empty-state agent-overview-empty-small" style={{ padding: '30px 20px' }}>
                <div className="agent-overview-loading-spinner" style={{ width: '32px', height: '32px', borderWidth: 3, margin: '0 auto 10px' }}></div>
                <p>Loading inquiries...</p>
              </div>
            ) : recentInquiries.length === 0 ? (
              <div className="agent-overview-empty-state agent-overview-empty-small">
                <p>No new inquiries</p>
              </div>
            ) : (
              recentInquiries.map((inquiry, index) => (
                <div 
                  className="agent-overview-inquiry-item" 
                  key={inquiry.id}
                  style={{ animationDelay: `${index * 0.1}s`, cursor: 'pointer' }}
                  onClick={() => {
                    navigate(`/agent-dashboard/inquiries?inquiryId=${inquiry.id}`);
                  }}
                >
                  <div className="agent-overview-inquiry-avatar">
                    {inquiry.buyerProfileImage ? (
                      <img src={inquiry.buyerProfileImage} alt={inquiry.buyerName} />
                    ) : (inquiry.avatar && typeof inquiry.avatar === 'string' && (inquiry.avatar.startsWith('http://') || inquiry.avatar.startsWith('https://'))) ? (
                      <img src={inquiry.avatar} alt={inquiry.buyerName} />
                    ) : (
                      inquiry.avatar || (inquiry.buyerName ? inquiry.buyerName.charAt(0).toUpperCase() : 'U')
                    )}
                  </div>
                  <div className="agent-overview-inquiry-content">
                    <div className="agent-overview-inquiry-header">
                      <span className="agent-overview-inquiry-name">{inquiry.buyerName}</span>
                      <span className="agent-overview-inquiry-time">{getTimeAgo(inquiry.createdAt)}</span>
                    </div>
                    <p className="agent-overview-inquiry-property">{inquiry.propertyTitle}</p>
                    <p className="agent-overview-inquiry-message">{inquiry.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add Property Popup */}
      {showPopup && <AddPropertyPopup onClose={() => setShowPopup(false)} />}
      
      {/* Add New project Popup */}
      {showUpcomingProjectPopup && <AddUpcomingProjectPopup onClose={() => setShowUpcomingProjectPopup(false)} />}
    </div>
  );
};

export default AgentOverview;