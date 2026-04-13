import React from 'react';
import { FileText, Download, Eye, Calendar, TrendingUp, ShieldCheck, Loader2 } from 'lucide-react';
import { downloadMedicalReportPDF } from '../../utils/pdfExport';
import { chatApi } from '../../services/api';

const ReportCard = ({ report, onView }) => {
  const [downloading, setDownloading] = React.useState(false);

  const handleDownload = async (e) => {
    if (e) e.stopPropagation();
    if (downloading) return;
    setDownloading(true);
    try {
      if (report.sessionId) {
        const res = await chatApi.getSession(report.sessionId);
        const sessionData = res.data;
        let diagObj = sessionData.diagnosis;
        if (typeof diagObj === 'string') {
          const cleaned = diagObj.replace(/```json/g, '').replace(/```/g, '').trim();
          const start = cleaned.indexOf('{');
          const end = cleaned.lastIndexOf('}');
          diagObj = JSON.parse(cleaned.substring(start, end + 1));
        }
        downloadMedicalReportPDF({
          ...diagObj,
          patientInfo: diagObj.patientInfo || sessionData.patientInfo || { name: 'Patient' },
          symptomsReported: diagObj.symptomsReported || diagObj.findings || [],
          dietaryGuide: diagObj.dietaryGuide || {},
          lifestyleChanges: diagObj.lifestyleChanges || diagObj.lifestyle_changes || [],
          herbalPreparations: diagObj.herbalPreparations || diagObj.herbal_preparations || [],
        });
      } else {
        downloadMedicalReportPDF({
          diagnosis: report.diagnosis,
          findings: report.symptoms?.split(', ') || [],
          root_causes: report.recommendations?.split('\n') || [],
          dietaryGuide: { toConsume: [], toAvoid: [] },
          lifestyleChanges: report.recommendations || 'Holistic guidelines provided'
        });
      }
    } catch (err) {
      console.error('Failed to download report:', err);
      downloadMedicalReportPDF({ diagnosis: report.diagnosis });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="bg-white rounded-[32px] border-2 border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-gray-200/50 hover:-translate-y-2 transition-all duration-500 overflow-hidden flex flex-col group relative">
      <div className="p-8 flex flex-col justify-between h-full min-h-[460px]">
        <div className="absolute top-0 right-0 w-32 h-1.5 bg-ayur-forest opacity-10"></div>
        
        <div className="relative z-10 space-y-10 flex-1">
          <div className="flex items-start justify-between">
             <div className="w-16 h-16 bg-[#f8faf9] border-2 border-gray-100 rounded-2xl flex items-center justify-center text-black shadow-inner group-hover:scale-105 group-hover:rotate-3 transition-all duration-500 relative ring-4 ring-white">
                <FileText size={28} strokeWidth={2.5} />
             </div>
             <div className="flex flex-col items-end gap-2 text-right">
                <span className="px-5 py-2 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold tracking-tight border-2 border-emerald-100 flex items-center gap-1.5 transition-all">
                   <ShieldCheck size={12} strokeWidth={3} />
                   <span>Verified</span>
                </span>
                <div className="flex items-center gap-2 text-slate-500 font-bold text-xs tracking-tight mt-1 mr-2 px-1">
                   <Calendar size={12} strokeWidth={2.5} />
                   <span>{report.date || new Date(report.createdAt).toLocaleDateString()}</span>
                </div>
             </div>
          </div>
          
          <div className="space-y-8">
             <div className="space-y-4">
                <h3 className="text-3xl font-black text-slate-900 tracking-tight leading-tight group-hover:text-emerald-700 transition-colors line-clamp-2">{report.diagnosis?.name || report.diagnosis}</h3>
                <div className="flex flex-wrap gap-2.5 transition-all">
                  {(report.symptoms || "").split(',').filter(Boolean).map((tag, idx) => (
                    <span key={idx} className="bg-white text-slate-700 px-4 py-1.5 rounded-lg text-xs font-bold tracking-tight border border-slate-200 shadow-sm">{tag.trim()}</span>
                  ))}
                </div>
             </div>
             
             <div className="bg-[#fcfdfd] p-8 rounded-2xl border-2 border-dashed border-gray-100 relative group/insight overflow-hidden flex flex-col justify-center">
                <div className="absolute top-4 right-4 text-emerald-500 opacity-20 group-hover:rotate-12 transition-transform duration-500">
                   <TrendingUp size={18} strokeWidth={2.5} />
                </div>
                <p className="text-base font-medium text-slate-600 leading-relaxed pr-6 opacity-70 line-clamp-3">\"{ report.recommendations || report.doshaRecommendation || 'Nourishing holistic protocol applied.' }\"</p>
             </div>
          </div>
        </div>
        
        <div className="pt-10 flex gap-4 relative z-10">
           <button 
             onClick={onView}
             className="flex-1 bg-white border-2 border-slate-900 text-slate-900 py-4 rounded-xl font-bold tracking-wide text-xs shadow-sm hover:bg-slate-900 hover:text-white active:scale-95 transition-all flex items-center justify-center gap-3"
           >
              <Eye size={18} strokeWidth={3} />
              <span>View Full Report</span>
           </button>
           <button 
             onClick={handleDownload}
             disabled={downloading}
             className="w-20 bg-slate-900 text-white py-4 rounded-xl font-bold tracking-wide text-xs shadow-lg shadow-slate-900/20 hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center disabled:bg-slate-400"
             title="Download PDF"
           >
              {downloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={20} strokeWidth={3} />}
           </button>
        </div>
      </div>
    </div>
  );
};

export default ReportCard;
