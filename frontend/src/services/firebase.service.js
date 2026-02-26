/**
 * Firebase Chat Service
 * Clean & Correct Implementation
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';

/* =========================================
   Firebase Configuration
========================================= */

const firebaseConfig = {
  apiKey: "AIzaSyBjD9KHuVjUNSvPpa6y-pElD7lIElCiXmE",
  authDomain: "my-chat-box-ec5b0.firebaseapp.com",
  projectId: "my-chat-box-ec5b0",
  storageBucket: "my-chat-box-ec5b0.firebasestorage.app",
  messagingSenderId: "387721645160",
  appId: "1:387721645160:web:64f6ec464447b49ea6bfdd",
  measurementId: "G-CLCBRJYNMN"
};

/* =========================================
   Lazy Init
========================================= */

let app = null;
let db = null;
let storage = null;

const initializeFirebase = async () => {
  try {
    if (db && storage) {
      console.log('✅ Firebase already initialized');
      return { app, db, storage };
    }
    
    if (!app) {
      console.log('🔥 Initializing Firebase app...');
      app = initializeApp(firebaseConfig);
      console.log('✅ Firebase app initialized');
    }
    
    if (!db) {
      console.log('🔥 Initializing Firestore...');
      db = getFirestore(app);
      console.log('✅ Firestore initialized');
    }
    
    if (!storage) {
      console.log('🔥 Initializing Firebase Storage...');
      storage = getStorage(app);
      console.log('✅ Firebase Storage initialized');
    }
    
    return { app, db, storage };
  } catch (error) {
    console.error('❌ Firebase initialization error:', error);
    throw new Error(`Failed to initialize Firebase: ${error.message}`);
  }
};

/* =========================================
   Chat Room ID (DETERMINISTIC)
   Format: min(buyerId, posterId)_max(buyerId, posterId)_propertyId
   Ensures exactly one chat per (buyerId + propertyId + posterId)
========================================= */

export const generateChatRoomId = (
  buyerId,
  posterId,
  propertyId
) => {
  // Convert to strings for consistent comparison
  const buyerIdStr = String(buyerId);
  const posterIdStr = String(posterId);
  
  // Sort IDs to ensure deterministic chat room ID
  const [minId, maxId] = buyerIdStr < posterIdStr 
    ? [buyerIdStr, posterIdStr] 
    : [posterIdStr, buyerIdStr];
  
  return `${minId}_${maxId}_${propertyId}`;
};

/* =========================================
   Create / Get Chat Room (ONLY PLACE)
   Creates chat room ONLY when first message is sent
   Uses deterministic chat room ID based on sorted participant IDs
========================================= */

export const createOrGetChatRoom = async (
  buyerId,
  posterId,
  posterRole,
  propertyId
) => {
  const { db } = await initializeFirebase();

  // Generate deterministic chat room ID with sorted IDs
  const chatRoomId = generateChatRoomId(
    buyerId,
    posterId,
    propertyId
  );

  const chatRoomRef = doc(db, 'chats', chatRoomId);
  const snapshot = await getDoc(chatRoomRef);

  if (snapshot.exists()) {
    // Chat room exists, just update timestamp
    await updateDoc(chatRoomRef, {
      updatedAt: serverTimestamp()
    });
    return chatRoomId;
  }

  // Create new chat room with sorted participants
  const buyerIdStr = String(buyerId);
  const posterIdStr = String(posterId);
  const [minId, maxId] = buyerIdStr < posterIdStr 
    ? [buyerIdStr, posterIdStr] 
    : [posterIdStr, buyerIdStr];

  await setDoc(chatRoomRef, {
    buyerId: buyerIdStr,
    receiverId: posterIdStr,
    receiverRole: posterRole, // 'seller' | 'agent'
    propertyId: String(propertyId),

    participants: [minId, maxId], // Sorted participants

    lastMessage: '',

    readStatus: {
      [buyerIdStr]: 'new',
      [posterIdStr]: 'new'
    },

    readBy: {},
    lastReadAt: {},

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return chatRoomId;
};

/* =========================================
   Send Message (NO AUTO ROOM CREATION)
========================================= */

export const sendMessage = async (
  chatRoomId,
  senderId,
  senderRole,
  text
) => {
  if (!chatRoomId || !senderId || !senderRole || !text || !text.trim()) {
    throw new Error('Missing required parameters for sendMessage');
  }

  try {
    const { db } = await initializeFirebase();

    const chatRoomRef = doc(db, 'chats', chatRoomId);
    const roomSnap = await getDoc(chatRoomRef);

    if (!roomSnap.exists()) {
      throw new Error('Chat room does not exist');
    }

    const messagesRef = collection(chatRoomRef, 'messages');

    await addDoc(messagesRef, {
      senderId: String(senderId),
      senderRole,
      text: text.trim(),
      timestamp: serverTimestamp()
    });

    const roomData = roomSnap.data();
    const otherUser =
      String(senderId) === roomData.buyerId
        ? roomData.receiverId
        : roomData.buyerId;

    await updateDoc(chatRoomRef, {
      lastMessage: text.trim(),
      updatedAt: serverTimestamp(),
      [`readStatus.${otherUser}`]: 'new'
    });
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

/* =========================================
   Listen Messages
========================================= */

export const listenToMessages = (chatRoomId, callback) => {
  if (!chatRoomId) {
    console.error('listenToMessages: chatRoomId is required');
    callback([], new Error('chatRoomId is required'));
    return () => {};
  }

  let unsubscribe = () => {};
  let isActive = true;

  initializeFirebase()
    .then(({ db }) => {
      if (!isActive) return;

      const messagesRef = collection(
        doc(db, 'chats', chatRoomId),
        'messages'
      );

      const q = query(messagesRef, orderBy('timestamp', 'asc'));

      unsubscribe = onSnapshot(
        q,
        snapshot => {
          if (!isActive) return;
          
          try {
            const messages = snapshot.docs.map(d => {
              const data = d.data();
              let timestamp = new Date();
              
              if (data.timestamp) {
                if (data.timestamp.toDate && typeof data.timestamp.toDate === 'function') {
                  timestamp = data.timestamp.toDate();
                } else if (data.timestamp instanceof Date) {
                  timestamp = data.timestamp;
                } else if (typeof data.timestamp === 'string' || typeof data.timestamp === 'number') {
                  timestamp = new Date(data.timestamp);
                }
              }

              return {
                id: d.id,
                ...data,
                timestamp: timestamp
              };
            });
            callback(messages, null);
          } catch (error) {
            console.error('Error processing messages:', error);
            callback([], error);
          }
        },
        error => {
          if (!isActive) return;
          console.error('Firebase listener error:', error);
          callback([], error);
        }
      );
    })
    .catch(error => {
      if (!isActive) return;
      console.error('Firebase initialization error:', error);
      callback([], error);
    });

  // Return cleanup function
  return () => {
    isActive = false;
    if (unsubscribe && typeof unsubscribe === 'function') {
      unsubscribe();
    }
  };
};

/* =========================================
   Get Chat Rooms (ALL ROLES)
========================================= */

export const getUserChatRooms = async userId => {
  const { db } = await initializeFirebase();

  const q = query(
    collection(db, 'chats'),
    where('participants', 'array-contains', String(userId))
  );

  const snapshot = await getDocs(q);

  const rooms = snapshot.docs.map(d => ({
    id: d.id,
    ...d.data(),
    updatedAt: d.data().updatedAt?.toDate?.() || new Date(0)
  }));

  rooms.sort((a, b) => b.updatedAt - a.updatedAt);
  return rooms;
};

/* =========================================
   Read Status
========================================= */

export const markChatAsRead = async (chatRoomId, userId) => {
  const { db } = await initializeFirebase();

  await updateDoc(doc(db, 'chats', chatRoomId), {
    [`readStatus.${userId}`]: 'read',
    [`readBy.${userId}`]: serverTimestamp(),
    [`lastReadAt.${userId}`]: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
};

export const getInquiryReadStatus = async (chatRoomId, userId) => {
  const { db } = await initializeFirebase();

  const chatRoomRef = doc(db, 'chats', chatRoomId);
  const snapshot = await getDoc(chatRoomRef);

  if (!snapshot.exists()) {
    return { status: null };
  }

  const data = snapshot.data();
  const readStatus = data.readStatus || {};
  const status = readStatus[userId] || null;

  return { status };
};

export const updateInquiryReadStatus = async (chatRoomId, userId, status) => {
  const { db } = await initializeFirebase();

  await updateDoc(doc(db, 'chats', chatRoomId), {
    [`readStatus.${userId}`]: status,
    [`readBy.${userId}`]: serverTimestamp(),
    [`lastReadAt.${userId}`]: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
};

/* =========================================
   Get Chat Room Details
========================================= */

export const getChatRoomDetails = async chatRoomId => {
  const { db } = await initializeFirebase();
  const snap = await getDoc(doc(db, 'chats', chatRoomId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

/* =========================================
   Property Image Upload to Firebase Storage
========================================= */

/**
 * Upload property image to Firebase Storage
 * @param {File} file - Image file to upload
 * @param {number} userId - User ID (for organizing storage)
 * @param {number|null} propertyId - Property ID (null for temp upload)
 * @param {Function} onProgress - Progress callback (optional)
 * @returns {Promise<{url: string, path: string, fileName: string}>} Firebase download URL
 */
export const uploadPropertyImageToFirebase = async (
  file,
  userId,
  propertyId = null,
  onProgress = null
) => {
  try {
    console.log('🔥 Firebase Upload: Starting upload...', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      userId,
      propertyId
    });
    
    // Initialize Firebase
    const { storage } = await initializeFirebase();
    if (!storage) {
      throw new Error('Firebase Storage not initialized');
    }
    console.log('✅ Firebase Storage initialized');
    
    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const extension = file.name.split('.').pop() || 'jpg';
    const fileName = `img_${timestamp}_${randomId}.${extension}`;
    
    // Determine storage path
    // Temporary uploads go to: properties/temp/{userId}/{filename}
    // Permanent uploads go to: properties/{propertyId}/{filename}
    let storagePath;
    if (propertyId) {
      storagePath = `properties/${propertyId}/${fileName}`;
    } else {
      storagePath = `properties/temp/${userId}/${fileName}`;
    }
    
    console.log('🔥 Firebase Upload: Storage path:', storagePath);
    
    // Create storage reference
    const storageRef = ref(storage, storagePath);
    console.log('✅ Firebase Storage reference created');
    
    // Upload file
    console.log('🔥 Firebase Upload: Uploading file to Firebase...');
    const snapshot = await uploadBytes(storageRef, file);
    console.log('✅ Firebase Upload: File uploaded successfully', {
      bytesTransferred: snapshot.metadata.size,
      contentType: snapshot.metadata.contentType
    });
    
    // Get download URL
    console.log('🔥 Firebase Upload: Getting download URL...');
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log('✅ Firebase Upload: Download URL obtained:', downloadURL);
    
    return {
      url: downloadURL,
      path: storagePath,
      fileName: fileName
    };
  } catch (error) {
    console.error('❌ Firebase Upload Error:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      fileName: file?.name,
      userId,
      propertyId
    });
    
    // Provide more specific error messages
    if (error.code === 'storage/unauthorized') {
      throw new Error('Firebase Storage: Permission denied. Check Storage rules.');
    } else if (error.code === 'storage/quota-exceeded') {
      throw new Error('Firebase Storage: Quota exceeded. Check Firebase billing.');
    } else if (error.code === 'storage/unauthenticated') {
      throw new Error('Firebase Storage: User not authenticated.');
    } else if (error.message.includes('network')) {
      throw new Error('Firebase Storage: Network error. Check internet connection.');
    }
    
    throw new Error(`Failed to upload image to Firebase: ${error.message}`);
  }
};

/* =========================================
   Profile Image Upload to Firebase Storage
========================================= */

/**
 * Upload profile image to Firebase Storage
 * @param {File} file - Image file to upload
 * @param {number|string} userId - User ID (for organizing storage)
 * @param {Function} onProgress - Progress callback (optional)
 * @returns {Promise<{url: string, path: string, fileName: string}>} Firebase download URL
 */
export const uploadProfileImageToFirebase = async (
  file,
  userId,
  onProgress = null
) => {
  try {
    console.log('🔥 Firebase Profile Upload: Starting upload...', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      userId,
    });
    
    // Initialize Firebase
    const { storage } = await initializeFirebase();
    if (!storage) {
      throw new Error('Firebase Storage not initialized');
    }
    console.log('✅ Firebase Storage initialized for profile image');
    
    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const extension = file.name.split('.').pop() || 'jpg';
    const fileName = `profile_${userId}_${timestamp}_${randomId}.${extension}`;
    
    // Profile images go to: profiles/{userId}/{filename}
    const storagePath = `profiles/${userId}/${fileName}`;
    console.log('🔥 Firebase Profile Upload: Storage path:', storagePath);
    
    // Create storage reference
    const storageRef = ref(storage, storagePath);
    console.log('✅ Firebase Profile Storage reference created');
    
    // Upload file
    console.log('🔥 Firebase Profile Upload: Uploading file to Firebase...');
    const snapshot = await uploadBytes(storageRef, file);
    console.log('✅ Firebase Profile Upload: File uploaded successfully', {
      bytesTransferred: snapshot.metadata.size,
      contentType: snapshot.metadata.contentType
    });
    
    // Get download URL
    console.log('🔥 Firebase Profile Upload: Getting download URL...');
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log('✅ Firebase Profile Upload: Download URL obtained:', downloadURL);
    
    return {
      url: downloadURL,
      path: storagePath,
      fileName: fileName
    };
  } catch (error) {
    console.error('❌ Firebase Profile Upload Error:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      fileName: file?.name,
      userId,
    });
    
    if (error.code === 'storage/unauthorized') {
      throw new Error('Firebase Storage: Permission denied. Check Storage rules.');
    } else if (error.code === 'storage/quota-exceeded') {
      throw new Error('Firebase Storage: Quota exceeded. Check Firebase billing.');
    } else if (error.code === 'storage/unauthenticated') {
      throw new Error('Firebase Storage: User not authenticated.');
    } else if (error.message.includes('network')) {
      throw new Error('Firebase Storage: Network error. Check internet connection.');
    }
    
    throw new Error(`Failed to upload profile image to Firebase: ${error.message}`);
  }
};

/**
 * Delete image from Firebase Storage (optional utility)
 * @param {string} storagePath - Firebase Storage path
 */
export const deletePropertyImageFromFirebase = async (storagePath) => {
  try {
    const { storage } = await initializeFirebase();
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
  } catch (error) {
    console.error('Firebase delete error:', error);
    // Don't throw - deletion failures are not critical
  }
};

/* =========================================
   Export
========================================= */

export default {
  initializeFirebase,
  generateChatRoomId,
  createOrGetChatRoom,
  sendMessage,
  listenToMessages,
  getUserChatRooms,
  markChatAsRead,
  getChatRoomDetails,
  getInquiryReadStatus,
  updateInquiryReadStatus,
  uploadPropertyImageToFirebase,
  deletePropertyImageFromFirebase,
  uploadProfileImageToFirebase
};
