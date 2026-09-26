import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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
  const [hasMoreMessages, setHasMoreMessages] = useState(false);

  // Message Input & File Upload state
  const [inputText, setInputText] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [attachment, setAttachment] = useState(null); // { url, name, type, size }
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile toggle

  // DM Search Modal state
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // --------------------------------------------------------------------------
  // 1. INITIALIZE SOCKET.IO CONNECTION WITH JWT HANDSHAKE AUTH
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!token) return;

    const socket = io(API_BASE_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('✅ Connected to real-time chat socket server.');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('🔌 Disconnected from chat socket.');
    });

    socket.on('error', (err) => {
      console.error('Socket error event:', err);
    });

    // Real-time message receiver
    socket.on('newMessage', (newMessage) => {
      const msgRoomId = newMessage.room?._id || newMessage.room;

      // If the incoming message belongs to currently active room, append it
      setActiveRoomId((currId) => {
        if (currId && currId.toString() === msgRoomId.toString()) {
          setMessages((prev) => {
            if (prev.some((m) => m._id === newMessage._id)) return prev;
            return [...prev, newMessage];
          });
        }
        return currId;
      });

      // Update the room preview snippet in sidebar
      setRooms((prevRooms) =>
        prevRooms.map((r) => {
          if (r._id.toString() === msgRoomId.toString()) {
            return {
              ...r,
              lastMessageText: newMessage.content || `📎 Attached ${newMessage.attachmentName || 'file'}`,
              lastMessageAt: newMessage.createdAt,
            };
          }
          return r;
        }).sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt))
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  // --------------------------------------------------------------------------
  // 2. FETCH ALL ACCESSIBLE ROOMS FOR USER
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

        // If no active room yet, select URL room or default to the first room (Group Chat)
        if (!activeRoomId && data.rooms?.length > 0) {
          const target = urlRoomId
            ? data.rooms.find((r) => r._id === urlRoomId) || data.rooms[0]
            : data.rooms[0];
          setActiveRoomId(target._id);
          setActiveRoom(target);
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
  }, [token, activeRoomId, urlRoomId]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // --------------------------------------------------------------------------
  // 3. JOIN ROOM & FETCH MESSAGE HISTORY
  // --------------------------------------------------------------------------
  const fetchRoomMessages = useCallback(
    async (roomId) => {
      if (!roomId) return;
      setLoadingMessages(true);
      try {
        // Request server-side socket join with strict DB membership check
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
        } else {
          console.error(data.message);
        }
      } catch (err) {
        console.error('Failed to load room messages:', err);
      } finally {
        setLoadingMessages(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (activeRoomId) {
      const room = rooms.find((r) => r._id === activeRoomId);
      if (room) setActiveRoom(room);
      fetchRoomMessages(activeRoomId);
    }
  }, [activeRoomId, rooms, fetchRoomMessages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // --------------------------------------------------------------------------
  // 4. SWITCH ACTIVE ROOM
  // --------------------------------------------------------------------------
  const handleSelectRoom = (room) => {
    setActiveRoomId(room._id);
    setActiveRoom(room);
    setSidebarOpen(false); // Close mobile drawer
    navigate(`/chat/${room._id}`, { replace: true });
  };

  // --------------------------------------------------------------------------
  // 5. SEND MESSAGE (SOCKET DISPATCH)
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
      }
    });

    setInputText('');
    setAttachment(null);
  };

  // --------------------------------------------------------------------------
  // 6. FILE ATTACHMENT UPLOAD
  // --------------------------------------------------------------------------
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeRoomId) return;

    if (file.size > 20 * 1024 * 1024) {
      alert('File size exceeds 20MB limit.');
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
      alert('Error uploading attachment: ' + err.message);
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // --------------------------------------------------------------------------
  // 7. USER SEARCH FOR 1:1 DIRECT MESSAGES
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/users/search?q=${encodeURIComponent(searchQuery.trim())}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
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

  // Start 1:1 DM with target user
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
        setShowSearchModal(false);
        setSearchQuery('');
        setSearchResults([]);

        // Add to rooms list if not already present
        setRooms((prev) => {
          if (prev.some((r) => r._id === data.room._id)) return prev;
          return [data.room, ...prev];
        });

        handleSelectRoom(data.room);
      }
    } catch (err) {
      alert('Failed to initiate direct message thread: ' + err.message);
    }
  };

  // Role Badge Helper
  const getRoleBadge = (role) => {
    switch (role?.toLowerCase()) {
      case 'lecturer':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono">
            FACULTY
          </span>
        );
      case 'cr':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
            CR
          </span>
        );
      default:
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400 font-mono">
            STUDENT
          </span>
        );
    }
  };

  const groupRooms = rooms.filter((r) => r.type === 'group');
  const directRooms = rooms.filter((r) => r.type === 'direct');

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-6 h-[calc(100vh-5rem)] flex flex-col">
      {/* Main Chat Container Card */}
      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex relative">
        {/* ========================================================================= */}
        {/* LEFT SIDEBAR: ROOMS LIST (GROUP CHAT + 1:1 DIRECT MESSAGES)               */}
        {/* ========================================================================= */}
        <div
          className={`w-80 md:w-88 flex-shrink-0 bg-slate-950 border-r border-slate-800 flex flex-col z-20 transition-all duration-300 ${
            sidebarOpen ? 'absolute inset-y-0 left-0 shadow-2xl' : 'hidden md:flex'
          }`}
        >
          {/* Sidebar Header */}
          <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <h2 className="text-base font-bold text-white tracking-tight">Campus Messaging</h2>
            </div>

            <button
              onClick={() => setShowSearchModal(true)}
              className="p-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 transition-all cursor-pointer flex items-center gap-1 text-xs font-semibold"
              title="Start a Direct Message"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>New DM</span>
            </button>
          </div>

          {/* Rooms List Scroll Area */}
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {/* 1. Class Group Chat Section */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 block mb-1.5">
                Class Group Chat
              </span>
              {loadingRooms ? (
                <div className="p-3 text-xs text-slate-500 animate-pulse">Loading class room...</div>
              ) : groupRooms.length === 0 ? (
                <div className="p-3 rounded-xl bg-slate-900/50 text-xs text-slate-500 text-center">
                  No group room assigned
                </div>
              ) : (
                groupRooms.map((room) => {
                  const isActive = activeRoomId === room._id;
                  return (
                    <div
                      key={room._id}
                      onClick={() => handleSelectRoom(room)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                        isActive
                          ? 'bg-indigo-950/60 border-indigo-500/50 shadow-md shadow-indigo-950/40'
                          : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="p-1 rounded-lg bg-indigo-600/20 text-indigo-400 text-xs">👥</span>
                          <h4 className="text-xs font-bold text-white truncate max-w-[170px]">
                            {room.title || room.name}
                          </h4>
                        </div>
                        <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950/80 px-1.5 py-0.2 rounded border border-indigo-500/30">
                          Sec {room.section || 'A'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate pl-6">
                        {room.lastMessageText || 'No messages yet'}
                      </p>
                    </div>
                  );
                })
              )}
            </div>

            {/* 2. Direct Messages Section */}
            <div>
              <div className="flex items-center justify-between px-2 mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Direct Messages ({directRooms.length})
                </span>
              </div>

              {directRooms.length === 0 ? (
                <div className="p-4 text-center rounded-2xl bg-slate-900/40 border border-slate-800/60 text-xs text-slate-500 space-y-2">
                  <p>No 1:1 direct conversations yet.</p>
                  <button
                    onClick={() => setShowSearchModal(true)}
                    className="text-[11px] text-indigo-400 hover:underline font-semibold"
                  >
                    Find a classmate or professor →
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {directRooms.map((room) => {
                    const isActive = activeRoomId === room._id;
                    const participant = room.participant;
                    return (
                      <div
                        key={room._id}
                        onClick={() => handleSelectRoom(room)}
                        className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
                          isActive
                            ? 'bg-slate-800 border-indigo-500/50 shadow-md'
                            : 'bg-slate-900/40 border-slate-800/60 hover:bg-slate-900 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-indigo-300 flex-shrink-0">
                              {participant?.name?.charAt(0) || 'U'}
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-semibold text-white truncate block">
                                {participant?.name || room.name}
                              </span>
                              <span className="text-[10px] text-slate-400 truncate block">
                                {room.lastMessageText || 'Start chatting...'}
                              </span>
                            </div>
                          </div>
                          {participant?.role && getRoleBadge(participant.role)}
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
        {/* RIGHT MAIN CHAT WINDOW                                                    */}
        {/* ========================================================================= */}
        <div className="flex-1 flex flex-col bg-slate-900/90 h-full overflow-hidden">
          {/* Active Room Top Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
            <div className="flex items-center gap-3">
              {/* Mobile Sidebar Toggle */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white tracking-tight">
                    {activeRoom?.title || activeRoom?.name || 'Select a Chat Room'}
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
                    ? `Live group communication for course members • Section ${activeRoom.section || 'A'}`
                    : 'End-to-end direct message session'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isConnected ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-red-400'
                }`}
                title={isConnected ? 'Live Socket Connected' : 'Reconnecting...'}
              />
              <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                {isConnected ? 'Real-Time Active' : 'Connecting...'}
              </span>
            </div>
          </div>

          {/* Messages Feed Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
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
                    Be the first to post notes, ask questions, or start the conversation!
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

                return (
                  <div
                    key={msg._id}
                    className={`flex items-start gap-3 max-w-2xl ${isOwn ? 'ml-auto flex-row-reverse' : ''}`}
                  >
                    {/* User Avatar */}
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold font-mono flex-shrink-0 shadow-sm ${
                        isOwn
                          ? 'bg-indigo-600 text-white'
                          : senderRole === 'lecturer'
                          ? 'bg-purple-600 text-white'
                          : senderRole === 'cr'
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-800 text-slate-200 border border-slate-700'
                      }`}
                    >
                      {senderName.charAt(0)}
                    </div>

                    {/* Message Bubble Container */}
                    <div className={`space-y-1 ${isOwn ? 'text-right' : 'text-left'}`}>
                      {/* Sender Meta Info */}
                      <div className={`flex items-center gap-2 text-[11px] ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        <span className="font-semibold text-slate-300">{isOwn ? 'You' : senderName}</span>
                        {!isOwn && getRoleBadge(senderRole)}
                        <span className="text-[10px] font-mono text-slate-500">{formattedTime}</span>
                      </div>

                      {/* Bubble Content */}
                      <div
                        className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-md ${
                          isOwn
                            ? 'bg-indigo-600 text-white rounded-tr-none'
                            : 'bg-slate-950 border border-slate-800/80 text-slate-200 rounded-tl-none'
                        }`}
                      >
                        {msg.content && <p className="whitespace-pre-wrap break-words">{msg.content}</p>}

                        {/* File Attachment Card (if present) */}
                        {msg.attachmentUrl && (
                          <div className="mt-2.5 pt-2 border-t border-white/15 flex items-center justify-between gap-3 bg-black/20 p-2.5 rounded-xl">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="p-1.5 rounded-lg bg-white/10 text-xs">📄</span>
                              <div className="min-w-0 text-left">
                                <span className="font-semibold text-xs truncate block">
                                  {msg.attachmentName || 'Shared Document'}
                                </span>
                                <span className="text-[10px] opacity-75 font-mono uppercase">
                                  {msg.attachmentType || 'File'}
                                </span>
                              </div>
                            </div>

                            <a
                              href={msg.attachmentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1 bg-white text-slate-950 font-bold text-xs rounded-lg hover:bg-slate-200 transition-all flex-shrink-0"
                            >
                              Open / Download
                            </a>
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

          {/* Pending Attachment Preview Strip */}
          {attachment && (
            <div className="px-4 py-2 bg-indigo-950/80 border-t border-indigo-500/30 flex items-center justify-between text-xs text-indigo-200">
              <div className="flex items-center gap-2">
                <span>📎 Ready to attach:</span>
                <strong className="text-white">{attachment.name}</strong>
              </div>
              <button
                onClick={() => setAttachment(null)}
                className="text-indigo-400 hover:text-white text-xs font-semibold"
              >
                Remove ✕
              </button>
            </div>
          )}

          {/* Chat Message Input Bar */}
          <form onSubmit={handleSendMessage} className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950/60">
            <div className="flex items-center gap-2">
              {/* Attachment Button */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".pdf,.docx,.doc,.pptx,.ppt,.jpg,.jpeg,.png,.webp,.txt"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFile}
                className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all cursor-pointer disabled:opacity-50"
                title="Attach Document or Image (Max 20MB)"
              >
                {uploadingFile ? (
                  <div className="w-5 h-5 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                )}
              </button>

              {/* Text Input */}
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type a message... (Press Enter to send)"
                className="flex-1 px-4 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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

      {/* ========================================================================= */}
      {/* "NEW DIRECT MESSAGE" USER SEARCH MODAL                                    */}
      {/* ========================================================================= */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Start a Direct Message</h3>
                <p className="text-xs text-slate-400">Search students, CRs, or faculty across campus</p>
              </div>
              <button
                onClick={() => setShowSearchModal(false)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type a classmate or professor's name..."
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <svg className="w-4 h-4 absolute left-3 top-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Results Feed */}
            <div className="max-h-60 overflow-y-auto space-y-1.5">
              {searching ? (
                <div className="p-4 text-center text-xs text-slate-500">Searching campus directory...</div>
              ) : searchResults.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  {searchQuery ? 'No members found matching that name.' : 'Type a name above to find members.'}
                </div>
              ) : (
                searchResults.map((u) => (
                  <div
                    key={u._id}
                    onClick={() => handleStartDM(u._id)}
                    className="p-3 bg-slate-950/70 hover:bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-3 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 font-bold text-xs flex items-center justify-center flex-shrink-0">
                        {u.name?.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-white group-hover:text-indigo-300 block truncate">
                          {u.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono block">
                          {u.courseCode || 'Campus'} • Section {u.section || 'A'}
                        </span>
                      </div>
                    </div>
                    {getRoleBadge(u.role)}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
