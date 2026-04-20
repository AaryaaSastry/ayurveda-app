import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  CalendarDays,
  Circle,
  Clock3,
  Handshake,
  IndianRupee,
  Loader2,
  MessageCircleMore,
  MessageSquare,
  PhoneCall,
  Plus,
  Send,
  UserRound,
  Video,
  Trash2,
} from 'lucide-react';
import { doctorChatApi } from '../../services/api';
import { createDoctorChatSocket } from '../../features/chat/socketService';

const MODE_OPTIONS = ['VIDEO', 'AUDIO', 'CHAT'];

const MODE_META = {
  VIDEO: { label: 'Video Call', icon: Video },
  AUDIO: { label: 'Audio Call', icon: PhoneCall },
  CHAT: { label: 'Chat', icon: MessageCircleMore },
};

const createOfferDraft = () => ({
  date: '',
  time: '',
  amount: '',
  mode: 'VIDEO',
});

const upsertMessageList = (messages, nextMessage) => {
  if (!nextMessage?._id) return messages;
  const existingIndex = messages.findIndex((item) => item._id === nextMessage._id);
  if (existingIndex === -1) {
    return [...messages, nextMessage].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  const nextMessages = [...messages];
  nextMessages[existingIndex] = { ...nextMessages[existingIndex], ...nextMessage };
  return nextMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
};

const updateNegotiationInMessages = (messages, negotiation) => messages.map((message) => (
  String(message.negotiationId || message.negotiation?._id || '') === String(negotiation?._id || '')
    ? { ...message, negotiationId: negotiation._id, negotiation }
    : message
));

const formatMoney = (amount) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
}).format(amount || 0);

const formatOfferDate = (value) => new Date(value).toLocaleDateString('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const NegotiationCard = ({ message, currentRole, onAccept, onCounter, acceptingId }) => {
  const negotiation = message.negotiation;
  const modeMeta = MODE_META[negotiation?.mode] || MODE_META.CHAT;
  const ModeIcon = modeMeta.icon;
  const didAccept = currentRole === 'DOCTOR' ? negotiation?.acceptedByDoctor : negotiation?.acceptedByUser;
  const otherAccepted = currentRole === 'DOCTOR' ? negotiation?.acceptedByUser : negotiation?.acceptedByDoctor;
  const isLocked = negotiation?.status === 'LOCKED';
  const isPending = negotiation?.status === 'PENDING';
  const isAccepting = acceptingId === negotiation?._id;

  return (
    <div className="w-full max-w-[420px] rounded-[28px] border border-emerald-200/80 bg-gradient-to-br from-white via-emerald-50/60 to-lime-50/70 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.24em] text-emerald-700">
            <Handshake size={14} />
            <span>Consultation Offer</span>
          </div>
          <div className="mt-2 text-sm font-semibold text-slate-600">
            {message.senderRole === currentRole ? 'You proposed a consultation deal.' : 'New consultation terms received.'}
          </div>
        </div>
        <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${
          isLocked ? 'bg-emerald-600 text-white' : 'bg-amber-100 text-amber-700'
        }`}>
          {negotiation?.status || 'PENDING'}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 text-sm text-slate-700">
        <div className="rounded-2xl bg-white/85 px-4 py-3 border border-white">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500"><CalendarDays size={14} /> Date</div>
          <div className="mt-2 font-bold text-slate-900">{formatOfferDate(negotiation?.date)}</div>
        </div>
        <div className="rounded-2xl bg-white/85 px-4 py-3 border border-white">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500"><Clock3 size={14} /> Time</div>
          <div className="mt-2 font-bold text-slate-900">{negotiation?.time}</div>
        </div>
        <div className="rounded-2xl bg-white/85 px-4 py-3 border border-white">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500"><IndianRupee size={14} /> Amount</div>
          <div className="mt-2 font-bold text-slate-900">{formatMoney(negotiation?.amount)}</div>
        </div>
        <div className="rounded-2xl bg-white/85 px-4 py-3 border border-white">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500"><ModeIcon size={14} /> Mode</div>
          <div className="mt-2 font-bold text-slate-900">{modeMeta.label}</div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-emerald-100 bg-white/80 px-4 py-3 text-sm">
        {isLocked ? (
          <div className="font-bold text-emerald-700">Deal confirmed. This consultation offer is locked.</div>
        ) : didAccept ? (
          <div className="font-semibold text-slate-600">Waiting for the other party to accept this deal.</div>
        ) : otherAccepted ? (
          <div className="font-semibold text-emerald-700">The other party has accepted the deal! Do you want to accept or counter?</div>
        ) : (
          <div className="font-semibold text-slate-600">Accept this deal to lock the consultation terms for both sides.</div>
        )}
      </div>

      <div className="mt-4">
        {isLocked ? (
          <div className="rounded-2xl bg-emerald-600 px-4 py-3 text-center text-sm font-bold text-white">
            Deal Confirmed
          </div>
        ) : isPending && !didAccept ? (
          <div className="flex gap-2">
            <button
              onClick={() => onAccept(negotiation?._id)}
              disabled={isAccepting}
              className="flex-1 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:bg-slate-300"
            >
              {isAccepting ? 'Accepting...' : 'Accept'}
            </button>
            <button
              onClick={() => onCounter(negotiation)}
              disabled={isAccepting}
              className="flex-1 rounded-2xl bg-white border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:bg-slate-100"
            >
              Counter
            </button>
          </div>
        ) : (
          <div className="rounded-2xl bg-slate-100 px-4 py-3 text-center text-sm font-semibold text-slate-600">
            {negotiation?.status === 'COUNTERED' ? 'This deal was countered.' : 'Waiting for other party...'}
          </div>
        )}
      </div>
    </div>
  );
};

const Messages = () => {
  const { chatId: routeChatId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const offerPanelRef = useRef(null);

  const [chats, setChats] = useState([]);
  const [messagesByChat, setMessagesByChat] = useState({});
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState('');
  const [isDoctorTyping, setIsDoctorTyping] = useState(false);
  const [isOfferOpen, setIsOfferOpen] = useState(false);
  const [offerDraft, setOfferDraft] = useState(createOfferDraft());
  const [offerSending, setOfferSending] = useState(false);
  const [acceptingNegotiationId, setAcceptingNegotiationId] = useState('');
  const [counteringNegotiationId, setCounteringNegotiationId] = useState('');

  const activeChatId = routeChatId || chats[0]?._id || null;
  const activeChat = useMemo(
    () => chats.find((chat) => chat._id === activeChatId) || null,
    [chats, activeChatId]
  );
  const activeMessages = messagesByChat[activeChatId] || [];

  const loadChats = async (preferredChatId = null) => {
    setLoadingChats(true);
    try {
      const res = await doctorChatApi.listChats();
      const nextChats = res.data || [];
      setChats(nextChats);

      const targetId = preferredChatId || routeChatId || nextChats[0]?._id;
      if (targetId && targetId !== routeChatId) {
        navigate(`/messages/${targetId}`, { replace: true });
      }
    } catch (error) {
      console.error('Failed to load chats:', error);
    } finally {
      setLoadingChats(false);
    }
  };

  useEffect(() => {
    loadChats();
  }, []);

  useEffect(() => {
    const doctorId = searchParams.get('doctorId');
    if (!doctorId) return;

    const run = async () => {
      try {
        const res = await doctorChatApi.initiateChat({ doctorId });
        await loadChats(res.data?._id);
        if (res.data?._id) {
          navigate(`/messages/${res.data._id}`, { replace: true });
        }
      } catch (error) {
        console.error('Failed to initiate doctor chat:', error);
      }
    };

    run();
  }, [searchParams]);

  useEffect(() => {
    if (!activeChatId) return;

    const loadMessages = async () => {
      setLoadingMessages(true);
      try {
        const res = await doctorChatApi.getMessages(activeChatId);
        setMessagesByChat((prev) => ({ ...prev, [activeChatId]: res.data || [] }));
        await doctorChatApi.markRead(activeChatId);
        setChats((prev) => prev.map((chat) => (
          chat._id === activeChatId ? { ...chat, unreadCount: 0 } : chat
        )));
      } catch (error) {
        console.error('Failed to load chat messages:', error);
      } finally {
        setLoadingMessages(false);
      }
    };

    loadMessages();
    setIsOfferOpen(false);
    setOfferDraft(createOfferDraft());
  }, [activeChatId]);

  useEffect(() => {
    if (!token) return;
    const socket = createDoctorChatSocket(token);
    socketRef.current = socket;

    socket.on('chat:updated', async () => {
      try {
        const nextChats = await doctorChatApi.listChats();
        setChats(nextChats);
      } catch (error) {
        console.error('Failed to sync charts dynamically', error);
      }
    });

    socket.on('chat:deleted', ({ chatId }) => {
       setChats((prev) => prev.filter((chat) => chat._id !== chatId));
       if (activeChatId === chatId) {
         navigate('/messages', { replace: true });
       }
    });

    socket.on('message:new', (message) => {
      setMessagesByChat((prev) => ({
        ...prev,
        [message.chatId]: upsertMessageList(prev[message.chatId] || [], message),
      }));

      setChats((prev) => prev.map((chat) => {
        if (chat._id !== message.chatId) return chat;
        const shouldIncrement = message.senderRole === 'DOCTOR' && message.chatId !== activeChatId;
        return {
          ...chat,
          lastMessage: message.message,
          unreadCount: shouldIncrement ? (chat.unreadCount || 0) + 1 : 0,
          updatedAt: message.timestamp,
        };
      }));
    });

    socket.on('message:read', ({ chatId }) => {
      setChats((prev) => prev.map((chat) => (
        chat._id === chatId ? { ...chat, unreadCount: 0 } : chat
      )));
    });

    socket.on('presence:update', ({ userId, isOnline }) => {
      setChats((prev) => prev.map((chat) => (
        chat.participantUserId === userId ? { ...chat, participantIsOnline: isOnline } : chat
      )));
    });

    socket.on('typing:update', ({ chatId, senderRole, isTyping }) => {
      if (chatId === activeChatId && senderRole === 'DOCTOR') {
        setIsDoctorTyping(!!isTyping);
      }
    });

    socket.on('negotiation:update', (negotiation) => {
      setMessagesByChat((prev) => ({
        ...prev,
        [negotiation.chatId]: updateNegotiationInMessages(prev[negotiation.chatId] || [], negotiation),
      }));
    });

    return () => {
      socket.disconnect();
    };
  }, [token, activeChatId]);

  useEffect(() => {
    if (!activeChatId || !socketRef.current) return;
    socketRef.current.emit('chat:join', { chatId: activeChatId });
  }, [activeChatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages, isDoctorTyping, loadingMessages]);

  useEffect(() => {
    if (!isOfferOpen) return undefined;

    const handlePointerDown = (event) => {
      if (offerPanelRef.current && !offerPanelRef.current.contains(event.target)) {
        setIsOfferOpen(false);
        setOfferDraft(createOfferDraft());
        setCounteringNegotiationId('');
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isOfferOpen]);

  const handleTyping = (value) => {
    setInput(value);
    if (socketRef.current && activeChatId) {
      socketRef.current.emit('typing:update', {
        chatId: activeChatId,
        isTyping: value.trim().length > 0,
      });
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !activeChatId || sending) return;

    setSending(true);
    setInput('');
    try {
      const res = await doctorChatApi.sendMessage({ chatId: activeChatId, message: text });
      const message = res.data;

      setMessagesByChat((prev) => ({
        ...prev,
        [activeChatId]: upsertMessageList(prev[activeChatId] || [], message),
      }));

      setChats((prev) => prev.map((chat) => (
        chat._id === activeChatId
          ? { ...chat, lastMessage: text, unreadCount: 0, updatedAt: message.timestamp }
          : chat
      )));

      socketRef.current?.emit('typing:update', { chatId: activeChatId, isTyping: false });
    } catch (error) {
      console.error('Failed to send message:', error);
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const handleCreateNegotiation = async () => {
    if (!activeChatId || offerSending) return;

    const amount = Number(offerDraft.amount);
    if (!offerDraft.date || !offerDraft.time || !Number.isFinite(amount) || amount < 0) {
      window.alert('Please fill date, time, and a valid amount before sending the offer.');
      return;
    }

    setOfferSending(true);
    try {
      let message;
      if (counteringNegotiationId) {
        const res = await doctorChatApi.counterNegotiation({
          negotiationId: counteringNegotiationId,
          date: offerDraft.date,
          time: offerDraft.time,
          amount,
          mode: offerDraft.mode,
        });
        message = res.data.newMessage;
        setMessagesByChat((prev) => ({
          ...prev,
          [activeChatId]: updateNegotiationInMessages(prev[activeChatId] || [], res.data.oldNegotiation),
        }));
      } else {
        const res = await doctorChatApi.createNegotiation({
          chatId: activeChatId,
          date: offerDraft.date,
          time: offerDraft.time,
          amount,
          mode: offerDraft.mode,
        });
        message = res.data;
      }

      setMessagesByChat((prev) => ({
        ...prev,
        [activeChatId]: upsertMessageList(prev[activeChatId] || [], message),
      }));
      setChats((prev) => prev.map((chat) => (
        chat._id === activeChatId
          ? { ...chat, lastMessage: message.message, updatedAt: message.timestamp, unreadCount: 0 }
          : chat
      )));
      setIsOfferOpen(false);
      setOfferDraft(createOfferDraft());
      setCounteringNegotiationId('');
    } catch (error) {
      console.error('Failed to create/counter negotiation:', error);
      window.alert(error?.response?.data?.message || 'Unable to create consultation offer right now.');
    } finally {
      setOfferSending(false);
    }
  };

  const handleCounter = (negotiation) => {
    setCounteringNegotiationId(negotiation._id);
    const d = new Date(negotiation.date);
    const dateStr = d.toISOString().split('T')[0];
    setOfferDraft({
      date: dateStr,
      time: negotiation.time,
      amount: negotiation.amount,
      mode: negotiation.mode,
    });
    setIsOfferOpen(true);
  };

  const handleAcceptNegotiation = async (negotiationId) => {
    if (!negotiationId || acceptingNegotiationId) return;

    setAcceptingNegotiationId(negotiationId);
    try {
      const res = await doctorChatApi.acceptNegotiation(negotiationId);
      const nextNegotiation = res.data;
      setMessagesByChat((prev) => ({
        ...prev,
        [nextNegotiation.chatId]: updateNegotiationInMessages(prev[nextNegotiation.chatId] || [], nextNegotiation),
      }));
    } catch (error) {
      console.error('Failed to accept negotiation:', error);
      window.alert(error?.response?.data?.message || 'Unable to accept this deal right now.');
    } finally {
      setAcceptingNegotiationId('');
    }
  };

  return (
    <div className="h-full bg-[#f8fafc] overflow-hidden">
      <div className="h-full min-h-0 grid grid-cols-[320px_1fr]">
        <aside className="border-r border-slate-200 bg-white h-full overflow-y-auto">
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <MessageSquare size={22} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Messages</h1>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Doctor conversations</p>
              </div>
            </div>
          </div>

          <div className="p-3 space-y-2">
            {loadingChats ? (
              <div className="py-8 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>
            ) : chats.length === 0 ? (
              <div className="p-6 text-sm text-slate-500">No doctor chats yet. Book or open a doctor profile to start one.</div>
            ) : chats.map((chat) => (
              <div
                key={chat._id}
                className={`group flex items-center w-full text-left rounded-2xl border transition-all ${
                  chat._id === activeChatId
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300'
                }`}
              >
              <button
                onClick={() => navigate(`/messages/${chat._id}`)}
                className="flex-1 w-full text-left p-4 min-w-0"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-bold truncate">{chat.participantName}</div>
                    <div className={`text-xs truncate mt-1 ${chat._id === activeChatId ? 'text-slate-300' : 'text-slate-500'}`}>
                      {chat.lastMessage || 'Start the conversation'}
                    </div>
                  </div>
                  {chat.unreadCount > 0 && (
                    <span className="min-w-6 h-6 px-2 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center">
                      {chat.unreadCount}
                    </span>
                  )}
                </div>
              </button>
              <button
                 onClick={async (e) => {
                    e.stopPropagation();
                    if (window.confirm('Are you sure you want to delete this chat completely?')) {
                       try {
                          await doctorChatApi.deleteChat(chat._id);
                          setChats(prev => prev.filter(c => c._id !== chat._id));
                          if (activeChatId === chat._id) navigate('/messages', { replace: true });
                       } catch (err) {
                          window.alert('Failed to delete chat');
                       }
                    }
                 }}
                 className={`p-4 transition-colors opacity-0 group-hover:opacity-100 ${chat._id === activeChatId ? 'text-slate-300 hover:text-red-400' : 'text-slate-400 hover:text-red-500'}`}
              >
                 <Trash2 size={16} />
              </button>
              </div>
            ))}
          </div>
        </aside>

        <section className="h-full min-h-0 flex flex-col overflow-hidden">
          {activeChat ? (
            <>
              <div className="sticky top-0 z-20 flex-shrink-0 px-8 py-5 bg-white/95 backdrop-blur border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-700">
                    <UserRound size={20} />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-slate-900">{activeChat.participantName}</div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                      <Circle size={10} fill={activeChat.participantIsOnline ? '#10b981' : '#cbd5e1'} strokeWidth={0} />
                      <span>{activeChat.participantIsOnline ? 'Online' : 'Offline'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto px-8 py-6 space-y-4">
                {loadingMessages ? (
                  <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-slate-400" /></div>
                ) : activeMessages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-500 text-sm">Say hello to start this consultation thread.</div>
                ) : activeMessages.map((message) => {
                  const isOwn = message.senderRole === 'USER';
                  return (
                    <div key={message._id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      {message.type === 'NEGOTIATION' && message.negotiation ? (
                        <NegotiationCard
                          message={message}
                          currentRole="USER"
                          onAccept={handleAcceptNegotiation}
                          onCounter={handleCounter}
                          acceptingId={acceptingNegotiationId}
                        />
                      ) : (
                        <div className={`max-w-[70%] px-5 py-3 rounded-3xl ${
                          isOwn ? 'bg-slate-900 text-white rounded-br-md' : 'bg-white border border-slate-200 text-slate-900 rounded-bl-md'
                        }`}>
                          <div className="text-sm leading-6">{message.message}</div>
                          <div className={`text-[11px] mt-2 ${isOwn ? 'text-slate-300' : 'text-slate-400'}`}>
                            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {isDoctorTyping && (
                  <div className="text-xs font-semibold text-slate-400">Doctor is typing...</div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="relative flex-shrink-0 p-6 border-t border-slate-200 bg-white">
                {isOfferOpen && (
                  <div ref={offerPanelRef} className="absolute bottom-[calc(100%+12px)] left-6 w-[360px] rounded-[28px] border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-200/70">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <Handshake size={18} />
                      </div>
                      <div>
                        <div className="text-sm font-black text-slate-900">Create Consultation Offer</div>
                        <div className="text-xs text-slate-500">Set the date, mode, and fee before sending.</div>
                      </div>
                    </div>

                    <div className="mt-5 space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <label className="text-sm">
                          <span className="mb-2 block font-semibold text-slate-600">Date</span>
                          <input
                            type="date"
                            value={offerDraft.date}
                            onChange={(e) => setOfferDraft((prev) => ({ ...prev, date: e.target.value }))}
                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-400"
                          />
                        </label>
                        <label className="text-sm">
                          <span className="mb-2 block font-semibold text-slate-600">Time</span>
                          <input
                            type="time"
                            value={offerDraft.time}
                            onChange={(e) => setOfferDraft((prev) => ({ ...prev, time: e.target.value }))}
                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-400"
                          />
                        </label>
                      </div>

                      <label className="text-sm block">
                        <span className="mb-2 block font-semibold text-slate-600">Amount</span>
                        <input
                          type="number"
                          min="0"
                          placeholder="500"
                          value={offerDraft.amount}
                          onChange={(e) => setOfferDraft((prev) => ({ ...prev, amount: e.target.value }))}
                          className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-400"
                        />
                      </label>

                      <div>
                        <div className="mb-2 block text-sm font-semibold text-slate-600">Mode</div>
                        <div className="grid grid-cols-3 gap-2">
                          {MODE_OPTIONS.map((mode) => {
                            const modeOption = MODE_META[mode];
                            const ModeIcon = modeOption.icon;
                            const isActive = offerDraft.mode === mode;
                            return (
                              <button
                                key={mode}
                                onClick={() => setOfferDraft((prev) => ({ ...prev, mode }))}
                                className={`rounded-2xl border px-3 py-3 text-xs font-bold transition ${
                                  isActive
                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                }`}
                              >
                                <ModeIcon size={15} className="mx-auto mb-2" />
                                {modeOption.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleCreateNegotiation}
                      disabled={offerSending}
                      className="mt-5 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:bg-slate-300"
                    >
                      {offerSending ? 'Sending Offer...' : 'Send Offer'}
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsOfferOpen((prev) => !prev)}
                    className="h-14 w-14 rounded-2xl border border-slate-200 bg-white text-slate-700 flex items-center justify-center hover:border-emerald-400 hover:text-emerald-600 transition"
                  >
                    <Plus size={20} />
                  </button>
                  <textarea
                    value={input}
                    onChange={(e) => handleTyping(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    rows={1}
                    placeholder="Message your doctor..."
                    className="flex-1 resize-none rounded-3xl border border-slate-200 px-5 py-4 outline-none focus:border-slate-400"
                  />
                  <button
                    onClick={handleSend}
                    disabled={sending || !input.trim()}
                    className="h-14 w-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center disabled:bg-slate-300"
                  >
                    {sending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500">Select a doctor chat to continue.</div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Messages;
