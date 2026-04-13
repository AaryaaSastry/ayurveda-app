import React from 'react';
import { Bell, Activity, ShieldCheck, User, Search, Settings, Download } from 'lucide-react';

const Navbar = ({ patientName }) => {
  return (
    <header className="h-[76px] bg-white border-b-2 border-gray-100 flex items-center justify-end px-8 sticky top-0 z-40 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-ayur-forest/5"></div>

      <div className="flex items-center gap-8">
         <div className="flex items-center gap-4 group cursor-pointer pl-4">
            <div className="flex flex-col items-end leading-none gap-2">
               <span className="text-base font-bold text-slate-900 tracking-tight group-hover:text-emerald-600 transition-colors">{patientName || 'Patient'}</span>
               <span className="text-xs font-bold text-slate-500 tracking-tight">Clinical Profile</span>
            </div>
            <div className="w-11 h-11 rounded-[16px] bg-[#f8faf9] border-2 border-gray-100 flex items-center justify-center text-ayur-forest shadow-sm group-hover:border-ayur-forest/20 transition-all group-hover:shadow-md relative overflow-hidden">
               <User size={22} strokeWidth={2.5} />
               <div className="absolute inset-0 bg-ayur-forest/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
         </div>
      </div>
    </header>
  );
};

export default Navbar;
