import React, { useState, useEffect } from 'react';
import { Search, Filter, Eye, Trash2, X, Check, Heart, Star } from 'lucide-react';
import { API_ENDPOINTS } from '../../config/api.config';
import { adminFetch } from '../utils/adminFetch';
import DeletePropertyModal from '../../components/DeletePropertyModal/DeletePropertyModal';
import '../style/AdminProperties.css';

const AdminProperties = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [cityFilter, setCityFilter] = useState('');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [properties, setProperties] = useState([]);
  const [filterOptions, setFilterOptions] = useState({ cities: [], property_types: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 0 });
  const [pageSize, setPageSize] = useState(20);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState(null);

  useEffect(() => {
    // Reset to page 1 when filters or page size change
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [statusFilter, searchTerm, cityFilter, propertyTypeFilter, minPrice, maxPrice, pageSize]);

  useEffect(() => {
    fetchProperties();
  }, [pagination.page, pageSize, statusFilter, searchTerm, cityFilter, propertyTypeFilter, minPrice, maxPrice]);

  const fetchProperties = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pageSize.toString()
      });

      if (statusFilter !== 'All Status') {
        if (statusFilter === 'Approved') params.append('status', 'approved');
        else if (statusFilter === 'Pending') params.append('status', 'pending');
        else if (statusFilter === 'Sold') params.append('status', 'sold');
      }
      if (cityFilter) params.append('city', cityFilter);
      if (propertyTypeFilter) params.append('property_type', propertyTypeFilter);
      if (minPrice) params.append('min_price', minPrice);
      if (maxPrice) params.append('max_price', maxPrice);
      if (searchTerm) params.append('search', searchTerm);

      const data = await adminFetch(`${API_ENDPOINTS.ADMIN_PROPERTIES_LIST}?${params}`);
      setProperties(Array.isArray(data?.properties) ? data.properties : []);
      setPagination(data?.pagination || { page: 1, total: 0, pages: 0 });
      if (data?.filter_options) setFilterOptions(data.filter_options);
    } catch (err) {
      setError(err.message || 'Failed to load properties');
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (propertyId) => {
    try {
      await adminFetch(`${API_ENDPOINTS.ADMIN_PROPERTIES_APPROVE}?id=${propertyId}`, { method: 'POST' });
      fetchProperties();
    } catch (err) {
      alert(err.message || 'Failed to approve property');
    }
  };

  const handleReject = async (propertyId) => {
    const reason = window.prompt('Enter rejection reason (optional):');
    if (reason === null) return;

    try {
      await adminFetch(`${API_ENDPOINTS.ADMIN_PROPERTIES_REJECT}?id=${propertyId}`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason || 'Property rejected by admin' })
      });
      fetchProperties();
    } catch (err) {
      alert(err.message || 'Failed to reject property');
    }
  };

  const handleDeleteClick = (propertyId) => {
    setPropertyToDelete(propertyId);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!propertyToDelete) return;

    try {
      await adminFetch(`${API_ENDPOINTS.ADMIN_PROPERTIES_DELETE}?id=${propertyToDelete}`, { method: 'DELETE' });
      fetchProperties();
      setPropertyToDelete(null);
      setDeleteModalOpen(false);
    } catch (err) {
      alert(err.message || 'Failed to delete property');
    }
  };

  const getStatusColor = (isActive) => {
    return isActive ? '#10b981' : '#f59e0b';
  };

  const getStatusText = (isActive) => {
    return isActive ? 'Approved' : 'Pending';
  };

  const formatPrice = (price) => {
    if (!price) return 'N/A';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price);
  };

  return (
    <div className="admin-properties">
      <div className="admin-page-header">
        <div>
          <h1>Manage Properties</h1>
          <p>{loading ? 'Loading...' : `${properties.length} of ${pagination.total} properties`}</p>
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
              placeholder="Search by name, location, or type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  fetchProperties();
                }
              }}
            />
          </div>
          <button className="admin-search-btn" onClick={fetchProperties}>
            Search
          </button>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
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
                {['All Status', 'Approved', 'Pending', 'Sold'].map(status => (
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

          {/* City Filter */}
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            style={{
              padding: '6px 12px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              minWidth: '150px'
            }}
          >
            <option value="">All Cities</option>
            {filterOptions.cities.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>

          {/* Property Type Filter */}
          <select
            value={propertyTypeFilter}
            onChange={(e) => setPropertyTypeFilter(e.target.value)}
            style={{
              padding: '6px 12px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              minWidth: '150px'
            }}
          >
            <option value="">All Types</option>
            {filterOptions.property_types.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          {/* Price Range */}
          <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
            <input
              type="number"
              placeholder="Min Price"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              style={{
                padding: '6px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '14px',
                width: '120px'
              }}
            />
            <span style={{ color: '#64748b' }}>to</span>
            <input
              type="number"
              placeholder="Max Price"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              style={{
                padding: '6px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '14px',
                width: '120px'
              }}
            />
          </div>
        </div>
      </div>

      <div className="admin-properties-table-container">
        {loading ? (
          <div className="admin-no-results">
            <h3>Loading properties...</h3>
          </div>
        ) : error ? (
          <div className="admin-no-results">
            <h3>Error</h3>
            <p>{error}</p>
          </div>
        ) : properties.length > 0 ? (
          <table className="admin-properties-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>PROPERTY</th>
                <th>TYPE</th>
                <th>LISTING</th>
                <th>PRICE</th>
                <th>VIEWS</th>
                <th>INTEREST</th>
                <th>FAVORITES</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {properties.map((property) => {
                const isActive = property.is_active || false;
                return (
                  <tr key={property.id}>
                    <td>#{property.id}</td>
                    <td>
                      <div className="admin-property-cell">
                        <div className="admin-property-icon">
                          {property.cover_image ? (
                            <img src={property.cover_image} alt="" />
                          ) : (
                            <div style={{ width: '40px', height: '40px', background: '#e5e7eb', borderRadius: '4px' }}></div>
                          )}
                        </div>
                        <div>
                          <div className="admin-property-name">{property.title || 'Untitled Property'}</div>
                          <div className="admin-property-location">{property.location || 'N/A'}</div>
                        </div>
                      </div>
                    </td>
                    <td>{property.property_type || 'N/A'}</td>
                    <td>
                      <span className={`admin-listing-badge ${property.status?.toLowerCase() || 'sale'}`}>
                        {property.status === 'rent' ? 'Rent' : 'Sale'}
                      </span>
                    </td>
                    <td className="admin-price-cell">{formatPrice(property.price)}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Eye size={16} style={{ color: '#64748b' }} />
                        <span style={{ fontWeight: '500', color: '#1e293b' }}>
                          {property.views_count || 0}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Heart size={16} style={{ color: '#f59e0b', fill: '#f59e0b' }} />
                        <span style={{ fontWeight: '500', color: '#1e293b' }}>
                          {property.interest_count || 0}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Star size={16} style={{ color: '#eab308', fill: '#eab308' }} />
                        <span style={{ fontWeight: '500', color: '#1e293b' }}>
                          {property.favorites_count || 0}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span 
                        className="admin-status-badge"
                        style={{ 
                          background: `${getStatusColor(isActive)}20`,
                          color: getStatusColor(isActive)
                        }}
                      >
                        {getStatusText(isActive)}
                      </span>
                    </td>
                    <td className="admin-actions-column">
                      <div className="admin-action-buttons">
                        <button className="admin-properties-icon-btn" title="View">
                          <Eye />
                        </button>
                        {!isActive && (
                          <>
                            <button 
                              className="admin-properties-icon-btn admin-approve-btn" 
                              title="Approve"
                              onClick={() => handleApprove(property.id)}
                            >
                              <Check />
                            </button>
                            <button 
                              className="admin-properties-icon-btn admin-reject-btn" 
                              title="Reject"
                              onClick={() => handleReject(property.id)}
                            >
                              <X />
                            </button>
                          </>
                        )}
                        <button 
                          className="admin-properties-icon-btn admin-danger" 
                          title="Delete"
                          onClick={() => handleDeleteClick(property.id)}
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
        ) : (
          <div className="admin-no-results">
            <h3>No properties found</h3>
            <p>Try adjusting your search or filters</p>
          </div>
        )}
      </div>

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

export default AdminProperties;