import React, { useState } from 'react';
import { Calendar, Clock, MapPin, User, MessageSquare, ArrowRight, Video, Stethoscope, ChevronRight, Activity, X, ExternalLink, Navigation, Loader2, Trash2 } from 'lucide-react';

const AppointmentCard = ({ appointment, onDelete }) => {
   const [loading, setLoading] = useState(false);
   const [showSessionInfo, setShowSessionInfo] = useState(false);
   const isConfirmed = (appointment.status || "").toLowerCase() === 'confirmed';
   const isPending = (appointment.status || "").toLowerCase() === 'pending';
   const isCancelled = (appointment.status || "").toLowerCase() === 'cancelled';

   const formatTime = (date) => {
      if (!date) return null;
      return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
   };

   const doctorName = appointment.doctor || (appointment.doctorId?.basicInfo?.name ? `Dr. ${appointment.doctorId.basicInfo.name}` : 'Practitioner');
   const specialty = appointment.specialty || appointment.doctorId?.professionalInfo?.specialization || 'Clinical Expert';
   const apptDate = appointment.date || (appointment.startTime ? new Date(appointment.startTime).toLocaleDateString() : appointment.createdAt ? new Date(appointment.createdAt).toLocaleDateString() : 'TBD');
   const apptTime = formatTime(appointment.startTime) || appointment.time || 'TBD';

   // Robust type detection based on model
   const type = (appointment.type || appointment.appointmentType || 'online').toLowerCase();
   const isOnline = type === 'online';
   const displayType = isOnline ? 'Virtual Session' : (type === 'clinic' ? 'Clinical Visit' : 'Follow-up');

   const clinicInfo = appointment.doctorId?.clinicInfo || {};
   const fullAddress = [clinicInfo.address, clinicInfo.city, clinicInfo.state, clinicInfo.pincode].filter(Boolean).join(', ');
   const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clinicInfo.clinicName + ' ' + fullAddress)}`;
   const meetingLink = appointment.meetingLink || '#';

   return (
      <div
         className="bg-white p-8 rounded-[32px] border-2 border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-gray-200/50 hover:-translate-y-2 transition-all duration-500 group relative overflow-hidden flex flex-col justify-between min-h-[440px]"
         onMouseLeave={() => setShowSessionInfo(false)}
      >
         <div className={`absolute top-0 right-0 w-32 h-1.5 ${isConfirmed ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : isPending ? 'bg-amber-500 shadow-[0_0_10px_#f59e0b]' : isCancelled ? 'bg-red-500 shadow-[0_0_10px_#ef4444]' : 'bg-gray-200'}`}></div>

         <button
            onClick={async (e) => {
               e.stopPropagation();
               if (window.confirm('Hide this appointment from your schedule?')) {
                  setLoading(true);
                  try {
                     await onDelete(appointment._id);
                  } finally {
                     setLoading(false);
                  }
               }
            }}
            disabled={loading}
            className="absolute top-4 right-4 w-10 h-10 bg-white/80 backdrop-blur-md border border-gray-100 rounded-2xl flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-100 hover:bg-red-50 transition-all z-20 shadow-sm opacity-0 group-hover:opacity-100 disabled:opacity-50"
            title="Hide Appointment"
         >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={20} />}
         </button>

         <div className="relative z-10 space-y-8 flex-1">
            <div className="flex items-start justify-between">
               <div className="w-16 h-16 bg-[#f8faf9] border-2 border-gray-100 rounded-2xl overflow-hidden flex items-center justify-center text-black group-hover:scale-105 transition-transform duration-300 relative shadow-inner">
                  <Activity size={28} strokeWidth={2.5} className="group-hover:text-emerald-500 transition-colors" />
               </div>
               <div className="flex flex-col items-end gap-2 pt-1 text-right">
                  <span className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[2px] border-2 shadow-sm flex items-center gap-2 ${isConfirmed ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        isPending ? 'bg-amber-50 text-amber-600 border-amber-100' :
                        isCancelled ? 'bg-red-50 text-red-600 border-red-100' :
                           'bg-gray-50 text-gray-400 border-gray-100'
                     }`}>
                     <div className={`w-1.5 h-1.5 rounded-full ${isConfirmed ? 'bg-emerald-500 animate-pulse' : isPending ? 'bg-amber-500' : isCancelled ? 'bg-red-500' : 'bg-gray-300'}`}></div>
                     {appointment.status || 'Scheduled'}
                  </span>
                  <div className="flex items-center gap-2 px-3 py-1 text-[9px] font-black uppercase tracking-[2px] text-gray-400">
                     {isOnline ? <Video size={10} strokeWidth={3} /> : <MapPin size={10} strokeWidth={3} />}
                     <span>{displayType}</span>
                  </div>
               </div>
            </div>

            <div className="space-y-6">
               <div className="space-y-2">
                  <h3 className="text-2xl font-black text-black tracking-tight leading-none group-hover:text-ayur-forest transition-colors uppercase italic">{doctorName}</h3>
                  <p className="text-[10px] font-black uppercase tracking-[3px] text-black opacity-40">{specialty}</p>
               </div>

               <div className="grid grid-cols-2 gap-4 py-6 border-y-2 border-gray-50 mb-4">
                  <div className="space-y-2">
                     <div className="flex items-center gap-2 text-black leading-none font-black text-[9px] uppercase tracking-[3px] opacity-30">
                        <Calendar size={14} strokeWidth={2.5} />
                        <span>Date</span>
                     </div>
                     <span className="font-black text-black text-[15px] tracking-tight truncate block italic">{apptDate}</span>
                  </div>
                  <div className="space-y-2">
                     <div className="flex items-center gap-2 text-black leading-none font-black text-[9px] uppercase tracking-[3px] opacity-30">
                        <Clock size={14} strokeWidth={2.5} />
                        <span>Time</span>
                     </div>
                     <span className="font-black text-black text-[15px] tracking-tight truncate block italic">{apptTime}</span>
                  </div>
               </div>
            </div>
         </div>

         <div className="pt-8 flex gap-4 relative z-10">
            <button
               onClick={() => setShowSessionInfo(true)}
               className="flex-1 bg-black text-white py-4.5 rounded-2xl font-black text-[11px] uppercase tracking-[3px] shadow-xl shadow-black/10 hover:shadow-black/20 hover:translate-y-[-2px] active:translate-y-0 transition-all flex items-center justify-center gap-3 group/btn"
            >
               <span>Access Session</span>
               <ChevronRight size={16} strokeWidth={3} className="group-hover/btn:translate-x-1 transition-transform" />
            </button>
            <button className="p-4.5 bg-white border-2 border-gray-100 text-black rounded-2xl hover:bg-gray-50 hover:border-black transition-all shadow-sm active:scale-95 group/msg">
               <MessageSquare size={20} strokeWidth={2.5} className="group-hover/msg:rotate-12 transition-transform" />
            </button>
         </div>

         {/* Session Access Overlay - Pops up within the card */}
         {showSessionInfo && (
            <div className="absolute inset-0 z-50 bg-white p-10 rounded-[30px] border-2 border-black flex flex-col justify-center animate-in slide-in-from-bottom-full duration-500 shadow-2xl">
               <div className="space-y-8">
                  <div className="space-y-3">
                     <div className="flex items-center gap-2 text-black font-black uppercase text-[10px] tracking-[4px]">
                        {isOnline ? <Video size={16} className="text-emerald-500" /> : <MapPin size={16} className="text-emerald-500" />}
                        <span>{isOnline ? 'Virtual Hub' : 'Physical Clinic'}</span>
                     </div>
                     <h2 className="text-3xl font-black text-black tracking-tighter uppercase italic leading-none">
                        {isOnline ? 'Access' : 'Visit'} <span className="text-emerald-500">{isOnline ? 'Session' : 'Hospital'}</span>
                     </h2>
                  </div>

                  {isOnline ? (
                     <div className="space-y-6">
                        <div className="space-y-4">
                           {appointment.meetingLink ? (
                              <a
                                 href={meetingLink}
                                 target="_blank"
                                 rel="noopener noreferrer"
                                 className="w-full flex items-center justify-between p-5 bg-[#f8faf9] border-2 border-gray-100 rounded-2xl hover:border-emerald-500/30 transition-all group/link"
                              >
                                 <span className="text-[12px] font-bold text-gray-400 truncate max-w-[150px]">{meetingLink}</span>
                                 <ExternalLink size={16} className="text-emerald-500" />
                              </a>
                           ) : (
                              <div className="p-5 bg-amber-50 border-2 border-amber-100 rounded-2xl">
                                 <p className="text-[10px] font-black uppercase tracking-[1px] text-amber-600 text-center italic">Awaiting session link...</p>
                              </div>
                           )}
                        </div>

                        <button
                           disabled={!appointment.meetingLink}
                           onClick={() => window.open(meetingLink, '_blank')}
                           className={`w-full py-4.5 rounded-[22px] font-black uppercase tracking-[3px] text-[11px] flex items-center justify-center gap-4 transition-all ${appointment.meetingLink
                                 ? 'bg-black text-white hover:scale-[1.02] shadow-xl shadow-black/20'
                                 : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              }`}
                        >
                           <span>Join Now</span>
                           <ArrowRight size={18} strokeWidth={3} />
                        </button>
                     </div>
                  ) : (
                     <div className="space-y-6">
                        <div className="space-y-4">
                           <div className="p-5 bg-[#f8faf9] border-2 border-gray-100 rounded-2xl">
                              <h4 className="font-black text-black uppercase italic text-sm tracking-tight mb-2">{clinicInfo.clinicName || 'The Wellness Center'}</h4>
                              <p className="text-[11px] font-bold text-gray-400 uppercase leading-relaxed">{clinicInfo.address}, {clinicInfo.city}</p>
                           </div>
                        </div>

                        <a
                           href={mapsUrl}
                           target="_blank"
                           rel="noopener noreferrer"
                           className="w-full py-4.5 bg-black text-white rounded-[22px] font-black uppercase tracking-[3px] text-[11px] flex items-center justify-center gap-4 hover:scale-[1.02] transition-all shadow-xl shadow-black/20"
                        >
                           <span>Open Maps</span>
                           <MapPin size={18} strokeWidth={3} />
                        </a>
                     </div>
                  )}

                  <p className="text-[9px] font-black uppercase tracking-[2px] text-gray-300 text-center">Move cursor away to close</p>
               </div>
            </div>
         )}
      </div>
   );
};

export default AppointmentCard;
