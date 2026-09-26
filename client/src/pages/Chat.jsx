import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:5000');

/**
 * Helper to format bytes into readable KB / MB
 */
const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

/**
 * Helper to assign color theme & label based on file extension (matches ResourceCard theme)
 */
const getFileMeta = (type = '', name = '') => {
  const ext = (name.split('.').pop() || type || '').toLowerCase();
  if (['pdf'].includes(ext)) {
    return {
      label: 'PDF Document',
      badgeClass: 'bg-red-500/15 text-red-400 border-red-500/30',
      iconBg: 'bg-red-500/10 text-red-400',
    };
  }
  if (['docx', 'doc'].includes(ext)) {
    return {
      label: 'Word Document',
      badgeClass: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
      iconBg: 'bg-blue-500/10 text-blue-400',
    };
  }
  if (['pptx', 'ppt'].includes(ext)) {
    return {
      label: 'Presentation',
      badgeClass: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
      iconBg: 'bg-orange-500/10 text-orange-400',
    };
  }
  if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
    return {
      label: 'Image Asset',
      badgeClass: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
      iconBg: 'bg-purple-500/10 text-purple-400',
    };
  }
  return {
    label: ext ? `${ext.toUpperCase()} File` : 'Document',
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    iconBg: 'bg-emerald-500/10 text-emerald-400',
  };
};

export const Chat = () => {
  const { user, token } = useAuth();
  const { roomId: urlRoomId } = useParams();
  const navigate = useNavigate();

  // Socket & Connection state
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  // Rooms & Messages state
  const [rooms, setRooms] = useState([]);
  const [activeRoomId, setActiveRoomId] = useState(urlRoomId || null);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);

  // Unread tracking state (stored per-user in localStorage)
  const [lastReadMap, setLastReadMap] = useState(() => {
    try {
      const stored = localStorage.getItem(`campus_chat_last_read_${user?._id}`);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Message Input & File Upload state
  const [inputText, setInputText] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [attachment, setAttachment] = useState(null); // { url, name, type, size }
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile drawer toggle

  // Search state for Direct Messages
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const previousScrollHeightRef = useRef(0);

  // --------------------------------------------------------------------------
  // 1. UNREAD TRACKING & LOCALSTORAGE SYNC
  // --------------------------------------------------------------------------
  const markRoomAsRead = useCallback(
    (roomId) => {
      if (!roomId || !user?._id) return;
      const nowIso = new Date().toISOString();
      setLastReadMap((prev) => {
        const next = { ...prev, [roomId]: nowIso };
        try {
          localStorage.setItem(`campus_chat_last_read_${user._id}`, JSON.stringify(next));
        } catch (err) {
          console.error('Error saving last read timestamp:', err);
        }
        return next;
      });
    },
    [user?._id]
  );

  const isRoomUnread = (room) => {
    if (!room || room._id === activeRoomId) return false;
    if (!room.lastMessageAt) return false;
    const lastRead = lastReadMap[room._id];
    if (!lastRead) return Boolean(room.lastMessageText);
    return new Date(room.lastMessageAt) > new Date(lastRead);
  };

  // --------------------------------------------------------------------------
  // 2. INITIALIZE SOCKET.IO CONNECTION WITH JWT HANDSHAKE AUTH
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!token) return;

    const socket = io(API_BASE_URL || undefined, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      // Auto-join active room if present
      if (activeRoomId) {
        socket.emit('joinRoom', { roomId: activeRoomId });
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('error', (err) => {
      console.error('Socket error event:', err);
    });

    // Real-time message listener
    socket.on('newMessage', (newMessage) => {
      const msgRoomId = newMessage.room?._id || newMessage.room;

      // 1. If incoming message belongs to open room, append it directly
      setActiveRoomId((currId) => {
        if (currId && currId.toString() === msgRoomId.toString()) {
          setMessages((prev) => {
            if (prev.some((m) => m._id === newMessage._id)) return prev;
            return [...prev, newMessage];
          });
          markRoomAsRead(currId);
        }
        return currId;
      });

      // 2. Update sidebar last message preview & sort
      setRooms((prevRooms) =>
        prevRooms
          .map((r) => {
            if (r._id.toString() === msgRoomId.toString()) {
              return {
                ...r,
                lastMessageText:
                  newMessage.content || `📎 Shared ${newMessage.attachmentName || 'file'}`,
                lastMessageAt: newMessage.createdAt,
              };
            }
            return r;
          })
          .sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0))
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [token, markRoomAsRead]);

  // --------------------------------------------------------------------------
  // 3. FETCH ALL ACCESSIBLE ROOMS (CLASS GROUP + DMs)
  // --------------------------------------------------------------------------
  const fetchRooms = useCallback(async () => {
    setLoadingRooms(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/chat/rooms`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setRooms(data.rooms || []);

        // Resolve active room from URL or default to first room (Class Group)
        if (!activeRoomId && data.rooms?.length > 0) {
          const target = urlRoomId
            ? data.rooms.find((r) => r._id === urlRoomId) || data.rooms[0]
            : data.rooms[0];
          setActiveRoomId(target._id);
          setActiveRoom(target);
          markRoomAsRead(target._id);
        } else if (activeRoomId) {
          const found = data.rooms.find((r) => r._id === activeRoomId);
          if (found) setActiveRoom(found);
        }
      }
    } catch (err) {
      console.error('Failed to load chat rooms:', err);
    } finally {
      setLoadingRooms(false);
    }
  }, [token, activeRoomId, urlRoomId, markRoomAsRead]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // --------------------------------------------------------------------------
  // 4. FETCH MESSAGES FOR SELECTED ROOM
  // --------------------------------------------------------------------------
  const fetchRoomMessages = useCallback(
    async (roomId) => {
      if (!roomId) return;
      setLoadingMessages(true);
      try {
        if (socketRef.current && socketRef.current.connected) {
          socketRef.current.emit('joinRoom', { roomId });
        }

        const res = await fetch(`${API_BASE_URL}/api/chat/rooms/${roomId}/messages?limit=50`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          setMessages(data.messages || []);
          setHasMoreMessages(Boolean(data.hasMore));
          markRoomAsRead(roomId);
        }
      } catch (err) {
        console.error('Failed to load room messages:', err);
      } finally {
        setLoadingMessages(false);
      }
    },
    [token, markRoomAsRead]
  );

  useEffect(() => {
    if (activeRoomId) {
      const room = rooms.find((r) => r._id === activeRoomId);
      if (room) setActiveRoom(room);
      fetchRoomMessages(activeRoomId);
    }
  }, [activeRoomId, rooms, fetchRoomMessages]);

  // --------------------------------------------------------------------------
  // 5. PAGINATION: LOAD OLDER MESSAGES ON SCROLL UP
  // --------------------------------------------------------------------------
  const loadOlderMessages = async () => {
    if (!activeRoomId || loadingOlder || !hasMoreMessages || messages.length === 0) return;

    const oldestMessage = messages[0];
    if (!oldestMessage) return;

    setLoadingOlder(true);
    if (messagesContainerRef.current) {
      previousScrollHeightRef.current = messagesContainerRef.current.scrollHeight;
    }

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/chat/rooms/${activeRoomId}/messages?before=${encodeURIComponent(
          oldestMessage.createdAt
        )}&limit=50`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();

      if (data.success && data.messages?.length > 0) {
        setMessages((prev) => [...data.messages, ...prev]);
        setHasMoreMessages(Boolean(data.hasMore));

        // Maintain scroll position smoothly after prepending older messages
        requestAnimationFrame(() => {
          if (messagesContainerRef.current) {
            const newScrollHeight = messagesContainerRef.current.scrollHeight;
            messagesContainerRef.current.scrollTop =
              newScrollHeight - previousScrollHeightRef.current;
          }
        });
      } else {
        setHasMoreMessages(false);
      }
    } catch (err) {
      console.error('Failed to load older messages:', err);
    } finally {
      setLoadingOlder(false);
    }
  };

  const handleMessagesScroll = (e) => {
    if (e.target.scrollTop < 40 && hasMoreMessages && !loadingOlder && !loadingMessages) {
      loadOlderMessages();
    }
  };

  // Scroll to bottom when new messages arrive (unless loading older)
  useEffect(() => {
    if (!loadingOlder && !loadingMessages) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, loadingOlder, loadingMessages]);

  // --------------------------------------------------------------------------
  // 6. SWITCH ACTIVE ROOM
  // --------------------------------------------------------------------------
  const handleSelectRoom = (room) => {
    setActiveRoomId(room._id);
    setActiveRoom(room);
    setSidebarOpen(false); // Close mobile drawer
    markRoomAsRead(room._id);
    navigate(`/chat/${room._id}`, { replace: true });
  };

  // --------------------------------------------------------------------------
  // 7. SEND MESSAGE VIA SOCKET.IO
  // --------------------------------------------------------------------------
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim() && !attachment) return;
    if (!activeRoomId || !socketRef.current) return;

    const payload = {
      roomId: activeRoomId,
      content: inputText.trim(),
      attachmentUrl: attachment?.url || '',
      attachmentName: attachment?.name || '',
      attachmentType: attachment?.type || '',
      attachmentSize: attachment?.size || 0,
    };

    socketRef.current.emit('sendMessage', payload, (response) => {
      if (response?.success && response.message) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === response.message._id)) return prev;
          return [...prev, response.message];
        });
        markRoomAsRead(activeRoomId);
      }
    });

    setInputText('');
    setAttachment(null);
  };

  // --------------------------------------------------------------------------
  // 8. FILE ATTACHMENT UPLOAD (Multer + Cloudinary)
  // --------------------------------------------------------------------------
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeRoomId) return;

    if (file.size > 20 * 1024 * 1024) {
      alert('File size exceeds the 20MB maximum limit.');
      return;
    }

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_BASE_URL}/api/chat/rooms/${activeRoomId}/attachment`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setAttachment({
          url: data.attachmentUrl,
          name: data.attachmentName,
          type: data.attachmentType,
          size: data.attachmentSize,
        });
      } else {
        alert(data.message || 'Failed to upload attachment.');
      }
    } catch (err) {
      alert(`Attachment error: ${err.message}`);
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // --------------------------------------------------------------------------
  // 9. INLINE USER SEARCH & START 1:1 DIRECT MESSAGE
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/users/search?q=${encodeURIComponent(searchQuery.trim())}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        if (data.success) {
          setSearchResults(data.users || []);
        }
      } catch (err) {
        console.error('Search users error:', err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, token]);

  const handleStartDM = async (targetUserId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/chat/dm/start`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ targetUserId }),
      });

      const data = await res.json();
      if (data.success && data.room) {
        setSearchQuery('');
        setSearchResults([]);
        setSearchFocused(false);

        // Add to rooms list if new
        setRooms((prev) => {
          if (prev.some((r) => r._id === data.room._id)) return prev;
          return [data.room, ...prev];
        });

        handleSelectRoom(data.room);
      }
    } catch (err) {
      alert(`Failed to start direct message: ${err.message}`);
    }
  };

  // Role Badge Helper
  const getRoleBadge = (role) => {
    switch (role?.toLowerCase()) {
      case 'lecturer':
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono">
            FACULTY
          </span>
        );
      case 'cr':
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
            CR
          </span>
        );
      default:
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-800 text-slate-400 font-mono">
            STUDENT
          </span>
        );
    }
  };

  // Group room vs Direct rooms
  const groupRooms = rooms.filter((r) => r.type === 'group');
  const directRooms = rooms.filter((r) => r.type === 'direct');
  const isGroupActive = activeRoom?.type === 'group';

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-3 sm:py-6 h-[calc(100vh-4.5rem)] flex flex-col font-sans antialiased">
      {/* Outer Card Container */}
      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex relative">
        {/* ========================================================================= */}
        {/* 1. LEFT SIDEBAR: PINNED CLASS ROOM + DM SEARCH + DM THREADS LIST          */}
        {/* ========================================================================= */}
        <div
          className={`w-80 sm:w-88 flex-shrink-0 bg-slate-950 border-r border-slate-800 flex flex-col z-20 transition-all duration-300 ${
            sidebarOpen ? 'absolute inset-y-0 left-0 shadow-2xl' : 'hidden md:flex'
          }`}
        >
          {/* Sidebar Top Title */}
          <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-sm">
                💬
              </div>
              <div>
                <h2 className="text-sm font-bold text-white tracking-tight">Campus Chat</h2>
                <span className="text-[10px] text-slate-400">Class & Direct Messaging</span>
              </div>
            </div>

            {/* Socket Live Indicator */}
            <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-full border border-slate-800">
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-red-400'
                }`}
              />
              <span className="text-[10px] font-mono text-slate-400">
                {isConnected ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>

          {/* Sidebar Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {/* ------------------------------------------------------------------- */}
            {/* SECTION A: PINNED CLASS GROUP ROOM (ALWAYS FIRST)                   */}
            {/* ------------------------------------------------------------------- */}
            <div>
              <div className="flex items-center justify-between px-2 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                  📌 Pinned Class Group
                </span>
                <span className="text-[9px] font-mono text-slate-500 uppercase">Always First</span>
              </div>

              {loadingRooms ? (
                <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse text-xs text-slate-500">
                  Loading class room...
                </div>
              ) : groupRooms.length === 0 ? (
                <div className="p-3 rounded-2xl bg-slate-900/40 border border-slate-800/60 text-xs text-slate-500 text-center">
                  No class room assigned
                </div>
              ) : (
                groupRooms.map((room) => {
                  const isActive = activeRoomId === room._id;
                  const hasUnread = isRoomUnread(room);
                  const courseCode = room.course?.code || user?.courseCode || 'CSE-QC';
                  const sectionCode = room.section || user?.section || 'A';
                  const roomLabel = `${courseCode} · Class Group`;

                  return (
                    <div
                      key={room._id}
                      onClick={() => handleSelectRoom(room)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative group ${
                        isActive
                          ? 'bg-indigo-950/80 border-indigo-500/60 shadow-lg shadow-indigo-950/50 ring-1 ring-indigo-500/30'
                          : 'bg-slate-900/80 border-slate-800 hover:bg-slate-900 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-sm flex-shrink-0">
                            👥
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-white truncate group-hover:text-indigo-300 transition-colors">
                              {roomLabel}
                            </h4>
                            <span className="text-[10px] text-slate-400 font-mono block">
                              Section {sectionCode}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {hasUnread && (
                            <span
                              className="w-2.5 h-2.5 rounded-full bg-indigo-400 ring-4 ring-indigo-400/20 animate-pulse"
                              title="New unread message"
                            />
                          )}
                          <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950 px-1.5 py-0.5 rounded border border-indigo-500/30">
                            Sec {sectionCode}
                          </span>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-400 truncate mt-2 pl-1">
                        {room.lastMessageText || 'No messages yet. Say hi to your class!'}
                      </p>
                    </div>
                  );
                })
              )}
            </div>

            {/* ------------------------------------------------------------------- */}
            {/* SECTION B: DM SEARCH BOX (Directly above DM list)                   */}
            {/* ------------------------------------------------------------------- */}
            <div className="pt-2 border-t border-slate-800/80 relative">
              <div className="flex items-center justify-between px-2 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Direct Messages ({directRooms.length})
                </span>
                <span className="text-[9px] text-slate-500">Cross-branch 1:1</span>
              </div>

              {/* Inline User Search Input */}
              <div className="relative mb-2">
                <input
                  type="text"
                  value={searchQuery}
                  onFocus={() => setSearchFocused(true)}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search classmate to message..."
                  className="w-full pl-8 pr-7 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                />
                <svg
                  className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-white text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Inline Search Results Dropdown Overlay */}
              {searchFocused && searchQuery.trim() && (
                <div className="mb-3 p-2 bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-xl max-h-56 overflow-y-auto space-y-1 z-30">
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>Search Results</span>
                    {searching && <span className="text-indigo-400 animate-pulse">Searching...</span>}
                  </div>

                  {!searching && searchResults.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-500">
                      No matching students or faculty found.
                    </div>
                  ) : (
                    searchResults.map((u) => (
                      <div
                        key={u._id}
                        onClick={() => handleStartDM(u._id)}
                        className="p-2.5 rounded-xl hover:bg-slate-800/90 border border-transparent hover:border-slate-700 flex items-center justify-between gap-2 cursor-pointer transition-all group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-300 font-bold text-xs flex items-center justify-center flex-shrink-0">
                            {u.name?.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-semibold text-white group-hover:text-indigo-300 block truncate">
                              {u.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono block truncate">
                              {u.courseCode} · Sec {u.section || 'A'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold font-mono bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                            {u.courseCode}-{u.section || 'A'}
                          </span>
                          {getRoleBadge(u.role)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* ----------------------------------------------------------------- */}
              {/* SECTION C: EXISTING DIRECT-MESSAGE THREADS LIST                    */}
              {/* ----------------------------------------------------------------- */}
              {directRooms.length === 0 ? (
                <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60 text-center text-xs text-slate-500 space-y-1">
                  <p>No 1:1 direct messages yet.</p>
                  <p className="text-[11px] text-slate-400">
                    Type a name above to start chatting with anyone across campus.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {directRooms.map((room) => {
                    const isActive = activeRoomId === room._id;
                    const hasUnread = isRoomUnread(room);
                    const participant = room.participant;
                    const participantName = participant?.name || room.name;
                    const participantCourse = participant?.course?.code || participant?.department || 'Campus';
                    const participantSection = participant?.section || 'A';
                    const badgeText = `${participantCourse}-${participantSection}`;

                    return (
                      <div
                        key={room._id}
                        onClick={() => handleSelectRoom(room)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer group ${
                          isActive
                            ? 'bg-slate-800/90 border-indigo-500/50 shadow-md ring-1 ring-indigo-500/20'
                            : 'bg-slate-900/50 border-slate-800/70 hover:bg-slate-900 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {/* Avatar */}
                            <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-indigo-300 flex-shrink-0">
                              {participantName?.charAt(0) || 'U'}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-semibold text-white truncate group-hover:text-indigo-300 transition-colors">
                                  {participantName}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 truncate block">
                                {room.lastMessageText || 'Direct message thread'}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <div className="flex items-center gap-1">
                              {hasUnread && (
                                <span
                                  className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"
                                  title="Unread message"
                                />
                              )}
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold font-mono bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                                {badgeText}
                              </span>
                            </div>
                            {participant?.role && getRoleBadge(participant.role)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. RIGHT MAIN CHAT WINDOW (MESSAGES PANE + INPUT + ATTACHMENTS)           */}
        {/* ========================================================================= */}
        <div className="flex-1 flex flex-col bg-slate-900/90 h-full overflow-hidden">
          {/* Active Room Top Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
            <div className="flex items-center gap-3">
              {/* Mobile Sidebar Toggle Button */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
                aria-label="Toggle chat sidebar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white tracking-tight">
                    {activeRoom?.type === 'group'
                      ? `${activeRoom.course?.code || user?.courseCode || 'CSE-QC'} · Class Group`
                      : activeRoom?.name || 'Direct Conversation'}
                  </h3>
                  {activeRoom?.type === 'group' ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      CLASS GROUP
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                      1:1 DIRECT
                    </span>
                  )}
                </div>

                <span className="text-[11px] text-slate-400">
                  {activeRoom?.type === 'group'
                    ? `Live class communication for Section ${activeRoom.section || user?.section || 'A'}`
                    : `Direct message thread with ${activeRoom?.participant?.name || 'classmate'}`}
                </span>
              </div>
            </div>

            {/* Socket Status Badge */}
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isConnected ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-red-400'
                }`}
                title={isConnected ? 'Live Socket Connected' : 'Connecting...'}
              />
              <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                {isConnected ? 'Real-Time Active' : 'Connecting...'}
              </span>
            </div>
          </div>

          {/* Messages Feed Area with Scroll-Up Pagination */}
          <div
            ref={messagesContainerRef}
            onScroll={handleMessagesScroll}
            className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4"
          >
            {/* Top Loading Indicator for older messages pagination */}
            {loadingOlder && (
              <div className="py-2 text-center text-xs text-indigo-400 flex items-center justify-center gap-2">
                <div className="w-3.5 h-3.5 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                <span>Loading older messages...</span>
              </div>
            )}

            {hasMoreMessages && !loadingOlder && (
              <div className="text-center py-1">
                <button
                  onClick={loadOlderMessages}
                  className="text-[11px] text-slate-500 hover:text-indigo-400 transition-colors"
                >
                  ↑ Scroll up or click to load older messages
                </button>
              </div>
            )}

            {loadingMessages ? (
              <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
                <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                <span>Loading message history...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3 text-slate-400">
                <div className="w-14 h-14 rounded-2xl bg-slate-800/80 text-2xl flex items-center justify-center">
                  💬
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">No messages yet</h4>
                  <p className="text-xs text-slate-500 max-w-sm mt-1">
                    Be the first to share notes, ask questions, or start the discussion!
                  </p>
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const isOwn = (msg.sender?._id || msg.sender) === user?._id;
                const senderName = msg.sender?.name || 'Classmate';
                const senderRole = msg.sender?.role || 'student';
                const formattedTime = new Date(msg.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                // In DMs, hide sender name since there's only 1 other person. In Group Chat, show sender name.
                const showSenderName = isGroupActive && !isOwn;

                return (
                  <div
                    key={msg._id}
                    className={`flex items-start gap-2.5 max-w-2xl ${
                      isOwn ? 'ml-auto flex-row-reverse' : ''
                    }`}
                  >
                    {/* User Avatar */}
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold font-mono flex-shrink-0 shadow-sm ${
                        isOwn
                          ? 'bg-indigo-600 text-white'
                          : senderRole === 'lecturer'
                          ? 'bg-purple-600 text-white'
                          : senderRole === 'cr'
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-800 text-slate-200 border border-slate-700'
                      }`}
                    >
                      {isOwn ? user?.name?.charAt(0) : senderName.charAt(0)}
                    </div>

                    {/* Bubble Content Container */}
                    <div className={`space-y-1 ${isOwn ? 'text-right' : 'text-left'} max-w-[85%]`}>
                      {/* Meta info (Name only in group room for others, timestamp always) */}
                      <div
                        className={`flex items-center gap-1.5 text-[11px] ${
                          isOwn ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {showSenderName && (
                          <>
                            <span className="font-semibold text-slate-300">{senderName}</span>
                            {getRoleBadge(senderRole)}
                          </>
                        )}
                        <span className="text-[10px] font-mono text-slate-500">{formattedTime}</span>
                      </div>

                      {/* Bubble Box */}
                      <div
                        className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-md ${
                          isOwn
                            ? 'bg-indigo-600 text-white rounded-tr-none'
                            : 'bg-slate-950 border border-slate-800/80 text-slate-200 rounded-tl-none'
                        }`}
                      >
                        {msg.content && <p className="whitespace-pre-wrap break-words">{msg.content}</p>}

                        {/* Shared File / Note Card (Reuses ResourceCard aesthetic) */}
                        {msg.attachmentUrl && (
                          <div
                            className={`mt-2.5 p-3 rounded-xl border transition-all ${
                              isOwn
                                ? 'bg-indigo-700/60 border-indigo-400/30 text-white'
                                : 'bg-slate-900 border-slate-800 text-slate-200'
                            }`}
                          >
                            {(() => {
                              const meta = getFileMeta(msg.attachmentType, msg.attachmentName);
                              return (
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div
                                      className={`w-9 h-9 rounded-lg ${meta.iconBg} flex items-center justify-center flex-shrink-0 text-sm border border-white/10`}
                                    >
                                      📄
                                    </div>
                                    <div className="min-w-0 text-left">
                                      <span className="font-bold text-xs truncate block leading-snug">
                                        {msg.attachmentName || 'Shared Document'}
                                      </span>
                                      <div className="flex items-center gap-1.5 text-[10px] opacity-80 mt-0.5">
                                        <span
                                          className={`px-1.5 py-0.2 rounded font-mono font-bold uppercase border ${meta.badgeClass}`}
                                        >
                                          {msg.attachmentType || 'FILE'}
                                        </span>
                                        {msg.attachmentSize > 0 && (
                                          <span className="font-mono">
                                            {formatFileSize(msg.attachmentSize)}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <a
                                    href={msg.attachmentUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download={msg.attachmentName || 'shared_document'}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 flex-shrink-0 transition-all cursor-pointer ${
                                      isOwn
                                        ? 'bg-white text-indigo-900 hover:bg-slate-100 shadow-sm'
                                        : 'bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30'
                                    }`}
                                  >
                                    <svg
                                      className="w-3.5 h-3.5"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                                      />
                                    </svg>
                                    <span>Download</span>
                                  </a>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Pending File Attachment Preview Banner */}
          {attachment && (
            <div className="px-4 py-2.5 bg-indigo-950/90 border-t border-indigo-500/30 flex items-center justify-between text-xs text-indigo-200 animate-fadeIn">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base">📎</span>
                <span className="text-slate-400">Ready to send:</span>
                <strong className="text-white truncate max-w-[200px] sm:max-w-md">
                  {attachment.name}
                </strong>
                {attachment.size > 0 && (
                  <span className="text-[10px] font-mono text-indigo-300 bg-indigo-900/60 px-1.5 py-0.5 rounded">
                    {formatFileSize(attachment.size)}
                  </span>
                )}
              </div>
              <button
                onClick={() => setAttachment(null)}
                className="text-indigo-400 hover:text-white text-xs font-semibold px-2 py-1 rounded hover:bg-indigo-900/50"
              >
                Remove ✕
              </button>
            </div>
          )}

          {/* Message Input & Attachment Bar */}
          <form onSubmit={handleSendMessage} className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950/60">
            <div className="flex items-center gap-2">
              {/* Hidden File Input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".pdf,.docx,.doc,.pptx,.ppt,.jpg,.jpeg,.png,.webp,.txt,.zip"
                className="hidden"
              />

              {/* Attach File Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFile}
                className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center"
                title="Attach Document, Presentation, or Image (Max 20MB)"
              >
                {uploadingFile ? (
                  <div className="w-5 h-5 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                    />
                  </svg>
                )}
              </button>

              {/* Text Input */}
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  activeRoom?.type === 'group'
                    ? 'Message your class... (Press Enter to send)'
                    : `Message ${activeRoom?.participant?.name || 'classmate'}...`
                }
                className="flex-1 px-4 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={!inputText.trim() && !attachment}
                className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-xs sm:text-sm shadow-lg shadow-indigo-600/25 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Send</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Chat;
