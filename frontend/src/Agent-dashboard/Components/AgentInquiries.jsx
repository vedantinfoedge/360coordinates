// src/pages/AgentInquiries.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useProperty } from './PropertyContext';
import { useAuth } from '../../context/AuthContext';
import { 
  generateChatRoomId, 
  listenToMessages, 
  sendMessage as firebaseSendMessage, 
  createOrGetChatRoom,
  getUserChatRooms,
  getChatRoomDetails,
  updateInquiryReadStatus,
  getInquiryReadStatus
} from '../../services/firebase.service';
import { sellerInquiriesAPI, sellerLeadsAPI } from '../../services/api.service';
import '../styles/AgentInquiries.css';

const AgentInquiries = ({ onUnreadCountChange }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { 
    inquiries, 
    properties, 
    updateInquiryStatus, 
    inquiriesLoading, 
    inquiriesError, 
    refreshData 
  } = useProperty();
  const { user } = useAuth();
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterProperty, setFilterProperty] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [replyText, setReplyText] = useState('');
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState({});
  const [lastReadAt, setLastReadAt] = useState({}); // Track lastReadAt timestamps from Firebase (by inquiryId)
  const [activeTab, setActiveTab] = useState('details');
  const [selectedChatRoomId, setSelectedChatRoomId] = useState(null);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [enrichedInquiries, setEnrichedInquiries] = useState([]); // Inquiries with Firebase data
  const [leads, setLeads] = useState([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const leadsSectionRef = useRef(null);
  
  // Ensure inquiries is always an array
  const safeInquiries = Array.isArray(inquiries) ? inquiries : [];
  const safeProperties = Array.isArray(properties) ? properties : [];

  // Calculate unread chat messages count using Firebase lastReadAt
  // Unread = messages from buyers that haven't been viewed by the agent
  // Only counts actual chat messages (not the initial inquiry message)
  const unreadChatCount = useMemo(() => {
    if (!user) return 0;
    
    let count = 0;
    Object.keys(chatMessages).forEach(inquiryId => {
      const messages = chatMessages[inquiryId] || [];
      // Skip if no messages or not an array
      if (!Array.isArray(messages) || messages.length === 0) return;
      
      // Check if this inquiry is currently selected and chat tab is active
      const isSelected = selectedInquiry?.id === inquiryId && activeTab === 'chat';
      // If selected and viewing chat, don't count unread
      if (isSelected) return;
      
      // Filter out initial messages (those with id starting with "initial-")
      const actualChatMessages = messages.filter(msg => !msg.id || !msg.id.toString().startsWith('initial-'));
      // Skip if no actual chat messages (only initial message exists)
      if (actualChatMessages.length === 0) return;
      
      // Use lastReadAt from Firebase as source of truth
      const readTimestamp = lastReadAt[inquiryId];
      
      if (readTimestamp) {
        // Convert Firebase timestamp to Date if needed
        const readTime = readTimestamp.toDate ? readTimestamp.toDate() : new Date(readTimestamp);
        
        // Count buyer messages with timestamp after lastReadAt
        const unread = actualChatMessages.filter(msg => {
          if (msg.sender !== 'buyer') return false;
          const msgTime = new Date(msg.timestamp);
          return msgTime > readTime;
        }).length;
        
        count += unread;
      } else {
        // If no lastReadAt, all buyer messages are unread
        const buyerMessages = actualChatMessages.filter(msg => msg.sender === 'buyer');
        count += buyerMessages.length;
      }
    });
    return count;
  }, [chatMessages, lastReadAt, selectedInquiry, activeTab, user]);

  // Notify parent component of unread count changes
  useEffect(() => {
    if (onUnreadCountChange) {
      onUnreadCountChange(unreadChatCount);
    }
  }, [unreadChatCount, onUnreadCountChange]);

  // Listen to Firebase messages for the selected inquiry/chat room
  useEffect(() => {
    if (!selectedInquiry || !selectedChatRoomId || !user) {
      console.log('⏸️ Agent: Listener not starting - missing requirements:', {
        hasInquiry: !!selectedInquiry,
        hasChatRoomId: !!selectedChatRoomId,
        chatRoomId: selectedChatRoomId,
        hasUser: !!user
      });
      return;
    }

    console.log('▶️ Agent: Starting message listener for chat room:', selectedChatRoomId, 'inquiry:', selectedInquiry.id);

    // Fetch chat room details to get lastReadAt
    const fetchChatRoomDetails = async () => {
      try {
        const chatRoomDetails = await getChatRoomDetails(selectedChatRoomId);
        if (chatRoomDetails && chatRoomDetails.lastReadAt && chatRoomDetails.lastReadAt[String(user.id)]) {
          const userLastReadAt = chatRoomDetails.lastReadAt[String(user.id)];
          setLastReadAt(prev => ({
            ...prev,
            [selectedInquiry.id]: userLastReadAt
          }));
          console.log('📖 Agent: Loaded lastReadAt for inquiry:', selectedInquiry.id, userLastReadAt);
        }
      } catch (error) {
        console.warn('⚠️ Agent: Failed to fetch chat room details for lastReadAt:', error);
      }
    };

    fetchChatRoomDetails();

    const unsubscribe = listenToMessages(selectedChatRoomId, (firebaseMessages, error) => {
      if (error) {
        console.error('❌ Error in agent chat listener:', error);
        return;
      }
      if (!firebaseMessages || !Array.isArray(firebaseMessages)) {
        console.error('❌ Error in agent chat listener: Invalid messages received');
        return;
      }

      console.log('📨 Agent: Received', firebaseMessages.length, 'messages for inquiry:', selectedInquiry.id);

      const transformed = firebaseMessages.map((msg, index) => {
        let date;
        if (msg.timestamp instanceof Date) {
          date = msg.timestamp;
        } else if (msg.timestamp) {
          date = new Date(msg.timestamp);
        } else {
          date = new Date();
        }

        // Use senderRole from Firebase to determine sender type
        // senderRole can be 'buyer', 'seller', or 'agent'
        const sender = msg.senderRole === 'agent' ? 'agent' : 'buyer';
        console.log(`  Message ${index + 1}: ${sender} (role: ${msg.senderRole}) - "${msg.text?.substring(0, 50)}..."`);

        return {
          id: msg.id || `${selectedInquiry.id}-${date.getTime()}-${index}-${Math.random()}`,
          text: msg.text || '',
          sender: sender,
          timestamp: date.toISOString()
        };
      });

      setChatMessages(prev => {
        const updated = {
          ...prev,
          [selectedInquiry.id]: transformed
        };
        console.log('💾 Agent: Updated chatMessages for inquiry:', selectedInquiry.id, 'Total messages:', transformed.length);
        return updated;
      });

      // Don't mark as read automatically - only mark when user views chat tab
      // This ensures unread count stays accurate until user actually views messages
    });

    return () => {
      console.log('🔌 Agent: Cleaning up listener for chat room:', selectedChatRoomId);
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [selectedInquiry, selectedChatRoomId, user]);

  // Load lastReadAt from Firebase for ALL inquiries on page load
  useEffect(() => {
    if (!user || !enrichedInquiries.length) return;

    const loadAllReadStatus = async () => {
      const lastReadAtMap = {};
      
      for (const inquiry of enrichedInquiries) {
        if (!inquiry.chatRoomId) continue;
        
        try {
          const chatRoomDetails = await getChatRoomDetails(inquiry.chatRoomId);
          if (chatRoomDetails?.lastReadAt?.[String(user.id)]) {
            lastReadAtMap[inquiry.id] = chatRoomDetails.lastReadAt[String(user.id)];
          }
        } catch (error) {
          console.warn(`Failed to load lastReadAt for inquiry ${inquiry.id}:`, error);
        }
      }
      
      setLastReadAt(prev => ({ ...prev, ...lastReadAtMap }));
    };

    loadAllReadStatus();
  }, [user, enrichedInquiries]);

  // Mark messages as read ONLY when chat tab is viewed
  // This ensures unread count reduces only when user actually views the messages
  // Update lastReadAt when viewing chat tab (Firebase will be updated via updateInquiryReadStatus)
  useEffect(() => {
    if (selectedInquiry && activeTab === 'chat' && selectedChatRoomId && user) {
      const inquiryId = selectedInquiry.id;
      const messages = chatMessages[inquiryId] || [];
      
      // Mark all messages as read when viewing the chat tab
      if (Array.isArray(messages) && messages.length > 0) {
        // Update local lastReadAt to current time
        const now = new Date();
        setLastReadAt(prev => ({
          ...prev,
          [inquiryId]: now
        }));
        
        // Update Firebase lastReadAt (via updateInquiryReadStatus)
        updateInquiryReadStatus(selectedChatRoomId, user.id, 'read').then(() => {
          // Fetch updated chat room details to sync lastReadAt from Firebase
          return getChatRoomDetails(selectedChatRoomId);
        }).then(chatRoomDetails => {
          if (chatRoomDetails && chatRoomDetails.lastReadAt && chatRoomDetails.lastReadAt[String(user.id)]) {
            const userLastReadAt = chatRoomDetails.lastReadAt[String(user.id)];
            setLastReadAt(prev => ({
              ...prev,
              [inquiryId]: userLastReadAt
            }));
          }
        }).catch(error => {
          console.warn('Failed to sync lastReadAt from Firebase:', error);
        });
      }
    }
  }, [selectedInquiry, activeTab, chatMessages, selectedChatRoomId, user]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, selectedInquiry, activeTab]);

  // Mark inquiry as 'read' when viewing messages or switching to chat tab
  useEffect(() => {
    if (!selectedInquiry || !user || !selectedChatRoomId) return;

    // Mark as read if:
    // 1. Inquiry status is 'new' AND
    // 2. (User switches to chat tab OR messages are loaded)
    const shouldMarkAsRead = 
      selectedInquiry.status === 'new' && 
      (activeTab === 'chat' || 
       (chatMessages[selectedInquiry.id] && chatMessages[selectedInquiry.id].length > 0));

    if (shouldMarkAsRead) {
      const markAsRead = async () => {
        try {
          // Update in Firebase (primary source)
          await updateInquiryReadStatus(selectedChatRoomId, user.id, 'read');
          // Update selected inquiry status
          setSelectedInquiry(prev => prev ? { ...prev, status: 'read' } : null);
          
          // Update enrichedInquiries immediately
          setEnrichedInquiries(prev => prev.map(inq => 
            inq.id === selectedInquiry.id || 
            inq.conversationKey === selectedInquiry.conversationKey ||
            (inq.buyerId === selectedInquiry.buyerId && inq.propertyId === selectedInquiry.propertyId)
              ? { ...inq, status: 'read', firebaseReadStatus: 'read' }
              : inq
          ));
          
          // Also try to update MySQL (optional, for backward compatibility)
          try {
            await updateInquiryStatus(selectedInquiry.id, 'read');
          } catch (dbError) {
            console.warn('Failed to update MySQL status, but Firebase status updated:', dbError);
          }
        } catch (error) {
          console.error('Failed to mark inquiry as read:', error);
        }
      };
      markAsRead();
    }
  }, [selectedInquiry, activeTab, chatMessages, user, selectedChatRoomId, updateInquiryStatus]);

  // Sync selectedInquiry with enrichedInquiries when enriched data updates
  useEffect(() => {
    if (selectedInquiry) {
      const updatedInquiry = enrichedInquiries.find(i => 
        i.id === selectedInquiry.id || 
        i.conversationKey === selectedInquiry.conversationKey ||
        (i.buyerId === selectedInquiry.buyerId && i.propertyId === selectedInquiry.propertyId)
      );
      if (updatedInquiry) {
        // Update selectedInquiry if any important fields changed (status, message, or buyer info)
        if (
          updatedInquiry.status !== selectedInquiry.status || 
          updatedInquiry.lastMessage !== selectedInquiry.lastMessage ||
          updatedInquiry.buyerName !== selectedInquiry.buyerName ||
          updatedInquiry.buyerProfileImage !== selectedInquiry.buyerProfileImage
        ) {
          setSelectedInquiry(updatedInquiry);
        }
      }
    }
  }, [enrichedInquiries, selectedInquiry?.id, selectedInquiry?.conversationKey]);

  // Enrich inquiries with Firebase chat room data and include chat rooms without inquiries
  useEffect(() => {
    if (!user) {
      setEnrichedInquiries(safeInquiries);
      return;
    }

    const enrichInquiries = async () => {
      try {
        // Fetch Firebase chat rooms for this agent
        const firebaseChatRooms = await getUserChatRooms(user.id);
        console.log('[AgentInquiries] Loaded', firebaseChatRooms.length, 'Firebase chat rooms');
        
        // Create a map of inquiries by buyer+property key
        // Deduplicate: keep only the most recent inquiry per conversationKey (buyer+property)
        const inquiryMap = new Map();
        safeInquiries.forEach(inquiry => {
          const conversationKey = inquiry.conversationKey || `${inquiry.buyerId || 'guest'}_${inquiry.propertyId}`;
          const existing = inquiryMap.get(conversationKey);
          
          if (!existing) {
            // First inquiry for this conversation - add it
            inquiryMap.set(conversationKey, inquiry);
          } else {
            // Multiple inquiries for same buyer+property - keep the most recent one
            const existingDate = new Date(existing.createdAt || 0);
            const currentDate = new Date(inquiry.createdAt || 0);
            if (currentDate > existingDate) {
              inquiryMap.set(conversationKey, inquiry);
            }
          }
        });
        
        // Create a map of buyer info by buyerId (for chat-only conversations)
        const buyerInfoMap = new Map();
        safeInquiries.forEach(inquiry => {
          if (inquiry.buyerId) {
            if (!buyerInfoMap.has(inquiry.buyerId)) {
              buyerInfoMap.set(inquiry.buyerId, {
                buyerName: inquiry.buyerName,
                buyerEmail: inquiry.buyerEmail,
                buyerPhone: inquiry.buyerPhone,
                buyerProfileImage: inquiry.buyerProfileImage,
                avatar: inquiry.avatar
              });
            }
          }
        });

        // Create a map of chat rooms by buyer+property key
        const chatRoomMap = new Map();
        firebaseChatRooms.forEach(room => {
          const key = `${room.buyerId}_${room.propertyId}`;
          chatRoomMap.set(key, room);
        });

        // Start with deduplicated inquiries - convert Map values to array
        // This ensures only one entry per buyer+property combination (same as buyer dashboard)
        const uniqueInquiries = Array.from(inquiryMap.values());
        
        // Start with enriched inquiries (merge Firebase data with inquiry data)
        // Preserve existing enrichedInquiries state to maintain recent status updates
        const existingEnrichedMap = new Map();
        enrichedInquiries.forEach(existing => {
          const key = existing.conversationKey || `${existing.buyerId || 'guest'}_${existing.propertyId}`;
          existingEnrichedMap.set(key, existing);
        });
        
        const enriched = uniqueInquiries.map(inquiry => {
          const conversationKey = inquiry.conversationKey || `${inquiry.buyerId || 'guest'}_${inquiry.propertyId}`;
          const firebaseRoom = chatRoomMap.get(conversationKey);
          const existingEnriched = existingEnrichedMap.get(conversationKey);
          
          if (firebaseRoom) {
            // Extract status for current user from Firebase readStatus object
            let firebaseStatus = inquiry.status;
            if (firebaseRoom.readStatus && typeof firebaseRoom.readStatus === 'object' && user) {
              const userStatus = firebaseRoom.readStatus[String(user.id)];
              if (userStatus) {
                firebaseStatus = userStatus;
              }
            }
            
            // If existing enriched inquiry has 'replied' status and Firebase doesn't have it yet,
            // preserve the 'replied' status (Firebase might not have propagated yet)
            if (existingEnriched && existingEnriched.status === 'replied' && firebaseStatus !== 'replied') {
              firebaseStatus = 'replied';
            }
            
            // Merge Firebase data with inquiry data
            return {
              ...inquiry,
              lastMessage: firebaseRoom.lastMessage || inquiry.message,
              lastActivity: firebaseRoom.updatedAt ? new Date(firebaseRoom.updatedAt) : new Date(inquiry.createdAt),
              chatRoomId: firebaseRoom.id,
              firebaseReadStatus: firebaseStatus,
              status: firebaseStatus
            };
          }
          
          // No Firebase room found - use inquiry data as-is, but preserve existing status if it's 'replied'
          const finalStatus = existingEnriched && existingEnriched.status === 'replied' 
            ? 'replied' 
            : inquiry.status;
          
          return {
            ...inquiry,
            lastMessage: inquiry.message,
            lastActivity: new Date(inquiry.createdAt),
            status: finalStatus,
            firebaseReadStatus: finalStatus
          };
        });

        // Also add chat rooms that don't have corresponding inquiries
        // Fetch buyer info from backend for chat-only conversations
        const buyerInfoPromises = [];
        const chatRoomsToEnrich = [];
        
        firebaseChatRooms.forEach(room => {
          const conversationKey = `${room.buyerId}_${room.propertyId}`;
          
          // Check if an inquiry already exists for this chat room
          // Need to check both the inquiryMap AND the enriched array to prevent duplicates
          const hasInquiryInMap = inquiryMap.has(conversationKey);
          
          // Also check if we've already enriched an entry for this conversation
          const alreadyEnriched = enriched.some(e => {
            const eKey = e.conversationKey || `${e.buyerId || 'guest'}_${e.propertyId}`;
            return eKey === conversationKey || 
                   (e.buyerId === room.buyerId && e.propertyId === room.propertyId);
          });
          
          // If no inquiry exists AND not already enriched, create a virtual inquiry entry
          if (!hasInquiryInMap && !alreadyEnriched) {
            // Fetch property details to get property title
            const property = safeProperties.find(p => p.id === parseInt(room.propertyId));
            
            // Verify this chat room belongs to the current agent
            // room.receiverId should match user.id for agents
            if (room.receiverId === String(user.id) || room.receiverId === user.id) {
              chatRoomsToEnrich.push({ room, conversationKey, property });
              
              // If buyer info not in map, fetch from backend
              if (!buyerInfoMap.has(room.buyerId) && room.buyerId) {
                buyerInfoPromises.push(
                  sellerInquiriesAPI.getBuyer(room.buyerId)
                    .then(response => {
                      if (response.success && response.data?.buyer) {
                        const buyer = response.data.buyer;
                        buyerInfoMap.set(room.buyerId, {
                          buyerName: buyer.name || 'Buyer',
                          buyerEmail: buyer.email || '',
                          buyerPhone: buyer.phone || '',
                          buyerProfileImage: buyer.profile_image || null,
                          avatar: buyer.profile_image || (buyer.name?.[0]?.toUpperCase() || 'B')
                        });
                      }
                    })
                    .catch(error => {
                      console.warn(`Failed to fetch buyer info for buyerId ${room.buyerId}:`, error);
                    })
                );
              }
            } else {
              console.warn('[AgentInquiries] Chat room receiverId mismatch:', {
                roomId: room.id,
                roomReceiverId: room.receiverId,
                currentUserId: user.id,
                roomBuyerId: room.buyerId,
                roomPropertyId: room.propertyId
              });
            }
          } else {
            // Inquiry exists for this chat room - update buyer info in enriched list if needed
            const existingInquiry = inquiryMap.get(conversationKey);
            const enrichedIndex = enriched.findIndex(e => {
              const eKey = e.conversationKey || `${e.buyerId || 'guest'}_${e.propertyId}`;
              return eKey === conversationKey || 
                     (e.buyerId === room.buyerId && e.propertyId === room.propertyId);
            });
            
            if (enrichedIndex >= 0 && existingInquiry) {
              // Update buyer info from the inquiry
              enriched[enrichedIndex] = {
                ...enriched[enrichedIndex],
                buyerName: existingInquiry.buyerName || enriched[enrichedIndex].buyerName,
                buyerEmail: existingInquiry.buyerEmail || enriched[enrichedIndex].buyerEmail,
                buyerPhone: existingInquiry.buyerPhone || enriched[enrichedIndex].buyerPhone,
                buyerProfileImage: existingInquiry.buyerProfileImage || enriched[enrichedIndex].buyerProfileImage,
                avatar: existingInquiry.buyerProfileImage || existingInquiry.avatar || enriched[enrichedIndex].avatar
              };
            }
          }
        });
        
        // Wait for all buyer info fetches to complete
        await Promise.all(buyerInfoPromises);
        
        // Now enrich chat-only conversations with buyer info (from map or fetched)
        chatRoomsToEnrich.forEach(({ room, conversationKey, property }) => {
          // Extract status for current user from Firebase readStatus object
          let firebaseStatus = 'new';
          if (room.readStatus && typeof room.readStatus === 'object' && user) {
            const userStatus = room.readStatus[String(user.id)];
            if (userStatus) {
              firebaseStatus = userStatus;
            }
          }
          
          // Preserve existing 'replied' status if it exists (Firebase might not have propagated yet)
          const existingEnriched = existingEnrichedMap.get(conversationKey);
          if (existingEnriched && existingEnriched.status === 'replied' && firebaseStatus !== 'replied') {
            firebaseStatus = 'replied';
          }
          
          // Get buyer info from map (now includes fetched data)
          const buyerInfo = buyerInfoMap.get(room.buyerId);
          const buyerName = buyerInfo?.buyerName || 'Buyer';
          const buyerEmail = buyerInfo?.buyerEmail || '';
          const buyerPhone = buyerInfo?.buyerPhone || '';
          const buyerProfileImage = buyerInfo?.buyerProfileImage || null;
          const avatar = buyerProfileImage || buyerInfo?.avatar || (buyerName[0]?.toUpperCase() || 'B');
          
          enriched.push({
            id: `chat_${room.id}`, // Virtual ID for chat-only conversations
            conversationKey: conversationKey,
            propertyId: room.propertyId,
            buyerId: room.buyerId,
            propertyTitle: property?.title || 'Property',
            buyerName: buyerName,
            buyerEmail: buyerEmail,
            buyerPhone: buyerPhone,
            buyerProfileImage: buyerProfileImage,
            message: room.lastMessage || '',
            status: firebaseStatus,
            createdAt: room.createdAt ? (room.createdAt instanceof Date ? room.createdAt : new Date(room.createdAt)) : new Date(),
            avatar: avatar,
            lastMessage: room.lastMessage || '',
            lastActivity: room.updatedAt ? (room.updatedAt instanceof Date ? room.updatedAt : new Date(room.updatedAt)) : new Date(),
            chatRoomId: room.id,
            firebaseReadStatus: firebaseStatus,
            isChatOnly: true // Flag to indicate this is a chat-only conversation (no inquiry)
          });
        });

        // Update buyer info for any chat-only conversations that now have buyer info from inquiries
        enriched.forEach((enrichedItem, index) => {
          if (enrichedItem.isChatOnly && enrichedItem.buyerId) {
            const buyerInfo = buyerInfoMap.get(enrichedItem.buyerId);
            if (buyerInfo && buyerInfo.buyerName !== 'Buyer') {
              // Update with real buyer info
              enriched[index] = {
                ...enrichedItem,
                buyerName: buyerInfo.buyerName,
                buyerEmail: buyerInfo.buyerEmail,
                buyerPhone: buyerInfo.buyerPhone,
                buyerProfileImage: buyerInfo.buyerProfileImage,
                avatar: buyerInfo.buyerProfileImage || buyerInfo.avatar || (buyerInfo.buyerName[0]?.toUpperCase() || 'B')
              };
            }
          }
        });

        // Sort by last activity (most recent first)
        enriched.sort((a, b) => {
          const dateA = a.lastActivity instanceof Date ? a.lastActivity : new Date(a.lastActivity);
          const dateB = b.lastActivity instanceof Date ? b.lastActivity : new Date(b.lastActivity);
          return dateB - dateA;
        });

        setEnrichedInquiries(enriched);
      } catch (error) {
        console.error('[AgentInquiries] Error enriching inquiries:', error);
        setEnrichedInquiries(safeInquiries);
      }
    };

    enrichInquiries();
  }, [safeInquiries, safeProperties, user]);

  // Fetch leads (view_owner interactions - when buyers click "Show Owner Details")
  useEffect(() => {
    if (!user) return;

    const fetchLeads = async () => {
      setLeadsLoading(true);
      try {
        const response = await sellerLeadsAPI.list();
        if (response.success && response.data?.leads) {
          setLeads(response.data.leads);
        } else {
          setLeads([]);
        }
      } catch (error) {
        console.warn('Failed to fetch leads:', error);
        setLeads([]);
      } finally {
        setLeadsLoading(false);
      }
    };

    fetchLeads();
  }, [user]);

  const scrollToLeadsSection = () => {
    leadsSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Filter inquiries (use enrichedInquiries instead of safeInquiries)
  const filteredInquiries = enrichedInquiries.filter(inquiry => {
    // Add null/undefined checks to prevent runtime errors
    if (!inquiry) return false;
    
    const matchesStatus = filterStatus === 'all' || inquiry.status === filterStatus;
    const matchesProperty =
      filterProperty === 'all' || inquiry.propertyId === parseInt(filterProperty);
    
    // Safely check search term with null/undefined protection
    const searchLower = searchTerm.toLowerCase();
    const buyerName = (inquiry.buyerName || '').toLowerCase();
    const message = (inquiry.message || '').toLowerCase();
    const propertyTitle = (inquiry.propertyTitle || '').toLowerCase();
    
    const matchesSearch =
      buyerName.includes(searchLower) ||
      message.includes(searchLower) ||
      propertyTitle.includes(searchLower);

    return matchesStatus && matchesProperty && matchesSearch;
  });

  // Stats (use enrichedInquiries) - use useMemo to ensure stats update when enrichedInquiries changes
  const stats = useMemo(() => {
    return {
      total: enrichedInquiries.length,
      new: enrichedInquiries.filter(i => i && (i.status === 'new' || i.firebaseReadStatus === 'new')).length,
      read: enrichedInquiries.filter(i => i && (i.status === 'read' || i.firebaseReadStatus === 'read')).length,
      replied: enrichedInquiries.filter(i => i && (i.status === 'replied' || i.firebaseReadStatus === 'replied')).length
    };
  }, [enrichedInquiries]);

  const getTimeAgo = (dateString) => {
    if (!dateString) return 'Unknown time';
    
    try {
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) return 'Invalid date';
      
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} min ago`;
      if (diffHours < 24) return `${diffHours} hours ago`;
      if (diffDays < 7) return `${diffDays} days ago`;
      return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  const handleSelectInquiry = async (inquiry) => {
    if (!inquiry || !inquiry.id) {
      console.error('Invalid inquiry selected:', inquiry);
      return;
    }
    
    // Setup chat room ID for this inquiry if we have buyer + property + agent
    // Use Firebase chat room ID if available (from enriched inquiry), otherwise generate it
    let chatRoomId = inquiry.chatRoomId || null;
    if (!chatRoomId && user && inquiry.buyerId && inquiry.propertyId) {
      chatRoomId = generateChatRoomId(inquiry.buyerId, user.id, inquiry.propertyId);
    }
    setSelectedChatRoomId(chatRoomId);
    
    // Check Firebase for actual read status (Firebase is source of truth)
    if (chatRoomId && user) {
      try {
        const firebaseStatus = await getInquiryReadStatus(chatRoomId, user.id);
        if (firebaseStatus.status && firebaseStatus.status !== inquiry.status) {
          // Update inquiry with Firebase status
          inquiry = { ...inquiry, status: firebaseStatus.status };
        }
      } catch (error) {
        console.warn('Failed to get Firebase status, using inquiry status:', error);
      }
    }
    
    // Update selected inquiry with potentially updated status
    setSelectedInquiry(inquiry);
    setActiveTab('details');
    
    // Mark as read if it's new - use Firebase for persistence
    if (inquiry.status === 'new' && chatRoomId && user) {
      try {
        // Update status optimistically - UI updates immediately
        setSelectedInquiry(prev => prev ? { ...prev, status: 'read' } : null);
        
        // Save to Firebase - this ensures persistence after refresh
        await updateInquiryReadStatus(chatRoomId, user.id, 'read');
        
        // Update enrichedInquiries immediately
        setEnrichedInquiries(prev => prev.map(inq => 
          inq.id === inquiry.id || 
          inq.conversationKey === inquiry.conversationKey ||
          (inq.buyerId === inquiry.buyerId && inq.propertyId === inquiry.propertyId)
            ? { ...inq, status: 'read', firebaseReadStatus: 'read' }
            : inq
        ));
        
        // Also try to update MySQL database (optional, for backward compatibility)
        try {
          await updateInquiryStatus(inquiry.id, 'read');
        } catch (dbError) {
          console.warn('Failed to update MySQL status, but Firebase status updated:', dbError);
        }
        
        // Update selected inquiry with confirmed status
        setSelectedInquiry(prev => prev ? { ...prev, status: 'read' } : null);
      } catch (error) {
        console.error('Failed to mark inquiry as read in Firebase:', error);
        // Revert optimistic update on error
        setSelectedInquiry(prev => prev ? { ...prev, status: 'new' } : null);
      }
    }
  };

  // Handle inquiryId query parameter from URL (for navigation from overview)
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const inquiryIdParam = searchParams.get('inquiryId');
    
    if (inquiryIdParam && enrichedInquiries.length > 0 && !selectedInquiry) {
      const inquiryId = parseInt(inquiryIdParam, 10);
      const inquiry = enrichedInquiries.find(i => i.id === inquiryId);
      
      if (inquiry) {
        // Select the inquiry
        handleSelectInquiry(inquiry);
        
        // Remove the query parameter from URL to clean it up
        const newSearchParams = new URLSearchParams(location.search);
        newSearchParams.delete('inquiryId');
        const newSearch = newSearchParams.toString();
        navigate(location.pathname + (newSearch ? `?${newSearch}` : ''), { replace: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrichedInquiries.length, location.search]);

  const handleReply = async () => {
    if (!replyText.trim() || !selectedInquiry) return;

    try {
      setUpdatingStatusId(selectedInquiry.id);
      await updateInquiryStatus(selectedInquiry.id, 'replied');
      setReplyText('');
      setShowReplyModal(false);
    } catch (error) {
      console.error('Error updating inquiry status:', error);
      alert('Failed to update inquiry status. Please try again.');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || !selectedInquiry || !user) {
      console.warn('⚠️ Cannot send message - missing data:', {
        hasMessage: !!chatMessage.trim(),
        hasInquiry: !!selectedInquiry,
        hasUser: !!user
      });
      return;
    }

    if (!selectedInquiry.buyerId || !selectedInquiry.propertyId) {
      alert('Buyer or property information not available for chat.');
      return;
    }

    const messageText = chatMessage.trim();
    setChatMessage('');

    try {
      setUpdatingStatusId(selectedInquiry.id);
      
      // Ensure chat room exists in Firebase and get its ID
      console.log('📤 Agent: Creating/getting chat room before sending message...');
      const chatRoomId = await createOrGetChatRoom(
        selectedInquiry.buyerId,
        user.id,
        'agent',
        selectedInquiry.propertyId
      );

      console.log('📤 Agent: Chat room ID:', chatRoomId);
      
      // Ensure selectedChatRoomId is set so listener can work
      if (chatRoomId !== selectedChatRoomId) {
        console.log('🔄 Agent: Updating selectedChatRoomId to:', chatRoomId);
        setSelectedChatRoomId(chatRoomId);
      }

      // Send message to Firebase
      console.log('📤 Agent: Sending message to Firebase...');
      await firebaseSendMessage(
        chatRoomId,
        user.id,
        'agent',
        messageText
      );
      console.log('✅ Agent: Message sent successfully');

      // Mark inquiry as replied in Firebase + UI
      try {
        // Update in Firebase (primary source)
        await updateInquiryReadStatus(chatRoomId, user.id, 'replied');
        
        // Fetch updated chat room details from Firebase to ensure status is synced
        const chatRoomDetails = await getChatRoomDetails(chatRoomId);
        let firebaseStatus = 'replied';
        if (chatRoomDetails && chatRoomDetails.readStatus && typeof chatRoomDetails.readStatus === 'object' && user) {
          const userStatus = chatRoomDetails.readStatus[String(user.id)];
          if (userStatus) {
            firebaseStatus = userStatus;
          }
        }
        
        // Update selected inquiry status
        setSelectedInquiry(prev => prev ? { ...prev, status: firebaseStatus } : null);
        
        // Update enrichedInquiries immediately with Firebase status
        setEnrichedInquiries(prev => prev.map(inq => 
          inq.id === selectedInquiry.id || 
          inq.conversationKey === selectedInquiry.conversationKey ||
          (inq.buyerId === selectedInquiry.buyerId && inq.propertyId === selectedInquiry.propertyId)
            ? { ...inq, status: firebaseStatus, firebaseReadStatus: firebaseStatus }
            : inq
        ));
        
        // Also try to update MySQL (optional, for backward compatibility)
        try {
          await updateInquiryStatus(selectedInquiry.id, 'replied');
        } catch (dbError) {
          console.warn('Failed to update MySQL status, but Firebase status updated:', dbError);
        }
      } catch (error) {
        console.error('Failed to mark inquiry as replied:', error);
        // Continue - message was sent successfully
      }

      // Optimistically update local chat state (listener will also update with real data)
      setChatMessages(prev => {
        const prevMsgs = prev[selectedInquiry.id] || [];
        const now = new Date();
        const newMessage = {
          id: `temp-${now.getTime()}`,
          text: messageText,
          sender: 'agent',
          timestamp: now.toISOString()
        };
        const updated = {
          ...prev,
          [selectedInquiry.id]: [...prevMsgs, newMessage]
        };
        console.log('💾 Agent: Optimistically added message to state');
        return updated;
      });
    } catch (error) {
      console.error('❌ Error sending chat message:', error);
      setChatMessage(messageText);
      alert(error.message || 'Failed to send message. Please try again.');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTabChange = async (tab) => {
    setActiveTab(tab);
    
    // Mark inquiry as 'read' when switching to chat tab (if status is 'new')
    if (tab === 'chat' && selectedInquiry && selectedInquiry.status === 'new' && selectedChatRoomId && user) {
      try {
        // Update in Firebase (primary source)
        await updateInquiryReadStatus(selectedChatRoomId, user.id, 'read');
        setSelectedInquiry(prev => prev ? { ...prev, status: 'read' } : null);
        
        // Update enrichedInquiries immediately
        setEnrichedInquiries(prev => prev.map(inq => 
          inq.id === selectedInquiry.id || 
          inq.conversationKey === selectedInquiry.conversationKey ||
          (inq.buyerId === selectedInquiry.buyerId && inq.propertyId === selectedInquiry.propertyId)
            ? { ...inq, status: 'read', firebaseReadStatus: 'read' }
            : inq
        ));
        
        // Also try to update MySQL (optional, for backward compatibility)
        try {
          await updateInquiryStatus(selectedInquiry.id, 'read');
        } catch (dbError) {
          console.warn('Failed to update MySQL status, but Firebase status updated:', dbError);
        }
      } catch (error) {
        console.error('Failed to mark inquiry as read on tab switch:', error);
      }
    }
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Handle file upload here
      console.log('File selected:', file.name);
      
      const newMessage = {
        id: Date.now(),
        text: `📎 ${file.name}`,
        sender: 'agent',
        timestamp: new Date().toISOString(),
        type: 'file'
      };

      setChatMessages(prev => ({
        ...prev,
        [selectedInquiry.id]: [...(prev[selectedInquiry.id] || []), newMessage]
      }));

      // Mark inquiry as replied in Firebase + UI
      try {
        if (selectedChatRoomId && user) {
          // Update in Firebase (primary source)
          await updateInquiryReadStatus(selectedChatRoomId, user.id, 'replied');
          
          // Fetch updated chat room details from Firebase to ensure status is synced
          const chatRoomDetails = await getChatRoomDetails(selectedChatRoomId);
          let firebaseStatus = 'replied';
          if (chatRoomDetails && chatRoomDetails.readStatus && typeof chatRoomDetails.readStatus === 'object' && user) {
            const userStatus = chatRoomDetails.readStatus[String(user.id)];
            if (userStatus) {
              firebaseStatus = userStatus;
            }
          }
          
          // Update selected inquiry status
          setSelectedInquiry(prev => prev ? { ...prev, status: firebaseStatus } : null);
          
          // Update enrichedInquiries immediately with Firebase status
          setEnrichedInquiries(prev => prev.map(inq => 
            inq.id === selectedInquiry.id || 
            inq.conversationKey === selectedInquiry.conversationKey ||
            (inq.buyerId === selectedInquiry.buyerId && inq.propertyId === selectedInquiry.propertyId)
              ? { ...inq, status: firebaseStatus, firebaseReadStatus: firebaseStatus }
              : inq
          ));
        } else {
          // Update selected inquiry status even if no chat room
          setSelectedInquiry(prev => prev ? { ...prev, status: 'replied' } : null);
        }
        
        // Also try to update MySQL (optional, for backward compatibility)
        try {
          await updateInquiryStatus(selectedInquiry.id, 'replied');
        } catch (dbError) {
          console.warn('Failed to update MySQL status, but Firebase status updated:', dbError);
        }
      } catch (error) {
        console.error('Failed to mark inquiry as replied:', error);
      }
      
      // Reset file input
      e.target.value = '';
    }
  };

  const getStatusBadge = (inquiry) => {
    // Get status - prefer firebaseReadStatus if it's a string, otherwise use inquiry.status
    let status = inquiry.status || 'new';
    
    // If firebaseReadStatus exists and is a string, use it
    if (inquiry.firebaseReadStatus && typeof inquiry.firebaseReadStatus === 'string') {
      status = inquiry.firebaseReadStatus;
    } else if (inquiry.firebaseReadStatus && typeof inquiry.firebaseReadStatus === 'object' && user) {
      // If firebaseReadStatus is an object (readStatus from Firebase), get the status for current user
      const userStatus = inquiry.firebaseReadStatus[String(user.id)];
      if (userStatus) {
        status = userStatus;
      }
    }
    
    const badges = {
      new: { label: 'New', class: 'new' },
      read: { label: 'Read', class: 'read' },
      replied: { label: 'Replied', class: 'replied' },
      contacted: { label: 'Contacted', class: 'replied' },
      interested: { label: 'Interested', class: 'replied' },
      not_interested: { label: 'Not Interested', class: 'read' },
      closed: { label: 'Closed', class: 'read' }
    };
    return badges[status] || badges.new;
  };

  return (
    <div className="agent-inquiries">
      {/* Header */}
      <div className="inquiries-header">
        <div className="header-content">
          <h1>Property Inquiries</h1>
          <p className="subtitle">
            {inquiriesLoading ? 'Loading inquiries...' : 'Manage and respond to buyer inquiries'}
          </p>
        </div>
        {inquiriesError && (
          <div style={{ 
            marginTop: '10px',
            padding: '10px', 
            background: '#fee', 
            border: '1px solid #fcc', 
            borderRadius: '6px',
            color: '#c33',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>⚠️ {typeof inquiriesError === 'string' ? inquiriesError : (inquiriesError?.message || 'An error occurred')}</span>
            <button 
              onClick={refreshData}
              style={{ 
                padding: '6px 12px', 
                background: '#fff', 
                border: '1px solid #ddd', 
                borderRadius: '4px',
                cursor: 'pointer',
                marginLeft: '10px'
              }}
            >
              🔄 Refresh
            </button>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="inquiry-stats">
        <div className="stat-card">
          <div className="stat-icon total">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Total Inquiries</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon new">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.new}</span>
            <span className="stat-label">New / Pending</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon read">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2"/>
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.read}</span>
            <span className="stat-label">Read</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon replied">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M9 10l-5 5 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M20 4v7a4 4 0 01-4 4H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.replied}</span>
            <span className="stat-label">Replied</span>
          </div>
        </div>

        <button
          type="button"
          className="agent-stat-card agent-leads-stat-btn"
          onClick={scrollToLeadsSection}
          title="View leads from buyers who viewed your contact details"
        >
          <div className="agent-stat-icon agent-leads">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2"/>
              <circle cx="8.5" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
              <path d="M20 8v6M23 11h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="agent-stat-info">
            <span className="agent-stat-value">{leadsLoading ? '—' : leads.length}</span>
            <span className="agent-stat-label">Leads</span>
          </div>
        </button>
      </div>

      {/* Leads Section - agent-specific class names to avoid conflict with seller */}
      <div ref={leadsSectionRef} className="agent-leads-section">
        <h2 className="agent-leads-heading">Leads</h2>
        {leadsLoading ? (
          <div className="agent-leads-loading">Loading leads...</div>
        ) : leads.length === 0 ? (
          <div className="agent-leads-empty">
            <p>No leads yet. Leads will appear when buyers view your contact details.</p>
          </div>
        ) : (
          <ol className="agent-leads-list">
            {leads.map((lead, index) => (
              <li key={`${lead.buyer_id}-${lead.property_id}-${index}`} className="agent-lead-item">
                <div className="agent-leads-grid">
                  <span className="agent-leads-property-title">{lead.property_title || 'Property'}</span>
                  <span className="agent-leads-separator">|</span>
                  <span className="agent-leads-buyer-name">{lead.buyer_name || 'Buyer'}</span>
                  <span className="agent-leads-separator">|</span>
                  <span className="agent-leads-phone">
                    {lead.buyer_phone ? (
                      <a href={`tel:${lead.buyer_phone}`} className="agent-leads-link">
                        {lead.buyer_phone}
                      </a>
                    ) : (
                      <span className="agent-leads-empty-text">—</span>
                    )}
                  </span>
                  <span className="agent-leads-separator">|</span>
                  <span className="agent-leads-email">
                    {lead.buyer_email ? (
                      <a href={`mailto:${lead.buyer_email}`} className="agent-leads-link">
                        {lead.buyer_email}
                      </a>
                    ) : (
                      <span className="agent-leads-empty-text">—</span>
                    )}
                  </span>
                  <span className="agent-leads-separator">|</span>
                  <span className="agent-leads-timestamp">{lead.created_at ? getTimeAgo(lead.created_at) : '—'}</span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="search-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
            <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder="Search inquiries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="new">New</option>
            <option value="read">Read</option>
            <option value="replied">Replied</option>
          </select>

          <select
            value={filterProperty}
            onChange={(e) => setFilterProperty(e.target.value)}
          >
            <option value="all">All Properties</option>
            {safeProperties.map(property => (
              property && (
                <option key={property.id} value={property.id}>
                  {(property.title || 'Unknown Property').toUpperCase()}
                </option>
              )
            ))}
          </select>
        </div>
      </div>

      {/* Main Content */}
      <div className="inquiries-container">
        {/* Inquiries List */}
        <div className="inquiries-list">
          {inquiriesLoading && enrichedInquiries.length === 0 ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <h3>Loading Inquiries...</h3>
              <p>Please wait while we fetch your inquiries</p>
            </div>
          ) : filteredInquiries.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              </div>
              <h3>No Inquiries Found</h3>
              <p>
                {searchTerm || filterStatus !== 'all' || filterProperty !== 'all'
                  ? 'Try adjusting your filters'
                  : "You haven't received any inquiries yet"}
              </p>
            </div>
          ) : (
            filteredInquiries.map((inquiry, index) => (
              <div
                key={inquiry.id}
                className={`inquiry-card ${selectedInquiry?.id === inquiry.id ? 'selected' : ''} ${inquiry.status === 'new' ? 'unread' : ''}`}
                onClick={() => handleSelectInquiry(inquiry)}
                style={{ 
                  animationDelay: `${index * 0.05}s`,
                  opacity: updatingStatusId === inquiry.id ? 0.6 : 1,
                  pointerEvents: updatingStatusId === inquiry.id ? 'none' : 'auto'
                }}
              >
                <div className="inquiry-avatar">{inquiry.avatar}</div>
              <div className="inquiry-content">
                <div className="inquiry-header">
                  <span className="inquiry-name">{inquiry.buyerName || 'Unknown Buyer'}</span>
                  <span className="inquiry-time">{getTimeAgo(inquiry.lastActivity || inquiry.createdAt)}</span>
                </div>
                <p className="inquiry-property">{inquiry.propertyTitle || 'Unknown Property'}</p>
                <p className="inquiry-preview">{inquiry.lastMessage || inquiry.message || 'No message'}</p>
              </div>
                <div className="inquiry-status">
                  <span className={`status-badge ${getStatusBadge(inquiry).class}`}>
                    {getStatusBadge(inquiry).label}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Detail Panel */}
        <div className={`inquiry-detail ${selectedInquiry ? 'active' : ''}`}>
          {selectedInquiry ? (
            <>
              <div className="detail-header">
                <button className="back-btn-mobile" onClick={() => setSelectedInquiry(null)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
                <div className="detail-user">
                  <div className="detail-avatar">{selectedInquiry.avatar}</div>
                  <div className="detail-user-info">
                    <h3>{selectedInquiry.buyerName || 'Unknown Buyer'}</h3>
                    <span className={`status-badge ${getStatusBadge(selectedInquiry || { status: 'new' }).class}`}>
                      {getStatusBadge(selectedInquiry || { status: 'new' }).label}
                    </span>
                  </div>
                </div>
              </div>

              <div className="detail-body">
                <div className="detail-tabs">
                  <button
                    className={`tab-btn ${activeTab === 'details' ? 'active' : ''}`}
                    onClick={() => setActiveTab('details')}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="2"/>
                      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    Details
                  </button>

                  <button
                    className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
                    onClick={() => {
                      handleTabChange('chat');
                      // Mark all messages as read when switching to chat tab
                      // lastReadAt will be updated in the useEffect hook above
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    Live Chat
                    {(() => {
                      const inquiryId = selectedInquiry?.id;
                      if (!inquiryId || !user) return null;
                      const messages = chatMessages[inquiryId] || [];
                      
                      // Filter out initial messages
                      const actualChatMessages = messages.filter(msg => !msg.id || !msg.id.toString().startsWith('initial-'));
                      
                      // Use lastReadAt from Firebase if available
                      const readTimestamp = lastReadAt[inquiryId];
                      let unread = 0;
                      
                      if (readTimestamp) {
                        // Convert Firebase timestamp to Date if needed
                        const readTime = readTimestamp.toDate ? readTimestamp.toDate() : new Date(readTimestamp);
                        
                        // Count buyer messages with timestamp after lastReadAt
                        unread = actualChatMessages.filter(msg => {
                          if (msg.sender !== 'buyer') return false;
                          const msgTime = new Date(msg.timestamp);
                          return msgTime > readTime;
                        }).length;
                      } else {
                        // If no lastReadAt, all buyer messages are unread
                        unread = actualChatMessages.filter(msg => msg.sender === 'buyer').length;
                      }
                      
                      return unread > 0 ? (
                        <span className="chat-badge">{unread}</span>
                      ) : null;
                    })()}
                  </button>
                </div>

                {activeTab === 'details' ? (
                  <div className="details-content">
                    <div className="property-info-card">
                      <h4>Property Inquiry</h4>
                      <p className="property-name">{selectedInquiry.propertyTitle || 'Unknown Property'}</p>
                    </div>

                    <div className="contact-info-card">
                      <h4>Contact Information</h4>

                      <div className="contact-item">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2"/>
                          <path d="M22 6l-10 7L2 6" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                        {selectedInquiry.buyerEmail ? (
                          <a href={`mailto:${selectedInquiry.buyerEmail}`}>{selectedInquiry.buyerEmail}</a>
                        ) : (
                          <span>No email provided</span>
                        )}
                      </div>

                      <div className="contact-item">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                        {selectedInquiry.buyerPhone ? (
                          <a href={`tel:${selectedInquiry.buyerPhone}`}>{selectedInquiry.buyerPhone}</a>
                        ) : (
                          <span>No phone provided</span>
                        )}
                      </div>
                    </div>

                    <div className="message-card">
                      <h4>Message</h4>
                      <div className="message-content">
                        <p>{selectedInquiry.message || 'No message provided'}</p>
                        <span className="message-time">{getTimeAgo(selectedInquiry.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="chat-container">
                    <div className="chat-messages">
                      {/* Initial buyer message - only show if not already in chatMessages */}
                      {(!chatMessages[selectedInquiry.id] || chatMessages[selectedInquiry.id].length === 0) && (
                        <div className="chat-message buyer">
                          <div className="message-avatar">{selectedInquiry.avatar || 'U'}</div>
                          <div className="message-bubble">
                            <div className="message-header">
                              <span className="message-sender">{selectedInquiry.buyerName || 'Unknown Buyer'}</span>
                              <span className="message-timestamp">{getTimeAgo(selectedInquiry.createdAt)}</span>
                            </div>
                            <p>{selectedInquiry.message || 'No message provided'}</p>
                          </div>
                        </div>
                      )}

                      {(chatMessages[selectedInquiry.id] || []).map((msg, index) => {
                        const inquiryId = selectedInquiry.id;
                        
                        // Use lastReadAt from Firebase if available
                        const readTimestamp = lastReadAt[inquiryId];
                        let isUnread = false;
                        
                        if (readTimestamp) {
                          // Convert Firebase timestamp to Date if needed
                          const readTime = readTimestamp.toDate ? readTimestamp.toDate() : new Date(readTimestamp);
                          const msgTime = new Date(msg.timestamp);
                          isUnread = msg.sender === 'buyer' && msgTime > readTime;
                        } else {
                          // If no lastReadAt, all buyer messages are unread
                          isUnread = msg.sender === 'buyer';
                        }
                        
                        return (
                          <div key={msg.id} className={`chat-message ${msg.sender} ${isUnread ? 'unread' : ''}`}>
                            {msg.sender === 'buyer' && (
                              <div className="message-avatar">{selectedInquiry.avatar || 'U'}</div>
                            )}
                            <div className="message-bubble">
                              <div className="message-header">
                                <span className="message-sender">
                                  {msg.sender === 'agent' ? 'You' : (selectedInquiry.buyerName || 'Unknown Buyer')}
                                </span>
                                <span className="message-timestamp">{getTimeAgo(msg.timestamp)}</span>
                              </div>
                              <p>{msg.text || ''}</p>
                            </div>
                            {msg.sender === 'agent' && (
                              <div className="message-avatar agent-avatar">A</div>
                            )}
                          </div>
                        );
                      })}

                      {chatMessages[selectedInquiry.id] && chatMessages[selectedInquiry.id].length === 0 && (
                        <div className="chat-empty">
                          <div className="chat-empty-icon">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="1.5"/>
                              <circle cx="9" cy="10" r="1" fill="currentColor"/>
                              <circle cx="12" cy="10" r="1" fill="currentColor"/>
                              <circle cx="15" cy="10" r="1" fill="currentColor"/>
                            </svg>
                          </div>
                          <h4>Start chatting with {selectedInquiry.buyerName || 'the buyer'}</h4>
                          <p>Send a message to begin the conversation</p>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>

                    <div className="chat-input-wrapper">
                      <div className="chat-input-container">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          style={{ display: 'none' }}
                          accept="image/*,.pdf,.doc,.docx"
                        />
                        <button 
                          className="attach-btn" 
                          title="Attach file"
                          onClick={handleFileClick}
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                        <input
                          type="text"
                          className="chat-input"
                          placeholder="Type your message..."
                          value={chatMessage}
                          onChange={(e) => setChatMessage(e.target.value)}
                          onKeyPress={handleKeyPress}
                        />
                        <button
                          className="send-message-btn"
                          onClick={handleSendMessage}
                          disabled={!chatMessage.trim()}
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {activeTab === 'details' && (
                <div className="detail-footer">
                  <button
                    className="reply-btn primary"
                    onClick={() => setShowReplyModal(true)}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M9 10l-5 5 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M20 4v7a4 4 0 01-4 4H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    Reply via Email
                  </button>
                  {selectedInquiry.buyerPhone ? (
                    <a
                      href={`tel:${selectedInquiry.buyerPhone}`}
                      className="call-btn"
                    >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    Call Now
                  </a>
                  ) : (
                    <button className="call-btn" disabled title="No phone number available">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      Call Now
                    </button>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="no-selection">
              <div className="no-selection-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              </div>
              <h3>Select an Inquiry</h3>
              <p>Choose an inquiry from the list to view details and respond</p>
            </div>
          )}
        </div>
      </div>

      {/* Reply Modal */}
      {showReplyModal && (
        <div className="modal-overlay" onClick={() => setShowReplyModal(false)}>
          <div className="reply-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Reply to {selectedInquiry?.buyerName}</h3>
              <button className="close-btn" onClick={() => setShowReplyModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            <div className="modal-body">
              <div className="reply-to-info">
                <span>To: {selectedInquiry?.buyerEmail}</span>
                <span>RE: {selectedInquiry?.propertyTitle}</span>
              </div>

              <textarea
                placeholder="Type your reply here..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={6}
              />
            </div>

            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowReplyModal(false)}>
                Cancel
              </button>

              <button className="send-btn" onClick={handleReply}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Send Reply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentInquiries;