import React, { useState, useEffect } from 'react';
import AppointmentCard from '../../components/dashboard/AppointmentCard';
import { Calendar as CalendarIcon, Filter, Search, PlusCircle, LayoutGrid, List, Activity, Loader2, Video, MapPin, X, ExternalLink, Navigation, ArrowRight, ChevronRight, Trash2 } from 'lucide-react';
import { patientApi, docConnectApi } from '../../services/api';
import { Link, useNavigate } from 'react-router-dom';

const Appointments = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('grid');
  const [selectedAppt, setSelectedAppt] = useState(null);

  const handleOpenChat = async (doctorId) => {
    try {
      const res = await docConnectApi.createChat(doctorId);
      navigate(`/messages/${res.data._id}`);
    } catch (err) {
      console.error('Failed to open chat:', err);
    }
  };

  const formatTime = (date) => {
    if (!date) return null;
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const res = await patientApi.getAppointments();
      setAppointments(res.data);
    } catch (err) {
      console.error('Failed to fetch appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAppointment = async (id) => {
    console.log('🗑 Attempting to hide appointment:', id);
    try {
      const res = await patientApi.hideAppointment(id);
      console.log('✅ Backend hide successful:', res.data);
      setAppointments(prev => {
        const filtered = prev.filter(appt => {
          const apptId = appt._id?.toString() || appt.id?.toString();
          return apptId !== id.toString();
        });
        console.log(`📊 Filtered list from ${prev.length} to ${filtered.length} items`);
        return filtered;
      });
    } catch (err) {
      console.error('❌ Failed to hide appointment:', err);
    }
  };

  return (
    <div className="h-full overflow-y-auto custom-scrollbar px-4 sm:px-6 md:px-8 lg:px-12 py-10 bg-white">
      <div className="max-w-[1240px] mx-auto space-y-12 pb-20">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-8 border-b-2 border-gray-100">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-500 font-bold text-xs tracking-tight">
               <CalendarIcon size={16} strokeWidth={2.5} className="text-emerald-500" />
               <span>Protocol Scheduler</span>
            </div>
            <h1 className="text-5xl font-bold text-slate-900 tracking-tight">Your <span className="text-emerald-600">Schedule</span></h1>
            <p className="text-black font-semibold text-lg opacity-60 leading-tight">Coordinate and track your upcoming health assessments.</p>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="bg-[#f8faf9] p-1.5 rounded-[18px] flex gap-1 border-2 border-gray-100">
                <button 
                  onClick={() => setView('grid')}
                  className={`px-6 py-2.5 rounded-lg transition-all duration-300 text-xs font-bold tracking-tight ${view === 'grid' ? 'bg-white text-slate-900 shadow-sm ring-2 ring-slate-200' : 'text-slate-400 hover:text-slate-900'}`}
                >
                  Grid
                </button>
                <button 
                  onClick={() => setView('list')}
                  className={`px-6 py-2.5 rounded-lg transition-all duration-300 text-xs font-bold tracking-tight ${view === 'list' ? 'bg-white text-slate-900 shadow-sm ring-2 ring-slate-200' : 'text-slate-400 hover:text-slate-900'}`}
                >
                   List
                </button>
             </div>
             <Link to="/find-doctors" className="flex items-center gap-3 px-10 py-3 bg-slate-900 text-white rounded-lg font-bold shadow-lg shadow-slate-900/20 hover:bg-slate-800 active:scale-95 transition-all group leading-none text-xs tracking-tight">
                <PlusCircle size={20} strokeWidth={2.5} className="text-emerald-500" />
                <span>New Booking</span>
             </Link>
          </div>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] space-y-6">
             <div className="relative">
                <div className="w-16 h-16 border-4 border-emerald-500/10 border-t-emerald-500 rounded-full animate-spin"></div>
                <Activity size={24} className="absolute inset-0 m-auto text-emerald-500 animate-pulse" />
             </div>
             <p className="text-xs font-bold tracking-tight text-slate-400">Synchronizing Registry...</p>
          </div>
        ) : appointments.length === 0 ? (
          <div className="col-span-full py-40 border-2 border-dashed border-gray-100 rounded-[48px] flex flex-col items-center justify-center text-center space-y-8 bg-[#fcfdfd] shadow-inner">
             <div className="w-24 h-24 bg-white border-2 border-gray-100 rounded-[400px] flex items-center justify-center text-gray-100 shadow-sm">
                <CalendarIcon size={48} strokeWidth={2.5} />
             </div>
             <div className="space-y-2">
               <h3 className="text-2xl font-black text-black uppercase italic tracking-tight">Zero Protocols Active</h3>
               <p className="text-gray-400 font-bold text-[13px] uppercase tracking-widest leading-relaxed">No medical sessions are currently scheduled in the system.</p>
             </div>
             <Link to="/find-doctors" className="px-12 py-4 bg-black text-white rounded-[22px] font-black shadow-xl shadow-black/20 uppercase tracking-[3px] text-[11px] hover:scale-105 transition-all">Engage Network</Link>
          </div>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
             {appointments.map(appt => (
               <AppointmentCard 
                 key={appt._id} 
                 appointment={appt} 
                 onDelete={handleDeleteAppointment}
                 onChat={() => handleOpenChat(appt.doctorId?._id || appt.doctorId)}
               />
             ))}
          </div>
        ) : (
          <div className="bg-white rounded-[32px] border-2 border-gray-100 overflow-hidden shadow-sm">
             <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                   <thead className="bg-[#fcfdfd] border-b-2 border-gray-100">
                      <tr>
                         <th className="px-8 py-7 font-bold tracking-tight text-xs text-slate-400">Doctor</th>
                         <th className="px-8 py-7 font-bold tracking-tight text-xs text-slate-400">Date & Time</th>
                         <th className="px-8 py-7 font-bold tracking-tight text-xs text-slate-400">Mode</th>
                         <th className="px-8 py-7 font-bold tracking-tight text-xs text-slate-400">Status</th>
                         <th className="px-8 py-7 font-bold tracking-tight text-xs text-slate-400 text-right">Reference</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y-2 divide-gray-50">
                      {appointments.map(appt => (
                        <tr key={appt._id} className="hover:bg-[#f8faf9] transition-colors group">
                           <td className="px-8 py-7">
                              <div className="flex items-center gap-5">
                                 <div className="w-12 h-12 rounded-xl bg-white border-2 border-gray-100 flex items-center justify-center text-black shadow-inner group-hover:border-ayur-forest/20 transition-all">
                                    <Activity size={20} strokeWidth={2.5} />
                                 </div>
                                 <div>
                                    <h4 className="font-bold text-slate-900 text-base tracking-tight truncate max-w-[200px]">Dr. {appt.doctorId?.basicInfo?.name || 'Practitioner'}</h4>
                                    <span className="text-xs font-bold text-emerald-600 tracking-tight">{appt.doctorId?.professionalInfo?.specialization || 'Consultant'}</span>
                                 </div>
                              </div>
                           </td>
                           <td className="px-8 py-7">
                              <div className="flex flex-col gap-1">
                                 <span className="font-bold text-slate-900 text-base tracking-tight">
                                    {appt.startTime 
                                      ? new Date(appt.startTime).toLocaleDateString() 
                                      : new Date(appt.createdAt).toLocaleDateString()}
                                 </span>
                                 <span className="text-xs font-bold text-slate-400 tracking-tight">
                                    {formatTime(appt.startTime) || appt.time || 'TBD'}
                                 </span>
                              </div>
                           </td>
                           <td className="px-8 py-7">
                              {(() => {
                                const type = (appt.type || appt.appointmentType || 'online').toLowerCase();
                                const isOnline = type === 'online';
                                const label = isOnline ? 'Virtual' : (type === 'clinic' ? 'Clinical' : 'Follow-up');
                                return (
                                  <div className="flex items-center gap-2">
                                     {isOnline ? <Video size={14} className="text-emerald-500" /> : <MapPin size={14} className="text-emerald-500" />}
                                     <span className="px-4 py-1.5 bg-slate-100 text-emerald-600 rounded-lg font-bold tracking-tight text-xs border border-emerald-200 capitalize shadow-sm">{label}</span>
                                  </div>
                                );
                              })()}
                           </td>
                           <td className="px-8 py-7">
                              <span className={`px-5 py-2.5 rounded-full text-xs font-bold tracking-tight border-2 flex items-center gap-2 w-fit ${
                                appt.status === 'confirmed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-sm shadow-emerald-100' : 
                                appt.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-100 shadow-sm shadow-amber-100' : 
                                'bg-slate-50 text-slate-400 border-slate-100'
                              }`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${appt.status === 'confirmed' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></div>
                                {appt.status}
                              </span>
                           </td>
                           <td className="px-8 py-7 text-right">
                              <div className="flex items-center justify-end gap-3 opacity-20 group-hover:opacity-100 transition-opacity">
                                 <button 
                                   onClick={() => handleOpenChat(appt.doctorId?._id || appt.doctorId)}
                                   className="p-2.5 bg-white border-2 border-gray-100 text-indigo-500 hover:text-indigo-600 hover:border-indigo-100 hover:bg-indigo-50 transition-all shadow-sm"
                                 >
                                    <MessageSquare size={16} strokeWidth={3} />
                                 </button>
                                <button 
                                  onClick={() => setSelectedAppt(appt)}
                                  className="px-6 py-2.5 bg-slate-900 text-white rounded-lg font-bold text-xs tracking-tight shadow-lg shadow-slate-900/10 hover:bg-slate-800 active:scale-95 transition-all flex items-center gap-2"
                                >
                                   <span>Access</span>
                                   <ChevronRight size={14} strokeWidth={3} />
                                </button>
                                <button 
                                  onClick={() => {
                                    if (window.confirm('Hide this appointment?')) handleDeleteAppointment(appt._id);
                                  }}
                                  className="p-2.5 bg-white border-2 border-gray-100 text-gray-400 hover:text-red-500 hover:border-red-100 hover:bg-red-50 transition-all shadow-sm"
                                  title="Hide"
                                >
                                   <Trash2 size={16} strokeWidth={3} />
                                </button>
                              </div>
                           </td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        )}
      </div>

      {/* Shared Session Access Modal */}
      {selectedAppt && (() => {
        const type = (selectedAppt.type || selectedAppt.appointmentType || 'online').toLowerCase();
        const isOnline = type === 'online';
        const clinicInfo = selectedAppt.doctorId?.clinicInfo || {};
        const fullAddress = [clinicInfo.address, clinicInfo.city, clinicInfo.state, clinicInfo.pincode].filter(Boolean).join(', ');
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clinicInfo.clinicName + ' ' + fullAddress)}`;
        const meetingLink = selectedAppt.meetingLink || '#';

        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-300">
            <div 
              className="bg-white w-full max-w-md rounded-[40px] p-10 relative shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-10 duration-300 border-2 border-gray-100"
              onMouseLeave={() => setSelectedAppt(null)}
            >
               <div className="space-y-8">
                  <div className="space-y-3">
                     <div className="flex items-center gap-2 text-slate-500 font-bold text-xs tracking-tight">
                        {isOnline ? <Video size={16} className="text-emerald-500" /> : <MapPin size={16} className="text-emerald-500" />}
                        <span>{isOnline ? 'Virtual Hub' : 'Physical Clinic'}</span>
                     </div>
                     <h2 className="text-4xl font-bold text-slate-900 tracking-tight leading-none">
                        {isOnline ? 'Access' : 'Visit'} <span className="text-emerald-600">{isOnline ? 'Session' : 'Hospital'}</span>
                     </h2>
                  </div>

                  {isOnline ? (
                     <div className="space-y-6">
                        <div className="p-8 bg-[#f8faf9] border-2 border-gray-100 rounded-[32px] space-y-6">
                           <div className="flex items-center gap-4">
                              <div className="w-14 h-14 bg-white border-2 border-gray-100 rounded-2xl flex items-center justify-center text-emerald-500 shadow-sm">
                                 <Video size={24} strokeWidth={2.5} />
                              </div>
                              <div>
                                 <h4 className="font-bold text-slate-900 text-lg tracking-tight">Google Meet</h4>
                                 <p className="text-xs font-bold tracking-tight text-slate-400">Secured Clinical Line</p>
                              </div>
                           </div>
                           
                           {selectedAppt.meetingLink ? (
                             <a 
                               href={meetingLink} 
                               target="_blank" 
                               rel="noopener noreferrer"
                               className="w-full flex items-center justify-between p-5 bg-white border-2 border-gray-100 rounded-2xl hover:border-emerald-500/30 transition-all group/link"
                             >
                                <span className="text-[12px] font-bold text-gray-400 truncate max-w-[200px]">{meetingLink}</span>
                                <ExternalLink size={16} className="text-emerald-500 group-hover/link:translate-x-1 group-hover/link:-translate-y-1 transition-transform" />
                             </a>
                           ) : (
                             <div className="p-5 bg-amber-50 border-2 border-amber-100 rounded-lg">
                                <p className="text-xs font-bold tracking-tight text-amber-600 text-center">Waiting for practitioner to generate session link...</p>
                             </div>
                           )}
                        </div>
                        
                        <button 
                          disabled={!selectedAppt.meetingLink}
                          onClick={() => window.open(meetingLink, '_blank')}
                          className={`w-full py-5 rounded-lg font-bold tracking-tight text-sm flex items-center justify-center gap-4 transition-all shadow-lg ${
                            selectedAppt.meetingLink 
                              ? 'bg-slate-900 text-white hover:bg-slate-800 active:scale-95 shadow-slate-900/20' 
                              : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                          }`}
                        >
                           <span>Join Consultation</span>
                           <ArrowRight size={18} strokeWidth={3} />
                        </button>
                     </div>
                  ) : (
                     <div className="space-y-6">
                        <div className="p-8 bg-[#f8faf9] border-2 border-gray-100 rounded-[32px] space-y-6">
                           <div className="space-y-4">
                              <div className="flex items-center gap-4">
                                 <div className="w-14 h-14 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                    <Navigation size={24} strokeWidth={2.5} />
                                 </div>
                                 <div>
                                    <h4 className="font-bold text-slate-900 text-lg tracking-tight">{clinicInfo.clinicName || 'The Wellness Center'}</h4>
                                    <p className="text-xs font-bold tracking-tight text-emerald-600">Physical Assessment Hub</p>
                                 </div>
                              </div>
                              
                              <div className="p-6 bg-white border-2 border-gray-100 rounded-2xl space-y-2">
                                 <p className="text-base font-bold text-slate-900 leading-tight tracking-tight">{clinicInfo.address}</p>
                                 <p className="text-xs font-bold text-slate-400 tracking-tight">{clinicInfo.city}, {clinicInfo.state} {clinicInfo.pincode}</p>
                              </div>
                           </div>
                        </div>
                        
                        <a 
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-5 bg-slate-900 text-white rounded-lg font-bold tracking-tight text-sm flex items-center justify-center gap-4 hover:bg-slate-800 active:scale-95 transition-all shadow-lg shadow-slate-900/20"
                        >
                           <span>View on Google Maps</span>
                           <MapPin size={18} strokeWidth={3} />
                        </a>
                     </div>
                  )}

                  <p className="text-center text-xs font-bold tracking-tight text-slate-400">
                     Move cursor away to close
                  </p>
               </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default Appointments;
