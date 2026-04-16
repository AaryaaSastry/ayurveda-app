import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  MoreVertical,
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
  Plus,
  Search,
  Filter,
  ShieldCheck,
  RefreshCcw,
  Sparkles,
  Loader2,
  Calendar,
  Settings,
  X,
  CreditCard,
  Stethoscope,
  Activity,
  Trash2
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
  const [currentUserId, setCurrentUserId] = useState(null);
  const [hiddenChats, setHiddenChats] = useState([]);
  const [showNegotiationForm, setShowNegotiationForm] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);

  const [negForm, setNegForm] = useState({
    price: '',
    consultation_time: '',
    consultation_mode: 'video'
  });

  const messagesEndRef = useRef(null);

  useEffect(() => {
    const s = io(SOCKET_URL);
    setSocket(s);
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsed = JSON.parse(userData);
      const uid = parsed.id || parsed._id;
      setCurrentUserId(uid);
      
      // Load hidden chats from localStorage
      const storedHidden = localStorage.getItem(`hidden_chats_${uid}`);
      if (storedHidden) setHiddenChats(JSON.parse(storedHidden));
    }
    return () => s.disconnect();
  }, []);

  const hideChat = (chatId, e) => {
    e.stopPropagation();
    const updatedHidden = [...hiddenChats, chatId];
    setHiddenChats(updatedHidden);
    localStorage.setItem(`hidden_chats_${currentUserId}`, JSON.stringify(updatedHidden));
    if (activeChat?._id === chatId) {
      setActiveChat(null);
      navigate('/messages');
    }
  };

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

  useEffect(() => { fetchChats(); }, [routeChatId]);

  useEffect(() => {
    if (!activeChat || !socket) return;
    socket.emit('join_chat', activeChat._id);
    
    const handleNewMessage = (msg) => {
      if (msg.chatId === activeChat._id || msg.chat_id === activeChat._id) {
        setMessages(prev => (prev.find(m => m._id === msg._id) ? prev : [...prev, msg]));
      }
    };
    
    const handleNegotiationUpdate = (data) => {
      if (data.chatId === activeChat._id) setNegotiation(data.negotiation);
    };
    
    socket.on('new_message', handleNewMessage);
    socket.on('negotiation_updated', handleNegotiationUpdate);
    
    const loadData = async () => {
      try {
        console.log('Active Chat Data:', activeChat);
        const mRes = await docConnectApi.getMessages(activeChat._id);
        setMessages(mRes.data);
        const nRes = await docConnectApi.getNegotiation(activeChat._id);
        setNegotiation(nRes.data);
      } catch {
        setNegotiation(null);
      }
    };
    loadData();
    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('negotiation_updated', handleNegotiationUpdate);
    };
  }, [activeChat?._id, socket]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, negotiation]);

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!newMessage.trim() || !activeChat) return;
    try {
      await docConnectApi.sendMessage(activeChat._id, newMessage);
      setNewMessage('');
    } catch (err) { console.error('Error:', err); }
  };

  const handleAccept = async () => {
    try {
      const res = await docConnectApi.acceptNegotiation(negotiation._id);
      setNegotiation(res.data);
      socket?.emit('negotiation_updated', { chatId: activeChat._id, negotiation: res.data });
    } catch (err) { console.error(err); }
  };

  const handleStartNegotiation = async () => {
    if (!negForm.price || !negForm.consultation_time) return;
    try {
      const otherUser = getOtherUser(activeChat);
      const isUser1Me = (activeChat.user1_id?._id || activeChat.user1_id) === currentUserId;
      
      const res = await docConnectApi.startNegotiation(activeChat._id, {
        doctor_id: isUser1Me ? (activeChat.user2_id?._id || activeChat.user2_id) : currentUserId,
        user_id: isUser1Me ? currentUserId : (activeChat.user2_id?._id || activeChat.user2_id),
        ...negForm
      });
      setNegotiation(res.data);
      setShowNegotiationForm(false);
      socket?.emit('negotiation_updated', { chatId: activeChat._id, negotiation: res.data });
    } catch (err) {
      console.error('Negotiation failed:', err);
    }
  };

  const handleUpdateNegotiation = async () => {
    if (!negForm.price || !negForm.consultation_time) return;
    try {
      const res = await docConnectApi.updateNegotiation(negotiation._id, {
        ...negForm,
        status: 'pending' 
      });
      setNegotiation(res.data);
      setShowNegotiationForm(false);
      socket?.emit('negotiation_updated', { chatId: activeChat._id, negotiation: res.data });
    } catch (err) {
      console.error('Negotiation update failed:', err);
    }
  };

  const handleProtocolAction = () => {
    if (negotiation) {
      handleUpdateNegotiation();
    } else {
      handleStartNegotiation();
    }
  };

  const getOtherUser = (chat) => {
    if (!chat || !currentUserId) return null;
    
    // Normalize IDs to strings for comparison
    const u1Id = String(chat.user1_id?._id || chat.user1_id);
    const u2Id = String(chat.user2_id?._id || chat.user2_id);
    const myId = String(currentUserId);
    
    const isMeU1 = u1Id === myId;
    const other = isMeU1 ? chat.user2_id : chat.user1_id;
    
    // Debug log to specifically check why names aren't showing
    if (activeChat?._id === chat._id) {
      console.log('--- USER IDENTITY RESOLUTION ---');
      console.log('My ID:', myId);
      console.log('Other User ID:', isMeU1 ? u2Id : u1Id);
      console.log('Other User Object:', other);
    }
    
    return other;
  };

  if (loading) return null;

  return (
    <div className="h-[calc(100vh-100px)] w-full flex bg-[#F9FBFA] font-sans selection:bg-emerald-100">
      
      {/* 1. LEFT PANEL: SESSION MANIFEST */}
      <div className="w-[380px] flex flex-col border-r border-emerald-900/5 bg-white relative z-20">
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-[#1A2E26] tracking-tight italic">Manifest</h2>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black text-emerald-800/40 uppercase tracking-[.2em]">Live Clinical Mesh</span>
              </div>
            </div>
            <button onClick={fetchChats} className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl hover:rotate-180 transition-all duration-700">
              <RefreshCcw size={18} strokeWidth={2.5} />
            </button>
          </div>

          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-800/20 group-focus-within:text-emerald-600 transition-colors" size={18} />
            <input 
              placeholder="Search Clinical Node..." 
              className="w-full h-12 pl-12 pr-4 bg-emerald-50/50 border-none rounded-2xl text-[13px] font-bold text-emerald-950 placeholder:text-emerald-800/20 focus:ring-2 ring-emerald-100 transition-all outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 space-y-2 custom-scrollbar">
          {chats.filter(c => !hiddenChats.includes(c._id)).map(chat => {
            const dr = getOtherUser(chat);
            const active = activeChat?._id === chat._id;
            return (
              <div 
                key={chat._id}
                onClick={() => { setActiveChat(chat); navigate(`/messages/${chat._id}`); }}
                className={`group p-4 rounded-[28px] cursor-pointer transition-all duration-500 relative ${
                  active ? 'bg-emerald-950 shadow-[0_20px_40px_rgba(6,78,59,0.15)]' : 'hover:bg-emerald-50/50'
                }`}
              >
                <button 
                  onClick={(e) => hideChat(chat._id, e)}
                  className={`absolute top-4 right-4 p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 ${
                    active ? 'text-rose-400 hover:text-rose-300 hover:bg-white/10' : 'text-rose-500/40 hover:text-rose-600 hover:bg-rose-50'
                  }`}
                  title="Archive Chat"
                >
                  <Trash2 size={16} strokeWidth={2.5} />
                </button>
                <div className="flex items-center gap-4">
                  <div className={`h-14 w-14 rounded-[22px] flex items-center justify-center text-lg font-black border-2 transition-transform duration-500 group-hover:scale-105 ${
                    active ? 'bg-white/10 border-white/10 text-white' : 'bg-white border-emerald-50 text-emerald-800/30'
                  }`}>
                    {dr?.name?.[0]?.toUpperCase() || 'D'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h4 className={`text-sm font-black uppercase tracking-tight truncate ${active ? 'text-white' : 'text-emerald-950'}`}>
                        {dr?.name || dr?.email?.split('@')[0] || 'Unknown Doctor'}
                      </h4>
                      <span className={`text-[9px] font-bold ${active ? 'text-white/40' : 'text-emerald-800/20'}`}>12:45 PM</span>
                    </div>
                    <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${active ? 'text-emerald-400' : 'text-emerald-700/40'}`}>
                      {active ? 'Synchronized' : 'Ready'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. CENTER PANEL: WORKSPACE */}
      <div className="flex-1 flex flex-col relative z-10 bg-[#F9FBFA]">
        {activeChat ? (
          <>
            {/* Clinical Header */}
            <div className="h-24 bg-white/80 backdrop-blur-md px-10 flex items-center justify-between border-b border-emerald-900/5 sticky top-0 z-30">
              <div className="flex items-center gap-5">
                <div className="h-12 w-12 rounded-2xl bg-emerald-950 flex items-center justify-center text-white shadow-xl">
                  <Stethoscope size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-emerald-950 uppercase tracking-tight">
                    {getOtherUser(activeChat)?.name || getOtherUser(activeChat)?.email?.split('@')[0] || 'Unknown Doctor'}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]" />
                    <span className="text-[9px] font-black text-emerald-800/40 uppercase tracking-[.2em]">Alpha-Node Link Established</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button className="h-12 w-12 rounded-2xl bg-white border border-emerald-50 text-emerald-800/40 hover:text-emerald-600 hover:bg-emerald-50 transition-all flex items-center justify-center shadow-sm active:scale-95">
                  <Video size={18} strokeWidth={2.5} />
                </button>
                <button className="h-12 w-12 rounded-2xl bg-emerald-950 text-white flex items-center justify-center shadow-lg shadow-emerald-950/20 active:scale-95 transition-all">
                  <CreditCard size={18} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* Log Stream (Messages) */}
            <div className="flex-1 overflow-y-auto px-10 py-8 flex flex-col gap-6 custom-scrollbar">
              {messages.map((msg, idx) => {
                const isMe = String(msg.senderId || msg.sender_id) === String(currentUserId);
                const isNeg = msg.message_type?.includes('negotiation') || msg.isNegotiation;

                if (isNeg && negotiation) {
                  return (
                    <div key={msg._id || idx} className="flex justify-center my-8">
                      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm bg-white rounded-[40px] border border-emerald-900/5 shadow-2xl shadow-emerald-900/10 overflow-hidden">
                        <div className="bg-emerald-950 h-2 w-full" />
                        <div className="p-8">
                          <div className="flex items-center justify-between mb-8">
                            <span className="text-[10px] font-black text-emerald-900/30 uppercase tracking-[.2em]">Clinical Protocol</span>
                            <div className="px-3 py-1 bg-emerald-50 rounded-full text-[9px] font-black text-emerald-700 uppercase">{negotiation.consultation_mode}</div>
                          </div>
                          
                          <div className="text-center mb-8">
                            <span className="text-[10px] text-emerald-800/40 uppercase font-black tracking-widest">Proposed Protocol Fee</span>
                            <div className="text-5xl font-black text-emerald-950 mt-2 tracking-tighter italic">₹{negotiation.price}</div>
                          </div>

                          <div className="flex flex-col gap-3 p-5 bg-emerald-50/50 rounded-3xl border border-emerald-100 mb-8 font-bold">
                            <div className="flex items-center gap-3 text-emerald-900/40 text-[10px] uppercase tracking-widest">
                              <Calendar size={14} /> Scheduled Sync Point
                            </div>
                            <div className="text-emerald-950 text-sm">{new Date(negotiation.consultation_time).toLocaleString()}</div>
                          </div>

                          {['pending', 'sent_by_doctor'].includes(negotiation.status) ? (
                            <div className="grid grid-cols-2 gap-3">
                              <button onClick={handleAccept} className="h-14 bg-emerald-950 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-emerald-900 transition-all shadow-xl shadow-emerald-950/20">Authorize</button>
                              <button onClick={() => setShowNegotiationForm(true)} className="h-14 border-2 border-emerald-100 text-emerald-800/40 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-emerald-50 transition-all">Counter</button>
                            </div>
                          ) : (
                            <div className="bg-emerald-500/10 text-emerald-600 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] text-center border border-emerald-500/20">
                              Protocol Synced
                            </div>
                          )}
                        </div>
                      </motion.div>
                    </div>
                  );
                }

                return (
                  <div key={msg._id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
                    <div className={`flex flex-col gap-2 ${isMe ? 'items-end' : 'items-start'} max-w-[70%]`}>
                      <div className={`px-6 py-4 text-sm font-medium transition-all shadow-sm ${
                        isMe 
                        ? 'bg-emerald-950 text-white rounded-[24px] rounded-tr-none' 
                        : 'bg-white border border-emerald-950/5 text-emerald-950 rounded-[24px] rounded-tl-none'
                      }`}>
                        {msg.content || msg.message_text}
                      </div>
                      <div className="flex items-center gap-2 px-2 opacity-0 group-hover:opacity-100 transition-all">
                        <span className="text-[9px] font-black text-emerald-800/20 uppercase tracking-widest">12:45 PM</span>
                        {isMe && <CheckCircle size={10} className="text-emerald-400" />}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Module */}
            <div className="p-8 bg-white border-t border-emerald-900/5">
              <div className="max-w-4xl mx-auto flex items-center gap-4 bg-emerald-50/50 p-2 rounded-[32px] border border-emerald-100/50 shadow-inner">
                <button 
                  onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                  className="h-14 w-14 bg-white rounded-[26px] flex items-center justify-center text-emerald-950 shadow-sm border border-emerald-100 hover:scale-105 active:scale-95 transition-all"
                >
                  <Plus size={24} strokeWidth={2.5} />
                </button>
                
                <AnimatePresence>
                  {showAttachmentMenu && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 20, scale: 0.95 }}
                      className="absolute bottom-24 left-0 w-80 bg-white rounded-[40px] shadow-[0_30px_90px_rgba(0,0,0,0.15)] border border-slate-100 p-4 z-50"
                    >
                      <div className="p-4 mb-2 border-b border-slate-50">
                        <p className="text-[10px] font-black text-emerald-800/40 uppercase tracking-[0.2em] opacity-40">Clinical Attachments</p>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        <button 
                          onClick={() => { setShowNegotiationForm(true); setShowAttachmentMenu(false); }}
                          className="w-full flex items-center gap-5 px-6 py-5 hover:bg-emerald-50 rounded-3xl transition-all group"
                        >
                          <div className="h-10 w-10 rounded-2xl bg-white flex items-center justify-center text-emerald-800/20 shadow-sm group-hover:text-emerald-950 group-hover:scale-110 transition-all">
                            <DollarSign size={20} />
                          </div>
                          <span className="text-xs font-black text-emerald-950 uppercase tracking-widest">{negotiation ? 'Counter Protocol' : 'Initiate Protocol'}</span>
                        </button>
                        <button className="w-full flex items-center gap-5 px-6 py-5 hover:bg-emerald-50 rounded-3xl transition-all group">
                          <div className="h-10 w-10 rounded-2xl bg-white flex items-center justify-center text-emerald-800/20 shadow-sm group-hover:text-emerald-950 group-hover:scale-110 transition-all">
                            <Calendar size={20} />
                          </div>
                          <span className="text-xs font-black text-emerald-950 uppercase tracking-widest">Propose Schedule</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <form className="flex-1 flex items-center relative" onSubmit={handleSendMessage}>
                  <input 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Input clinical data transmission..."
                    className="w-full h-14 bg-transparent px-4 outline-none text-[14px] font-bold text-emerald-950 placeholder:text-emerald-800/20"
                  />
                  <button type="submit" className="h-12 px-6 bg-emerald-950 text-white rounded-2xl text-[10px] font-black uppercase tracking-[.2em] shadow-lg shadow-emerald-950/20 hover:bg-emerald-900 transition-all active:scale-95">
                    Transmit
                  </button>
                </form>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-20 text-center">
            <div className="relative mb-12">
              <div className="h-48 w-48 bg-white rounded-[60px] shadow-2xl flex items-center justify-center text-emerald-950 border border-emerald-50 relative z-10">
                <Activity size={64} strokeWidth={1.5} className="animate-pulse" />
              </div>
              <div className="absolute -bottom-4 -right-4 h-24 w-24 bg-emerald-950 rounded-[40px] flex items-center justify-center text-white shadow-2xl z-20">
                <ShieldCheck size={32} />
              </div>
              <div className="absolute inset-0 bg-emerald-500/10 blur-[80px] rounded-full" />
            </div>
            <h2 className="text-4xl font-black text-emerald-950 italic tracking-tighter uppercase">Station Offline</h2>
            <p className="max-w-xs text-emerald-800/40 font-black text-[11px] uppercase tracking-[.2em] mt-6 leading-loose">Initialize clinical manifest to establish alpha-node synchronization.</p>
          </div>
        )}
      </div>

      {/* 3. SYNTHESIS PORTAL (COUNTER MODAL) */}
      <AnimatePresence>
        {showNegotiationForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowNegotiationForm(false)} className="absolute inset-0 bg-emerald-950/95 backdrop-blur-xl" />
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="relative w-full max-w-lg bg-white rounded-[56px] p-12 shadow-[0_40px_100px_rgba(0,0,0,0.4)]">
              <div className="mb-12">
                <span className="text-[10px] font-black text-emerald-700 uppercase tracking-[.4em]">AyurCare v4.0</span>
                <h3 className="text-3xl font-black text-emerald-950 italic uppercase tracking-tighter mt-2">Protocol Override</h3>
              </div>
              
              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-emerald-900/30 uppercase tracking-widest ml-4">Counter Fee (INR)</label>
                  <input type="number" value={negForm.price} onChange={e => setNegForm({...negForm, price: e.target.value})} className="w-full h-20 bg-emerald-50/50 rounded-[32px] px-8 text-3xl font-black text-emerald-950 border-2 border-transparent focus:border-emerald-100 outline-none transition-all shadow-inner" />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-emerald-900/30 uppercase tracking-widest ml-4">Sync Schedule</label>
                  <input type="datetime-local" value={negForm.consultation_time} onChange={e => setNegForm({...negForm, consultation_time: e.target.value})} className="w-full h-20 bg-emerald-50/50 rounded-[32px] px-8 font-bold text-emerald-950 border-2 border-transparent focus:border-emerald-100 outline-none transition-all shadow-inner" />
                </div>
              </div>

              <div className="mt-12 space-y-4">
                <button 
                  onClick={handleProtocolAction}
                  className="w-full h-20 bg-emerald-950 text-white rounded-[28px] text-[13px] font-black uppercase tracking-[.2em] shadow-2xl shadow-emerald-950/20 active:scale-95 transition-all"
                >
                  {negotiation ? 'Submit Override' : 'Deploy Protocol'}
                </button>
                <button onClick={() => setShowNegotiationForm(false)} className="w-full text-emerald-900/30 text-[10px] font-black uppercase tracking-widest hover:text-emerald-950 transition-colors">Abort Synthesis</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Messages;
