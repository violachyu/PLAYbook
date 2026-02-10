
import React, { useState, useRef, useEffect } from 'react';
import { TripConfig, TransportMode, PaceIntensity } from '../types';
import { ArrowRight, MapPin, Calendar, Gauge, Train } from 'lucide-react';

interface LocationInputProps {
  label: string;
  name: string;
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

const LocationInput: React.FC<LocationInputProps> = ({ 
  label, name, value, onChange, placeholder, isOpen, onOpen, onClose 
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (value.length < 2) {
      setSuggestions([]);
      return;
    }

    const fetchLocations = async () => {
      setIsLoading(true);
      try {
        // Using Photon API (OpenStreetMap based) for free location autocomplete
        const response = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(value)}&limit=8&lang=en`
        );
        const data = await response.json();
        
        const places = new Set<string>();
        data.features.forEach((f: any) => {
          const p = f.properties;
          const parts = [];
          if (p.name) parts.push(p.name);
          if (p.city && p.city !== p.name) parts.push(p.city);
          if (p.state) parts.push(p.state);
          if (p.country) parts.push(p.country);
          
          const placeStr = parts.join(', ');
          if (placeStr) places.add(placeStr);
        });

        setSuggestions(Array.from(places).slice(0, 5));
      } catch (error) {
        console.error("Error fetching locations:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchLocations, 300);
    return () => clearTimeout(debounceTimer);
  }, [value]);

  const handleSelect = (loc: string) => {
    onChange(loc);
    onClose();
  };

  return (
    // Dynamic z-index: Active field is z-50 to float above siblings, inactive is z-20
    <div className={`space-y-1 relative ${isOpen ? 'z-50' : 'z-20'}`} ref={wrapperRef}>
      <label className="text-[10px] font-bold uppercase tracking-widest opacity-60 flex items-center gap-1">
        <MapPin className="w-3 h-3" /> {label}
      </label>
      <div className="relative">
        <input
          type="text"
          name={name}
          value={value}
          onChange={(e) => { 
            onChange(e.target.value); 
            onOpen(); 
          }}
          onFocus={() => {
             // Always open dropdown on focus if we have suggestions or want to type
             onOpen();
          }}
          placeholder={placeholder}
          className="w-full bg-white border border-[#1A1A1A]/20 p-3 text-sm font-bold focus:outline-none focus:border-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A] transition-all rounded-sm"
          required
          autoComplete="off"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="animate-spin w-3 h-3 border-2 border-[#1A1A1A]/30 border-t-[#1A1A1A] rounded-full" />
          </div>
        )}
      </div>
      
      {isOpen && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-[#1A1A1A] shadow-hard max-h-48 overflow-y-auto">
          {suggestions.map((loc, idx) => (
            <div
              key={idx}
              className="px-3 py-2 text-xs font-bold hover:bg-[#F0F2EB] cursor-pointer border-b border-[#1A1A1A]/5 last:border-0 truncate"
              onClick={() => handleSelect(loc)}
            >
              {loc}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

interface InputSectionProps {
  isLoading: boolean;
  onStart: (config: TripConfig) => void;
}

export const InputSection: React.FC<InputSectionProps> = ({ isLoading, onStart }) => {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [mode, setMode] = useState<TransportMode>('public');
  const [intensity, setIntensity] = useState<PaceIntensity>('moderate');
  
  // Track which field is currently active to prevent dropdown overlap
  const [activeField, setActiveField] = useState<'origin' | 'destination' | null>(null);

  // Refs for date inputs to programmatically open picker
  const startRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (origin && destination && startDate && endDate) {
      onStart({ origin, destination, startDate, endDate, mode, intensity });
    }
  };

  const showDatePicker = (ref: React.RefObject<HTMLInputElement>) => {
    const input = ref.current;
    if (input && 'showPicker' in input && typeof input.showPicker === 'function') {
      try {
        input.showPicker();
      } catch (err) {
        console.warn('showPicker failed', err);
      }
    }
  };

  const getDaysDiff = () => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
    return diffDays;
  };
  
  const today = new Date().toISOString().split('T')[0];
  const dayCount = getDaysDiff();
  const isDateValid = dayCount > 0 && dayCount <= 5;

  return (
    <section className="w-full max-w-2xl mx-auto mb-12 animate-fade-in-up">
      <form onSubmit={handleSubmit} className="flex flex-col gap-0 border-2 border-[#1A1A1A] rounded-xl bg-[#F0F2EB] shadow-hard overflow-hidden">
        
        {/* Header Strip */}
        <div className="bg-[#1A1A1A] p-3 flex justify-between items-center text-[#F0F2EB]">
           <span className="font-mono text-xs font-bold uppercase tracking-widest">Trip Configuration</span>
           <span className="font-mono text-xs opacity-60">v2.0</span>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 relative">
           {/* Background Grid */}
           <div className="absolute inset-0 bg-[linear-gradient(to_right,#1A1A1A05_1px,transparent_1px),linear-gradient(to_bottom,#1A1A1A05_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />

          {/* Locations - Controlled Active State */}
          <div className="space-y-4 relative z-20">
            <LocationInput 
              key="origin"
              label="Origin" 
              name="origin"
              value={origin} 
              onChange={setOrigin} 
              placeholder="Current City" 
              isOpen={activeField === 'origin'}
              onOpen={() => setActiveField('origin')}
              onClose={() => setActiveField(null)}
            />
            <LocationInput 
              key="destination"
              label="Destination" 
              name="destination"
              value={destination} 
              onChange={setDestination} 
              placeholder="Target City" 
              isOpen={activeField === 'destination'}
              onOpen={() => setActiveField('destination')}
              onClose={() => setActiveField(null)}
            />
          </div>

          {/* Logistics */}
          <div className="space-y-4 relative z-10">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-60 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Dates (Max 5 Days)
              </label>
              <div className="flex gap-2">
                <div 
                    className="relative w-full cursor-pointer group"
                    onClick={() => showDatePicker(startRef)}
                >
                    <input
                      ref={startRef}
                      type="date"
                      value={startDate}
                      min={today}
                      onChange={(e) => setStartDate(e.target.value)}
                      onClick={(e) => {
                         e.stopPropagation();
                         showDatePicker(startRef);
                      }}
                      className="w-full bg-white border border-[#1A1A1A]/20 p-3 text-xs font-bold focus:outline-none focus:border-[#1A1A1A] rounded-sm cursor-pointer uppercase pr-8"
                      required
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 group-hover:opacity-100 transition-opacity pointer-events-none" />
                </div>
                <div 
                    className="relative w-full cursor-pointer group"
                    onClick={() => showDatePicker(endRef)}
                >
                    <input
                      ref={endRef}
                      type="date"
                      value={endDate}
                      min={startDate || today}
                      onChange={(e) => setEndDate(e.target.value)}
                      onClick={(e) => {
                         e.stopPropagation();
                         showDatePicker(endRef);
                      }}
                      className="w-full bg-white border border-[#1A1A1A]/20 p-3 text-xs font-bold focus:outline-none focus:border-[#1A1A1A] rounded-sm cursor-pointer uppercase pr-8"
                      required
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 group-hover:opacity-100 transition-opacity pointer-events-none" />
                </div>
              </div>
              {!isDateValid && startDate && endDate && (
                <p className="text-[10px] text-red-600 font-bold text-right">Trip must be 1-5 days</p>
              )}
              {isDateValid && (
                 <p className="text-[10px] text-[#1A1A1A] font-bold text-right opacity-50">Duration: {dayCount} Days</p>
              )}
            </div>

            <div className="flex gap-4">
               <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-60 flex items-center gap-1">
                    <Train className="w-3 h-3" /> Mode
                  </label>
                  <div className="flex gap-1">
                    {(['public', 'car', 'walk'] as TransportMode[]).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMode(m)}
                        className={`flex-1 py-3 rounded-sm border border-[#1A1A1A] text-[10px] font-bold uppercase transition-colors ${
                          mode === m ? 'bg-[#1A1A1A] text-white' : 'bg-transparent text-[#1A1A1A] hover:bg-[#1A1A1A]/5'
                        }`}
                      >
                        {m === 'public' ? 'Transit' : m}
                      </button>
                    ))}
                  </div>
               </div>
               
               <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-60 flex items-center gap-1">
                    <Gauge className="w-3 h-3" /> Pace
                  </label>
                   <select 
                    value={intensity}
                    onChange={(e) => setIntensity(e.target.value as PaceIntensity)}
                    className="w-full bg-white border border-[#1A1A1A]/20 p-2 text-xs font-bold focus:outline-none focus:border-[#1A1A1A] rounded-sm h-[42px] cursor-pointer"
                   >
                     <option value="relaxed">Relaxed (3h)</option>
                     <option value="moderate">Moderate (5h)</option>
                     <option value="power">Power (8h+)</option>
                   </select>
               </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !isDateValid}
          className="w-full py-5 bg-[#1A1A1A] text-[#F0F2EB] hover:bg-[#1A1A1A]/90 transition-colors disabled:opacity-70 disabled:cursor-not-allowed border-t border-[#1A1A1A]"
        >
          <div className="flex items-center justify-center gap-3 font-bold tracking-widest uppercase text-sm">
            {isLoading ? 'Calibrating Route...' : 'Build Route'}
            {!isLoading && <ArrowRight className="w-4 h-4" />}
          </div>
        </button>
      </form>
    </section>
  );
};
