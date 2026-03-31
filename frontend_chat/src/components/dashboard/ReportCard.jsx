import React from 'react';
import { FileText, Download, Eye, Calendar, Activity, AlertCircle, TrendingUp, ShieldCheck } from 'lucide-react';

const ReportCard = ({ report }) => {
  return (
    <div className="bg-white p-10 rounded-[32px] border-2 border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-gray-200/50 hover:-translate-y-2 transition-all duration-500 group relative overflow-hidden flex flex-col justify-between min-h-[480px]">
      <div className="absolute top-0 right-0 w-32 h-1.5 bg-ayur-forest opacity-10"></div>
      
      <div className="relative z-10 space-y-10 flex-1">
        <div className="flex items-start justify-between">
           <div className="w-16 h-16 bg-[#f8faf9] border-2 border-gray-100 rounded-2xl flex items-center justify-center text-black shadow-inner group-hover:scale-105 group-hover:rotate-3 transition-all duration-500 relative ring-4 ring-white">
              <FileText size={28} strokeWidth={2.5} />
           </div>
           <div className="flex flex-col items-end gap-2 text-right">
              <span className="px-5 py-2 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-[3px] border-2 border-emerald-100 flex items-center gap-1.5 transition-all">
                 <ShieldCheck size={12} strokeWidth={3} />
                 <span>Verified</span>
              </span>
              <div className="flex items-center gap-2 text-gray-400 font-black text-[10px] uppercase tracking-[3px] mt-1 mr-2 px-1">
                 <Calendar size={12} strokeWidth={2.5} />
                 <span>{report.date || new Date(report.createdAt).toLocaleDateString()}</span>
              </div>
           </div>
        </div>
        
        <div className="space-y-8">
           <div className="space-y-4">
              <h3 className="text-3xl font-black text-black tracking-tighter leading-tight uppercase italic group-hover:text-ayur-forest transition-colors line-clamp-2">{report.diagnosis?.name || report.diagnosis}</h3>
              <div className="flex flex-wrap gap-2.5 transition-all">
                {(report.symptoms || "").split(',').filter(Boolean).map((tag, idx) => (
                  <span key={idx} className="bg-white text-black px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 border-gray-100 shadow-sm">{tag.trim()}</span>
                ))}
              </div>
           </div>
           
           <div className="bg-[#fcfdfd] p-8 rounded-2xl border-2 border-dashed border-gray-100 relative group/insight overflow-hidden flex flex-col justify-center">
              <div className="absolute top-4 right-4 text-emerald-500 opacity-20 group-hover:rotate-12 transition-transform duration-500">
                 <TrendingUp size={18} strokeWidth={2.5} />
              </div>
              <p className="text-[15px] font-bold text-black leading-relaxed italic pr-6 opacity-60 line-clamp-3">"{report.recommendations || report.doshaRecommendation || 'Nourishing holistic protocol applied.'}"</p>
           </div>
        </div>
      </div>
      
      <div className="pt-10 flex gap-4 relative z-10">
         <Link to={`/chat/${report.sessionId || ''}`} className="flex-1 bg-black text-white py-5 rounded-2xl font-black uppercase tracking-[3px] text-[11px] shadow-xl shadow-black/20 hover:bg-ayur-forest active:scale-95 transition-all flex items-center justify-center gap-3">
            <Eye size={18} strokeWidth={3} />
            <span>Open Report</span>
         </Link>
         <button className="p-5 bg-white border-2 border-gray-100 text-black rounded-2xl hover:bg-gray-50 hover:border-black transition-all shadow-sm active:scale-95 group/down">
            <Download size={22} className="group-hover:translate-y-1 transition-transform" strokeWidth={3} />
         </button>
      </div>
    </div>
  );
};

export default ReportCard;
