import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { MessageSquare, Send, UserRound, Circle, Loader2 } from 'lucide-react';
import { doctorChatApi } from '../../services/api';
import { createDoctorChatSocket } from '../../features/chat/socketService';

const upsertMessageList = (messages, nextMessage) => {
  if (!nextMessage?._id) return messages;
  const exists = messages.some((item) => item._id === nextMessage._id);
  if (exists) return messages;
  return [...messages, nextMessage].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
};

const Messages = () => {
  const { chatId: routeChatId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  const [chats, setChats] = useState([]);
  const [messagesByChat, setMessagesByChat] = useState({});
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState('');
  const [isDoctorTyping, setIsDoctorTyping] = useState(false);

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
  }, [activeChatId]);

  useEffect(() => {
    if (!token) return;
    const socket = createDoctorChatSocket(token);
    socketRef.current = socket;

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
              <button
                key={chat._id}
                onClick={() => navigate(`/messages/${chat._id}`)}
                className={`w-full text-left rounded-2xl border p-4 transition-all ${
                  chat._id === activeChatId
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300'
                }`}
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
                      <div className={`max-w-[70%] px-5 py-3 rounded-3xl ${
                        isOwn ? 'bg-slate-900 text-white rounded-br-md' : 'bg-white border border-slate-200 text-slate-900 rounded-bl-md'
                      }`}>
                        <div className="text-sm leading-6">{message.message}</div>
                        <div className={`text-[11px] mt-2 ${isOwn ? 'text-slate-300' : 'text-slate-400'}`}>
                          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {isDoctorTyping && (
                  <div className="text-xs font-semibold text-slate-400">Doctor is typing...</div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="flex-shrink-0 p-6 border-t border-slate-200 bg-white">
                <div className="flex items-center gap-3">
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
