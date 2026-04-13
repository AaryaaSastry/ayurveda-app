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
      return null; // We moved the button to the + menu payload
    }

    const statusColors = {
      active: 'bg-emerald-500',
      countered: 'bg-amber-500',
      accepted_by_doctor: 'bg-indigo-500',
      accepted_by_user: 'bg-emerald-600',
      locked: 'bg-slate-900'
    };

    return (
      <div className="w-[320px] bg-[#f8fafc] border-l border-slate-100 flex flex-col p-8 h-full shrink-0 z-20">
        <h4 className="text-xs font-bold tracking-tight text-slate-400 mb-10 pb-4 border-b border-slate-200">Active Protocol</h4>
        
        <div className="flex flex-col items-center mb-10 space-y-3">
          <div className={`h-16 w-16 rounded-[24px] ${statusColors[negotiation.status]} flex items-center justify-center text-white shadow-xl mb-3`}>
            <DollarSign size={28} strokeWidth={3} />
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-tight text-white ${statusColors[negotiation.status]}`}>
            {negotiation.status.replace(/_/g, ' ')}
          </span>
          <span className="text-4xl font-bold text-slate-900 tracking-tight block pt-2">₹{negotiation.price}</span>
        </div>

        <div className="space-y-4 flex-1">
          <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex items-center gap-4">
            <Calendar className="text-emerald-500 shrink-0" size={18} />
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold tracking-tight text-slate-400">Date & Time</span>
              <span className="text-sm font-bold text-slate-800 leading-tight mt-0.5">{new Date(negotiation.consultation_time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
            </div>
          </div>
          
          <div className="bg-white p-5 rounded-lg border border-slate-100 shadow-sm flex items-center gap-4">
            <Video className="text-indigo-400 shrink-0" size={18} />
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold tracking-tight text-slate-400">Mode</span>
              <span className="text-sm font-bold text-slate-800 leading-tight mt-0.5">{negotiation.consultation_mode}</span>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-200 flex flex-col gap-4 mt-6">
          {negotiation.status !== 'locked' && (
            <>
              <button 
                onClick={() => updateNegotiation('accepted_by_user')}
                className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold tracking-tight transition-all shadow-lg active:scale-95"
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
                className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold tracking-tight transition-all active:scale-95"
              >
                Modify
              </button>
            </>
          )}
          {negotiation.status === 'locked' && (
            <div className="h-14 w-full flex justify-center items-center gap-3 bg-slate-100 text-slate-400 rounded-lg text-xs font-bold tracking-tight">
              <Lock size={16} /> Locked
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full bg-white overflow-hidden relative">
      {/* CHAT LIST */}
      <div className="w-96 border-r border-slate-50 flex flex-col h-full bg-[#f8fafc]">
        <div className="p-10 pb-6">
           <h2 className="text-3xl font-bold text-slate-900 tracking-tight leading-none mb-2">Registry</h2>
           <p className="text-xs font-bold tracking-tight text-slate-400">Clinical Communication</p>
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
                    <h4 className="text-lg font-bold text-slate-900 truncate tracking-tight leading-none mb-2">
                       {getOtherUser(chat)?.name || 'Practitioner'}
                    </h4>
                    <p className="text-xs font-bold tracking-tight text-slate-400 leading-none">Status: Connected</p>
                 </div>
               </div>
             </button>
           ))}
        </div>
      </div>

      {/* CHAT MAIN AREA */}
      <div className="flex-1 flex flex-col h-full bg-slate-50 relative">
        {activeChat ? (
          <div className="flex flex-1 overflow-hidden">
            <div className="flex-1 flex flex-col relative h-full bg-white z-10 w-full rounded-tr-[40px] shadow-sm overflow-hidden border-r border-slate-100">
              {/* MESSAGES */}
              {!negotiation && <NegotiationBar />}
              <div className="flex-1 overflow-y-auto px-6 pt-16 pb-6 flex flex-col space-y-2 custom-scrollbar relative">
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
                         <div className={`max-w-[75%] md:max-w-sm flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            <div className={`px-4 py-2.5 shadow-sm min-w-[80px] flex flex-col max-w-full break-words ${
                              isMe 
                              ? 'bg-[#000000] text-white rounded-2xl rounded-br-sm' 
                              : 'bg-slate-100 text-slate-800 rounded-2xl rounded-bl-sm'
                            }`}>
                              <p className="text-[15px] leading-snug">{msg.message_text || msg.content || msg.text || msg.message}</p>
                              <div className={`text-[10px] self-end mt-1 ${isMe ? 'text-white/60' : 'text-slate-400'}`}>
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
              <div className="p-4 bg-white border-t border-slate-100 shrink-0">
                 <form 
                   onSubmit={handleSendMessage}
                   className="flex items-center gap-3 relative"
                 >
                   <div className="relative">
                     <button 
                       type="button" 
                       onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                       className="w-12 h-12 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-full flex items-center justify-center transition-all shrink-0"
                     >
                       <Plus size={20} className={showAttachmentMenu ? 'rotate-45 transition-transform' : 'transition-transform'} />
                     </button>

                     <AnimatePresence>
                       {showAttachmentMenu && (
                         <motion.div 
                           initial={{ opacity: 0, y: 10, scale: 0.95 }}
                           animate={{ opacity: 1, y: 0, scale: 1 }}
                           exit={{ opacity: 0, y: 10, scale: 0.95 }}
                           className="absolute bottom-full left-0 mb-4 bg-white border border-slate-100 shadow-xl rounded-2xl p-2 w-56 z-50 overflow-hidden"
                         >
                           <button 
                             type="button"
                             onClick={() => setShowAttachmentMenu(false)}
                             className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 rounded-lg transition-all text-sm font-bold tracking-tight text-slate-700 hover:text-blue-600"
                           >
                             <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center">
                               <ShieldCheck size={14} />
                             </div>
                             Send File
                           </button>
                           
                           {!negotiation && (
                             <button 
                               type="button"
                               onClick={() => {
                                 setShowAttachmentMenu(false);
                                 setNegForm({ price: '', consultation_time: '', consultation_mode: 'video' });
                                 setShowNegotiationForm(true);
                               }}
                               className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 rounded-lg transition-all text-sm font-bold tracking-tight text-slate-700 hover:text-emerald-600 mt-1"
                             >
                               <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center">
                                 <DollarSign size={14} />
                               </div>
                               Negotiation
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
                     placeholder="Type a message..."
                     className="flex-1 bg-slate-50 border border-transparent focus:border-slate-200 rounded-full py-3.5 pl-6 pr-6 text-[15px] font-medium text-slate-800 placeholder:text-slate-400 transition-all outline-none"
                   />
                   <button
                     type="submit"
                     className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shrink-0 ${newMessage.trim() ? 'bg-slate-950 text-white shadow-lg hover:scale-105 active:scale-95' : 'bg-slate-50 text-slate-300 pointer-events-none'}`}
                   >
                     <Send size={18} fill={newMessage.trim() ? "currentColor" : "none"} />
                   </button>
                 </form>
              </div>
            </div>

            {/* VERTICAL NEGOTIATION RIGHT BAR */}
            {negotiation && <NegotiationBar />}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-20">
             <div className="h-24 w-24 bg-slate-50 rounded-[40px] flex items-center justify-center mb-8 shadow-inner">
               <MessageSquare size={40} className="text-slate-200" />
             </div>
             <h3 className="text-4xl font-bold text-slate-900 tracking-tight">Secure Comms</h3>
             <p className="text-slate-400 mt-4 max-w-sm font-medium text-sm tracking-tight leading-relaxed">Select a clinical bridge from the registry manifest to begin bidirectional transmission.</p>
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
                  <h3 className="text-4xl font-bold text-slate-900 tracking-tight leading-none">Set <span className="text-emerald-600">Protocol</span></h3>
                  <p className="text-xs font-bold tracking-tight text-slate-400">Negotiation Framework</p>
                </div>
                <button onClick={() => setShowNegotiationForm(false)} className="w-14 h-14 bg-slate-50 border-2 border-transparent hover:border-emerald-100 rounded-3xl flex items-center justify-center text-slate-300 hover:bg-emerald-50 hover:text-emerald-600 transition-all">
                  <Plus size={24} className="rotate-45" />
                </button>
              </div>

              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-xs font-bold tracking-tight text-slate-300 pl-4">Professional Fee (INR)</label>
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
                  <label className="text-xs font-bold tracking-tight text-slate-300 pl-4">Synchronization Time</label>
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
                  <label className="text-xs font-bold tracking-tight text-slate-300 pl-4">Access Mode</label>
                  <div className="grid grid-cols-2 gap-4">
                    {['video', 'chat'].map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setNegForm({ ...negForm, consultation_mode: m })}
                        className={`flex items-center justify-center gap-3 py-6 rounded-lg border-2 font-bold tracking-tight transition-all capitalize ${negForm.consultation_mode === m ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-slate-50 border-transparent text-slate-300 hover:border-slate-200'}`}
                      >
                        {m === 'video' ? <Video size={18} /> : <MessageSquare size={18} />} {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={negotiation ? handleCounter : handleStartNegotiation}
                className="w-full bg-emerald-600 text-white py-8 rounded-lg font-bold tracking-wide text-base shadow-lg shadow-emerald-600/40 hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-4 group"
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
