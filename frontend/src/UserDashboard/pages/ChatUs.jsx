import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getUserChatRooms, listenToMessages, sendMessage as firebaseSendMessage, getChatRoomDetails, markChatAsRead } from '../../services/firebase.service';
import { propertiesAPI, chatAPI } from '../../services/api.service';
import MyChatBox from '../../MyChatBox/MyChatBox';
import ChatUsOverlay from '../components/ChatUsOverlay';
import '../styles/ChatUs.css';

const ChatUs = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const chatIdFromUrl = searchParams.get('chatId');
  const ownerNameFromUrl = searchParams.get('ownerName');
  const propertyIdFromUrl = searchParams.get('propertyId');
  const [propertyOwners, setPropertyOwners] = useState([]);

  const [selectedOwner, setSelectedOwner] = useState(null);
  const [selectedChatRoomId, setSelectedChatRoomId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  const [messages, setMessages] = useState([]);
  const [allChatMessages, setAllChatMessages] = useState({}); // Store messages from all chat rooms
  const [lastReadAt, setLastReadAt] = useState({}); // Track lastReadAt timestamps from Firebase (by chatRoomId)
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const unsubscribeMessagesRef = useRef(null);
  const allUnsubscribesRef = useRef({}); // Track all message listeners
  
  // Property cache for chat rooms
  const [propertyCache, setPropertyCache] = useState({});

  // Format message time helper function
  const formatMessageTime = (date) => {
    if (!date) return 'Just now';
    const now = new Date();
    const msgDate = date instanceof Date ? date : new Date(date);
    const diffMs = now - msgDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return msgDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  // Format "Member since" label for owner profile popup - returns only Month Year
  const formatOwnerMemberSince = (dateString) => {
    if (!dateString) return 'Recently';
    try {
      // Normalize MySQL datetime (YYYY-MM-DD HH:mm:ss) to ISO for reliable parsing across browsers
      const normalized = String(dateString).trim().replace(' ', 'T');
      const date = new Date(normalized);
      if (Number.isNaN(date.getTime())) return 'Recently';
      const month = date.toLocaleDateString('en-IN', { month: 'long' });
      const year = date.getFullYear();
      return `${month} ${year}`;
    } catch {
      return 'Recently';
    }
  };

  // Load chat rooms from Firebase
  useEffect(() => {
    const loadChatRooms = async () => {
      if (!user || user.user_type !== 'buyer') {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const chatRooms = await getUserChatRooms(user.id);
        
        // If chatId from URL but not in loaded chat rooms, fetch it directly
        if (chatIdFromUrl && !chatRooms.find(r => r.id === chatIdFromUrl)) {
          try {
            const chatRoomDetails = await getChatRoomDetails(chatIdFromUrl);
            if (chatRoomDetails) {
              chatRooms.push(chatRoomDetails);
            }
          } catch (error) {
            console.error('Error fetching chat room details from URL:', error);
          }
        }
        
        // Fetch property details for each chat room
        const ownersWithProperties = await Promise.all(
          chatRooms.map(async (room) => {
            try {
              // Get property details
              let property = propertyCache[room.propertyId];
              if (!property) {
                const propResponse = await propertiesAPI.getDetails(room.propertyId);
                if (propResponse.success && propResponse.data?.property) {
                  property = propResponse.data.property;
                  setPropertyCache(prev => ({ ...prev, [room.propertyId]: property }));
                }
              }

              // Resolve receiverId and receiverRole STRICTLY based on property owner's user_type
              // NO fallback, NO manual selection - ONLY from property data
              let receiverId, receiverRole;
              const ownerUserType = property?.user_type || property?.seller?.user_type;
              
              if (ownerUserType === 'agent') {
                // Property owner is an agent
                receiverId = property?.user_id || property?.seller?.id;
                receiverRole = 'agent';
              } else {
                // Property owner is a seller
                receiverId = property?.user_id || property?.seller?.id;
                receiverRole = 'seller';
              }
              
              // Validate receiverId exists
              if (!receiverId) {
                console.error('Cannot determine receiver from property data:', property);
                return null;
              }
              
              return {
                id: room.id,
                chatRoomId: room.id,
                receiverId: receiverId,
                receiverRole: receiverRole,
                propertyId: room.propertyId,
                name: property?.seller?.name || property?.seller?.full_name || 'Property Owner',
                propertyTitle: property?.title || 'Property',
                propertyType: property?.property_type || '',
                location: property?.location || '',
                price: property?.price ? `₹${parseFloat(property.price).toLocaleString('en-IN')}${property.status === 'rent' ? '/Month' : ''}` : '',
                image: property?.seller?.profile_image || property?.cover_image || 'https://via.placeholder.com/60',
                lastMessage: room.lastMessage || '',
                lastMessageTime: formatMessageTime(room.updatedAt),
                unread: 0, // TODO: Implement unread count
                status: 'offline', // TODO: Implement online status
                ownerMemberSince: property?.seller?.created_at || property?.created_at || null,
                ownerEmail: property?.seller?.email || '',
                ownerPhone: property?.seller?.phone || ''
              };
            } catch (error) {
              console.error('Error loading property for chat room:', error);
              return null;
            }
          })
        );

        const validOwners = ownersWithProperties.filter(owner => owner !== null && owner.id);
        setPropertyOwners(validOwners);
        
        // Priority: If chatId from URL, select that chat room first
        if (chatIdFromUrl) {
          const urlChatRoom = validOwners.find(owner => owner.chatRoomId === chatIdFromUrl);
          if (urlChatRoom) {
            console.log('✅ Found chat room from URL:', chatIdFromUrl);
            setSelectedOwner(urlChatRoom);
            setSelectedChatRoomId(urlChatRoom.chatRoomId);
          } else {
            // Chat room from URL not in list yet (might be brand new)
            console.log('⚠️ Chat room from URL not in list, fetching details...', chatIdFromUrl);
            setSelectedChatRoomId(chatIdFromUrl);
            
            // Create temp owner object immediately using URL params for instant display
            let tempOwner = null;
            const usePropertyId = propertyIdFromUrl || null;
            
            if (ownerNameFromUrl) {
              // Use owner name from URL for immediate display
              tempOwner = {
                id: chatIdFromUrl,
                chatRoomId: chatIdFromUrl,
                receiverId: null, // Will be fetched
                receiverRole: 'seller',
                propertyId: usePropertyId,
                name: decodeURIComponent(ownerNameFromUrl),
                propertyTitle: 'Property',
                propertyType: '',
                location: '',
                price: '',
                image: 'https://via.placeholder.com/60',
                lastMessage: '',
                lastMessageTime: 'Just now',
                unread: 0,
                status: 'offline',
                ownerEmail: '',
                ownerPhone: ''
              };
              setSelectedOwner(tempOwner);
              // Add temp owner to propertyOwners list immediately so it appears in sidebar
              setPropertyOwners(prevOwners => {
                if (!prevOwners.find(o => o.chatRoomId === chatIdFromUrl)) {
                  return [tempOwner, ...prevOwners];
                }
                return prevOwners;
              });
            }
            
            // Try to get chat room details and property info to complete the owner object
            try {
              const chatRoomDetails = await getChatRoomDetails(chatIdFromUrl);
              if (chatRoomDetails) {
                // Fetch property details
                const propId = chatRoomDetails.propertyId || usePropertyId;
                if (propId) {
                  const propResponse = await propertiesAPI.getDetails(propId);
                  if (propResponse.success && propResponse.data?.property) {
                    const property = propResponse.data.property;
                    
                    // Resolve receiverId and receiverRole STRICTLY based on property owner's user_type
                    // NO fallback, NO manual selection - ONLY from property data
                    let receiverId, receiverRole;
                    const ownerUserType = property.user_type || property.seller?.user_type;
                    
                    if (ownerUserType === 'agent') {
                      // Property owner is an agent
                      receiverId = property.user_id || property.seller?.id;
                      receiverRole = 'agent';
                    } else {
                      // Property owner is a seller
                      receiverId = property.user_id || property.seller?.id;
                      receiverRole = 'seller';
                    }
                    
                    // Validate receiverId exists
                    if (!receiverId) {
                      console.error('Cannot determine receiver from property data:', property);
                      return;
                    }
                    
                    const completeOwner = {
                      id: chatRoomDetails.id,
                      chatRoomId: chatRoomDetails.id,
                      receiverId: receiverId,
                      receiverRole: receiverRole,
                      propertyId: chatRoomDetails.propertyId,
                      name: property?.seller?.name || property?.seller?.full_name || ownerNameFromUrl || 'Property Owner',
                      propertyTitle: property?.title || 'Property',
                      propertyType: property?.property_type || '',
                      location: property?.location || '',
                      price: property?.price ? `₹${parseFloat(property.price).toLocaleString('en-IN')}${property.status === 'rent' ? '/Month' : ''}` : '',
                      image: property?.seller?.profile_image || property?.cover_image || 'https://via.placeholder.com/60',
                      lastMessage: chatRoomDetails.lastMessage || '',
                      lastMessageTime: formatMessageTime(chatRoomDetails.updatedAt),
                      unread: 0,
                      status: 'offline',
                      ownerMemberSince: property?.seller?.created_at || property?.created_at || null,
                      ownerEmail: property?.seller?.email || '',
                      ownerPhone: property?.seller?.phone || ''
                    };
                    setSelectedOwner(completeOwner);
                    setSelectedChatRoomId(chatIdFromUrl);
                    // Add to propertyOwners list if not already there
                    setPropertyOwners(prevOwners => {
                      if (!prevOwners.find(o => o.chatRoomId === chatIdFromUrl)) {
                        return [completeOwner, ...prevOwners];
                      }
                      return prevOwners.map(o => o.chatRoomId === chatIdFromUrl ? completeOwner : o);
                    });
                  } else if (tempOwner) {
                    // Update temp owner with chat room details even if property fetch failed
                    // Use receiverId and receiverRole from chatRoomDetails (should be correct from Firebase)
                    tempOwner.receiverId = chatRoomDetails.receiverId;
                    tempOwner.receiverRole = chatRoomDetails.receiverRole || 'seller';
                    tempOwner.propertyId = chatRoomDetails.propertyId;
                    tempOwner.lastMessage = chatRoomDetails.lastMessage || '';
                    tempOwner.lastMessageTime = formatMessageTime(chatRoomDetails.updatedAt);
                    setSelectedOwner(tempOwner);
                    // Add to propertyOwners list if not already there
                    setPropertyOwners(prevOwners => {
                      if (!prevOwners.find(o => o.chatRoomId === chatIdFromUrl)) {
                        return [tempOwner, ...prevOwners];
                      }
                      return prevOwners.map(o => o.chatRoomId === chatIdFromUrl ? tempOwner : o);
                    });
                  }
                } else if (tempOwner) {
                  // Update temp owner with chat room details
                  tempOwner.receiverId = chatRoomDetails.receiverId;
                  tempOwner.receiverRole = chatRoomDetails.receiverRole || 'seller';
                  tempOwner.propertyId = chatRoomDetails.propertyId;
                  tempOwner.lastMessage = chatRoomDetails.lastMessage || '';
                  tempOwner.lastMessageTime = formatMessageTime(chatRoomDetails.updatedAt);
                  setSelectedOwner(tempOwner);
                  // Add to propertyOwners list if not already there
                  setPropertyOwners(prevOwners => {
                    if (!prevOwners.find(o => o.chatRoomId === chatIdFromUrl)) {
                      return [tempOwner, ...prevOwners];
                    }
                    return prevOwners.map(o => o.chatRoomId === chatIdFromUrl ? tempOwner : o);
                  });
                }
              } else if (tempOwner) {
                // Chat room doesn't exist yet, but we have temp owner from URL
                // This is fine - user can still see the owner name and chat will be created on first message
                console.log('Chat room not found in Firebase yet, using temp owner from URL');
              }
            } catch (error) {
              console.error('Error fetching chat room details from URL:', error);
              // If we have temp owner, keep it
              if (!tempOwner && ownerNameFromUrl) {
                // Create minimal temp owner even if all fetches fail
                // receiverId and receiverRole will be resolved when property is fetched or on first message
                const minimalOwner = {
                  id: chatIdFromUrl,
                  chatRoomId: chatIdFromUrl,
                  receiverId: null,
                  receiverRole: null, // Will be resolved from property
                  propertyId: usePropertyId,
                  name: decodeURIComponent(ownerNameFromUrl),
                  propertyTitle: 'Property',
                  propertyType: '',
                  location: '',
                  price: '',
                  image: 'https://via.placeholder.com/60',
                  lastMessage: '',
                  lastMessageTime: 'Just now',
                  unread: 0,
                  status: 'offline',
                  ownerEmail: '',
                  ownerPhone: ''
                };
                setSelectedOwner(minimalOwner);
              }
            }
          }
        } else if (validOwners.length > 0 && !selectedOwner) {
          // If no URL chatId, select first owner
          setSelectedOwner(validOwners[0]);
          setSelectedChatRoomId(validOwners[0].chatRoomId);
        }
      } catch (error) {
        console.error('Error loading chat rooms:', error);
      } finally {
        setLoading(false);
      }
    };

    loadChatRooms();
  }, [user, chatIdFromUrl]);

  // Load lastReadAt from Firebase for ALL chat rooms on page load
  useEffect(() => {
    if (!user || user.user_type !== 'buyer' || propertyOwners.length === 0) return;

    const loadReadStatus = async () => {
      const lastReadAtMap = {};
      
      for (const owner of propertyOwners) {
        if (!owner.chatRoomId) continue;
        
        try {
          const chatRoomDetails = await getChatRoomDetails(owner.chatRoomId);
          if (chatRoomDetails?.lastReadAt?.[String(user.id)]) {
            lastReadAtMap[owner.chatRoomId] = chatRoomDetails.lastReadAt[String(user.id)];
          }
        } catch (error) {
          console.warn(`Failed to load lastReadAt for chat room ${owner.chatRoomId}:`, error);
        }
      }
      
      setLastReadAt(prev => ({ ...prev, ...lastReadAtMap }));
    };

    loadReadStatus();
  }, [user, propertyOwners]);
  
  // Calculate unread chat messages count across all chat rooms
  // Unread = messages from sellers/agents that haven't been viewed by the buyer
  const unreadChatCount = useMemo(() => {
    if (!user) return 0;
    
    let count = 0;
    Object.keys(allChatMessages).forEach(chatRoomId => {
      const messages = allChatMessages[chatRoomId] || [];
      if (!Array.isArray(messages) || messages.length === 0) return;
      
      const isSelected = selectedChatRoomId === chatRoomId;
      
      // If this is the selected chat room, don't count unread (user is viewing it)
      if (isSelected) return;
      
      // Use lastReadAt from Firebase as source of truth
      const readTimestamp = lastReadAt[chatRoomId];
      
      if (readTimestamp) {
        // Convert Firebase timestamp to Date if needed
        const readTime = readTimestamp.toDate ? readTimestamp.toDate() : new Date(readTimestamp);
        
        // Count seller/agent messages with timestamp after lastReadAt
        const unread = messages.filter(msg => {
          if (msg.sender !== 'owner') return false;
          const msgTime = new Date(msg.timestamp);
          return msgTime > readTime;
        }).length;
        
        count += unread;
      } else {
        // If no lastReadAt, all seller/agent messages are unread
        const sellerMessages = messages.filter(msg => msg.sender === 'owner');
        count += sellerMessages.length;
      }
    });
    return count;
  }, [allChatMessages, lastReadAt, selectedChatRoomId, user]);

  // Notify parent/navbar of unread count changes via custom event
  useEffect(() => {
    const event = new CustomEvent('buyerUnreadCountChange', { detail: unreadChatCount });
    window.dispatchEvent(event);
  }, [unreadChatCount]);

  // Listen to messages from ALL chat rooms to track unread count
  useEffect(() => {
    if (!user || user.user_type !== 'buyer' || propertyOwners.length === 0) return;

    // Set up listeners for all chat rooms
    propertyOwners.forEach(owner => {
      const chatRoomId = owner.chatRoomId;
      if (!chatRoomId) return;
      
      // Skip if already listening
      if (allUnsubscribesRef.current[chatRoomId]) return;

      const unsubscribe = listenToMessages(chatRoomId, (firebaseMessages, error) => {
        if (error) {
          console.error('Error in buyer chat listener for room:', chatRoomId, error);
          return;
        }

        if (!firebaseMessages || !Array.isArray(firebaseMessages)) {
          console.error('Invalid messages received for room:', chatRoomId);
          return;
        }

        const transformed = firebaseMessages.map((msg) => {
          let date;
          if (msg.timestamp instanceof Date) {
            date = msg.timestamp;
          } else if (msg.timestamp) {
            date = new Date(msg.timestamp);
          } else {
            date = new Date();
          }

          return {
            id: msg.id || `${chatRoomId}-${date.getTime()}-${Math.random()}`,
            text: msg.text || '',
            sender: msg.senderId === String(user.id) ? 'user' : 'owner',
            timestamp: date.toISOString()
          };
        });

        // Store messages for this chat room
        setAllChatMessages(prev => ({
          ...prev,
          [chatRoomId]: transformed
        }));
      });

      allUnsubscribesRef.current[chatRoomId] = unsubscribe;
    });

    // Cleanup: unsubscribe from chat rooms that are no longer in the list
    return () => {
      Object.keys(allUnsubscribesRef.current).forEach(chatRoomId => {
        if (!propertyOwners.find(owner => owner.chatRoomId === chatRoomId)) {
          if (allUnsubscribesRef.current[chatRoomId]) {
            allUnsubscribesRef.current[chatRoomId]();
            delete allUnsubscribesRef.current[chatRoomId];
          }
        }
      });
    };
  }, [user, propertyOwners]);

  // Mark messages as read when chat room is viewed - update lastReadAt
  useEffect(() => {
    if (selectedChatRoomId && user) {
      const messages = allChatMessages[selectedChatRoomId] || [];
      if (Array.isArray(messages) && messages.length > 0) {
        // Update local lastReadAt to current time
        const now = new Date();
        setLastReadAt(prev => ({
          ...prev,
          [selectedChatRoomId]: now
        }));
        
        // Update Firebase lastReadAt
        markChatAsRead(selectedChatRoomId, user.id).catch(error => {
          console.warn('Failed to update Firebase lastReadAt:', error);
        });
      }
    }
  }, [selectedChatRoomId, allChatMessages, user]);

  // Refresh chat rooms periodically to update last message timestamps
  useEffect(() => {
    if (!user || user.user_type !== 'buyer') return;
    
    const interval = setInterval(async () => {
      try {
        const chatRooms = await getUserChatRooms(user.id);
        
        // Update propertyOwners list with latest chat room data
        setPropertyOwners(prevOwners => {
          return prevOwners.map(owner => {
            const updatedRoom = chatRooms.find(room => room.id === owner.chatRoomId);
            if (updatedRoom) {
              return {
                ...owner,
                lastMessage: updatedRoom.lastMessage || owner.lastMessage,
                lastMessageTime: formatMessageTime(updatedRoom.updatedAt)
              };
            }
            return owner;
          });
        });
      } catch (error) {
        console.error('Error refreshing chat rooms:', error);
      }
    }, 10000); // Refresh every 10 seconds
    
    return () => clearInterval(interval);
  }, [user]);

  // Lock page scroll position - prevent any scrolling
  useEffect(() => {
    // Lock scroll on mount
    window.scrollTo(0, 0);
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      // Cleanup message listener
      if (unsubscribeMessagesRef.current) {
        unsubscribeMessagesRef.current();
      }
    };
  }, []);

  // Handle owner selection
  const handleOwnerSelect = (owner) => {
    setSelectedOwner(owner);
    setSelectedChatRoomId(owner.chatRoomId);
    setIsSidebarOpen(false);
    setMessages([]); // Clear messages while loading
    setIsProfileOpen(false);
  };

  const handleHeaderClick = () => {
    if (!selectedOwner) return;
    setIsProfileOpen(true);
  };

  // Listen to messages when chat room is selected (use chatIdFromUrl as fallback)
  useEffect(() => {
    const chatRoomId = selectedChatRoomId || chatIdFromUrl;
    if (!chatRoomId || !user) {
      console.log('Message listener skipped:', { selectedChatRoomId, chatIdFromUrl, hasUser: !!user });
      return;
    }

    console.log('Setting up message listener for chat room:', chatRoomId);

    // Unsubscribe from previous listener
    if (unsubscribeMessagesRef.current) {
      unsubscribeMessagesRef.current();
      unsubscribeMessagesRef.current = null;
    }

    // Subscribe to messages
    unsubscribeMessagesRef.current = listenToMessages(chatRoomId, (firebaseMessages, error) => {
      if (error) {
        console.error('Error in message listener:', error);
        return;
      }
      
      if (!firebaseMessages || !Array.isArray(firebaseMessages)) {
        console.error('Invalid messages received');
        return;
      }
      
      console.log('Received messages:', firebaseMessages.length);
      
      // Transform Firebase messages to match UI structure
      const transformedMessages = firebaseMessages.map((msg, index) => {
        let timestamp = 'Just now';
        if (msg.timestamp) {
          try {
            const date = msg.timestamp instanceof Date 
              ? msg.timestamp 
              : new Date(msg.timestamp);
            timestamp = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          } catch (e) {
            console.error('Error parsing timestamp:', e);
          }
        }
        
        return {
          id: msg.id || `${chatRoomId}-${index}-${Date.now()}`,
          text: msg.text || '',
          sender: msg.senderId === String(user.id) ? 'user' : 'owner',
          timestamp
        };
      });
      setMessages(transformedMessages);
      
      // Update chat room list with last message and timestamp
      if (firebaseMessages.length > 0) {
        const lastMessage = firebaseMessages[firebaseMessages.length - 1];
        const lastMsgText = lastMessage.text || '';
        let lastMsgTime = new Date();
        if (lastMessage.timestamp) {
          lastMsgTime = lastMessage.timestamp instanceof Date 
            ? lastMessage.timestamp 
            : new Date(lastMessage.timestamp);
        }
        
        // Update the chat room in propertyOwners list
        setPropertyOwners(prevOwners => {
          const updatedOwners = prevOwners.map(owner => {
            if (owner.chatRoomId === chatRoomId) {
              return {
                ...owner,
                lastMessage: lastMsgText,
                lastMessageTime: formatMessageTime(lastMsgTime)
              };
            }
            return owner;
          });
          
          // If chat room not in list but we have selectedOwner, add it
          if (!updatedOwners.find(o => o.chatRoomId === chatRoomId) && selectedOwner) {
            updatedOwners.unshift({
              ...selectedOwner,
              lastMessage: lastMsgText,
              lastMessageTime: formatMessageTime(lastMsgTime)
            });
          }
          
          return updatedOwners;
        });
      }
    });

    return () => {
      if (unsubscribeMessagesRef.current) {
        unsubscribeMessagesRef.current();
        unsubscribeMessagesRef.current = null;
      }
    };
  }, [selectedChatRoomId, chatIdFromUrl, user, selectedOwner]);

  // Core function to send a message - can be called with any message text
  const sendMessageCore = async (messageText) => {
    if (!messageText || !messageText.trim() || !user) {
      console.error('Cannot send message - missing data:', { 
        user: !!user, 
        message: messageText?.trim() 
      });
      return;
    }

    const trimmedMessage = messageText.trim();

    try {
      // Resolve receiver and propertyId STRICTLY from property data
      // Chat room is created ONLY when first message is sent
      let receiverId, receiverRole, propertyId;
      
      // Try to get receiver from selectedOwner first
      if (selectedOwner && selectedOwner.receiverId && selectedOwner.propertyId) {
        receiverId = selectedOwner.receiverId;
        receiverRole = selectedOwner.receiverRole;
        propertyId = selectedOwner.propertyId;
      } else if (propertyIdFromUrl) {
        // Fetch property to resolve receiver STRICTLY based on property owner's user_type
        const propResponse = await propertiesAPI.getDetails(propertyIdFromUrl);
        if (!propResponse.success || !propResponse.data?.property) {
          throw new Error('Property not found');
        }
        
        const property = propResponse.data.property;
        
        // Resolve receiverId and receiverRole STRICTLY based on property owner's user_type
        // NO fallback, NO manual selection - ONLY from property data
        const ownerUserType = property.user_type || property.seller?.user_type;
        
        if (ownerUserType === 'agent') {
          // Property owner is an agent
          receiverId = property.user_id || property.seller?.id;
          receiverRole = 'agent';
        } else {
          // Property owner is a seller
          receiverId = property.user_id || property.seller?.id;
          receiverRole = 'seller';
        }
        
        if (!receiverId) {
          throw new Error('Could not determine receiver from property data. Property owner user_type is required.');
        }
        
        propertyId = propertyIdFromUrl;
      } else {
        throw new Error('Property information is missing. Cannot determine receiver.');
      }
      
      // Generate chat room ID to check if it's a new conversation
      const { generateChatRoomId, createOrGetChatRoom, getChatRoomDetails } = await import('../../services/firebase.service');
      const generatedChatRoomId = generateChatRoomId(user.id, receiverId, propertyId);
      
      // Check if this is a new chat room (first message for this buyer-property-seller)
      let isNewChatRoom = false;
      try {
        const existingRoom = await getChatRoomDetails(generatedChatRoomId);
        isNewChatRoom = !existingRoom;
      } catch (error) {
        // Room doesn't exist, this is a new conversation
        isNewChatRoom = true;
      }
      
      // If this is a NEW chat room (first message), call backend API to validate chat room setup
      // This validates the buyer, seller, and property before creating the Firebase chat room
      if (isNewChatRoom) {
        try {
          console.log('📞 First message - Validating chat room setup via backend API...');
          const response = await chatAPI.createRoom(receiverId, propertyId);
          if (response.success) {
            console.log('✅ Chat room validated successfully:', response.data);
          }
        } catch (error) {
          console.warn('⚠️ Failed to validate chat room via backend API, continuing with Firebase chat room creation:', error);
          // Continue even if backend API fails - Firebase chat room will still be created
        }
      }
      
      // ALWAYS ensure chat room exists in Firebase before sending message
      // createOrGetChatRoom will get existing room or create new one
      const finalChatRoomId = await createOrGetChatRoom(
        user.id,
        receiverId,
        receiverRole,
        propertyId
      );
      
      // Update selectedChatRoomId and selectedOwner with the chat room ID
      setSelectedChatRoomId(finalChatRoomId);
      if (selectedOwner) {
        setSelectedOwner({
          ...selectedOwner,
          chatRoomId: finalChatRoomId,
          receiverId: receiverId,
          receiverRole: receiverRole,
          propertyId: propertyId
        });
      }
      
      // Send message to Firebase
      await firebaseSendMessage(
        finalChatRoomId,
        user.id,
        user.user_type,
        trimmedMessage
      );
      console.log('✅ Message sent successfully');
      
      // Update chat room list immediately with the sent message
      const now = new Date();
      setPropertyOwners(prevOwners => {
        const updatedOwners = prevOwners.map(owner => {
          if (owner.chatRoomId === finalChatRoomId) {
            return {
              ...owner,
              lastMessage: trimmedMessage,
              lastMessageTime: formatMessageTime(now)
            };
          }
          return owner;
        });
        
        // If chat room not in list but we have selectedOwner, add it to the list
        if (!updatedOwners.find(o => o.chatRoomId === finalChatRoomId) && selectedOwner) {
          const newOwner = {
            ...selectedOwner,
            chatRoomId: finalChatRoomId,
            lastMessage: trimmedMessage,
            lastMessageTime: formatMessageTime(now)
          };
          // Add to beginning of list (most recent)
          updatedOwners.unshift(newOwner);
        }
        
        return updatedOwners;
      });
      
      // Message will also be added via real-time listener
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = error.message || 'Failed to send message. Please try again.';
      alert(errorMessage);
      throw error; // Re-throw to allow caller to handle
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (inputMessage.trim() === '' || !user) {
      console.error('Cannot send message - missing data:', { 
        user: !!user, 
        message: inputMessage.trim() 
      });
      return;
    }

    const messageText = inputMessage.trim();
    setInputMessage(''); // Clear input immediately for better UX

    try {
      await sendMessageCore(messageText);
    } catch (error) {
      // Restore message on error
      setInputMessage(messageText);
    }
  };

  const quickReplies = [
    "When can I visit?",
    "Is it still available?",
    "Tell me about amenities",
    "Can we negotiate price?",
    "How do we proceed further?",
    "I need more information"
  ];

  const handleQuickReply = async (reply) => {
    if (!reply || !reply.trim()) return;
    
    // Directly send the reply message without setting inputMessage
    try {
      await sendMessageCore(reply.trim());
    } catch (error) {
      console.error('Error sending quick reply:', error);
    }
  };

  const isAuthenticated = !!user;

  return (
    <div className="buyer-chatus-page">
      <div className={`buyer-chatus-wrapper ${!isAuthenticated ? 'buyer-chatus-blurred' : ''}`}>
        <MyChatBox
          // Sidebar props
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onCloseSidebar={() => setIsSidebarOpen(false)}
          propertyOwners={propertyOwners}
          selectedOwner={selectedOwner}
          onOwnerSelect={handleOwnerSelect}
          loading={loading}
          
          // Messages props
          messages={messages}
          isTyping={isTyping}
          
          // Input props
          inputMessage={inputMessage}
          onInputChange={(value) => setInputMessage(value)}
          onSendMessage={handleSendMessage}
          quickReplies={quickReplies}
          showQuickReplies={messages.length <= 3}
          onQuickReply={handleQuickReply}

          // Header actions
          onHeaderClick={handleHeaderClick}
        />
      </div>

      {/* Blur Overlay - Only show when user is not authenticated (just backdrop blur, no content) */}
      {!isAuthenticated && (
        <div className="buyer-chatus-blur-overlay"></div>
      )}

      {/* Chat Us Overlay Popup - Only show when user is not authenticated */}
      {!isAuthenticated && (
        <ChatUsOverlay 
          isOpen={true} 
          onClose={() => navigate('/BuyerHome')} 
        />
      )}

      {/* Owner Profile Card Popup - opens when chat header is clicked */}
      {isAuthenticated && isProfileOpen && selectedOwner && (
        <div
          className="buyer-chatus-profile-overlay"
          onClick={() => setIsProfileOpen(false)}
        >
          <div
            className="buyer-chatus-profile-card"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="buyer-chatus-profile-close"
              aria-label="Close owner profile"
              onClick={() => setIsProfileOpen(false)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M18 6L6 18M6 6l12 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            <div className="buyer-chatus-profile-header">
              <div className="buyer-chatus-profile-avatar">
                <img
                  src={
                    selectedOwner.image && selectedOwner.image.trim() !== ''
                      ? selectedOwner.image
                      : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          selectedOwner.name || 'Owner'
                        )}&background=886ace&color=fff&size=200`
                  }
                  alt={selectedOwner.name || 'Owner'}
                  onError={(e) => {
                    const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      selectedOwner.name || 'Owner'
                    )}&background=886ace&color=fff&size=200`;
                    if (e.target.src !== fallback) {
                      e.target.src = fallback;
                    }
                  }}
                />
              </div>

              <div className="buyer-chatus-profile-title-block">
                <h2>{selectedOwner.name || 'Property Owner'}</h2>
                <p className="buyer-chatus-profile-role">
                  {selectedOwner.receiverRole === 'agent'
                    ? 'Agent'
                    : 'Seller / Owner'}
                </p>
              </div>
            </div>

            <div className="buyer-chatus-profile-body">
              {selectedOwner.ownerEmail && (
                <div className="buyer-chatus-profile-row">
                  <span className="buyer-chatus-profile-label">Email</span>
                  <span className="buyer-chatus-profile-value">
                    <a href={`mailto:${selectedOwner.ownerEmail}`} className="buyer-chatus-profile-link">
                      {selectedOwner.ownerEmail}
                    </a>
                  </span>
                </div>
              )}

              {selectedOwner.ownerPhone && (
                <div className="buyer-chatus-profile-row">
                  <span className="buyer-chatus-profile-label">Phone</span>
                  <span className="buyer-chatus-profile-value">
                    <a href={`tel:${selectedOwner.ownerPhone}`} className="buyer-chatus-profile-link">
                      {selectedOwner.ownerPhone}
                    </a>
                  </span>
                </div>
              )}

              <div className="buyer-chatus-profile-row">
                <span className="buyer-chatus-profile-label">Member since</span>
                <span className="buyer-chatus-profile-value">
                  {formatOwnerMemberSince(selectedOwner.ownerMemberSince)}
                </span>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatUs;
