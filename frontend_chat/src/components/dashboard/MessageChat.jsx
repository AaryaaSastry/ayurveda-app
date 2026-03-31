import React, { useState } from 'react';
import { Send, User, CheckCheck, Smile, Paperclip, Image as ImageIcon } from 'lucide-react';

const MessageChat = ({ recipient, messages: initialMessages }) => {
  const [messages, setMessages] = useState(initialMessages || []);
  const [newMessage, setNewMessage] = useState('');

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    setMessages([...messages, { 
      id: messages.length + 1, 
      text: newMessage, 
      sender: 'patient', 
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    }]);
    setNewMessage('');
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/20 rounded-[56px] relative overflow-hidden group">
      <div className="p-8 lg:p-10 flex items-center justify-between border-b border-white backdrop-blur-md bg-white/40 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-5">
           <div className="w-16 h-16 rounded-[24px] bg-white p-1 border-2 border-slate-50 shadow-2xl flex items-center justify-center text-slate-300 text-slate-300 shadow-xl shadow-emerald-500/20">
              <User size={36} />
           </div>
           <div>
              <h3 className="text-2xl font-black text-ayur-forest tracking-tighter uppercase leading-none mb-1">{recipient?.name || 'Practitioner'}</h3>
              <div className="flex items-center gap-2">
                 <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-xl shadow-emerald-500/20"></span>
                 <span className="text-[10px] font-black uppercase tracking-[3px] text-ayur-sage opacity-80">Connected | Secure Session</span>
              </div>
           </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 lg:p-12 space-y-8 custom-scrollbar">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex flex-col ${msg.sender === 'patient' ? 'items-end' : 'items-start'} animate-slide-up group/msg`}
          >
             <div className={`p-6 lg:p-7 rounded-[32px] font-black text-[15px] lg:text-lg shadow-2xl relative transition-all duration-500 max-w-[85%] lg:max-w-[75%] ${
               msg.sender === 'patient' 
                 ? 'bg-ayur-forest text-white rounded-br-none shadow-ayur-forest/30 hover:scale-[1.02] transform-gpu' 
                 : 'bg-white text-ayur-forest rounded-bl-none shadow-slate-100/50 border border-slate-50 hover:scale-[1.02] transform-gpu'
             }`}>
               {msg.text}
             </div>
             <div className={`flex items-center gap-2 mt-3 px-4 ${msg.sender === 'patient' ? 'flex-row-reverse' : 'flex-row'}`}>
                <span className="text-[9px] font-black uppercase tracking-[4px] text-slate-300">
                  {msg.time}
                </span>
                {msg.sender === 'patient' && (
                  <CheckCheck size={14} className="text-emerald-500 opacity-60" />
                )}
             </div>
          </div>
        ))}
      </div>

      <div className="p-8 lg:px-10 pb-10 bg-white/40 backdrop-blur-md border-t border-white shadow-[0_-20px_50px_-10px_rgba(31,42,38,0.05)]">
        <form onSubmit={handleSendMessage} className="flex items-center gap-4 bg-white p-3 rounded-[32px] border-4 border-slate-50 shadow-2xl shadow-slate-200/50 group/form transition-all duration-500 hover:shadow-slate-200/80">
          <div className="hidden sm:flex gap-1 pl-2">
             <button type="button" className="w-12 h-12 bg-slate-50 text-slate-300 hover:text-ayur-sage rounded-2xl flex items-center justify-center transition-all group-hover/form:scale-110">
                <Paperclip size={20} />
             </button>
          </div>
          <input 
            type="text" 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Secure message..." 
            className="flex-1 bg-transparent border-none outline-none text-lg font-black text-ayur-forest placeholder:text-slate-200 min-w-0 px-2"
          />
          <button 
           type="submit"
           disabled={!newMessage.trim()}
           className="w-16 h-16 bg-ayur-forest text-white rounded-[24px] flex items-center justify-center disabled:opacity-30 disabled:grayscale transition-all shadow-xl shadow-ayur-forest/20 active:scale-95 group/send"
          >
           <Send size={24} className="group-hover/send:translate-x-1 group-hover/send:-translate-y-1 transition-transform" strokeWidth={3} />
         </button>
        </form>
      </div>
    </div>
  );
};

export default MessageChat;
