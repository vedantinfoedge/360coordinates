import React, { useState, useEffect } from 'react';
import { Search, Filter, Eye, MessageSquare, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { API_BASE_URL, API_ENDPOINTS } from '../../config/api.config';
import '../style/AdminSupport.css';

const AdminSupport = () => {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({
    open: 0,
    in_progress: 0,
    resolved: 0,
    closed: 0,
    total: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const [showPriorityFilter, setShowPriorityFilter] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 0 });
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    fetchTickets();
  }, [pagination.page, statusFilter, priorityFilter, searchTerm]);

  const fetchTickets = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pageSize.toString()
      });

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      if (priorityFilter !== 'all') {
        params.append('priority', priorityFilter);
      }

      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.ADMIN_SUPPORT_LIST}?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include' // Use HTTP-only cookie for authentication
      });

      // Get response text first to see if it's JSON
      const responseText = await response.text();
      
      if (!response.ok) {
        // Try to parse as JSON to get error details
        let errorData = null;
        try {
          errorData = JSON.parse(responseText);
        } catch (e) {
          // Not JSON, use raw text
        }
        throw new Error(errorData?.message || errorData?.data?.message || 
          (response.status === 401 ? 'Authentication required. Please log in again.' :
           response.status === 403 ? 'Access denied. Insufficient permissions.' :
           response.status === 500 ? 'Server error. Please try again later.' :
           `HTTP error! status: ${response.status}`));
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse JSON:', e);
        console.error('Response text:', responseText);
        throw new Error('Invalid JSON response from server: ' + responseText.substring(0, 200));
      }

      if (data.success) {
        setTickets(data.data.tickets || []);
        setStats(data.data.stats || stats);
        setPagination(data.data.pagination || { page: 1, total: 0, pages: 0 });
      } else {
        setError(data.message || 'Failed to load tickets');
      }
    } catch (err) {
      console.error('Error fetching tickets:', err);
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setError('Network error. Please check your connection and ensure the backend server is running.');
      } else {
        setError(err.message || 'Failed to load tickets');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (ticketId, newStatus) => {
    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.ADMIN_SUPPORT_UPDATE_STATUS}?id=${ticketId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Use HTTP-only cookie for authentication
        body: JSON.stringify({ status: newStatus })
      });

      const data = await response.json();

      if (data.success) {
        fetchTickets();
      } else {
        alert(data.message || 'Failed to update ticket status');
      }
    } catch (err) {
      console.error('Error updating ticket:', err);
      alert('Failed to update ticket status');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatPriority = (priority) => {
    return priority ? priority.charAt(0).toUpperCase() + priority.slice(1) : 'Medium';
  };

  const formatStatus = (status) => {
    if (!status) return 'Open';
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getPriorityColor = (priority) => {
    const p = priority?.toLowerCase();
    switch (p) {
      case 'urgent': return '#ef4444';
      case 'high': return '#f97316';
      case 'medium': return '#3b82f6';
      case 'low': return '#64748b';
      default: return '#64748b';
    }
  };

  const getStatusColor = (status) => {
    const s = status?.toLowerCase();
    switch (s) {
      case 'open': return '#f59e0b';
      case 'in_progress': return '#3b82f6';
      case 'resolved': return '#10b981';
      case 'closed': return '#64748b';
      default: return '#64748b';
    }
  };

  const statCards = [
    { label: 'Open', value: stats.open, icon: AlertCircle, color: '#f59e0b' },
    { label: 'In Progress', value: stats.in_progress, icon: MessageSquare, color: '#3b82f6' },
    { label: 'Resolved', value: stats.resolved, icon: CheckCircle, color: '#10b981' },
    { label: 'Closed', value: stats.closed, icon: XCircle, color: '#64748b' }
  ];

  if (loading && tickets.length === 0) {
    return (
      <div className="admin-support">
        <div className="admin-page-header">
          <div>
            <h1>Support & Complaints</h1>
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && tickets.length === 0) {
    return (
      <div className="admin-support">
        <div className="admin-page-header">
          <div>
            <h1>Support & Complaints</h1>
            <div style={{ color: '#ef4444', marginTop: '20px' }}>
              {error}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-support">
      <div className="admin-page-header">
        <div>
          <h1>Support & Complaints</h1>
          <p>{stats.total} total tickets</p>
        </div>
      </div>

      <div className="admin-support-stats">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="admin-support-stat-card">
              <div className="admin-stat-icon" style={{ background: `${stat.color}20` }}>
                <Icon style={{ color: stat.color }} />
              </div>
              <div className="admin-stat-info">
                <div className="admin-stat-value">{stat.value}</div>
                <div className="admin-stat-label">{stat.label}</div>
              </div>
            </div>
          );
        })}
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
          <Search />
          <input 
            type="text" 
            placeholder="Search tickets..." 
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
          />
        </div>
        <div style={{ position: 'relative' }}>
          <button 
            className="admin-filter-btn"
            onClick={() => {
              setShowStatusFilter(!showStatusFilter);
              setShowPriorityFilter(false);
            }}
          >
            <Filter />
            {statusFilter === 'all' ? 'All Status' : formatStatus(statusFilter)}
          </button>
          {showStatusFilter && (
            <div className="admin-filter-dropdown">
              <div onClick={() => { setStatusFilter('all'); setShowStatusFilter(false); setPagination(prev => ({ ...prev, page: 1 })); }}>All Status</div>
              <div onClick={() => { setStatusFilter('open'); setShowStatusFilter(false); setPagination(prev => ({ ...prev, page: 1 })); }}>Open</div>
              <div onClick={() => { setStatusFilter('in_progress'); setShowStatusFilter(false); setPagination(prev => ({ ...prev, page: 1 })); }}>In Progress</div>
              <div onClick={() => { setStatusFilter('resolved'); setShowStatusFilter(false); setPagination(prev => ({ ...prev, page: 1 })); }}>Resolved</div>
              <div onClick={() => { setStatusFilter('closed'); setShowStatusFilter(false); setPagination(prev => ({ ...prev, page: 1 })); }}>Closed</div>
            </div>
          )}
        </div>
        <div style={{ position: 'relative' }}>
          <button 
            className="admin-filter-btn"
            onClick={() => {
              setShowPriorityFilter(!showPriorityFilter);
              setShowStatusFilter(false);
            }}
          >
            {priorityFilter === 'all' ? 'All Priority' : formatPriority(priorityFilter)}
          </button>
          {showPriorityFilter && (
            <div className="admin-filter-dropdown">
              <div onClick={() => { setPriorityFilter('all'); setShowPriorityFilter(false); setPagination(prev => ({ ...prev, page: 1 })); }}>All Priority</div>
              <div onClick={() => { setPriorityFilter('urgent'); setShowPriorityFilter(false); setPagination(prev => ({ ...prev, page: 1 })); }}>Urgent</div>
              <div onClick={() => { setPriorityFilter('high'); setShowPriorityFilter(false); setPagination(prev => ({ ...prev, page: 1 })); }}>High</div>
              <div onClick={() => { setPriorityFilter('medium'); setShowPriorityFilter(false); setPagination(prev => ({ ...prev, page: 1 })); }}>Medium</div>
              <div onClick={() => { setPriorityFilter('low'); setShowPriorityFilter(false); setPagination(prev => ({ ...prev, page: 1 })); }}>Low</div>
            </div>
          )}
        </div>
      </div>

      <div className="admin-tickets-table-container">
        {tickets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            No tickets found
          </div>
        ) : (
          <table className="admin-tickets-table">
            <thead>
              <tr>
                <th>TICKET ID</th>
                <th>SUBJECT</th>
                <th>USER</th>
                <th>PRIORITY</th>
                <th>STATUS</th>
                <th>CREATED</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket.id}>
                  <td className="admin-ticket-id">
                    <MessageSquare size={16} />
                    {ticket.ticket_id || `TCT-${ticket.id}`}
                  </td>
                  <td className="admin-subject">{ticket.subject}</td>
                  <td>
                    <div>
                      <div className="admin-user-name">{ticket.user_name || 'Guest'}</div>
                      <div className="admin-user-email">{ticket.user_email || 'N/A'}</div>
                    </div>
                  </td>
                  <td>
                    <span 
                      className="admin-priority-badge"
                      style={{ 
                        background: `${getPriorityColor(ticket.priority)}20`,
                        color: getPriorityColor(ticket.priority)
                      }}
                    >
                      {formatPriority(ticket.priority)}
                    </span>
                  </td>
                  <td>
                    <span 
                      className="admin-status-badge"
                      style={{ 
                        background: `${getStatusColor(ticket.status)}20`,
                        color: getStatusColor(ticket.status)
                      }}
                    >
                      {formatStatus(ticket.status)}
                    </span>
                  </td>
                  <td>{formatDate(ticket.created_at)}</td>
                  <td>
                    <button 
                      className="admin-support-icon-btn"
                      onClick={() => {
                        const newStatus = ticket.status === 'open' ? 'in_progress' : 
                                         ticket.status === 'in_progress' ? 'resolved' : 
                                         ticket.status === 'resolved' ? 'closed' : 'open';
                        handleStatusUpdate(ticket.id, newStatus);
                      }}
                      title="Update status"
                    >
                      <Eye />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pagination.pages > 1 && (
        <div className="admin-pagination">
          <button 
            onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
            disabled={pagination.page === 1}
          >
            Previous
          </button>
          <span>Page {pagination.page} of {pagination.pages}</span>
          <button 
            onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.pages, prev.page + 1) }))}
            disabled={pagination.page === pagination.pages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminSupport;
