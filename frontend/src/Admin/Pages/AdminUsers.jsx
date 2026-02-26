import React, { useState, useEffect } from 'react';
import { Search, Filter, Trash2, Ban, CheckCircle } from 'lucide-react';
import { API_ENDPOINTS } from '../../config/api.config';
import { adminFetch } from '../utils/adminFetch';
import '../style/AdminUsers.css';

const AdminUsers = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All Roles');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 0 });
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    // Reset to page 1 when filters or page size change
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [roleFilter, searchTerm, pageSize]);

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, pageSize, roleFilter, searchTerm]);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pageSize.toString()
      });
      if (roleFilter !== 'All Roles') params.append('user_type', roleFilter.toLowerCase());
      if (searchTerm) params.append('search', searchTerm);

      const data = await adminFetch(`${API_ENDPOINTS.ADMIN_USERS_LIST}?${params}`);
      const usersList = data?.users || [];
      const paginationData = data?.pagination || { page: 1, total: 0, pages: 0 };
      setUsers(usersList);
      setPagination(paginationData);
    } catch (err) {
      setError(err.message || 'Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    try {
      await adminFetch(`${API_ENDPOINTS.ADMIN_USERS_DELETE}?id=${userId}`, { method: 'DELETE' });
      fetchUsers();
    } catch (err) {
      alert(err.message || 'Failed to delete user');
    }
  };

  const handleBanToggle = async (user, isBanned) => {
    try {
      await adminFetch(`${API_ENDPOINTS.ADMIN_USERS_UPDATE}?id=${user.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_banned: !isBanned }),
      });
      fetchUsers();
    } catch (err) {
      alert(err.message || 'Failed to update user');
    }
  };

  const getKYCStatus = (user) => {
    if (user.email_verified && user.phone_verified) return 'Verified';
    if (user.email_verified || user.phone_verified) return 'Partial';
    return 'Pending';
  };

  const getKYCColor = (status) => {
    switch (status) {
      case 'Verified': return '#10b981';
      case 'Partial': return '#f59e0b';
      case 'Pending': return '#f59e0b';
      default: return '#64748b';
    }
  };

  const getStatusColor = (isBanned) => {
    return isBanned ? '#ef4444' : '#10b981';
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatRole = (role) => {
    if (!role) return 'N/A';
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  return (
    <div className="admin-users">
      <div className="admin-page-header">
        <div>
          <h1>Manage Users</h1>
          <p>{loading ? 'Loading...' : `${users.length} of ${pagination.total} users`}</p>
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
                  fetchUsers();
                }
              }}
            />
          </div>
          <button className="admin-search-btn" onClick={fetchUsers}>
            Search
          </button>
        </div>

        <div style={{ position: 'relative' }}>
          <button 
            className="admin-filter-btn"
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
          >
            <Filter />
            {roleFilter}
          </button>
          
          {showFilterDropdown && (
            <div className="admin-filter-dropdown">
              {['All Roles', 'Buyer', 'Seller'].map(role => (
                <div
                  key={role}
                  className={`admin-filter-option ${roleFilter === role ? 'admin-active' : ''}`}
                  onClick={() => {
                    setRoleFilter(role);
                    setShowFilterDropdown(false);
                  }}
                >
                  {role}
                </div>
              ))}
            </div>
          )}
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

      <div className="admin-users-table-container">
        {loading ? (
          <div className="admin-no-results">
            <h3>Loading users...</h3>
            <p>Please wait while we fetch user data...</p>
          </div>
        ) : error && users.length === 0 ? (
          <div className="admin-no-results">
            <h3>Unable to Load Users</h3>
            <p>{error}</p>
            <button 
              onClick={fetchUsers}
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
        ) : users.length > 0 ? (
          <>
            <div style={{ marginBottom: '15px', color: '#64748b', fontSize: '14px' }}>
              Showing {users.length} of {pagination.total} users (Page {pagination.page} of {pagination.pages})
            </div>
            <table className="admin-users-table">
              <thead>
                <tr>
                  <th>USER</th>
                  <th>PHONE</th>
                  <th>ROLE</th>
                  <th>KYC STATUS</th>
                  <th>PROPERTIES</th>
                  <th>STATUS</th>
                  <th>JOINED</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>

              <tbody>
                {users.map((user, index) => {
                  const kycStatus = getKYCStatus(user);
                  const isBanned = user.is_banned || false;
                  
                  if (!user || !user.id) {
                    console.warn('Invalid user data:', user);
                    return null;
                  }
                  
                  return (
                    <tr key={user.id || `user-${index}`}>
                      <td>
                        <div className="admin-user-cell">
                          <div className="admin-user-avatar">
                            {getInitials(user.full_name)}
                          </div>
                          <div className="admin-user-info">
                            <div className="admin-user-name">{user.full_name || 'N/A'}</div>
                            <div className="admin-user-email">{user.email || 'No email'}</div>
                          </div>
                        </div>
                      </td>

                      <td className="admin-phone-cell">
                        <div>
                          <div>{user.phone || 'N/A'}</div>
                          {user.phone_verified && (
                            <span style={{ fontSize: '11px', color: '#10b981' }}>✓ Verified</span>
                          )}
                        </div>
                      </td>
                      <td className="admin-role-cell">
                        <span style={{ 
                          padding: '4px 8px', 
                          borderRadius: '4px',
                          background: user.user_type === 'agent' ? '#06b6d420' : 
                                     user.user_type === 'seller' ? '#8b5cf620' : '#3b82f620',
                          color: user.user_type === 'agent' ? '#06b6d4' : 
                                user.user_type === 'seller' ? '#8b5cf6' : '#3b82f6',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}>
                          {formatRole(user.user_type)}
                        </span>
                      </td>

                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span
                            className="admin-status-badge"
                            style={{
                              background: `${getKYCColor(kycStatus)}20`,
                              color: getKYCColor(kycStatus),
                              fontSize: '11px'
                            }}
                          >
                            {kycStatus}
                          </span>
                          <div style={{ fontSize: '10px', color: '#64748b' }}>
                            {user.email_verified ? '✓ Email' : '✗ Email'} | {user.phone_verified ? '✓ Phone' : '✗ Phone'}
                          </div>
                        </div>
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontWeight: '600', color: '#3b82f6' }}>
                          {user.property_count || 0}
                        </span>
                      </td>

                      <td>
                        <span
                          className="admin-status-badge"
                          style={{
                            background: `${getStatusColor(isBanned)}20`,
                            color: getStatusColor(isBanned)
                          }}
                        >
                          {isBanned ? 'Banned' : 'Active'}
                        </span>
                      </td>

                      <td className="admin-joined-cell">{formatDate(user.created_at)}</td>

                      <td className="admin-actions-column">
                        <div className="admin-action-buttons">
                          <button 
                            className={`admin-icon-btn ${isBanned ? 'admin-success' : 'admin-warning'}`}
                            title={isBanned ? 'Unban User' : 'Ban User'}
                            onClick={() => handleBanToggle(user, isBanned)}
                          >
                            {isBanned ? <CheckCircle /> : <Ban />}
                          </button>
                          <button 
                            className="admin-icon-btn admin-danger" 
                            title="Delete User"
                            onClick={() => handleDelete(user.id)}
                          >
                            <Trash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
                  Page {pagination.page} of {pagination.pages} ({pagination.total} total users)
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
            <h3>No users found</h3>
            <p>Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUsers;
