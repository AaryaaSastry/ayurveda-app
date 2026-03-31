import React, { useState, useEffect } from 'react';
import MessageChat from '../../components/dashboard/MessageChat';
import { Search, User, Clock, CheckCheck, Menu, Filter } from 'lucide-react';

const Messages = () => {
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data
    const mockConvos = [
      { id: 1, name: 'Dr. Amit Sharma', lastMessage: 'Please follow the diet chart strictly.', time: '10:45 AM', unread: 2, messages: [
        { id: 1, text: 'Hello, how are you feeling today?', sender: 'doctor', time: '10:30 AM' },
        { id: 2, text: 'I am feeling better, but still have some bloating.', sender: 'patient', time: '10:35 AM' },
        { id: 3, text: 'The triphala should help with that. Please follow the diet chart strictly.', sender: 'doctor', time: '10:45 AM' },
      ]},
      { id: 2, name: 'Dr. Priya Varma', lastMessage: 'Your appointment is confirmed.', time: 'Yesterday', unread: 0, messages: [
        { id: 1, text: 'Welcome to Narayanam Care. Your appointment is confirmed.', sender: 'doctor', time: '02:00 PM' },
      ]},
      { id: 3, name: 'Support Team', lastMessage: 'Your refund has been processed.', time: 'Monday', unread: 0, messages: [] },
    ];
    setConversations(mockConvos);
    setActiveChat(mockConvos[0]);
    setLoading(false);
  }, []);

  return (
    <div className="h-full px-4 sm:px-6 md:px-8 lg:px-12 py-8 overflow-hidden">
      <div className="h-full flex bg-white border border-[#f0f1f3] rounded-[48px] overflow-hidden shadow-sm relative">
      {/* Sidebar - Conversations List */}
      <div className="w-[420px] bg-white border-r-2 border-ayur-sage-light flex flex-col z-20">
         <div className="p-10 space-y-8">
            <div className="flex items-center justify-between">
               <h2 className="text-4xl font-black text-ayur-forest tracking-tighter uppercase leading-none">Messages</h2>
               <div className="w-12 h-12 bg-ayur-sage-light/50 rounded-2xl flex items-center justify-center text-ayur-sage hover:bg-ayur-sage hover:text-white transition-all cursor-pointer">
                  <Filter size={20} />
               </div>
            </div>
            
            <div className="relative group/search">
               <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-ayur-sage opacity-50 group-focus-within/search:opacity-100 transition-opacity" size={20} />
               <input 
                 type="text" 
                 placeholder="Search conversations..." 
                 className="w-full pl-14 pr-6 py-5 bg-ayur-sage-light/30 border-2 border-transparent focus:border-ayur-sage focus:bg-white rounded-[28px] outline-none font-bold text-ayur-forest transition-all"
               />
            </div>
         </div>
         
         <div className="flex-1 overflow-y-auto px-6 space-y-3 pb-10">
            {conversations.map(convo => (
              <div 
                key={convo.id} 
                onClick={() => setActiveChat(convo)}
                className={`p-6 rounded-[36px] transition-all duration-300 cursor-pointer group relative overflow-hidden ${activeChat?.id === convo.id ? 'bg-ayur-forest text-white shadow-2xl shadow-ayur-forest/30' : 'hover:bg-ayur-sage-light/40 hover:scale-[1.02]'}`}
              >
                  {activeChat?.id === convo.id && (
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-bl-full"></div>
                  )}
                  <div className="flex items-center gap-5 relative z-10">
                      <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center text-slate-300 border-2 transition-all ${activeChat?.id === convo.id ? 'bg-white/10 border-white/20' : 'bg-slate-50 border-white'}`}>
                        <User size={32} />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                         <div className="flex items-center justify-between">
                            <h4 className={`font-black uppercase tracking-tight truncate ${activeChat?.id === convo.id ? 'text-white' : 'text-ayur-forest text-lg'}`}>{convo.name}</h4>
                            <span className={`text-[10px] font-black uppercase tracking-widest ${activeChat?.id === convo.id ? 'text-white/60' : 'text-ayur-sage/50'}`}>{convo.time}</span>
                         </div>
                         <div className="flex items-center justify-between">
                            <p className={`text-sm font-semibold truncate ${activeChat?.id === convo.id ? 'text-white/70' : 'text-ayur-sage opacity-60'}`}>{convo.lastMessage}</p>
                            {convo.unread > 0 && (
                              <span className="w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[10px] font-black shadow-lg shadow-emerald-500/30 animate-pulse">{convo.unread}</span>
                            )}
                         </div>
                      </div>
                  </div>
              </div>
            ))}
         </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 bg-slate-50/30">
        {activeChat ? (
          <MessageChat recipient={activeChat} messages={activeChat.messages} />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-20 space-y-8 bg-white/20 backdrop-blur-3xl animate-fade-in">
             <div className="w-32 h-32 bg-ayur-sage-light/50 rounded-[40px] flex items-center justify-center text-ayur-sage/30">
                <MessageSquare size={64} />
             </div>
             <div className="space-y-4 max-w-sm">
                <h3 className="text-4xl font-black text-ayur-forest tracking-tighter uppercase leading-none">Select a Channel</h3>
                <p className="text-ayur-sage font-bold text-lg opacity-60">Connected with your practitioners and our care team 24/7.</p>
             </div>
             <button className="bg-ayur-forest text-white px-10 py-5 rounded-[24px] font-black uppercase tracking-widest text-sm shadow-2xl shadow-ayur-forest/30 hover:scale-110 active:scale-95 transition-all">Start New Conversation</button>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default Messages;
