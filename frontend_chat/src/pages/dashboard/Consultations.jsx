import React, { useState, useEffect } from 'react';
import ReportCard from '../../components/dashboard/ReportCard';
import { Search, Filter, SlidersHorizontal, Activity, FileText, ChevronRight, Loader2, X, Download, Grid3x3, List } from 'lucide-react';
import { patientApi, chatApi } from '../../services/api';
import { Link } from 'react-router-dom';
import ReportRenderer from '../../ReportRenderer';
import { downloadMedicalReportPDF } from '../../utils/pdfExport';

const Consultations = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest' or 'oldest'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [fullReportData, setFullReportData] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);

  const openReportDrawer = async (report) => {
    setSelectedReportId(report._id);
    setIsDrawerOpen(true);
    setIsDetailsLoading(true);
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
        setFullReportData(diagObj);
      }
    } catch (err) {
      console.error('Failed to load full report:', err);
    } finally {
      setIsDetailsLoading(false);
    }
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setTimeout(() => {
      setFullReportData(null);
      setSelectedReportId(null);
    }, 300);
  };

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

  const sortedReports = [...reports].sort((a, b) => {
    const dateA = new Date(a.createdAt || a.date).getTime();
    const dateB = new Date(b.createdAt || b.date).getTime();
    return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
  });

  return (
    <div className="h-full overflow-y-auto custom-scrollbar px-4 sm:px-6 md:px-8 lg:px-12 py-8">
      <div className="max-w-[1240px] mx-auto space-y-8 pb-20">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-10 pb-4 border-b border-slate-200">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-emerald-600 font-bold uppercase text-[10px] tracking-[2px]">
              <FileText size={14} strokeWidth={2.5} />
              <span>Clinical Repository</span>
            </div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Your AI Reports</h1>
            <p className="text-slate-600 font-medium text-sm leading-snug">Comprehensive synthesis of all biological assessments.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                title="Grid view"
              >
                <Grid3x3 size={18} strokeWidth={2.5} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                title="List view"
              >
                <List size={18} strokeWidth={2.5} />
              </button>
            </div>
            
            <div className="relative group/sort">
              <SlidersHorizontal className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/sort:text-slate-900 transition-colors" size={18} strokeWidth={2.5} />
              <select 
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="pl-12 pr-10 py-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-600 focus:bg-white rounded-lg outline-none text-sm font-bold tracking-tight text-slate-900 appearance-none transition-all duration-300 shadow-sm cursor-pointer min-w-[180px]"
              >
                <option value="newest">Most Recent</option>
                <option value="oldest">Oldest First</option>
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <ChevronRight size={16} strokeWidth={3} className="rotate-90" />
              </div>
            </div>
          </div>
        </header>

        {loading ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1,2,3].map(i => <div key={i} className="h-96 bg-slate-100 border border-slate-200 rounded-[40px] animate-pulse"></div>)}
            </div>
          ) : (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-20 bg-slate-100 border border-slate-200 rounded-lg animate-pulse"></div>)}
            </div>
          )
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedReports.map(report => (
              <ReportCard key={report._id} report={report} onView={() => openReportDrawer(report)} isListView={false} />
            ))}
            
            {sortedReports.length === 0 && (
              <div className="col-span-full py-40 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[48px] flex flex-col items-center justify-center text-center space-y-4 animate-fade-in shadow-inner">
                <FileText size={64} className="text-slate-200" />
                <h3 className="text-2xl font-bold text-slate-900">No Reports Found</h3>
                <p className="text-slate-500 font-medium max-w-[320px]">You haven't completed any clinical consultations yet. Start by beginning a new synthesis.</p>
                <Link to="/chat" className="mt-4 bg-slate-900 text-white px-12 py-3 rounded-3xl font-bold tracking-widest text-sm shadow-lg shadow-slate-900/20 hover:bg-black active:scale-95 transition-all flex items-center gap-2">
                  <span>Begin Synthesis</span>
                  <Activity size={16} strokeWidth={3} className="text-emerald-500" />
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {sortedReports.map(report => (
              <ReportCard key={report._id} report={report} onView={() => openReportDrawer(report)} isListView={true} />
            ))}
            
            {sortedReports.length === 0 && (
              <div className="py-40 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[48px] flex flex-col items-center justify-center text-center space-y-4 animate-fade-in shadow-inner">
                <FileText size={64} className="text-slate-200" />
                <h3 className="text-2xl font-bold text-slate-900">No Reports Found</h3>
                <p className="text-slate-500 font-medium max-w-[320px]">You haven't completed any clinical consultations yet. Start by beginning a new synthesis.</p>
                <Link to="/chat" className="mt-4 bg-slate-900 text-white px-12 py-3 rounded-3xl font-bold tracking-widest text-sm shadow-lg shadow-slate-900/20 hover:bg-black active:scale-95 transition-all flex items-center gap-2">
                  <span>Begin Synthesis</span>
                  <Activity size={16} strokeWidth={3} className="text-emerald-500" />
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Report Details Side Drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
            onClick={closeDrawer}
          />
          
          {/* Drawer Content */}
          <div className="relative w-full max-w-[600px] h-full bg-white shadow-[-10px_0_40px_rgba(0,0,0,0.1)] flex flex-col animate-slide-in-right">
             <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                <div className="space-y-1">
                   <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs tracking-tight">
                      <FileText size={16} strokeWidth={2.5} />
                      <span>Clinical Assessment</span>
                   </div>
                   <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Full Report</h3>
                </div>
                <div className="flex items-center gap-3">
                   {fullReportData && (
                      <button
                        onClick={() => downloadMedicalReportPDF(fullReportData)}
                        className="p-3 bg-[#f8faf9] border-2 border-gray-100 rounded-2xl text-black hover:bg-black hover:text-white transition-all shadow-sm"
                        title="Download PDF"
                      >
                         <Download size={20} strokeWidth={2.5} />
                      </button>
                   )}
                   <button 
                     onClick={closeDrawer} 
                     className="p-3 bg-[#f8faf9] border-2 border-gray-100 rounded-2xl text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all shadow-sm"
                   >
                     <X size={24} />
                   </button>
                </div>
             </div>

             <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-50/20 p-8 pt-4">
                {isDetailsLoading ? (
                   <div className="h-full flex flex-col items-center justify-center space-y-4">
                      <Loader2 size={48} className="animate-spin text-ayur-forest" />
                      <p className="text-xs font-bold tracking-tight text-slate-400">Synthesizing clinical data...</p>
                   </div>
                ) : fullReportData ? (
                   <div className="animate-fade-in">
                      <ReportRenderer report={fullReportData} />
                      <div className="mt-10 p-8 bg-black text-white rounded-[32px] flex items-center justify-between relative overflow-hidden group">
                         <div className="absolute top-0 right-0 w-32 h-full bg-ayur-forest opacity-20 skew-x-12 translate-x-12"></div>
                         <div className="relative z-10 space-y-1">
                            <h4 className="text-[10px] font-black uppercase tracking-[2px] opacity-60">Ready for consultation?</h4>
                            <p className="text-sm font-bold opacity-90">Book an appointment with a verified practitioner.</p>
                         </div>
                         <Link to="/doctors" className="relative z-10 px-6 py-3 bg-white text-black rounded-xl font-black uppercase text-[10px] tracking-[1px] hover:bg-ayur-sage hover:text-white transition-all shadow-xl">
                            Find Doctors
                         </Link>
                      </div>
                   </div>
                ) : (
                   <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-20">
                      <FileText size={80} />
                      <p className="font-bold text-sm">Failed to load detailed report data.</p>
                   </div>
                )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Consultations;
