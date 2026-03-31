import React, { useState, useEffect } from 'react';
import ReportCard from '../../components/dashboard/ReportCard';
import { Search, Filter, SlidersHorizontal, Activity, FileText, ChevronRight, Loader2 } from 'lucide-react';
import { patientApi } from '../../services/api';
import { Link } from 'react-router-dom';

const Consultations = () => {
  const [reports, setReports] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      try {
        const res = await patientApi.getReports();
        setReports(res.data);
      } catch (err) {
        console.error('Failed to fetch reports:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  const filteredReports = reports.filter(report => {
    const diagnosisName = report.diagnosis?.name || '';
    const symptoms = report.symptoms?.join(', ') || '';
    return diagnosisName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           symptoms.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="h-full overflow-y-auto custom-scrollbar px-4 sm:px-6 md:px-8 lg:px-12 py-10 bg-white">
      <div className="max-w-[1240px] mx-auto space-y-12 pb-20">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-10 pb-8 border-b-2 border-gray-100">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-black font-black uppercase text-[10px] tracking-[4px]">
               <FileText size={16} strokeWidth={2.5} className="text-emerald-500" />
               <span>Clinical Repository</span>
            </div>
            <h1 className="text-5xl font-black text-black tracking-tighter uppercase italic">Your AI <span className="text-ayur-sage">Reports</span></h1>
            <p className="text-black font-semibold text-lg opacity-60 leading-tight">Comprehensive synthesis of all biological assessments.</p>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="relative group/search min-w-[340px]">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within/search:text-black transition-colors" size={18} strokeWidth={2.5} />
                <input 
                  type="text" 
                  placeholder="Search diagnoses or symptoms..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-6 py-4 bg-[#f8faf9] border-2 border-transparent focus:border-ayur-forest/30 focus:bg-white rounded-2xl outline-none text-sm font-bold text-black transition-all duration-300 shadow-sm"
                />
             </div>
             <button className="p-4 bg-white border-2 border-gray-100 text-gray-400 rounded-2xl hover:text-black hover:border-black transition-all shadow-sm active:scale-95 group">
                <SlidersHorizontal size={20} className="group-hover:rotate-180 transition-transform duration-500" strokeWidth={2.5} />
             </button>
          </div>
        </header>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
             {[1,2,3].map(i => <div key={i} className="h-80 bg-[#f8faf9] border-2 border-gray-100 rounded-[32px] animate-pulse"></div>)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
             {filteredReports.map(report => (
               <ReportCard key={report._id} report={report} />
             ))}
             
             {filteredReports.length === 0 && (
                <div className="col-span-full py-32 flex flex-col items-center justify-center text-center space-y-8 bg-[#fcfdfd] border-2 border-dashed border-gray-100 rounded-[48px] animate-fade-in shadow-inner">
                   <div className="relative w-28 h-28 bg-white border-2 border-gray-100 rounded-[40px] flex items-center justify-center text-gray-100 shadow-sm">
                      <FileText size={64} className="opacity-5 scale-125" />
                      <Search size={32} className="absolute text-emerald-500" strokeWidth={2.5} />
                   </div>
                   <div className="space-y-2">
                      <h3 className="text-2xl font-black text-black uppercase italic tracking-tight">Zero Matches Detected</h3>
                      <p className="text-gray-400 font-bold text-[13px] uppercase tracking-widest leading-relaxed">System failed to correlate search parameters with records.</p>
                   </div>
                   <Link to="/chat" className="bg-black text-white px-12 py-4 rounded-[22px] font-black uppercase tracking-[3px] text-[11px] shadow-xl shadow-black/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-4">
                      <span>Begin Synthesis</span>
                      <Activity size={16} strokeWidth={3} className="text-emerald-500" />
                   </Link>
                </div>
             )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Consultations;
