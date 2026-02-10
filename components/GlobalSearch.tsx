import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2 } from 'lucide-react';

interface SearchResult {
  name: string;
  city?: string;
  country?: string;
  lat: number;
  lng: number;
}

interface GlobalSearchProps {
  onSelectLocation: (lat: number, lng: number, name: string) => void;
  bias?: { lat: number; lng: number };
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ onSelectLocation, bias }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.length < 3) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        // Bias results towards the map center/destination if provided
        const biasParam = bias ? `&lat=${bias.lat}&lon=${bias.lng}` : '';
        const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5${biasParam}`);
        const data = await res.json();
        const mapped = data.features.map((f: any) => ({
          name: f.properties.name,
          city: f.properties.city,
          country: f.properties.country,
          lat: f.geometry.coordinates[1],
          lng: f.geometry.coordinates[0]
        }));
        setResults(mapped);
        setIsOpen(true);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query, bias]);

  return (
    <div ref={containerRef} className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-md">
      <div className="relative shadow-hard rounded-lg group">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-[#1A1A1A]/50" />
          ) : (
            <Search className="w-4 h-4 text-[#1A1A1A]" />
          )}
        </div>
        <input
          type="text"
          className="w-full pl-10 pr-4 py-3 bg-white border-2 border-[#1A1A1A] rounded-lg text-sm font-bold focus:outline-none placeholder:text-[#1A1A1A]/30 uppercase tracking-wider"
          placeholder="Search places to add..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-[#1A1A1A] rounded-lg shadow-hard overflow-hidden">
          {results.map((res, idx) => (
            <button
              key={idx}
              className="w-full text-left px-4 py-3 hover:bg-[#F0F2EB] flex items-center gap-3 border-b border-[#1A1A1A]/5 last:border-0 transition-colors"
              onClick={() => {
                onSelectLocation(res.lat, res.lng, res.name);
                setQuery('');
                setIsOpen(false);
              }}
            >
              <MapPin className="w-4 h-4 flex-shrink-0 opacity-50" />
              <div className="min-w-0">
                <div className="text-sm font-bold truncate">{res.name}</div>
                <div className="text-[10px] uppercase tracking-wider opacity-60 truncate">
                  {[res.city, res.country].filter(Boolean).join(', ')}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};