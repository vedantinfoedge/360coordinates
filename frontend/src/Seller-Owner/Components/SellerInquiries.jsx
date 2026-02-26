// src/pages/SellerInquiries.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useProperty } from './PropertyContext';
import { useAuth } from '../../context/AuthContext';
import { generateChatRoomId, listenToMessages, sendMessage as firebaseSendMessage, createOrGetChatRoom, updateInquiryReadStatus, getInquiryReadStatus, getUserChatRooms, getChatRoomDetails } from '../../services/firebase.service';
import { sellerInquiriesAPI, sellerLeadsAPI } from '../../services/api.service';
import '../styles/SellerInquiries.css';

const SellerInquiries = ({ onUnreadCountChange }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { inquiries, properties, updateInquiryStatus, syncInquiryStatusFromFirebase } = useProperty();
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
  const [enrichedInquiries, setEnrichedInquiries] = useState([]); // Inquiries with Firebase data
  const [leads, setLeads] = useState([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const leadsSectionRef = useRef(null);

  // Calculate unread chat messages count
  // Unread = messages from buyers that haven't been viewed by the seller
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
      
      // Use lastReadAt from Firebase as source of truth
      const readTimestamp = lastReadAt[inquiryId];
      
      if (readTimestamp) {
        // Convert Firebase timestamp to Date if needed
        const readTime = readTimestamp.toDate ? readTimestamp.toDate() : new Date(readTimestamp);
        
        // Count buyer messages with timestamp after lastReadAt
        const unread = messages.filter(msg => {
          if (msg.sender !== 'buyer') return false;
          const msgTime = new Date(msg.timestamp);
          return msgTime > readTime;
        }).length;
        
        count += unread;
      } else {
        // If no lastReadAt, all buyer messages are unread
        const buyerMessages = messages.filter(msg => msg.sender === 'buyer');
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

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, selectedInquiry, activeTab]);

  // Sync Firebase read status when inquiries are loaded (after page refresh)
  // This ensures Firebase is the source of truth for read status
  const syncedInquiriesRef = useRef(new Set());
  
  useEffect(() => {
    if (!inquiries.length || !user) return;

    let isMounted = true;

    const syncFirebaseStatus = async () => {
      const statusUpdates = [];
      
      // Check Firebase status for each inquiry that hasn't been synced yet
      for (const inquiry of inquiries) {
        // Skip if already synced
        if (syncedInquiriesRef.current.has(inquiry.id)) {
          continue;
        }

        // Only sync if we have the required IDs
        if (inquiry.buyerId && inquiry.propertyId && user.id) {
          try {
            const chatRoomId = generateChatRoomId(inquiry.buyerId, user.id, inquiry.propertyId);
            const firebaseStatus = await getInquiryReadStatus(chatRoomId, user.id);
            
            // If Firebase has a different status, queue it for update
            if (firebaseStatus.status && firebaseStatus.status !== inquiry.status) {
              statusUpdates.push({
                id: inquiry.id,
                status: firebaseStatus.status
              });
            }
            
            // Mark as synced
            syncedInquiriesRef.current.add(inquiry.id);
          } catch (error) {
            console.warn(`Failed to sync Firebase status for inquiry ${inquiry.id}:`, error);
            // Mark as synced even on error to prevent retry loops
            syncedInquiriesRef.current.add(inquiry.id);
          }
        } else {
          // Mark as synced even if we can't sync (missing IDs)
          syncedInquiriesRef.current.add(inquiry.id);
        }
      }

      // Apply all status updates at once (only if component is still mounted)
      if (isMounted && statusUpdates.length > 0) {
        console.log('[SellerInquiries] Syncing Firebase read status for inquiries:', statusUpdates);
        
        // Update each inquiry status directly (Firebase is source of truth, no API call needed)
        statusUpdates.forEach(({ id, status }) => {
          syncInquiryStatusFromFirebase(id, status);
        });
      }
    };

    syncFirebaseStatus();

    return () => {
      isMounted = false;
    };
  }, [inquiries.length, user?.id, syncInquiryStatusFromFirebase]); // Only run when inquiries count or user changes

  // Reset synced inquiries when inquiries list changes significantly (new load)
  useEffect(() => {
    const currentIds = new Set(inquiries.map(i => i.id));
    // Remove IDs that are no longer in the inquiries list
    syncedInquiriesRef.current.forEach(id => {
      if (!currentIds.has(id)) {
        syncedInquiriesRef.current.delete(id);
      }
    });
  }, [inquiries.length]);

  // Load lastReadAt from Firebase for ALL inquiries on page load
  useEffect(() => {
    if (!user || !enrichedInquiries.length) return;

    const loadReadStatus = async () => {
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

    loadReadStatus();
  }, [user, enrichedInquiries]);

  // Enrich inquiries with Firebase chat room data and include chat rooms without inquiries
  useEffect(() => {
    if (!user) {
      setEnrichedInquiries(inquiries);
      return;
    }

    const enrichInquiries = async () => {
      try {
        // Fetch Firebase chat rooms for this seller
        const firebaseChatRooms = await getUserChatRooms(user.id);
        console.log('[SellerInquiries] Loaded', firebaseChatRooms.length, 'Firebase chat rooms');
        
        // Create a map of inquiries by buyer+property key
        const inquiryMap = new Map();
        inquiries.forEach(inquiry => {
          const conversationKey = inquiry.conversationKey || `${inquiry.buyerId || 'guest'}_${inquiry.propertyId}`;
          inquiryMap.set(conversationKey, inquiry);
        });
        
        // Create a map of buyer info by buyerId (for chat-only conversations)
        // This allows us to get buyer name/avatar even if there's no inquiry for this specific property
        const buyerInfoMap = new Map();
        inquiries.forEach(inquiry => {
          if (inquiry.buyerId) {
            // Store buyer info if not already stored or if this is more recent
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

        // Start with enriched inquiries (merge Firebase data with inquiry data)
        // Preserve existing enrichedInquiries state to maintain recent status updates
        const existingEnrichedMap = new Map();
        enrichedInquiries.forEach(existing => {
          const key = existing.conversationKey || `${existing.buyerId || 'guest'}_${existing.propertyId}`;
          existingEnrichedMap.set(key, existing);
        });
        
        const enriched = inquiries.map(inquiry => {
          const conversationKey = inquiry.conversationKey || `${inquiry.buyerId || 'guest'}_${inquiry.propertyId}`;
          const firebaseRoom = chatRoomMap.get(conversationKey);
          const existingEnriched = existingEnrichedMap.get(conversationKey);
          
          if (firebaseRoom) {
            // Extract status for current user from Firebase readStatus object
            // readStatus is an object like { [userId]: 'read' }
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
              // Use Firebase last message if available
              lastMessage: firebaseRoom.lastMessage || inquiry.message,
              // Use Firebase updatedAt if it's more recent
              lastActivity: firebaseRoom.updatedAt ? new Date(firebaseRoom.updatedAt) : new Date(inquiry.createdAt),
              // Firebase chat room ID for loading messages
              chatRoomId: firebaseRoom.id,
              // Use Firebase read status if available
              firebaseReadStatus: firebaseStatus,
              // Also update status if Firebase has a different status
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
        // This ensures sellers see all conversations, even if buyer sent message without inquiry
        // Fetch buyer info from backend for chat-only conversations
        const buyerInfoPromises = [];
        const chatRoomsToEnrich = [];
        
        firebaseChatRooms.forEach(room => {
          const conversationKey = `${room.buyerId}_${room.propertyId}`;
          
          // If no inquiry exists for this chat room, create a virtual inquiry entry
          if (!inquiryMap.has(conversationKey)) {
            // Fetch property details to get property title
            const property = properties.find(p => p.id === parseInt(room.propertyId));
            
            // Verify this chat room belongs to the current seller
            // room.receiverId should match user.id for sellers
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
              console.warn('[SellerInquiries] Chat room receiverId mismatch:', {
                roomId: room.id,
                roomReceiverId: room.receiverId,
                currentUserId: user.id,
                roomBuyerId: room.buyerId,
                roomPropertyId: room.propertyId
              });
            }
          } else {
            // Inquiry exists for this chat room - update buyer info in enriched list if needed
            // This ensures buyer info stays up-to-date
            const existingInquiry = inquiryMap.get(conversationKey);
            const enrichedIndex = enriched.findIndex(e => 
              (e.conversationKey === conversationKey) || 
              (e.buyerId === room.buyerId && e.propertyId === room.propertyId)
            );
            
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
          // Use profile image if available, otherwise use first letter of name
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
        // This ensures buyer names update dynamically when inquiries are created
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

        console.log('[SellerInquiries] Enriched inquiries:', enriched.length, 'total conversations');
        setEnrichedInquiries(enriched);
      } catch (error) {
        console.error('Error enriching inquiries with Firebase data:', error);
        // Fallback to original inquiries if Firebase fails
        setEnrichedInquiries(inquiries);
      }
    };

    enrichInquiries();
  }, [inquiries, user, properties]);

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

  // When opened with ?section=leads (e.g. from overview Leads card), scroll to leads section
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('section') === 'leads') {
      const timer = setTimeout(() => scrollToLeadsSection(), 300);
      return () => clearTimeout(timer);
    }
  }, [location.search]);

  // Sync selectedInquiry with updated inquiries list (for real-time status updates)
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

  // Filter enriched inquiries (use enrichedInquiries instead of inquiries)
  const filteredInquiries = enrichedInquiries.filter(inquiry => {
    const matchesStatus = filterStatus === 'all' || inquiry.status === filterStatus;
    const matchesProperty =
      filterProperty === 'all' || inquiry.propertyId === parseInt(filterProperty);
    const matchesSearch =
      inquiry.buyerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inquiry.lastMessage || inquiry.message || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      inquiry.propertyTitle.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesStatus && matchesProperty && matchesSearch;
  });

  // Stats (use enrichedInquiries) - use useMemo to ensure stats update when enrichedInquiries changes
  const stats = useMemo(() => {
    return {
      total: enrichedInquiries.length,
      new: enrichedInquiries.filter(i => i.status === 'new' || i.firebaseReadStatus === 'new').length,
      read: enrichedInquiries.filter(i => i.status === 'read' || i.firebaseReadStatus === 'read').length,
      replied: enrichedInquiries.filter(i => i.status === 'replied' || i.firebaseReadStatus === 'replied').length
    };
  }, [enrichedInquiries]);

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
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
  };

  const handleSelectInquiry = async (inquiry) => {
    // Setup chat room ID for this inquiry if we have buyer + property + seller
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
    // This ensures once a message is read, it stays in read state even after refresh
    if (inquiry.status === 'new' && chatRoomId && user) {
      try {
        // Update status optimistically - UI updates immediately
        setSelectedInquiry(prev => prev ? { ...prev, status: 'read' } : null);
        
        // Save to Firebase - this ensures persistence after refresh
        await updateInquiryReadStatus(chatRoomId, user.id, 'read');
        
        // Also try to update MySQL database (optional, for backward compatibility)
        try {
          await updateInquiryStatus(inquiry.id, 'read');
        } catch (dbError) {
          console.warn('Failed to update MySQL status, but Firebase status updated:', dbError);
          // Continue - Firebase status is the primary source
        }
        
        // Update selected inquiry with confirmed status
        setSelectedInquiry(prev => prev ? { ...prev, status: 'read' } : null);
      } catch (error) {
        console.error('Failed to mark inquiry as read in Firebase:', error);
        // Revert optimistic update on error
        setSelectedInquiry(prev => prev ? { ...prev, status: 'new' } : null);
        // Continue anyway - don't block user from viewing
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
      await updateInquiryStatus(selectedInquiry.id, 'replied');
      // Update selected inquiry status
      setSelectedInquiry(prev => prev ? { ...prev, status: 'replied' } : null);
      setReplyText('');
      setShowReplyModal(false);
    } catch (error) {
      console.error('Failed to mark inquiry as replied:', error);
      alert('Failed to update inquiry status. Please try again.');
    }
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || !selectedInquiry || !user) return;

    if (!selectedInquiry.buyerId || !selectedInquiry.propertyId) {
      alert('Buyer or property information not available for chat.');
      return;
    }

    const messageText = chatMessage.trim();
    setChatMessage('');

    try {
      // Ensure chat room exists in Firebase and get its ID
      const chatRoomId = await createOrGetChatRoom(
        selectedInquiry.buyerId,
        user.id,
        user.user_type || 'seller',
        selectedInquiry.propertyId
      );

      setSelectedChatRoomId(chatRoomId);

      // Send message to Firebase
      await firebaseSendMessage(
        chatRoomId,
        user.id,
        user.user_type || 'seller',
        messageText
      );

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

      // Optimistically update local chat state (listener will also update)
      setChatMessages(prev => {
        const prevMsgs = prev[selectedInquiry.id] || [];
        const now = new Date();
        const newMessage = {
          id: now.getTime(),
          text: messageText,
          sender: 'seller',
          timestamp: now.toISOString()
        };
        return {
          ...prev,
          [selectedInquiry.id]: [...prevMsgs, newMessage]
        };
      });
    } catch (error) {
      console.error('Error sending chat message as seller:', error);
      setChatMessage(messageText);
      alert(error.message || 'Failed to send message. Please try again.');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Mark messages as read ONLY when chat tab is viewed - update lastReadAt
  // This ensures unread count reduces only when user actually views the messages
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
        
        // Update Firebase lastReadAt
        updateInquiryReadStatus(selectedChatRoomId, user.id, 'read').catch(error => {
          console.warn('Failed to update Firebase lastReadAt:', error);
        });
      }
    }
  }, [selectedInquiry, activeTab, chatMessages, selectedChatRoomId, user, updateInquiryReadStatus]);

  // Handle tab switch
  const handleTabSwitch = async (tab) => {
    setActiveTab(tab);
    
    // Mark inquiry as 'read' when switching to chat tab (if status is 'new')
    if (tab === 'chat' && selectedInquiry && selectedInquiry.status === 'new' && selectedChatRoomId && user) {
      try {
        // Update in Firebase (primary source)
        await updateInquiryReadStatus(selectedChatRoomId, user.id, 'read');
        setSelectedInquiry(prev => prev ? { ...prev, status: 'read' } : null);
        
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

  // Listen to Firebase messages for the selected inquiry/chat room
  useEffect(() => {
    if (!selectedInquiry || !selectedChatRoomId || !user) return;

    const unsubscribe = listenToMessages(selectedChatRoomId, (firebaseMessages, error) => {
      if (error) {
        console.error('Error in seller chat listener:', error);
        return;
      }
      if (!firebaseMessages || !Array.isArray(firebaseMessages)) {
        console.error('Error in seller chat listener: Invalid messages received');
        return;
      }

      const transformed = firebaseMessages.map((msg, index) => {
        let date;
        if (msg.timestamp instanceof Date) {
          date = msg.timestamp;
        } else if (msg.timestamp) {
          date = new Date(msg.timestamp);
        } else {
          date = new Date();
        }

        return {
          id: msg.id || `${selectedInquiry.id}-${date.getTime()}-${index}-${Math.random()}`,
          text: msg.text || '',
          sender: msg.senderId === String(user.id) ? 'seller' : 'buyer',
          timestamp: date.toISOString()
        };
      });

      setChatMessages(prev => ({
        ...prev,
        [selectedInquiry.id]: transformed
      }));

      // Don't mark as read automatically - only mark when user views chat tab
      // This ensures unread count stays accurate until user actually views messages
    });

    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [selectedInquiry, selectedChatRoomId, user, updateInquiryStatus]);

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
        sender: 'seller',
        timestamp: new Date().toISOString(),
        type: 'file'
      };

      setChatMessages(prev => ({
        ...prev,
        [selectedInquiry.id]: [...(prev[selectedInquiry.id] || []), newMessage]
      }));

      try {
        // Update in Firebase (primary source)
        if (selectedChatRoomId && user) {
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
      new: { label: 'New', class: 'seller-new' },
      read: { label: 'Read', class: 'seller-read' },
      replied: { label: 'Replied', class: 'seller-replied' },
      contacted: { label: 'Contacted', class: 'seller-replied' },
      interested: { label: 'Interested', class: 'seller-replied' },
      not_interested: { label: 'Not Interested', class: 'seller-read' },
      closed: { label: 'Closed', class: 'seller-read' }
    };
    return badges[status] || badges.new;
  };

  return (
    <div className="seller-inquiries">
      {/* Header */}
      <div className="seller-inquiries-header">
        <div className="seller-header-content">
          <h1>Property Inquiries</h1>
          <p className="seller-subtitle">Manage and respond to buyer inquiries</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="seller-inquiry-stats">
        <div className="seller-stat-card">
          <div className="seller-stat-icon seller-total">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
          <div className="seller-stat-info">
            <span className="seller-stat-value">{stats.total}</span>
            <span className="seller-stat-label">Total Inquiries</span>
          </div>
        </div>

        <div className="seller-stat-card">
          <div className="seller-stat-icon seller-new">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="seller-stat-info">
            <span className="seller-stat-value">{stats.new}</span>
            <span className="seller-stat-label">New / Pending</span>
          </div>
        </div>

        <div className="seller-stat-card">
          <div className="seller-stat-icon seller-read">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2"/>
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
          <div className="seller-stat-info">
            <span className="seller-stat-value">{stats.read}</span>
            <span className="seller-stat-label">Read</span>
          </div>
        </div>

        <div className="seller-stat-card">
          <div className="seller-stat-icon seller-replied">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M9 10l-5 5 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M20 4v7a4 4 0 01-4 4H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="seller-stat-info">
            <span className="seller-stat-value">{stats.replied}</span>
            <span className="seller-stat-label">Replied</span>
          </div>
        </div>

        <button
          type="button"
          className="seller-stat-card seller-leads-stat-btn"
          onClick={scrollToLeadsSection}
          title="View leads from buyers who viewed your contact details"
        >
          <div className="seller-stat-icon seller-leads">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2"/>
              <circle cx="8.5" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
              <path d="M20 8v6M23 11h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="seller-stat-info">
            <span className="seller-stat-value">{leadsLoading ? '—' : leads.length}</span>
            <span className="seller-stat-label">Leads</span>
          </div>
        </button>
      </div>

      {/* Leads Section */}
      <div ref={leadsSectionRef} className="seller-leads-section">
        <h2 className="seller-leads-heading">Leads</h2>
        {leadsLoading ? (
          <div className="seller-leads-loading">Loading leads...</div>
        ) : leads.length === 0 ? (
          <div className="seller-leads-empty">
            <p>No leads yet. Leads will appear when buyers view your contact details.</p>
          </div>
        ) : (
          (() => {
            // Group leads by property
            const byProperty = leads.reduce((acc, lead) => {
              const key = lead.property_id;
              if (!acc[key]) acc[key] = { property_title: lead.property_title || 'Property', items: [] };
              acc[key].items.push(lead);
              return acc;
            }, {});
            const groups = Object.entries(byProperty);
            return (
              <div className="seller-leads-grouped">
                {groups.map(([propertyId, { property_title, items }]) => (
                  <div key={propertyId} className="seller-leads-property-group" style={{ marginBottom: '20px' }}>
                    <h3 className="seller-leads-property-heading" style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '8px' }}>
                      {property_title}
                    </h3>
                    <ol className="seller-leads-list buyer-history-list">
                      {items.map((lead, index) => (
                        <li key={`${lead.buyer_id}-${lead.property_id}-${index}`} className="seller-lead-item buyer-history-item">
                          <div className="buyer-history-grid">
                            <span className="buyer-history-owner-name">{lead.buyer_name || 'Buyer'}</span>
                            <span className="buyer-history-separator">|</span>
                            <span className="buyer-history-owner-phone">
                              {lead.buyer_phone ? (
                                <a href={`tel:${lead.buyer_phone}`} className="buyer-history-link">
                                  {lead.buyer_phone}
                                </a>
                              ) : (
                                <span className="buyer-history-empty">—</span>
                              )}
                            </span>
                            <span className="buyer-history-separator">|</span>
                            <span className="buyer-history-owner-email">
                              {lead.buyer_email ? (
                                <a href={`mailto:${lead.buyer_email}`} className="buyer-history-link">
                                  {lead.buyer_email}
                                </a>
                              ) : (
                                <span className="buyer-history-empty">—</span>
                              )}
                            </span>
                            <span className="buyer-history-separator">|</span>
                            <span className="buyer-history-timestamp">{lead.created_at ? getTimeAgo(lead.created_at) : '—'}</span>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            );
          })()
        )}
      </div>

      {/* Filters */}
      <div className="seller-filters-section">
        <div className="seller-search-box">
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

        <div className="seller-filter-group">
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
            {properties.map(property => (
              <option key={property.id} value={property.id}>
                {(property.title || '').toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content */}
      <div className="seller-inquiries-container">
        {/* Inquiries List */}
        <div className="seller-inquiries-list">
          {filteredInquiries.length === 0 ? (
            <div className="seller-empty-state">
              <div className="seller-empty-icon">
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
                key={inquiry.conversationKey || inquiry.id}
                className={`seller-inquiry-card ${selectedInquiry?.id === inquiry.id || selectedInquiry?.conversationKey === inquiry.conversationKey ? 'seller-selected' : ''} ${(inquiry.status === 'new' || inquiry.firebaseReadStatus === 'new') ? 'seller-unread' : ''}`}
                onClick={() => handleSelectInquiry(inquiry)}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="seller-inquiry-avatar">
                  {inquiry.buyerProfileImage ? (
                    <img src={inquiry.buyerProfileImage} alt={inquiry.buyerName} />
                  ) : (
                    inquiry.avatar
                  )}
                </div>
                <div className="seller-inquiry-content">
                  <div className="seller-inquiry-header">
                    <span className="seller-inquiry-name">{inquiry.buyerName}</span>
                    <span className="seller-inquiry-time">{getTimeAgo(inquiry.lastActivity || inquiry.createdAt)}</span>
                  </div>
                  <p className="seller-inquiry-property">{inquiry.propertyTitle}</p>
                  <p className="seller-inquiry-preview">{inquiry.lastMessage || inquiry.message}</p>
                </div>
                <div className="seller-inquiry-status">
                  <span className={`seller-status-badge ${getStatusBadge(inquiry).class}`}>
                    {getStatusBadge(inquiry).label}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Detail Panel */}
        <div className={`seller-inquiry-detail ${selectedInquiry ? 'seller-active' : ''}`}>
          {selectedInquiry ? (
            <>
              <div className="seller-detail-header">
                <button className="seller-back-btn-mobile" onClick={() => setSelectedInquiry(null)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
                <div className="seller-detail-user">
                  <div className="seller-detail-avatar">
                    {selectedInquiry.buyerProfileImage ? (
                      <img src={selectedInquiry.buyerProfileImage} alt={selectedInquiry.buyerName} />
                    ) : (
                      selectedInquiry.avatar
                    )}
                  </div>
                  <div className="seller-detail-user-info">
                    <h3>{selectedInquiry.buyerName}</h3>
                    <span className={`seller-status-badge ${getStatusBadge(selectedInquiry).class}`}>
                      {getStatusBadge(selectedInquiry).label}
                    </span>
                  </div>
                </div>
              </div>

              <div className="seller-detail-body">
                <div className="seller-detail-tabs">
                  <button
                    className={`seller-tab-btn ${activeTab === 'details' ? 'seller-active' : ''}`}
                    onClick={() => handleTabSwitch('details')}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="2"/>
                      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    Details
                  </button>

                  <button
                    className={`seller-tab-btn ${activeTab === 'chat' ? 'seller-active' : ''}`}
                    onClick={() => handleTabSwitch('chat')}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    Live Chat
                    {(() => {
                      const inquiryId = selectedInquiry?.id;
                      if (!inquiryId) return null;
                      
                      // Don't show badge if chat tab is currently active (user is viewing messages)
                      if (activeTab === 'chat') return null;
                      
                      const messages = chatMessages[inquiryId] || [];
                      
                      // Use lastReadAt from Firebase as source of truth
                      const readTimestamp = lastReadAt[inquiryId];
                      let unread = 0;
                      
                      if (readTimestamp) {
                        // Convert Firebase timestamp to Date if needed
                        const readTime = readTimestamp.toDate ? readTimestamp.toDate() : new Date(readTimestamp);
                        
                        // Count buyer messages with timestamp after lastReadAt
                        unread = messages.filter(msg => {
                          if (msg.sender !== 'buyer') return false;
                          const msgTime = new Date(msg.timestamp);
                          return msgTime > readTime;
                        }).length;
                      } else {
                        // If no lastReadAt, all buyer messages are unread
                        unread = messages.filter(msg => msg.sender === 'buyer').length;
                      }
                      
                      return unread > 0 ? (
                        <span className="seller-chat-badge">{unread}</span>
                      ) : null;
                    })()}
                  </button>
                </div>

                {activeTab === 'details' ? (
                  <div className="seller-details-content">
                    <div className="seller-property-info-card">
                      <h4>Property Inquiry</h4>
                      <p className="seller-property-name">{selectedInquiry.propertyTitle}</p>
                    </div>

                    <div className="seller-contact-info-card">
                      <h4>Contact Information</h4>

                      <div className="seller-contact-item">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2"/>
                          <path d="M22 6l-10 7L2 6" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                        <a href={`mailto:${selectedInquiry.buyerEmail}`}>{selectedInquiry.buyerEmail}</a>
                      </div>

                      <div className="seller-contact-item">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                        <a href={`tel:${selectedInquiry.buyerPhone}`}>{selectedInquiry.buyerPhone}</a>
                      </div>
                    </div>

                    <div className="seller-message-card">
                      <h4>Message</h4>
                      <div className="seller-message-content">
                        <p>{selectedInquiry.message}</p>
                        <span className="seller-message-time">{getTimeAgo(selectedInquiry.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="seller-chat-container">
                    <div className="seller-chat-messages">
                      {/* Show initial inquiry message only if there are no Firebase messages */}
                      {(!chatMessages[selectedInquiry.id] || chatMessages[selectedInquiry.id].length === 0) && (
                        <div className="seller-chat-message seller-buyer">
                          <div className="seller-message-avatar">
                            {selectedInquiry.buyerProfileImage ? (
                              <img src={selectedInquiry.buyerProfileImage} alt={selectedInquiry.buyerName} />
                            ) : (
                              selectedInquiry.avatar
                            )}
                          </div>
                          <div className="seller-message-bubble">
                            <div className="seller-message-header">
                              <span className="seller-message-sender">{selectedInquiry.buyerName}</span>
                              <span className="seller-message-timestamp">{getTimeAgo(selectedInquiry.createdAt)}</span>
                            </div>
                            <p>{selectedInquiry.message}</p>
                          </div>
                        </div>
                      )}

                      {/* Dynamic Firebase chat messages - these update in real-time */}
                      {(chatMessages[selectedInquiry.id] || []).map((msg) => (
                        <div key={msg.id} className={`seller-chat-message ${msg.sender === 'seller' ? 'seller-seller' : 'seller-buyer'}`}>
                          {msg.sender === 'buyer' && (
                            <div className="seller-message-avatar">
                              {selectedInquiry.buyerProfileImage ? (
                                <img src={selectedInquiry.buyerProfileImage} alt={selectedInquiry.buyerName} />
                              ) : (
                                selectedInquiry.avatar
                              )}
                            </div>
                          )}
                          <div className="seller-message-bubble">
                            <div className="seller-message-header">
                              <span className="seller-message-sender">
                                {msg.sender === 'seller' ? 'You' : selectedInquiry.buyerName}
                              </span>
                              <span className="seller-message-timestamp">{getTimeAgo(msg.timestamp)}</span>
                            </div>
                            <p>{msg.text}</p>
                          </div>
                          {msg.sender === 'seller' && (
                            <div className="seller-message-avatar seller-seller-avatar">
                              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 
                               user?.name ? user.name.charAt(0).toUpperCase() : 
                               user?.email ? user.email.charAt(0).toUpperCase() : 'S'}
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Empty state - show only when there are no Firebase messages to encourage starting conversation */}
                      {(!chatMessages[selectedInquiry.id] || chatMessages[selectedInquiry.id].length === 0) && (
                        <div className="seller-chat-empty">
                          <div className="seller-chat-empty-icon">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="1.5"/>
                              <circle cx="9" cy="10" r="1" fill="currentColor"/>
                              <circle cx="12" cy="10" r="1" fill="currentColor"/>
                              <circle cx="15" cy="10" r="1" fill="currentColor"/>
                            </svg>
                          </div>
                          <h4>Continue the conversation</h4>
                          <p>Reply to {selectedInquiry.buyerName}'s inquiry above or send a new message</p>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>

                    <div className="seller-chat-input-wrapper">
                      <div className="seller-chat-input-container">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          style={{ display: 'none' }}
                          accept="image/*,.pdf,.doc,.docx"
                        />
                        <button 
                          className="seller-attach-btn" 
                          title="Attach file"
                          onClick={handleFileClick}
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                        <input
                          type="text"
                          className="seller-chat-input"
                          placeholder="Type your message..."
                          value={chatMessage}
                          onChange={(e) => setChatMessage(e.target.value)}
                          onKeyPress={handleKeyPress}
                        />
                        <button
                          className="seller-send-message-btn"
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
                <div className="seller-detail-footer">
                  <button
                    className="seller-reply-btn seller-primary"
                    onClick={() => setShowReplyModal(true)}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M9 10l-5 5 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M20 4v7a4 4 0 01-4 4H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    Reply via Email
                  </button>
                  <a
                    href={`tel:${selectedInquiry.buyerPhone}`}
                    className="seller-call-btn"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    Call Now
                  </a>
                </div>
              )}
            </>
          ) : (
            <div className="seller-no-selection">
              <div className="seller-no-selection-icon">
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
        <div className="seller-modal-overlay" onClick={() => setShowReplyModal(false)}>
          <div className="seller-reply-modal" onClick={(e) => e.stopPropagation()}>
            <div className="seller-modal-header">
              <h3>Reply to {selectedInquiry?.buyerName}</h3>
              <button className="seller-close-btn" onClick={() => setShowReplyModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            <div className="seller-modal-body">
              <div className="seller-reply-to-info">
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

            <div className="seller-modal-footer">
              <button className="seller-cancel-btn" onClick={() => setShowReplyModal(false)}>
                Cancel
              </button>

              <button className="seller-send-btn" onClick={handleReply}>
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

export default SellerInquiries;
