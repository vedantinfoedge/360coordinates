import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Users, 
  UserCheck,
  CreditCard,
  AlertCircle
} from 'lucide-react';
import { API_ENDPOINTS } from '../../config/api.config';
import { adminFetch } from '../utils/adminFetch';
import '../style/AdminDashboard.css';

const POLL_INTERVAL_MS = 180000; // 3 minutes – avoid refreshing too often

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [propertyTypes, setPropertyTypes] = useState([]);
  const [recentProperties, setRecentProperties] = useState([]);
  const [dateRange, setDateRange] = useState('7d'); // '7d', '30d', '90d', 'all'
  const [lastUpdated, setLastUpdated] = useState(null);
  const fetchInProgressRef = useRef(false);

  useEffect(() => {
    fetchDashboardStats(true); // initial load: show loading

    const interval = setInterval(() => {
      if (fetchInProgressRef.current) return;
      // Only poll when tab is visible so we don't refresh in background
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      fetchDashboardStats(false); // background refresh: no loading flicker
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [dateRange]);

  const fetchDashboardStats = async (showLoading = true) => {
    if (fetchInProgressRef.current) return;
    fetchInProgressRef.current = true;
    if (showLoading) {
      setLoading(true);
      setError(null);
    }

    try {
      const params = new URLSearchParams();
      if (dateRange !== 'all') {
        params.append('date_range', dateRange);
      }
      // Cache-bust so we always get fresh counts from the server
      params.append('_t', Date.now().toString());
      const endpoint = `${API_ENDPOINTS.ADMIN_DASHBOARD_STATS}?${params.toString()}`;
      const statsData = await adminFetch(endpoint, { cache: 'no-store' });

      // Use actual counts from API (total_properties and total_users are all-time DB counts)
      const totalProperties = Number(statsData.total_properties ?? statsData.totalProperties ?? 0) || 0;
      const totalUsers = Number(statsData.total_users ?? statsData.totalUsers ?? 0) || 0;
      const pendingProperties = Number(statsData.pending_properties ?? 0) || 0;
      const buyers = Number(statsData.users_by_type?.buyer ?? 0) || 0;
      const sellers = Number(statsData.users_by_type?.seller ?? 0) || 0;

        // Format stats for display with navigation paths – real-time data only
        const formattedStats = [
          {
            title: 'Total Properties',
            value: String(totalProperties),
            change: `${pendingProperties} pending`,
            trend: 'up',
            icon: Building2,
            color: '#3b82f6',
            path: '/admin/properties'
          },
          {
            title: 'Total Users',
            value: String(totalUsers),
            change: `${buyers} buyers, ${sellers} sellers`,
            trend: 'up',
            icon: Users,
            color: '#8b5cf6',
            path: '/admin/users'
          },
          {
            title: 'Active Agents',
            value: String(Number(statsData.total_agents ?? 0) || 0),
            change: `${Number(statsData.total_agents ?? 0) || 0} total agents`,
            trend: 'up',
            icon: UserCheck,
            color: '#06b6d4',
            path: '/admin/agents'
          },
          {
            title: 'Active Subscriptions',
            value: String(Number(statsData.active_subscriptions ?? 0) || 0),
            change: `${Number(statsData.expired_subscriptions ?? 0) || 0} expired`,
            trend: 'up',
            icon: CreditCard,
            color: '#8b5cf6',
            path: '/admin/subscriptions'
          }
        ];

        setStats(formattedStats);
        setPropertyTypes(statsData.property_types_distribution || []);
        setRecentProperties(statsData.recent_properties || []);
        setLastUpdated(new Date());
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data.');
    } finally {
      if (showLoading) setLoading(false);
      fetchInProgressRef.current = false;
    }
  };

  // Dynamic color palette for property types - generates colors based on type name hash
  const generateColorFromType = (typeName) => {
    if (!typeName) return '#64748b';
    
    // Hash function to generate consistent colors
    let hash = 0;
    for (let i = 0; i < typeName.length; i++) {
      hash = typeName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Generate HSL color with good saturation and lightness
    const hue = Math.abs(hash) % 360;
    const saturation = 60 + (Math.abs(hash) % 20); // 60-80%
    const lightness = 45 + (Math.abs(hash) % 15); // 45-60%
    
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  const getColorForType = (typeName) => {
    // Fallback to predefined colors for common types, otherwise generate dynamically
    const predefinedColors = {
      'Apartment': '#3b82f6',
      'House': '#10b981',
      'Villa': '#8b5cf6',
      'Commercial': '#f59e0b',
      'Land': '#06b6d4',
      'Plot': '#ef4444',
      'Office': '#6366f1'
    };
    
    return predefinedColors[typeName] || generateColorFromType(typeName);
  };

  // Calculate pie chart segments
  const calculatePieChart = () => {
    if (!propertyTypes || propertyTypes.length === 0) return null;
    
    const total = propertyTypes.reduce((sum, type) => sum + type.count, 0);
    if (total === 0) return null;

    const circumference = 2 * Math.PI * 80; // radius = 80
    let offset = 0;
    
    return propertyTypes.map((type, index) => {
      const percentage = (type.count / total) * 100;
      const dashArray = (percentage / 100) * circumference;
      const dashOffset = -offset;
      offset += dashArray;
      
      return {
        ...type,
        percentage: percentage.toFixed(1),
        dashArray: `${dashArray} ${circumference}`,
        dashOffset: dashOffset,
        color: getColorForType(type.name)
      };
    });
  };

  const pieSegments = calculatePieChart();

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="admin-dashboard-header">
          <div>
            <h1>Dashboard</h1>
            <p>Loading dashboard data...</p>
          </div>
        </div>
        
        {/* Loading Skeletons */}
        <div className="admin-stats-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="admin-stat-card" style={{ opacity: 0.6 }}>
              <div className="admin-stat-header">
                <div className="admin-stat-title" style={{ 
                  background: '#e2e8f0', 
                  height: '16px', 
                  width: '100px', 
                  borderRadius: '4px',
                  animation: 'pulse 1.5s ease-in-out infinite'
                }}></div>
                <div className="admin-stat-icon" style={{ 
                  background: '#e2e8f0',
                  animation: 'pulse 1.5s ease-in-out infinite'
                }}></div>
              </div>
              <div className="admin-stat-value" style={{ 
                background: '#e2e8f0', 
                height: '32px', 
                width: '80px', 
                borderRadius: '4px',
                animation: 'pulse 1.5s ease-in-out infinite'
              }}></div>
              <div style={{ 
                background: '#e2e8f0', 
                height: '14px', 
                width: '120px', 
                borderRadius: '4px',
                marginTop: '8px',
                animation: 'pulse 1.5s ease-in-out infinite'
              }}></div>
            </div>
          ))}
        </div>
        
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-dashboard">
        <div className="admin-dashboard-header">
          <h1>Dashboard</h1>
          <div style={{ color: '#ef4444', marginTop: '20px' }}>
            <AlertCircle size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p>Welcome back! Here's an overview of your platform.
            {lastUpdated && (
              <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '8px' }}>
                Updated {lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <span style={{ fontSize: '12px', color: '#94a3b8', marginLeft: '4px' }}>(refreshes every 3 min)</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select 
            value={dateRange} 
            onChange={(e) => setDateRange(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              background: 'white'
            }}
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
          </select>
          <button 
            onClick={fetchDashboardStats}
            style={{
              padding: '8px 16px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="admin-stats-grid">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            const isClickable = stat.path !== null;
            
            return (
              <div 
                key={index} 
                className={`admin-stat-card ${isClickable ? 'admin-stat-card-clickable' : ''}`}
                onClick={() => {
                  if (isClickable && stat.path) {
                    navigate(stat.path);
                  }
                }}
                style={{
                  cursor: isClickable ? 'pointer' : 'default',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (isClickable) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (isClickable) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '';
                  }
                }}
              >
                <div className="admin-stat-content">
                  <div className="admin-stat-header">
                    <span className="admin-stat-title">{stat.title}</span>
                    <div className="admin-stat-icon" style={{ background: `${stat.color}20` }}>
                      <Icon style={{ color: stat.color }} />
                    </div>
                  </div>
                  <div className="admin-stat-value">{stat.value}</div>

                  {stat.change && (
                    <div className={`admin-stat-change ${stat.trend}`}>
                      <span>{stat.change}</span>
                    </div>
                  )}
                  
                  {isClickable && (
                    <div style={{ 
                      marginTop: '8px', 
                      fontSize: '12px', 
                      color: stat.color,
                      fontWeight: '500',
                      opacity: 0.8
                    }}>
                      Click to view →
                    </div>
                  )}
                </div>    
              </div>
            );
          })}
        </div>
      )}

      {/* Recent Activity Section */}
      <div style={{ marginTop: '20px' }}>
        <div className="admin-dashboard-card">
          <h2>Recent Properties</h2>
          {recentProperties.length > 0 ? (
            <div style={{ marginTop: '15px' }}>
              {recentProperties.map((property, index) => (
                <div key={property.id || index} style={{ 
                  padding: '12px', 
                  borderBottom: index < recentProperties.length - 1 ? '1px solid #e2e8f0' : 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>
                      {property.title || 'Untitled Property'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      {property.seller_name || 'Unknown'} • ₹{property.price?.toLocaleString('en-IN') || '0'}
                    </div>
                  </div>
                  <div style={{ 
                    padding: '4px 8px', 
                    borderRadius: '4px',
                    background: property.is_active ? '#10b98120' : '#f59e0b20',
                    color: property.is_active ? '#10b981' : '#f59e0b',
                    fontSize: '11px',
                    fontWeight: '500'
                  }}>
                    {property.is_active ? 'Active' : 'Pending'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>
              No recent properties
            </p>
          )}
        </div>
      </div>

      {/* Property Types */}
      {pieSegments && pieSegments.length > 0 ? (
        <div className="admin-dashboard-card" style={{ marginTop: '20px' }}>
          <h2>Property Types Distribution</h2>
          <div className="admin-pie-chart-container">
            <svg viewBox="0 0 200 200" className="admin-pie-chart">
              {pieSegments.map((segment, index) => (
                <circle
                  key={index}
                  cx="100"
                  cy="100"
                  r="80"
                  fill="none"
                  stroke={segment.color}
                  strokeWidth="40"
                  strokeDasharray={segment.dashArray}
                  strokeDashoffset={segment.dashOffset}
                  transform="rotate(-90 100 100)"
                />
              ))}
            </svg>

            <div className="admin-pie-labels">
              {pieSegments.map((type, index) => (
                <div key={index} className="admin-pie-label">
                  <span className="admin-pie-color" style={{ background: type.color }}></span>
                  <span className="admin-pie-text">{type.name} {type.percentage}% ({type.count})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="admin-dashboard-card" style={{ marginTop: '20px' }}>
          <h2>Property Types Distribution</h2>
          <p style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>
            No property data available
          </p>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;
