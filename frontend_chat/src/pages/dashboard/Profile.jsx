import React, { useState, useEffect } from 'react';
import { User, Phone, Mail, MapPin, Calendar, Edit2, CheckCircle2, Shield, Heart, Activity, ChevronRight, Lock, Loader2 } from 'lucide-react';
import { patientApi } from '../../services/api';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    age: '',
    gender: '',
    height: '',
    weight: '',
    dosha: '',
    bloodGroup: '',
    address: ''
  });

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      try {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        setProfile({
          name: storedUser.name || '',
          email: storedUser.email || '',
          phone: storedUser.phone || '',
          age: storedUser.age || '',
          gender: storedUser.gender || '',
          height: storedUser.height || '',
          weight: storedUser.weight || '',
          dosha: storedUser.dosha || 'Pitta-Kapha',
          bloodGroup: storedUser.bloodGroup || 'B+',
          address: storedUser.address || ''
        });
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handleSave = async () => {
    setIsEditing(false);
    try {
      const res = await patientApi.updateProfile(profile);
      localStorage.setItem('user', JSON.stringify(res.data));
      setProfile(res.data);
    } catch (err) {
      console.error('Failed to save profile:', err);
    }
  };

  const infoGroups = [
    { label: 'Full Name', value: profile.name, key: 'name', icon: <User size={16} /> },
    { label: 'Email Address', value: profile.email, key: 'email', icon: <Mail size={16} /> },
    { label: 'Primary Phone', value: profile.phone, key: 'phone', icon: <Phone size={16} /> },
    { label: 'Residence', value: profile.address, key: 'address', icon: <MapPin size={16} /> },
  ];

  const medicalGroups = [
    { label: 'Age', value: profile.age, key: 'age', icon: <Calendar size={16} /> },
    { label: 'Gender', value: profile.gender, key: 'gender', icon: <Activity size={16} /> },
    { label: 'Height', value: profile.height, key: 'height', icon: <Activity size={16} /> },
    { label: 'Weight', value: profile.weight, key: 'weight', icon: <Activity size={16} /> },
    { label: 'Prakriti (Dosha)', value: profile.dosha, key: 'dosha', icon: <Heart size={16} /> },
    { label: 'Blood Group', value: profile.bloodGroup, key: 'bloodGroup', icon: <Shield size={16} /> },
  ];

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-ayur-sage" /></div>;

  return (
    <div className="h-full overflow-y-auto custom-scrollbar px-4 sm:px-6 md:px-8 lg:px-12 py-8">
      <div className="max-w-[1240px] mx-auto space-y-12 pb-20">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-10 pb-4 border-b border-[#f0f1f3]">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-ayur-sage font-black uppercase text-[10px] tracking-[4px]">
               <User size={14} />
               <span>Personal Record</span>
            </div>
            <h1 className="text-4xl font-bold text-ayur-forest tracking-tighter">Health Profile</h1>
            <p className="text-[#6d7b74] font-medium text-lg leading-snug">Everything your AI assistant needs to personalize your treatments.</p>
          </div>
          
          <button 
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            className={`flex items-center gap-2.5 px-8 py-3 rounded-full font-bold uppercase tracking-widest text-[11px] transition-all shadow-xl active:scale-95 group ${
              isEditing ? 'bg-emerald-500 text-white shadow-emerald-500/10' : 'bg-ayur-forest text-white shadow-ayur-forest/10'
            }`}
          >
            {isEditing ? <CheckCircle2 size={18} /> : <Edit2 size={18} />}
            <span>{isEditing ? 'Save Changes' : 'Update Info'}</span>
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
           {/* Left Side Summary */}
           <div className="lg:col-span-4 space-y-8">
              <div className="bg-white p-10 rounded-[32px] border border-[#f0f1f3] shadow-sm flex flex-col items-center group relative overflow-hidden text-center">
                 <div className="absolute top-0 right-0 w-24 h-24 bg-ayur-sage/5 rounded-bl-[100px] -z-0"></div>
                 <div className="w-40 h-40 rounded-[32px] bg-[#f4f7f6] p-1 border border-gray-100 shadow-inner relative flex items-center justify-center text-gray-200 mb-6 group-hover:scale-[1.02] transition-transform duration-500 ring-4 ring-white">
                    <User size={80} />
                    <div className="absolute inset-0 bg-gradient-to-tr from-ayur-sage/5 to-transparent"></div>
                 </div>
                 <div className="space-y-2 relative z-10">
                    <h3 className="text-2xl font-bold text-ayur-forest tracking-tight leading-none">{profile.name}</h3>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 shadow-sm shadow-emerald-500/5">
                       <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                       <span className="text-[10px] font-black uppercase tracking-widest">Active Member</span>
                    </div>
                 </div>
                 
                 <div className="w-full flex items-center justify-between mt-10 p-6 bg-[#fcfdfd] border border-gray-50 rounded-2xl">
                    <div className="flex-1 space-y-1">
                       <span className="text-[9px] font-black uppercase tracking-widest text-[#aaaaaa]">Primary Dosha</span>
                       <span className="font-bold text-ayur-forest text-lg tracking-tight block">{profile.dosha}</span>
                    </div>
                    <div className="w-px h-8 bg-gray-100"></div>
                    <div className="flex-1 space-y-1">
                       <span className="text-[9px] font-black uppercase tracking-widest text-[#aaaaaa]">Blood</span>
                       <span className="font-bold text-ayur-forest text-lg tracking-tight block text-center">{profile.bloodGroup}</span>
                    </div>
                 </div>
              </div>
           </div>
           
           {/* Right Side - Editable Blocks */}
           <div className="lg:col-span-8 space-y-8 animate-fade-in">
              <section className="bg-white p-8 rounded-[32px] border border-[#f0f1f3] shadow-sm space-y-8">
                 <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-ayur-sage rounded-full"></div>
                    <h3 className="text-xl font-bold text-ayur-forest">Contact Information</h3>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {infoGroups.map(item => (
                      <div key={item.key} className="space-y-2 group/field">
                         <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[2.5px] text-[#aaaaaa] group-focus-within/field:text-ayur-sage transition-all">
                            {item.icon}
                            <span>{item.label}</span>
                         </label>
                         {isEditing ? (
                           <input 
                             type="text" 
                             value={profile[item.key]} 
                             onChange={(e) => setProfile({ ...profile, [item.key]: e.target.value })}
                             className="w-full px-5 py-3.5 bg-[#f4f7f6] border border-transparent rounded-xl outline-none focus:border-ayur-sage focus:bg-white transition-all text-ayur-forest font-bold text-base"
                           />
                         ) : (
                           <div className="px-5 py-3.5 bg-[#fafbfc] border border-transparent rounded-xl font-bold text-ayur-forest text-base shadow-inner group-hover/field:border-[#f0f1f3] transition-all">
                             {item.value || 'Not set'}
                           </div>
                         )}
                      </div>
                    ))}
                 </div>
              </section>
              
              <section className="bg-white p-8 rounded-[32px] border border-[#f0f1f3] shadow-sm space-y-8">
                 <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-amber-600/60 rounded-full"></div>
                    <h3 className="text-xl font-bold text-ayur-forest">Biometric Pulse Markers</h3>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {medicalGroups.map(item => (
                      <div key={item.key} className="space-y-2 group/field">
                         <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[2.5px] text-[#aaaaaa] group-focus-within/field:text-ayur-sage transition-all">
                            {item.icon}
                            <span>{item.label}</span>
                         </label>
                         {isEditing ? (
                           <input 
                             type="text" 
                             value={profile[item.key]} 
                             onChange={(e) => setProfile({ ...profile, [item.key]: e.target.value })}
                             className="w-full px-5 py-3.5 bg-[#f4f7f6] border border-transparent rounded-xl outline-none focus:border-ayur-sage focus:bg-white transition-all text-ayur-forest font-bold text-base"
                           />
                         ) : (
                           <div className="px-5 py-3.5 bg-[#fafbfc] border border-transparent rounded-xl font-bold text-ayur-forest text-base shadow-inner group-hover/field:border-[#f0f1f3] transition-all">
                             {item.value || 'N/A'}
                           </div>
                         )}
                      </div>
                    ))}
                 </div>
              </section>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
