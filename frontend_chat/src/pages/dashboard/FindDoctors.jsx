import React, { useState, useEffect } from 'react';
import { Search, MapPin, Star, ShieldCheck, Clock, ArrowRight, Filter, Activity, User, Loader2 } from 'lucide-react';
import { publicApi, patientApi, chatApi } from '../../services/api';

const FindDoctors = ({ embedded, diagnosis }) => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [location, setLocation] = useState({ lat: 19.0760, lng: 72.8777 }); // Default: Mumbai
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (embedded) {
      fetchAllDoctors();
    } else {
      // Try to get user's location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setLocation(loc);
            fetchDoctors(loc.lat, loc.lng);
          },
          () => fetchDoctors(location.lat, location.lng)
        );
      } else {
        fetchDoctors(location.lat, location.lng);
      }
    }
  }, [embedded]);

  const fetchAllDoctors = async () => {
    setLoading(true);
    setIsSearching(true);
    try {
      const res = await publicApi.getAllDoctors();
      setDoctors(res.data);
    } catch (err) {
      console.error('Failed to fetch all doctors:', err);
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  };

  const fetchDoctors = async (lat, lng) => {
    setLoading(true);
    setIsSearching(true);
    try {
      const res = await publicApi.getNearbyDoctors(lat, lng);
      setDoctors(res.data);
    } catch (err) {
      console.error('Failed to fetch doctors:', err);
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  };

  const filteredDoctors = doctors.filter(doctor =>
    doctor.basicInfo?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doctor.professionalInfo?.specialization?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // If embedded, try to boost or just show them as recommended
  const displayDoctors = React.useMemo(() => {
    let sorted = [...filteredDoctors];
    if (embedded && diagnosis) {
      try {
        let diagData = diagnosis;
        if (typeof diagnosis === 'string') {
          const raw = diagnosis.includes('---REPORT_DATA---') ? diagnosis.split('---REPORT_DATA---').pop() : diagnosis;
          const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
          diagData = JSON.parse(clean);
        }
        const recommendedTreatments = (diagData?.treatments || []).map(t => String(t).toLowerCase());

        if (recommendedTreatments.length > 0) {
          // 1. Strictly filter out doctors who don't have matching treatments, UNLESS they are a general practitioner
          sorted = sorted.filter((doc) => {
            const docTreatments = (doc.professionalInfo?.treatments || []).map(t => String(t).toLowerCase());
            const isGeneral = doc.professionalInfo?.specialization?.toLowerCase().includes('general') || docTreatments.some(t => t.includes('general'));

            return isGeneral || docTreatments.some(t => recommendedTreatments.some(rt => rt.includes(t) || t.includes(rt)));
          });

          // 2. Sort by match quality (most matches first)
          sorted = sorted.sort((a, b) => {
            const aTreatments = (a.professionalInfo?.treatments || []).map(t => String(t).toLowerCase());
            const bTreatments = (b.professionalInfo?.treatments || []).map(t => String(t).toLowerCase());

            // Check for partial matches or exact matches
            const aMatches = aTreatments.filter(t => recommendedTreatments.some(rt => rt.includes(t) || t.includes(rt))).length;
            const bMatches = bTreatments.filter(t => recommendedTreatments.some(rt => rt.includes(t) || t.includes(rt))).length;

            return bMatches - aMatches; // Highest match first
          });
        }
      } catch (err) {
        console.error("Diagnosis parse error in FindDoctors:", err);
      }
    }
    return sorted;
  }, [filteredDoctors, embedded, diagnosis]);

  const handleBook = async (doctorId) => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    const patientId = userData.id || userData._id;
    if (!patientId) {
      alert('You must be logged in to book an appointment.');
      return;
    }

    try {
      // Find the LATEST chat session that has a diagnosis to include in the booking
      let diagContent = 'General Consultation Inquiry';
      let diagTitle = 'Ayurvedic Checkup';

      try {
        const resp = await chatApi.getSessions(patientId);
        if (resp.data && resp.data.length > 0) {
          // Find the first session that has a diagnosis field
          const sessionWithDiag = resp.data.find(s => s.diagnosis);
          if (sessionWithDiag) {
            // Re-fetch regular session to get the full diagnosis text if needed, 
            // but the summary response might have it.
            diagContent = sessionWithDiag.diagnosis;
            diagTitle = sessionWithDiag.title || 'Clinical Synthesis';
          }
        }
      } catch (e) {
        console.warn("Failed to attach latest AI context:", e);
      }

      await publicApi.bookAppointment({
        doctorId,
        patientId,
        sessionData: {
          diagnosis: diagContent,
          title: diagTitle
        }
      });
      alert('Booking request sent! The doctor will confirm shortly.');
    } catch (err) {
      console.error('Failed to book:', err);
      alert('Booking failed. Please try again.');
    }
  };

  return (
    <div className={`h-full overflow-y-auto custom-scrollbar ${embedded ? 'px-2 py-4' : 'px-4 sm:px-6 md:px-8 lg:px-12 py-8'}`}>
      <div className={`${embedded ? 'w-full' : 'max-w-[1240px]'} mx-auto space-y-8 pb-20`}>
        {!embedded ? (
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-10 pb-4 border-b border-[#f0f1f3]">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-ayur-sage font-black uppercase text-[10px] tracking-[4px]">
                <MapPin size={14} />
                <span>Practitioner Finder</span>
              </div>
              <h1 className="text-4xl font-bold text-ayur-forest tracking-tighter">Nearby Specialists</h1>
              <p className="text-[#6d7b74] font-medium text-lg leading-snug">Connect with verified Ayurvedic doctors in your locality.</p>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative group/search min-w-[340px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within/search:text-ayur-sage transition-colors" size={16} />
                <input
                  type="text"
                  placeholder="Search specialty or doctor name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-5 py-3 bg-[#f4f7f6] border border-transparent focus:border-ayur-sage/30 focus:bg-white rounded-full outline-none text-sm font-medium transition-all duration-300"
                />
              </div>
              <button className="p-3 bg-white border border-gray-100 text-gray-400 rounded-full hover:text-ayur-sage hover:border-ayur-sage transition-all shadow-sm active:scale-95 group">
                <Filter size={18} className="group-hover:rotate-12 transition-transform" />
              </button>
            </div>
          </header>
        ) : (
          <header className="flex flex-col gap-4 pb-4 border-b border-[#f0f1f3]">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-ayur-forest tracking-tight">Recommended Doctors</h2>
              <p className="text-[#6d7b74] font-medium text-xs leading-snug">Based on the treatments recommended in your diagnosis.</p>
            </div>
            <div className="relative group/search w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#f4f7f6] border border-transparent rounded-full outline-none text-xs font-medium"
              />
            </div>
          </header>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 animate-pulse">
            <Loader2 size={32} className="text-ayur-sage animate-spin" />
            <p className="text-xs font-black uppercase tracking-[3px] text-ayur-sage/40">Scanning nearby clinics...</p>
          </div>
        ) : displayDoctors.length === 0 ? (
          <div className={`col-span-full ${embedded ? 'py-10' : 'py-40'} bg-[#fbfcfc] border-2 border-dashed border-[#f0f1f3] rounded-[48px] flex flex-col items-center justify-center text-center space-y-4`}>
            {embedded ? <Star size={64} className="text-ayur-sage/10 mb-2" /> : <MapPin size={64} className="text-ayur-sage/10 mb-2" />}
            <h3 className="text-2xl font-bold text-ayur-forest">{embedded ? 'No specialists found' : 'No doctors found nearby'}</h3>
            <p className="text-gray-400 font-medium max-w-[320px]">{embedded ? 'We couldn\'t find practitioners offering the specific treatments recommended for your plan.' : 'We couldn\'t find any certified practitioners matching your location. Try expanding your search radius.'}</p>
          </div>
        ) : (
          <div className={`grid grid-cols-1 ${embedded ? '' : 'md:grid-cols-2 lg:grid-cols-3'} gap-6`}>
            {displayDoctors.map((doctor, idx) => (
              <div key={doctor._id} className="bg-white p-8 rounded-[40px] border border-[#f0f1f3] shadow-sm hover:shadow-2xl hover:shadow-ayur-sage/10 transition-all duration-500 relative overflow-hidden group animate-fade-in-up" style={{ animationDelay: `${idx * 100}ms` }}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-ayur-sage/5 rounded-bl-[100px] -z-0 transition-transform group-hover:scale-125"></div>
                <div className="relative z-10 flex flex-col items-center text-center">
                  <div className="w-24 h-24 rounded-[32px] bg-gray-50 p-1 border border-gray-100 shadow-inner overflow-hidden relative mb-5 ring-4 ring-white shadow-xl transition-transform group-hover:scale-105 duration-500">
                    <User size={64} className="text-gray-200 mt-4 mx-auto" />
                    <div className="absolute inset-0 bg-gradient-to-tr from-ayur-sage/10 to-transparent"></div>
                    <div className="absolute bottom-2 right-2 w-4 h-4 bg-emerald-500 rounded-full border-4 border-white"></div>
                  </div>

                  <div className="space-y-1 mb-6">
                    <div className="flex items-center justify-center gap-2">
                      <h3 className="text-2xl font-bold text-ayur-forest tracking-tight leading-none truncate">Dr. {doctor.basicInfo?.name || 'Ayur Practitioner'}</h3>
                      <ShieldCheck size={18} className="text-emerald-500" />
                    </div>
                    <span className="text-xs font-black uppercase text-ayur-sage tracking-[2px] block">{doctor.professionalInfo?.specialization || 'Ayurvedic Specialist'}</span>
                  </div>

                  <div className="flex items-center gap-6 mb-8 py-4 border-y border-gray-50 w-full justify-center">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-black uppercase text-[#aaaaaa] tracking-widest">Fees</span>
                      <span className="font-bold text-ayur-forest text-base tracking-tight leading-none">₹{doctor.availability?.fees || 'N/A'}</span>
                    </div>
                    <div className="w-px h-6 bg-gray-100"></div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-black uppercase text-[#aaaaaa] tracking-widest">Experience</span>
                      <span className="font-bold text-ayur-forest text-base tracking-tight leading-none">{doctor.professionalInfo?.experience || '5'}+ Yr</span>
                    </div>
                  </div>

                  <div className="w-full space-y-3">
                    <button
                      onClick={() => handleBook(doctor._id)}
                      className="w-full bg-[#2d4038] text-white py-4 rounded-3xl font-bold uppercase tracking-widest text-xs shadow-xl shadow-[#2d4038]/20 hover:bg-[#1a231f] active:scale-95 transition-all flex items-center justify-center gap-2 group/btn"
                    >
                      <span>Book Clinical Visit</span>
                      <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                    <button className="w-full py-3 rounded-2xl font-bold uppercase tracking-widest text-[10px] text-gray-400 hover:text-ayur-sage hover:bg-ayur-sage/5 transition-all"></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FindDoctors;
