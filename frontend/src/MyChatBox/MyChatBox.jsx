import React from 'react';
import ChatSidebar from './components/ChatSidebar';
import ChatHeader from './components/ChatHeader';
import ChatMessages from './components/ChatMessages';
import ChatInput from './components/ChatInput';
import './MyChatBox.css';

const MyChatBox = ({
  // Sidebar props
  isSidebarOpen,
  onToggleSidebar,
  onCloseSidebar,
  propertyOwners,
  selectedOwner,
  onOwnerSelect,
  loading,
  
  // Messages props
  messages,
  isTyping,
  
  // Input props
  inputMessage,
  onInputChange,
  onSendMessage,
  quickReplies,
  showQuickReplies,
  onQuickReply,

  // Header actions
  onHeaderClick
}) => {
  return (
    <div className="mychatbox-container">
      <div className="mychatbox-wrapper">
        {/* Left Sidebar - Property Owners List */}
        <ChatSidebar
          isOpen={isSidebarOpen}
          onClose={onCloseSidebar}
          propertyOwners={propertyOwners}
          selectedOwner={selectedOwner}
          onOwnerSelect={onOwnerSelect}
          loading={loading}
        />

        {/* Main Chat Area */}
        <div className="mychatbox-chat-main">
          {/* Chat Header */}
          <ChatHeader 
            selectedOwner={selectedOwner}
            onToggleSidebar={onToggleSidebar}
            onHeaderClick={onHeaderClick}
          />
          
          {/* Chat Messages Area */}
          <ChatMessages 
            messages={messages}
            isTyping={isTyping}
            selectedOwner={selectedOwner}
          />

          {/* Quick Replies & Input Area */}
          <ChatInput
            inputMessage={inputMessage}
            onInputChange={onInputChange}
            onSendMessage={onSendMessage}
            quickReplies={quickReplies}
            showQuickReplies={showQuickReplies}
            onQuickReply={onQuickReply}
          />
        </div>
      </div>
    </div>
  );
};

export default MyChatBox;
