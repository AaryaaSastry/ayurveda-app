import React from 'react'
import './report.css'
import { Activity, Download, ClipboardCheck, AlertCircle } from 'lucide-react'
import { sanitizeMarkdownText } from './utils/textUtils'

function ReportRenderer({ report }) {
  if (!report) return null

  return (
    <div className="report-container animate-fade-in py-4">
      <div className="bg-[#fcfdfd] rounded-[32px] p-10 border-2 border-gray-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-ayur-forest/10"></div>
        
        <div className="space-y-10">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-ayur-forest font-black uppercase text-[10px] tracking-[4px]">
                <ClipboardCheck size={14} className="text-emerald-500" />
                <span>Verified Diagnostic Synthesis</span>
              </div>
              <h2 className="text-3xl font-black text-black tracking-tight">{report.diagnosis?.name || "Ayurvedic Assessment"}</h2>
              <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-100 rounded-full w-fit">
                 <AlertCircle size={12} className="text-amber-600" />
                 <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Severity: {report.diagnosis?.threatLevel || 'Moderate'}</span>
              </div>
            </div>
            <div className="w-16 h-16 bg-white border-2 border-gray-100 rounded-2xl flex items-center justify-center text-ayur-sage shadow-inner">
               <Activity size={32} strokeWidth={2.5} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-8 border-y-2 border-gray-100/60">
             <div className="space-y-3">
                <h4 className="text-[11px] font-black text-ayur-forest uppercase tracking-[2px]">Imbalanced Dosha</h4>
                <div className="p-5 bg-white border-2 border-gray-100 rounded-2xl text-[14px] font-bold text-black shadow-sm">
                   {report.diagnosis?.dosha || 'Vata-Pitta'} imbalance detected.
                </div>
             </div>
             <div className="space-y-3">
                <h4 className="text-[11px] font-black text-ayur-forest uppercase tracking-[2px]">Primary Recommendation</h4>
                <div className="p-5 bg-white border-2 border-gray-100 rounded-2xl text-[14px] font-bold text-black shadow-sm">
                   {report.doshaRecommendation || 'Focus on grounding and warm nourishment.'}
                </div>
             </div>
          </div>

          <p className="text-[15px] leading-relaxed text-black font-medium opacity-80 italic border-l-4 border-ayur-sage/30 pl-6">
             "The observed symptoms align with traditional Ayurvedic patterns requiring holistic restoration of bodily equilibrium."
          </p>
        </div>
      </div>
    </div>
  )
}

export default ReportRenderer

