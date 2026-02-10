import React from 'react';
import { Map, Compass, Share2, Printer, Check } from 'lucide-react';
import { ItineraryItem, TripConfig } from '../types';

interface HeaderProps {
  onShare?: () => void;
  onPrint?: () => void;
  showActions?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onShare, onPrint, showActions = false }) => {
  const [shared, setShared] = React.useState(false);

  const handleShare = () => {
    if (onShare) {
      onShare();
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  };

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-[#F0F2EB] border-b border-[#1A1A1A] print:hidden">
      <div className="flex items-center gap-2">
        <Map className="w-6 h-6 text-[#1A1A1A]" strokeWidth={2} />
        <h1 className="text-2xl font-black tracking-tighter text-[#1A1A1A]">
          PLAYbook
        </h1>
      </div>
      
      <div className="flex items-center gap-4">
        {showActions && (
          <div className="flex items-center gap-2">
            <button 
              onClick={onPrint}
              className="p-2 hover:bg-[#1A1A1A]/5 rounded-full transition-colors hidden sm:block"
              title="Print / PDF"
            >
              <Printer className="w-5 h-5" />
            </button>
            <button 
              onClick={handleShare}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#1A1A1A] text-[#F0F2EB] rounded-full text-xs font-bold uppercase tracking-widest hover:bg-[#1A1A1A]/80 transition-all"
            >
              {shared ? <Check className="w-3 h-3" /> : <Share2 className="w-3 h-3" />}
              {shared ? "Copied" : "Share"}
            </button>
          </div>
        )}
        
        <div className="hidden sm:flex items-center gap-2 opacity-100">
          <span className="text-xs font-bold bg-[#1A1A1A] text-[#F0F2EB] px-2 py-1 rounded-full">
            BETA
          </span>
          <Compass className="w-5 h-5" strokeWidth={1.5} />
        </div>
      </div>
    </header>
  );
};