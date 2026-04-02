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
    if (!chat) return null;
    return chat.user1_id?._id === currentUserId ? chat.user2_id : chat.user1_id;
  };

  // Negotiation Bar UI
  const NegotiationBar = () => {
    if (!negotiation) {
      return (
        <motion.div 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="absolute top-2 right-4 z-40"
        >
          <button 
            onClick={() => {
              setNegForm({ price: '', consultation_time: '', consultation_mode: 'video' });
              setShowNegotiationForm(true);
            }}
            className="flex items-center gap-3 px-6 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-[24px] text-[10px] font-black uppercase tracking-[2px] shadow-xl shadow-emerald-500/20 hover:scale-[1.05] active:scale-95 transition-all group"
          >
            <Sparkles size={16} className="group-hover:rotate-12 transition-transform" />
            <span>Initiate Proposal</span>
          </button>
        </motion.div>
      );
    }

    const statusColors = {
      active: 'bg-emerald-500',
      countered: 'bg-amber-500',
      accepted_by_doctor: 'bg-indigo-500',
      accepted_by_user: 'bg-indigo-500',
      locked: 'bg-slate-900'
    };

    return (
      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="absolute top-2 left-4 right-4 z-40"
      >
        <div className="bg-white/95 backdrop-blur-xl border border-slate-100 shadow-2xl rounded-3xl p-5 flex items-center justify-between gap-8 group">
          <div className="flex items-center gap-6 flex-1 min-w-0">
            <div className={`h-14 w-14 rounded-2xl ${statusColors[negotiation.status]} flex items-center justify-center text-white shadow-xl shadow-slate-900/10 shrink-0`}>
              <DollarSign size={24} strokeWidth={3} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black uppercase tracking-[3px] text-slate-400">Consultation Protocol</span>
                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-[2px] text-white ${statusColors[negotiation.status]}`}>
                  {negotiation.status.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-2xl font-black text-slate-950 tracking-tighter italic">${negotiation.price}</span>
                <div className="h-4 w-[1px] bg-slate-100"></div>
                <div className="flex items-center gap-2 text-slate-500">
                  <Calendar size={14} className="text-emerald-500" />
                  <span className="text-[11px] font-black tracking-tight">{new Date(negotiation.consultation_time).toLocaleString()}</span>
                </div>
                <div className="h-4 w-[1px] bg-slate-100"></div>
                <div className="flex items-center gap-2 text-slate-500">
                  <Video size={14} className="text-indigo-400" />
                  <span className="text-[11px] font-black tracking-tight uppercase italic">{negotiation.consultation_mode}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4 shrink-0">
            {negotiation.status !== 'locked' && (
              <>
                <button 
                  onClick={() => updateNegotiation('accepted_by_user')}
                  className="h-12 px-8 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[3px] transition-all shadow-xl shadow-emerald-500/20 active:scale-95"
                >
                  Authorize
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
                  className="h-12 px-6 bg-slate-950 hover:bg-slate-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-[3px] transition-all active:scale-95"
                >
                  Modify
                </button>
              </>
            )}
            {negotiation.status === 'locked' && (
              <div className="h-12 px-8 flex items-center gap-3 bg-slate-100 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-[3px] italic">
                <Lock size={14} />
                Protocol Locked
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="flex h-full bg-white overflow-hidden relative">
      {/* CHAT LIST */}
      <div className="w-96 border-r border-slate-50 flex flex-col h-full bg-[#f8fafc]">
        <div className="p-10 pb-6">
           <h2 className="text-3xl font-black text-slate-950 tracking-tighter uppercase italic leading-none mb-2">Registry</h2>
           <p className="text-[10px] font-black uppercase tracking-[4px] text-slate-400">Clinical Communication</p>
        </div>
        
        <div className="flex-1 overflow-y-auto px-6 space-y-4 pb-10 custom-scrollbar">
           {chats.map(chat => (
             <button
               key={chat._id}
               onClick={() => {
                 setActiveChat(chat);
                 navigate(`/messages/${chat._id}`);
               }}
               className={`w-full p-6 transition-all duration-300 rounded-[32px] text-left border relative group ${
                 activeChat?._id === chat._id 
                 ? 'bg-white border-slate-100 shadow-2xl shadow-slate-950/5 scale-[1.02]' 
                 : 'bg-transparent border-transparent hover:bg-white/60 hover:translate-x-1'
               }`}
             >
               <div className="flex items-center gap-5">
                 <div className="h-16 w-16 bg-slate-950 rounded-2xl flex items-center justify-center shadow-xl shadow-slate-900/10 shrink-0 group-hover:-rotate-3 transition-transform">
                   <User className="h-8 w-8 text-white" />
                 </div>
                 <div className="flex-1 min-w-0">
                    <h4 className="text-lg font-black text-slate-950 truncate tracking-tight italic uppercase leading-none mb-2">
                       {getOtherUser(chat)?.name || 'Practitioner'}
                    </h4>
                    <p className="text-[9px] font-black uppercase tracking-[2px] text-slate-400 leading-none">Status: Connected</p>
                 </div>
               </div>
             </button>
           ))}
        </div>
      </div>

      {/* CHAT MAIN AREA */}
      <div className="flex-1 flex flex-col h-full bg-white relative">
        {activeChat ? (
          <>
            <NegotiationBar />
            
            {/* MESSAGES */}
            <div className="flex-1 overflow-y-auto px-10 pt-32 pb-10 space-y-8 custom-scrollbar">
               {messagesLoading ? (
                 <div className="h-full flex items-center justify-center bg-transparent">
                   <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
                 </div>
               ) : (
                 <>
                   {messages.map((msg, i) => {
                     const isMe = msg.sender_id === currentUserId || msg.senderId === currentUserId;
                     return (
                     <motion.div
                       key={msg._id || i}
                       initial={{ opacity: 0, x: isMe ? 20 : -20 }}
                       animate={{ opacity: 1, x: 0 }}
                       className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                     >
                       <div className={`max-w-xl group relative ${isMe ? 'order-2' : ''}`}>
                          <div className={`p-6 rounded-[28px] shadow-sm transition-all hover:shadow-md ${
                            isMe 
                            ? 'bg-slate-950 text-white rounded-br-none' 
                            : 'bg-[#f0f4f2] text-slate-800 rounded-bl-none border border-emerald-500/5'
                          }`}>
                            <p className="text-[13px] font-medium leading-relaxed">{msg.message_text || msg.content || msg.text || msg.message}</p>
                            <div className={`text-[8px] font-black uppercase tracking-[2px] mt-4 opacity-30 ${isMe ? 'text-white' : 'text-slate-500'}`}>
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
            <div className="p-10 pt-2 border-t border-slate-50 bg-white">
               <form 
                 onSubmit={handleSendMessage}
                 className="relative group h-20"
               >
                 <input
                   type="text"
                   value={newMessage}
                   onChange={(e) => setNewMessage(e.target.value)}
                   placeholder="Transmit message to practice..."
                   className="w-full h-full bg-[#f8fafc] border-2 border-transparent focus:border-emerald-500 rounded-[28px] pl-10 pr-24 font-bold text-slate-800 placeholder:text-slate-300 transition-all focus:outline-none focus:shadow-2xl focus:shadow-emerald-500/5"
                 />
                 <button
                   type="submit"
                   className="absolute right-3 top-3 bottom-3 w-32 bg-slate-950 text-white rounded-[22px] flex items-center justify-center gap-3 hover:bg-slate-800 transition-all font-black uppercase tracking-[3px] text-[10px] shadow-xl shadow-slate-950/20 active:scale-95"
                 >
                   <span>Send</span>
                   <Zap size={14} className="text-emerald-500" fill="currentColor" />
                 </button>
               </form>
               <div className="flex items-center justify-center gap-6 mt-6 opacity-20">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={10} className="text-emerald-500" />
                    <span className="text-[8px] font-black uppercase tracking-[3px]">Secure Protocol Active</span>
                  </div>
               </div>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-20">
             <div className="h-24 w-24 bg-slate-50 rounded-[40px] flex items-center justify-center mb-8 shadow-inner">
               <MessageSquare size={40} className="text-slate-200" />
             </div>
             <h3 className="text-4xl font-black text-slate-950 tracking-tighter uppercase italic">Secure Comms</h3>
             <p className="text-slate-400 mt-4 max-w-sm font-bold text-sm tracking-tight leading-relaxed italic">Select a clinical bridge from the registry manifest to begin bidirectional transmission.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showNegotiationForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-10">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNegotiationForm(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xl"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 40 }}
              className="relative w-full max-w-[500px] bg-white rounded-[56px] p-12 space-y-12 shadow-2xl border-4 border-slate-100"
            >
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 to-[#10b981]"></div>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none italic">Set <span className="text-emerald-500">Protocol</span></h3>
                  <p className="text-[10px] font-black uppercase tracking-[3px] text-slate-400">Negotiation Framework</p>
                </div>
                <button onClick={() => setShowNegotiationForm(false)} className="w-14 h-14 bg-slate-50 border-2 border-transparent hover:border-emerald-100 rounded-3xl flex items-center justify-center text-slate-300 hover:bg-emerald-50 hover:text-emerald-600 transition-all">
                  <Plus size={24} className="rotate-45" />
                </button>
              </div>

              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[3px] text-slate-300 pl-4">Professional Fee (INR)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 text-emerald-500" size={24} />
                    <input
                      type="number"
                      value={negForm.price}
                      onChange={(e) => setNegForm({ ...negForm, price: e.target.value })}
                      placeholder="0.00"
                      className="w-full pl-16 pr-8 py-6 bg-slate-50 border-2 border-transparent focus:border-slate-900 focus:bg-white rounded-[32px] outline-none text-2xl font-black transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[3px] text-slate-300 pl-4">Synchronization Time</label>
                  <div className="relative">
                    <Clock className="absolute left-6 top-1/2 -translate-y-1/2 text-blue-500" size={24} />
                    <input
                      type="datetime-local"
                      value={negForm.consultation_time}
                      onChange={(e) => setNegForm({ ...negForm, consultation_time: e.target.value })}
                      className="w-full pl-16 pr-8 py-6 bg-slate-50 border-2 border-transparent focus:border-slate-900 focus:bg-white rounded-[32px] outline-none font-bold transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[3px] text-slate-300 pl-4">Access Mode</label>
                  <div className="grid grid-cols-2 gap-4">
                    {['video', 'chat'].map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setNegForm({ ...negForm, consultation_mode: m })}
                        className={`flex items-center justify-center gap-3 py-6 rounded-[32px] border-2 font-black uppercase tracking-[2px] transition-all capitalize ${negForm.consultation_mode === m ? 'bg-slate-900 border-slate-900 text-white shadow-xl' : 'bg-slate-50 border-transparent text-slate-300 hover:border-slate-200'}`}
                      >
                        {m === 'video' ? <Video size={18} /> : <MessageSquare size={18} />} {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={negotiation ? handleCounter : handleStartNegotiation}
                className="w-full bg-emerald-500 text-white py-8 rounded-[36px] font-black uppercase tracking-[5px] text-base shadow-2xl shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-4 group"
              >
                <span>{negotiation ? 'Issue Counter Proposal' : 'Initiate Deal Synthesis'}</span>
                <ChevronRight size={24} className="group-hover:translate-x-2 transition-transform" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Messages;
