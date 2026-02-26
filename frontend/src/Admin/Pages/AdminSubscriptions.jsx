import React, { useState, useEffect } from 'react';
import { Search, Filter, CreditCard } from 'lucide-react';
import { API_ENDPOINTS } from '../../config/api.config';
import { adminFetch } from '../utils/adminFetch';
import '../style/AdminSubscriptions.css';

const AdminSubscriptions = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [planFilter, setPlanFilter] = useState('All Plans');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 0 });
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [planFilter, statusFilter, searchTerm, pageSize]);

  useEffect(() => {
    fetchSubscriptions();
  }, [pagination.page, pageSize, planFilter, statusFilter, searchTerm]);

  const fetchSubscriptions = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pageSize.toString()
      });
      if (planFilter !== 'All Plans') params.append('plan_type', planFilter.toLowerCase());
      if (statusFilter !== 'All Status') params.append('status', statusFilter.toLowerCase());
      if (searchTerm) params.append('search', searchTerm);

      const data = await adminFetch(`${API_ENDPOINTS.ADMIN_SUBSCRIPTIONS_LIST}?${params}`);
      setSubscriptions(Array.isArray(data?.subscriptions) ? data.subscriptions : []);
      setPagination(data?.pagination || { page: 1, total: 0, pages: 0 });
    } catch (err) {
      setError(err.message || 'Failed to load subscriptions');
      setSubscriptions([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    });
  };

  const getPlanColor = (planType) => {
    const colors = {
      'free': '#64748b',
      'basic': '#3b82f6',
      'pro': '#8b5cf6',
      'premium': '#f59e0b'
    };
    return colors[planType] || '#64748b';
  };

  const getStatusColor = (isActive) => {
    return isActive ? '#10b981' : '#ef4444';
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <div className="admin-subscriptions">
      <div className="admin-page-header">
        <div>
          <h1>Subscription Management</h1>
          <p>{loading ? 'Loading...' : `${subscriptions.length} of ${pagination.total} subscriptions`}</p>
        </div>
      </div>

      <div className="admin-filters-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontSize: '14px', color: '#64748b' }}>Items per page:</label>
          <select 
            value={pageSize} 
            onChange={(e) => setPageSize(Number(e.target.value))}
            style={{
              padding: '6px 12px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
        
        <div className="admin-search-box">
          <div className="admin-search-input-wrapper">
            <Search />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  fetchSubscriptions();
                }
              }}
            />
          </div>
          <button className="admin-search-btn" onClick={fetchSubscriptions}>
            Search
          </button>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {/* Plan Filter */}
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            style={{
              padding: '6px 12px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              minWidth: '150px'
            }}
          >
            <option value="All Plans">All Plans</option>
            <option value="Free">Free</option>
            <option value="Basic">Basic</option>
            <option value="Pro">Pro</option>
            <option value="Premium">Premium</option>
          </select>

          {/* Status Filter */}
          <div style={{ position: 'relative' }}>
            <button 
              className="admin-filter-btn"
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            >
              <Filter />
              {statusFilter}
            </button>
            
            {showFilterDropdown && (
              <div className="admin-filter-dropdown">
                {['All Status', 'Active', 'Expired'].map(status => (
                  <div
                    key={status}
                    className={`admin-filter-option ${statusFilter === status ? 'admin-active' : ''}`}
                    onClick={() => {
                      setStatusFilter(status);
                      setShowFilterDropdown(false);
                    }}
                  >
                    {status}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div style={{ 
          background: '#fee2e2', 
          color: '#dc2626', 
          padding: '12px 16px', 
          borderRadius: '6px', 
          marginBottom: '20px',
          border: '1px solid #fecaca'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="admin-subscriptions-table-container">
        {loading ? (
          <div className="admin-no-results">
            <h3>Loading subscriptions...</h3>
            <p>Please wait while we fetch subscription data...</p>
          </div>
        ) : error && subscriptions.length === 0 ? (
          <div className="admin-no-results">
            <h3>Unable to Load Subscriptions</h3>
            <p>{error}</p>
            <button 
              onClick={fetchSubscriptions}
              style={{
                marginTop: '15px',
                padding: '10px 20px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Retry
            </button>
          </div>
        ) : subscriptions.length > 0 ? (
          <>
            <div style={{ marginBottom: '15px', color: '#64748b', fontSize: '14px' }}>
              Showing {subscriptions.length} of {pagination.total} subscriptions (Page {pagination.page} of {pagination.pages})
            </div>
            <table className="admin-subscriptions-table">
              <thead>
                <tr>
                  <th>USER</th>
                  <th>SUBSCRIPTION PLAN</th>
                  <th>START DATE</th>
                  <th>EXPIRY DATE</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((subscription) => (
                  <tr key={subscription.id}>
                    <td>
                      <div className="admin-subscription-user-cell">
                        <div className="admin-subscription-user-avatar">
                          {getInitials(subscription.user_name)}
                        </div>
                        <div className="admin-subscription-user-info">
                          <div className="admin-subscription-user-name">{subscription.user_name}</div>
                          <div className="admin-subscription-user-email">{subscription.user_email}</div>
                          <div className="admin-subscription-user-phone">{subscription.user_phone}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CreditCard size={18} style={{ color: getPlanColor(subscription.plan_type) }} />
                        <span
                          style={{
                            padding: '4px 12px',
                            borderRadius: '4px',
                            background: `${getPlanColor(subscription.plan_type)}20`,
                            color: getPlanColor(subscription.plan_type),
                            fontSize: '13px',
                            fontWeight: '600',
                            textTransform: 'capitalize'
                          }}
                        >
                          {subscription.plan_type}
                        </span>
                      </div>
                    </td>
                    <td className="admin-subscription-date-cell">{formatDate(subscription.start_date)}</td>
                    <td className="admin-subscription-date-cell">
                      {subscription.end_date ? formatDate(subscription.end_date) : 'No expiry'}
                    </td>
                    <td>
                      <span
                        className="admin-status-badge"
                        style={{
                          background: `${getStatusColor(subscription.is_active)}20`,
                          color: getStatusColor(subscription.is_active)
                        }}
                      >
                        {subscription.is_active ? 'Active' : 'Expired'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="admin-pagination" style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                <button 
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                  disabled={pagination.page === 1}
                  style={{ 
                    padding: '8px 16px', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '6px',
                    background: pagination.page === 1 ? '#f1f5f9' : 'white',
                    cursor: pagination.page === 1 ? 'not-allowed' : 'pointer'
                  }}
                >
                  Previous
                </button>
                <span style={{ padding: '0 10px' }}>
                  Page {pagination.page} of {pagination.pages} ({pagination.total} total subscriptions)
                </span>
                <button 
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.pages, prev.page + 1) }))}
                  disabled={pagination.page === pagination.pages}
                  style={{ 
                    padding: '8px 16px', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '6px',
                    background: pagination.page === pagination.pages ? '#f1f5f9' : 'white',
                    cursor: pagination.page === pagination.pages ? 'not-allowed' : 'pointer'
                  }}
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="admin-no-results">
            <h3>No subscriptions found</h3>
            <p>Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSubscriptions;

