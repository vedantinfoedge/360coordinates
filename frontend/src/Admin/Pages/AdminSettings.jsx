import React, { useState, useEffect } from 'react';
import { Shield, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { API_BASE_URL, API_ENDPOINTS } from '../../config/api.config';
import '../style/AdminSettings.css'

const AdminSettings = () => {
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [adminProfile, setAdminProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Load admin profile on mount
  useEffect(() => {
    const loadAdminProfile = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.ADMIN_VERIFY}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Use HTTP-only cookie for authentication
        });

        const data = await response.json();
        if (data.success && data.data?.admin) {
          setAdminProfile(data.data.admin);
        }
      } catch (err) {
        console.error('Error loading admin profile:', err);
      } finally {
        setProfileLoading(false);
      }
    };

    loadAdminProfile();
  }, []);

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswords(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear message when user types
    if (message.text) {
      setMessage({ type: '', text: '' });
    }
  };

  const handleChangePassword = async () => {
    // Validation
    if (!passwords.currentPassword || !passwords.newPassword || !passwords.confirmPassword) {
      setMessage({ type: 'error', text: 'All password fields are required' });
      return;
    }

    if (passwords.newPassword.length < 8) {
      setMessage({ type: 'error', text: 'New password must be at least 8 characters long' });
      return;
    }

    if (passwords.newPassword !== passwords.confirmPassword) {
      setMessage({ type: 'error', text: 'New password and confirm password do not match' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {

      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.ADMIN_CHANGE_PASSWORD}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Use HTTP-only cookie for authentication
        body: JSON.stringify({
          current_password: passwords.currentPassword,
          new_password: passwords.newPassword,
          confirm_password: passwords.confirmPassword
        })
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Password changed successfully!' });
        setPasswords({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to change password' });
      }
    } catch (err) {
      console.error('Error changing password:', err);
      setMessage({ type: 'error', text: 'Failed to change password. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveChanges = () => {
    // Add save logic here for other settings
    console.log('Saving changes...');
  };

  return (
    <div className="admin-settings">
      <div className="admin-page-header">
        <div>
          <h1>Settings</h1>
          <p>Manage your privacy and security settings</p>
        </div>
      </div>

      <div className="admin-settings-grid">
        {/* Admin Profile Info */}
        {adminProfile && (
          <div className="admin-settings-card">
            <div className="admin-settings-header">
              <Shield />
              <h2>Admin Profile</h2>
            </div>
            <div style={{ padding: '20px 0' }}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Full Name</label>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>
                  {adminProfile.full_name || adminProfile.username || 'N/A'}
                </div>
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Email</label>
                <div style={{ fontSize: '16px', color: '#1e293b' }}>
                  {adminProfile.email || 'N/A'}
                </div>
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Role</label>
                <div style={{ fontSize: '16px', color: '#1e293b', textTransform: 'capitalize' }}>
                  {adminProfile.role?.replace('_', ' ') || 'N/A'}
                </div>
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Account Status</label>
                <div style={{ fontSize: '16px', color: adminProfile.is_active ? '#10b981' : '#ef4444' }}>
                  {adminProfile.is_active ? 'Active' : 'Inactive'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Privacy & Security */}
        <div className="admin-settings-card">
          <div className="admin-settings-header">
            <Shield />
            <h2>Privacy & Security</h2>
          </div>
          <p className="admin-settings-description">Manage your account password</p>
          
          <div className="admin-settings-form">
            {message.text && (
              <div className={`admin-message ${message.type === 'success' ? 'admin-message-success' : 'admin-message-error'}`}>
                {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                <span>{message.text}</span>
              </div>
            )}

            <div className="admin-form-group">
              <label>Current Password</label>
              <input 
                type="password" 
                name="currentPassword"
                value={passwords.currentPassword}
                onChange={handlePasswordChange}
                disabled={loading}
              />
            </div>

            <div className="admin-password-row">
              <div className="admin-form-group">
                <label>New Password</label>
                <input 
                  type="password" 
                  name="newPassword"
                  value={passwords.newPassword}
                  onChange={handlePasswordChange}
                  disabled={loading}
                />
              </div>

              <div className="admin-form-group">
                <label>Confirm New Password</label>
                <input 
                  type="password" 
                  name="confirmPassword"
                  value={passwords.confirmPassword}
                  onChange={handlePasswordChange}
                  disabled={loading}
                />
              </div>
            </div>

            <button 
              className="admin-change-password-btn" 
              onClick={handleChangePassword}
              disabled={loading}
            >
              {loading ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </div>
      </div>

      <div className="admin-settings-footer">
        <button className="admin-save-settings-btn" onClick={handleSaveChanges}>
          <Save />
          Save All Changes
        </button>
      </div>
    </div>
  );
};

export default AdminSettings;
