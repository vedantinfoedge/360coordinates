import React, { useRef, useEffect } from 'react';
import './ChatMessages.css';

const ChatMessages = ({ messages, isTyping, selectedOwner }) => {
  const messagesEndRef = useRef(null);
  const chatMessagesRef = useRef(null);

  const scrollToBottom = () => {
    if (chatMessagesRef.current) {
      // Use requestAnimationFrame for smooth scrolling
      requestAnimationFrame(() => {
        if (chatMessagesRef.current) {
          chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
        }
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, selectedOwner]);

  // Ensure messages is an array
  const safeMessages = Array.isArray(messages) ? messages : [];

  return (
    <div className="mychatbox-chat-messages" ref={chatMessagesRef}>
      <div className="mychatbox-chat-messages-container">
        {!selectedOwner ? (
          <div className="mychatbox-no-selection">Select a conversation to start chatting</div>
        ) : safeMessages.length === 0 ? (
          <div className="mychatbox-no-messages">No messages yet. Start the conversation!</div>
        ) : (
          safeMessages.map((message) => (
            <div
              key={message.id || `msg-${Math.random()}`}
              className={`mychatbox-message ${message.sender === 'user' ? 'mychatbox-message-user' : 'mychatbox-message-owner'}`}
            >
              <div className="mychatbox-message-content">
                <p>{message.text || ''}</p>
                <span className="mychatbox-message-timestamp">{message.timestamp || ''}</span>
              </div>
            </div>
          ))
        )}
        
        {isTyping && (
          <div className="mychatbox-message mychatbox-message-owner">
            <div className="mychatbox-message-content mychatbox-typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default ChatMessages;
