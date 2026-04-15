import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  User,
  Clock,
  Video,
  Mic,
  MessageSquare,
  MapPin,
  DollarSign,
  CheckCircle,
  Lock,
  ChevronRight,
  ShieldCheck,
  Zap,
  Sparkles,
  Loader2,
  Calendar,
  Settings,
  MoreVertical,
  Plus
} from 'lucide-react';
import { docConnectApi } from '../../services/api';

const SOCKET_URL = 'http://localhost:5001';

const Messages = () => {
  const { chatId: routeChatId } = useParams();
  const navigate = useNavigate();
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [negotiation, setNegotiation] = useState(null);
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [showNegotiationForm, setShowNegotiationForm] = useState(false);
  const [negForm, setNegForm] = useState({
    price: '',
    consultation_time: '',
    consultation_mode: 'video'
  });

  const messagesEndRef = useRef(null);

  // Initialize Socket
  useEffect(() => {
    const s = io(SOCKET_URL);
    setSocket(s);

    const userData = localStorage.getItem('user');
    if (userData) {
      setCurrentUserId(JSON.parse(userData).id || JSON.parse(userData)._id);
    }

    return () => s.disconnect();
  }, []);

  // Fetch all chats
  useEffect(() => {
    const fetchChats = async () => {
      try {
        const res = await docConnectApi.getChats();
        setChats(res.data);
        if (routeChatId) {
          const current = res.data.find(c => c._id === routeChatId);
          if (current) setActiveChat(current);
        }
      } catch (err) {
        console.error('Failed to fetch chats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchChats();
  }, [routeChatId]);

  // Handle Socket Events & Active Chat Change
  useEffect(() => {
    if (!activeChat || !socket) return;

    socket.emit('join_chat', activeChat._id);
    fetchMessages(activeChat._id);
    fetchNegotiation(activeChat._id);

    const handleNewMessage = (msg) => {
      if (msg.chatId === activeChat._id || msg.chat_id === activeChat._id) {
        setMessages(prev => {
          if (prev.find(m => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
      }
    };

    const handleNegotiationUpdate = (data) => {
      if (data.chatId === activeChat._id) {
        setNegotiation(data.negotiation);
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('negotiation_updated', handleNegotiationUpdate);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('negotiation_updated', handleNegotiationUpdate);
    };
  }, [activeChat, socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async (chatId) => {
    setMessagesLoading(true);
    try {
      const res = await docConnectApi.getMessages(chatId);
      setMessages(res.data);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setMessagesLoading(false);
    }
  };

  const fetchNegotiation = async (chatId) => {
    try {
      const res = await docConnectApi.getNegotiation(chatId);
      setNegotiation(res.data);
    } catch (err) {
      console.error('No negotiation found for this chat');
      setNegotiation(null);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat) return;

    const messageData = {
      chatId: activeChat._id,
      content: newMessage,
      senderId: currentUserId
    };

    try {
      const res = await docConnectApi.sendMessage(activeChat._id, newMessage);
      setMessages(prev => {
        if (prev.find(m => m._id === res.data._id)) return prev;
        return [...prev, res.data];
      });
      setNewMessage('');
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const updateNegotiation = async (status) => {
    try {
      let res;
      if (status === 'accepted_by_user') {
        res = await docConnectApi.acceptNegotiation(negotiation._id);
      }
      if (res && res.data) {
        setNegotiation(res.data);
        socket.emit('negotiation_updated', { chatId: activeChat._id, negotiation: res.data });
      }
    } catch (err) {
      console.error('Failed to update negotiation:', err);
    }
  };

  const handleStartNegotiation = async () => {
    if (!negForm.price || !negForm.consultation_time) return;
    try {
      const isUser1Me = activeChat.user1_id?._id === currentUserId || activeChat.user1_id === currentUserId;
      const drId = isUser1Me ? activeChat.user2_id?._id || activeChat.user2_id : activeChat.user1_id?._id || activeChat.user1_id;
      const res = await docConnectApi.startNegotiation(activeChat._id, {
        doctor_id: drId,
        user_id: currentUserId,
        ...negForm
      });
      setNegotiation(res.data);
      setShowNegotiationForm(false);
      socket.emit('negotiation_updated', { chatId: activeChat._id, negotiation: res.data });
    } catch (err) {
      console.error(err);
    }
  };

  const handleCounter = async () => {
    if (!negForm.price || !negForm.consultation_time) return;
    try {
      const res = await docConnectApi.counterNegotiation(negotiation._id, negForm);
      setNegotiation(res.data);
      setShowNegotiationForm(false);
      socket.emit('negotiation_updated', { chatId: activeChat._id, negotiation: res.data });
    } catch (err) {
      console.error(err);
    }
  };

  const getOtherUser = (chat) => {
    if (!chat || !currentUserId) return null;
    const u1_id = chat.user1_id?._id || chat.user1_id;
    return String(u1_id) === String(currentUserId) ? chat.user2_id : chat.user1_id;
  };

  // State for Attachment Menu
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);

  // Negotiation Bar UI
  const NegotiationBar = () => {
    if (!negotiation) {
      return null;
    }

    const statusConfig = {
      active: { color: 'bg-emerald-500', label: 'Active Synthesis' },
      countered: { color: 'bg-amber-500', label: 'Counter Proposal' },
      accepted_by_doctor: { color: 'bg-ayur-forest', label: 'Doctor Approved' },
      accepted_by_user: { color: 'bg-emerald-600', label: 'User Authorized' },
      locked: { color: 'bg-ayur-deep-green', label: 'Protocol Locked' }
    };

    const currentStatus = statusConfig[negotiation.status] || statusConfig.active;

    return (
      <div className="w-[320px] bg-white border-l border-ayur-sage/5 flex flex-col p-8 h-full shrink-0 z-20 shadow-2xl">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-ayur-sage/5">
          <h4 className="text-[10px] font-black tracking-[0.2em] text-ayur-sage uppercase">Session Protocol</h4>
          <Lock size={12} className="text-ayur-sage/40" />
        </div>

        <div className="flex flex-col items-center mb-10 space-y-4">
          <div className={`h-20 w-20 rounded-[32px] ${currentStatus.color} flex items-center justify-center text-white shadow-2xl shadow-ayur-forest/20 mb-2 relative group`}>
            <div className="absolute inset-0 bg-white/20 rounded-[32px] scale-0 group-hover:scale-100 transition-transform duration-500" />
            <DollarSign size={32} strokeWidth={2.5} className="relative z-10" />
          </div>

          <div className="text-center">
            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black tracking-widest uppercase text-white ${currentStatus.color} shadow-lg shadow-current/20`}>
              {currentStatus.label}
            </span>
            <div className="mt-4 flex items-baseline justify-center gap-1">
              <span className="text-sm font-bold text-ayur-sage">₹</span>
              <span className="text-5xl font-black text-ayur-forest tracking-tighter">{negotiation.price}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4 flex-1">
          <div className="bg-ayur-sage-light/30 p-5 rounded-[28px] border border-ayur-sage/5 flex items-center gap-4 transition-all hover:bg-ayur-sage-light/50">
            <div className="h-10 w-10 rounded-2xl bg-white flex items-center justify-center text-emerald-500 shadow-sm">
              <Calendar size={18} />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[9px] font-black tracking-widest text-ayur-sage uppercase">Sync Date</span>
              <span className="text-[13px] font-black text-ayur-forest leading-tight mt-0.5">
                {new Date(negotiation.consultation_time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
            </div>
          </div>

          <div className="bg-ayur-sage-light/30 p-5 rounded-[28px] border border-ayur-sage/5 flex items-center gap-4 transition-all hover:bg-ayur-sage-light/50">
            <div className="h-10 w-10 rounded-2xl bg-white flex items-center justify-center text-ayur-sage shadow-sm">
              {negotiation.consultation_mode === 'video' ? <Video size={18} /> : <MessageSquare size={18} />}
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[9px] font-black tracking-widest text-ayur-sage uppercase">Sync Mode</span>
              <span className="text-[13px] font-black text-ayur-forest leading-tight mt-0.5 capitalize">
                {negotiation.consultation_mode} Link
              </span>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-ayur-sage/5 flex flex-col gap-4 mt-6">
          {negotiation.status !== 'locked' && (
            <>
              <button
                onClick={() => updateNegotiation('accepted_by_user')}
                className="w-full h-16 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[11px] font-black tracking-widest uppercase transition-all shadow-xl shadow-emerald-600/20 active:scale-95 flex items-center justify-center gap-3"
              >
                <CheckCircle size={16} /> Authorize protocol
              </button>
              <button
                onClick={() => {
                  setNegForm({
                    price: negotiation.price,
                    consultation_time: negotiation.consultation_time,
                    consultation_mode: negotiation.consultation_mode || 'video'
                  });
                  setShowNegotiationForm(true);
                }}
                className="w-full h-16 bg-ayur-forest hover:bg-ayur-forest/90 text-white rounded-2xl text-[11px] font-black tracking-widest uppercase transition-all shadow-xl shadow-ayur-forest/20 active:scale-95"
              >
                Modify Terms
              </button>
            </>
          )}
          {negotiation.status === 'locked' && (
            <div className="h-16 w-full flex justify-center items-center gap-3 bg-ayur-sage-light/50 text-ayur-sage rounded-2xl text-[11px] font-black tracking-widest uppercase border-2 border-dashed border-ayur-sage/20">
              <Lock size={16} /> Connection Secure
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full bg-ayur-soft-mint overflow-hidden relative font-sans">
      {/* CHAT LIST (Registry) */}
      <div className="w-96 border-r border-ayur-sage/10 flex flex-col h-full bg-white/80 backdrop-blur-md z-30">
        <div className="p-8 pb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-black text-ayur-forest tracking-tighter">Registry</h2>
            <div className="h-8 w-8 rounded-full bg-ayur-sage-light flex items-center justify-center">
              <Settings size={16} className="text-ayur-sage" />
            </div>
          </div>
          <p className="text-[10px] font-bold tracking-widest text-ayur-sage/60 uppercase mb-6">Clinical Communications Protocol</p>

          <div className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-ayur-sage/40 group-focus-within:text-ayur-sage transition-colors">
              <Plus size={18} className="rotate-45" />
            </div>
            <input
              type="text"
              placeholder="Search manifest..."
              className="w-full bg-ayur-sage-light/50 border border-transparent focus:border-ayur-sage/20 focus:bg-white rounded-2xl py-3 pl-12 pr-4 text-sm font-bold text-ayur-forest placeholder:text-ayur-sage/30 transition-all outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-10 custom-scrollbar">
          {chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <div className="h-12 w-12 rounded-2xl bg-ayur-sage-light flex items-center justify-center mb-4">
                <Loader2 size={24} className="text-ayur-sage/40 animate-spin" />
              </div>
              <p className="text-xs font-bold text-ayur-sage/40 uppercase tracking-widest">Scanning channels...</p>
            </div>
          ) : (
            chats.map(chat => {
              const otherUser = getOtherUser(chat);
              const isActive = activeChat?._id === chat._id;
              return (
                <button
                  key={chat._id}
                  onClick={() => {
                    setActiveChat(chat);
                    navigate(`/messages/${chat._id}`);
                  }}
                  className={`w-full p-4 transition-all duration-500 rounded-[24px] text-left relative group ${isActive
                    ? 'bg-ayur-forest text-white shadow-2xl shadow-ayur-forest/20'
                    : 'bg-transparent hover:bg-ayur-sage-light/50'
                    }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform duration-500 group-hover:scale-105 ${isActive ? 'bg-white/10' : 'bg-ayur-forest text-white'
                      }`}>
                      {otherUser?.avatar ? (
                        <img src={otherUser.avatar} alt="" className="h-full w-full object-cover rounded-2xl" />
                      ) : (
                        <User className={`h-6 w-6 ${isActive ? 'text-white' : 'text-white'}`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className={`text-base font-black truncate tracking-tight transition-colors ${isActive ? 'text-white' : 'text-ayur-forest'
                          }`}>
                          {otherUser?.name || 'Practitioner'}
                        </h4>
                        <span className={`text-[10px] font-bold ${isActive ? 'text-white/40' : 'text-ayur-sage/40'}`}>
                          12:45
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-ayur-sage/30'}`} />
                        <p className={`text-[11px] font-bold truncate tracking-tight ${isActive ? 'text-white/60' : 'text-ayur-sage/60'
                          }`}>
                          Connected via Secure Link
                        </p>
                      </div>
                    </div>
                  </div>
                  {isActive && (
                    <motion.div
                      layoutId="active-pill"
                      className="absolute right-4 top-1/2 -translate-y-1/2"
                    >
                      <ChevronRight size={16} className="text-white/40" />
                    </motion.div>
                  )}
                </button>
              );
            })
          )}
        </div>

        <div className="p-6 border-t border-ayur-sage/5">
          <div className="bg-ayur-forest p-4 rounded-3xl flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
              <ShieldCheck size={20} />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Session Type</p>
              <p className="text-xs font-bold text-white">Encrypted Terminal</p>
            </div>
          </div>
        </div>
      </div>

      {/* CHAT MAIN AREA */}
      <div className="flex-1 flex flex-col h-full bg-white relative">
        {activeChat ? (
          <div className="flex-1 flex flex-col h-full relative">
            {/* CHAT HEADER */}
            <header className="h-24 bg-white/80 backdrop-blur-md border-b border-ayur-sage/5 flex items-center justify-between px-10 z-20 shrink-0">
              <div className="flex items-center gap-5">
                <div className="h-12 w-12 rounded-2xl bg-ayur-forest flex items-center justify-center shadow-lg shadow-ayur-forest/10 overflow-hidden">
                  {getOtherUser(activeChat)?.avatar ? (
                    <img src={getOtherUser(activeChat).avatar} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <User className="text-white h-6 w-6" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="text-lg font-black text-ayur-forest tracking-tight">
                      {getOtherUser(activeChat)?.name || 'Practitioner'}
                    </h3>
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <p className="text-[10px] font-bold text-ayur-sage/60 uppercase tracking-widest flex items-center gap-2">
                    <Lock size={10} /> End-to-End Encrypted
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button className="h-12 w-12 rounded-2xl bg-ayur-sage-light hover:bg-ayur-sage/10 text-ayur-sage flex items-center justify-center transition-all active:scale-90">
                  <Video size={18} />
                </button>
                <button className="h-12 w-12 rounded-2xl bg-ayur-sage-light hover:bg-ayur-sage/10 text-ayur-sage flex items-center justify-center transition-all active:scale-90">
                  <Plus size={18} />
                </button>
                <button className="h-12 w-12 rounded-2xl bg-ayur-forest text-white flex items-center justify-center shadow-xl shadow-ayur-forest/20 ml-2 transition-all active:scale-90 hover:rotate-3">
                  <MoreVertical size={18} />
                </button>
              </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
              <div className="flex-1 flex flex-col relative h-full bg-ayur-soft-mint/30 z-10 w-full overflow-hidden">
                {/* MESSAGES */}
                <div className="flex-1 overflow-y-auto px-10 pt-8 pb-32 flex flex-col space-y-6 custom-scrollbar relative">
                  {messagesLoading ? (
                    <div className="h-full flex items-center justify-center">
                      <Loader2 className="h-10 w-10 text-ayur-sage animate-spin" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                      <Sparkles size={48} className="text-ayur-sage mb-4" />
                      <p className="text-sm font-bold text-ayur-forest uppercase tracking-widest">No transmissions found</p>
                      <p className="text-xs text-ayur-sage mt-2">Start the consultation by sending a message</p>
                    </div>
                  ) : (
                    <>
                      {messages.map((msg, i) => {
                        const isMe = msg.sender_id === currentUserId || msg.senderId === currentUserId;
                        const isGrouped = i > 0 && messages[i - 1].sender_id === msg.sender_id;

                        return (
                          <motion.div
                            key={msg._id || i}
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${isGrouped ? 'mt-1' : 'mt-4'}`}
                          >
                            <div className={`max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                              <div className={`px-5 py-3.5 shadow-sm relative group ${isMe
                                ? 'bg-ayur-forest text-white rounded-[24px] rounded-br-[4px]'
                                : 'bg-white text-ayur-forest rounded-[24px] rounded-bl-[4px] border border-ayur-sage/5'
                                }`}>
                                <p className="text-[14px] font-medium leading-relaxed">
                                  {msg.message_text || msg.content || msg.text || msg.message}
                                </p>
                                <div className={`text-[9px] font-bold mt-2 flex items-center gap-1.5 ${isMe ? 'text-white/40' : 'text-ayur-sage/40'}`}>
                                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  {isMe && <CheckCircle size={10} className="text-emerald-400" />}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* INPUT SECTION */}
                <div className="absolute bottom-0 left-0 right-0 p-8 pt-0 pointer-events-none">
                  <div className="max-w-4xl mx-auto pointer-events-auto">
                    <form
                      onSubmit={handleSendMessage}
                      className="flex items-center gap-4 bg-white/80 backdrop-blur-xl border border-ayur-sage/10 p-2.5 rounded-[32px] shadow-2xl shadow-ayur-forest/10"
                    >
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                          className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 ${showAttachmentMenu
                            ? 'bg-ayur-forest text-white rotate-45'
                            : 'bg-ayur-sage-light text-ayur-sage hover:bg-ayur-sage/20'
                            }`}
                        >
                          <Plus size={24} />
                        </button>

                        <AnimatePresence>
                          {showAttachmentMenu && (
                            <motion.div
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.95 }}
                              className="absolute bottom-full left-0 mb-6 bg-ayur-forest border border-white/10 shadow-2xl rounded-[32px] p-2.5 w-64 z-50 overflow-hidden"
                            >
                              <button
                                type="button"
                                onClick={() => setShowAttachmentMenu(false)}
                                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/10 rounded-[20px] transition-all text-sm font-bold tracking-tight text-white group"
                              >
                                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                  <ShieldCheck size={18} className="text-emerald-400" />
                                </div>
                                Clinical Report
                              </button>

                              {!negotiation && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowAttachmentMenu(false);
                                    setNegForm({ price: '', consultation_time: '', consultation_mode: 'video' });
                                    setShowNegotiationForm(true);
                                  }}
                                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/10 rounded-[20px] transition-all text-sm font-bold tracking-tight text-white mt-1 group"
                                >
                                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Zap size={18} className="text-amber-400" />
                                  </div>
                                  Protocol Prep
                                </button>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Synthesize message..."
                        className="flex-1 bg-transparent border-none py-4 px-4 text-sm font-bold text-ayur-forest placeholder:text-ayur-sage/40 outline-none"
                      />

                      <button
                        type="submit"
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 ${newMessage.trim()
                          ? 'bg-ayur-forest text-white shadow-xl shadow-ayur-forest/20 hover:scale-105'
                          : 'bg-ayur-sage-light text-ayur-sage/30 pointer-events-none'
                          }`}
                      >
                        <Send size={22} fill={newMessage.trim() ? "currentColor" : "none"} className={newMessage.trim() ? 'translate-x-0.5 -translate-y-0.5' : ''} />
                      </button>
                    </form>
                  </div>
                </div>
              </div>

              {/* VERTICAL NEGOTIATION RIGHT BAR */}
              <AnimatePresence>
                {negotiation && (
                  <motion.div
                    initial={{ x: 320 }}
                    animate={{ x: 0 }}
                    exit={{ x: 320 }}
                    transition={{ type: 'spring', damping: 20 }}
                    className="z-20 h-full"
                  >
                    <NegotiationBar />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-20 bg-ayur-soft-mint/20 relative overflow-hidden">
            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-ayur-sage/5 rounded-full blur-3xl -mr-48 -mt-48" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-ayur-sage/5 rounded-full blur-3xl -ml-48 -mb-48" />

            <div className="relative z-10 flex flex-col items-center">
              <div className="h-32 w-32 bg-white rounded-[48px] flex items-center justify-center mb-10 shadow-2xl shadow-ayur-forest/5 group hover:rotate-6 transition-transform duration-700">
                <div className="h-20 w-20 bg-ayur-forest rounded-[32px] flex items-center justify-center shadow-inner">
                  <Sparkles size={40} className="text-white" />
                </div>
              </div>
              <h3 className="text-5xl font-black text-ayur-forest tracking-tighter mb-6">
                Ayur<span className="text-ayur-sage">Care</span> AI
              </h3>
              <div className="h-1 w-20 bg-ayur-sage/20 rounded-full mb-8" />
              <p className="text-ayur-sage/60 max-w-sm font-bold text-sm tracking-tight leading-relaxed uppercase">
                Secure Clinical Bridge <br />
                <span className="text-[10px] mt-1 block font-bold text-ayur-forest/40">Select a manifest entry to begin bidirectional transmission</span>
              </p>

              <div className="mt-12 flex items-center gap-3 px-6 py-3 bg-white/50 backdrop-blur-md rounded-2xl border border-ayur-sage/10">
                <ShieldCheck size={16} className="text-emerald-500" />
                <span className="text-[10px] font-black text-ayur-forest/60 uppercase tracking-widest">Quantum Encryption Active</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showNegotiationForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 md:p-10">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNegotiationForm(false)}
              className="absolute inset-0 bg-ayur-forest/80 backdrop-blur-2xl"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 40 }}
              className="relative w-full max-w-[540px] bg-white rounded-[48px] overflow-hidden shadow-2xl"
            >
              <div className="h-2 bg-gradient-to-r from-ayur-sage to-emerald-500 w-full" />

              <div className="p-10 md:p-14">
                <div className="flex items-center justify-between mb-12">
                  <div className="space-y-1">
                    <h3 className="text-3xl font-black text-ayur-forest tracking-tighter leading-none">
                      Protocol <span className="text-ayur-sage">Synthesis</span>
                    </h3>
                    <p className="text-[10px] font-bold tracking-widest text-ayur-sage uppercase">Negotiation Framework v1.0</p>
                  </div>
                  <button
                    onClick={() => setShowNegotiationForm(false)}
                    className="w-12 h-12 bg-ayur-sage-light text-ayur-sage rounded-2xl flex items-center justify-center hover:bg-ayur-sage/20 transition-all active:scale-90"
                  >
                    <Plus size={24} className="rotate-45" />
                  </button>
                </div>

                <div className="space-y-10">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black tracking-widest text-ayur-sage uppercase pl-2">Professional Remuneration (INR)</label>
                    <div className="relative group">
                      <div className="absolute left-7 top-1/2 -translate-y-1/2 text-ayur-sage group-focus-within:text-ayur-forest transition-colors">
                        <DollarSign size={24} />
                      </div>
                      <input
                        type="number"
                        value={negForm.price}
                        onChange={(e) => setNegForm({ ...negForm, price: e.target.value })}
                        placeholder="0.00"
                        className="w-full pl-16 pr-8 py-7 bg-ayur-sage-light/50 border-2 border-transparent focus:border-ayur-forest focus:bg-white rounded-[28px] outline-none text-2xl font-black transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black tracking-widest text-ayur-sage uppercase pl-2">Temporal Synchronization</label>
                    <div className="relative group">
                      <div className="absolute left-7 top-1/2 -translate-y-1/2 text-ayur-sage group-focus-within:text-ayur-forest transition-colors">
                        <Clock size={24} />
                      </div>
                      <input
                        type="datetime-local"
                        value={negForm.consultation_time}
                        onChange={(e) => setNegForm({ ...negForm, consultation_time: e.target.value })}
                        className="w-full pl-16 pr-8 py-7 bg-ayur-sage-light/50 border-2 border-transparent focus:border-ayur-forest focus:bg-white rounded-[28px] outline-none font-bold text-sm transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black tracking-widest text-ayur-sage uppercase pl-2">Transmission Modality</label>
                    <div className="grid grid-cols-2 gap-4">
                      {['video', 'chat'].map(m => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setNegForm({ ...negForm, consultation_mode: m })}
                          className={`flex items-center justify-center gap-3 py-6 rounded-2xl border-2 font-black tracking-widest uppercase text-[11px] transition-all ${negForm.consultation_mode === m
                            ? 'bg-ayur-forest border-ayur-forest text-white shadow-xl shadow-ayur-forest/20 scale-[1.02]'
                            : 'bg-ayur-sage-light/50 border-transparent text-ayur-sage hover:border-ayur-sage/20'
                            }`}
                        >
                          {m === 'video' ? <Video size={16} /> : <MessageSquare size={16} />}
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-14">
                  <button
                    onClick={negotiation ? handleCounter : handleStartNegotiation}
                    className="w-full bg-ayur-forest text-white py-8 rounded-3xl font-black tracking-widest uppercase text-xs shadow-2xl shadow-ayur-forest/30 hover:bg-ayur-forest/90 active:scale-[0.98] transition-all flex items-center justify-center gap-4 group"
                  >
                    <span>{negotiation ? 'Issue Counter Proposal' : 'Initiate Deal Synthesis'}</span>
                    <ChevronRight size={18} className="group-hover:translate-x-2 transition-transform" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Messages;
