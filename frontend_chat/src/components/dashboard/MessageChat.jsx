import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  User, 
  CheckCircle, 
  Video, 
  Search, 
  MoreVertical, 
  Plus, 
  Calendar, 
  Lock, 
  DollarSign,
  Clock,
  ShieldCheck,
  CheckCheck,
  Check
} from 'lucide-react';

const MessageChat = ({ recipient, messages: initialMessages, negotiation }) => {
  const [messages, setMessages] = useState(initialMessages || []);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    setMessages([...messages, { 
      id: Date.now(), 
      text: newMessage, 
      sender: 'patient', 
      timestamp: new Date().toISOString()
    }]);
    setNewMessage('');
  };

  const formatTime = (isoString) => {
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-1 flex-col h-full bg-ayur-soft-mint/30 overflow-hidden relative">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-ayur-sage/10 flex items-center justify-between shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-ayur-sage-light rounded-full flex items-center justify-center text-ayur-sage">
            <User size={24} />
          </div>
          <div>
            <h3 className="text-base font-bold text-ayur-forest leading-none">{recipient?.name || 'Practitioner'}</h3>
            <div className="flex items-center gap-1.5 mt-1">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[11px] text-ayur-sage font-bold uppercase tracking-wider">Active Session</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-5 text-ayur-sage">
          <div className="p-2 hover:bg-ayur-sage-light rounded-lg cursor-pointer transition-colors">
            <Video size={20} />
          </div>
          <div className="p-2 hover:bg-ayur-sage-light rounded-lg cursor-pointer transition-colors">
            <Search size={20} />
          </div>
          <div className="p-2 hover:bg-ayur-sage-light rounded-lg cursor-pointer transition-colors">
            <MoreVertical size={20} />
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col space-y-6 bg-gradient-to-br from-white via-ayur-soft-mint/10 to-white custom-scrollbar pb-32">
        {/* Negotiation Card if available */}
        {negotiation && (
          <div className="flex justify-center">
            <div className="w-full max-w-[340px] bg-white rounded-3xl shadow-2xl border border-ayur-sage/5 overflow-hidden">
              {/* Header with Practitioner name */}
              <div className="bg-gradient-to-r from-ayur-sage to-ayur-forest px-6 py-4 text-white">
                <div className="text-xs font-bold uppercase tracking-[0.15em] opacity-90">Ayur Sage</div>
                <h3 className="text-3xl font-black mt-2 tracking-tight">₹{negotiation.price}</h3>
              </div>
              
              <div className="p-6 space-y-5">
                {/* Session Info Grid */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-ayur-sage" />
                      <span className="text-xs font-bold text-ayur-sage/70 uppercase tracking-wide">Duration</span>
                    </div>
                    <span className="text-sm font-bold text-ayur-forest">{negotiation.consultation_time} min</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Video size={14} className="text-ayur-sage" />
                      <span className="text-xs font-bold text-ayur-sage/70 uppercase tracking-wide">Mode</span>
                    </div>
                    <span className="inline-block bg-ayur-sage/10 text-ayur-sage text-xs font-black px-3 py-1.5 rounded-full uppercase tracking-tight">
                      {negotiation.consultation_mode}
                    </span>
                  </div>
                </div>

                <div className="border-t border-ayur-sage/10"></div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button className="flex-1 bg-ayur-forest hover:bg-ayur-sage text-white font-bold py-3 rounded-2xl transition-all duration-300 uppercase text-xs tracking-wider shadow-lg hover:shadow-xl active:scale-95">
                    Accept
                  </button>
                  <button className="flex-1 border-2 border-ayur-sage text-ayur-sage hover:bg-ayur-sage/5 font-bold py-3 rounded-2xl transition-all duration-300 uppercase text-xs tracking-wider">
                    Counter
                  </button>
                </div>

                <div className="flex items-center justify-center gap-2 py-2.5 text-ayur-sage/60 text-[10px] font-medium">
                  <Lock size={11} strokeWidth={2.5} />
                  <span>Encrypted terms</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg) => {
          const isPatient = msg.sender === 'patient';
          return (
            <div 
              key={msg.id} 
              className={`flex flex-col ${isPatient ? 'items-end' : 'items-start'} group/msg animate-in fade-in slide-in-from-bottom-2`}
            >
              <span className="text-[9px] font-black text-ayur-sage uppercase tracking-[0.15em] mb-2.5 px-1 opacity-60">
                {isPatient ? '● Patient (You)' : '● Practitioner'}
              </span>
              <div className={`px-5 py-3.5 rounded-[32px] text-[14px] font-medium shadow-md max-w-[75%] relative transition-all ${
                isPatient 
                  ? 'bg-gradient-to-br from-ayur-forest to-ayur-sage text-white rounded-br-none' 
                  : 'bg-white text-ayur-forest border border-ayur-sage/15 rounded-bl-none shadow-sm'
              }`}>
                {msg.text}
              </div>
              <div className={`flex items-center gap-1.5 mt-2.5 px-1 ${isPatient ? 'flex-row-reverse' : 'flex-row'}`}>
                <span className="text-[9px] font-bold text-ayur-sage/50 uppercase tracking-wider">
                  {formatTime(msg.timestamp || new Date())}
                </span>
                {isPatient && (
                  <CheckCheck size={11} className="text-emerald-300 opacity-70" />
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Floating Pill */}
      <div className="fixed bottom-0 left-0 right-0 px-6 py-5 bg-gradient-to-t from-white/95 via-white to-white/90 backdrop-blur-sm">
        <form 
          onSubmit={handleSendMessage} 
          className="flex items-center gap-0 max-w-2xl mx-auto bg-white shadow-2xl rounded-full border border-ayur-sage/10 overflow-hidden transition-all duration-300 hover:shadow-3xl focus-within:ring-2 focus-within:ring-ayur-sage/30"
        >
          {/* Plus Button */}
          <button 
            type="button" 
            className="p-3.5 text-ayur-sage hover:text-ayur-forest hover:bg-ayur-sage/5 transition-all flex-shrink-0"
          >
            <Plus size={22} className="stroke-[2.5]" />
          </button>

          {/* Input */}
          <input 
            type="text" 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Synthesize your thoughts..." 
            className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-ayur-forest placeholder:text-ayur-sage/40 px-4 py-4"
          />

          {/* Send Button */}
          <button 
            type="submit"
            disabled={!newMessage.trim()}
            className="w-12 h-12 bg-gradient-to-br from-ayur-forest to-ayur-sage text-white rounded-full flex items-center justify-center disabled:opacity-40 disabled:grayscale transition-all shadow-lg hover:shadow-xl active:scale-95 flex-shrink-0 m-1.5 group"
          >
            <Send size={18} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default MessageChat;
