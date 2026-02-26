import React from 'react';
import './ChatSidebar.css';

const ChatSidebar = ({ 
  isOpen, 
  onClose, 
  propertyOwners = [], 
  selectedOwner, 
  onOwnerSelect, 
  loading = false
}) => {
  const safePropertyOwners = Array.isArray(propertyOwners) ? propertyOwners : [];
  const validOwners = safePropertyOwners.filter(owner => owner && owner.id);

  const getOwnerAvatarSrc = (owner) => {
    if (!owner) return null;
    return (
      owner.profileImage ||
      owner.avatar ||
      owner.profile_photo ||
      owner.image_url ||
      owner.image ||
      null
    );
  };

  const getOwnerInitials = (owner) => {
    if (!owner) return 'U';
    const name = owner.name || owner.full_name || '';
    if (!name.trim()) return 'U';
    const parts = name.trim().split(' ');
    const initials = parts
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0].toUpperCase())
      .join('');
    return initials || 'U';
  };

  const handleOwnerClick = (owner) => {
    if (onOwnerSelect && owner) {
      onOwnerSelect(owner);
    }
  };

  return (
    <div className={`mychatbox-sidebar ${isOpen ? 'open' : ''}`}>
      <div className="mychatbox-sidebar-header">
        <h2>Conversations</h2>
        <button 
          className="mychatbox-sidebar-close-btn"
          onClick={onClose}
          aria-label="Close sidebar"
          type="button"
        >
          ×
        </button>
      </div>
      
      <div className="mychatbox-owners-list">
        {loading ? (
          <div className="mychatbox-loading">Loading conversations...</div>
        ) : validOwners.length === 0 ? (
          <div className="mychatbox-empty">No conversations yet</div>
        ) : (
          validOwners.map((owner) => {
            const avatarSrc = getOwnerAvatarSrc(owner);
            const initials = getOwnerInitials(owner);

            return (
              <div
                key={owner.id}
                className={`mychatbox-owner-card ${selectedOwner?.id === owner.id ? 'active' : ''}`}
                onClick={() => handleOwnerClick(owner)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleOwnerClick(owner);
                  }
                }}
              >
                <div className="mychatbox-owner-avatar">
                  <div className="mychatbox-owner-avatar-initials">
                    {initials}
                  </div>
                  {avatarSrc && (
                    <img
                      src={avatarSrc}
                      alt={owner.name || 'Owner'}
                      onError={(e) => {
                        // Hide broken image so initials remain visible as fallback
                        e.target.style.display = 'none';
                      }}
                    />
                  )}
                </div>

                <div className="mychatbox-owner-info">
                  <div className="mychatbox-owner-header">
                    <h3>{owner.name || 'Unknown'}</h3>
                    <span className="mychatbox-message-time">{owner.lastMessageTime || ''}</span>
                  </div>
                  
                  <div className="mychatbox-property-info">
                    <p className="mychatbox-property-title">{owner.propertyTitle || 'Property'}</p>
                    {owner.location && (
                      <p className="mychatbox-property-location">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                        </svg>
                        {owner.location}
                      </p>
                    )}
                  </div>
                  
                  <div className="mychatbox-owner-footer">
                    <p className="mychatbox-last-message">{owner.lastMessage || ''}</p>
                    {owner.unread > 0 && (
                      <span className="mychatbox-unread-badge">{owner.unread}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ChatSidebar;
