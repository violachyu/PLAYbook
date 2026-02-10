
import React, { useState } from 'react';
import { ItineraryItem, TripConfig } from '../types';
import { TimelineNode } from './TimelineNode';
import { LeafletMap } from './LeafletMap';
import { Calendar, Plus } from 'lucide-react';

interface TimelineProps {
  days: ItineraryItem[][];
  config: TripConfig;
  totalDays: number;
  onGenerateNextDay: () => void;
  isGenerating: boolean;
  onUpdateItem: (id: string, updates: Partial<ItineraryItem>) => void;
  onDeleteItem: (id: string) => void;
  onAddItem: (item: ItineraryItem) => void;
  onSelectItem: (id: string) => void;
  selectedItemId: string | null;
}

export const Timeline: React.FC<TimelineProps> = ({ 
  days, 
  config, 
  totalDays, 
  onGenerateNextDay, 
  isGenerating,
  onUpdateItem,
  onDeleteItem,
  onAddItem,
  onSelectItem,
  selectedItemId
}) => {
  
  const allItems = days.flat();
  const [selectedTransitId, setSelectedTransitId] = useState<string | null>(null);

  const handleTransitSelect = (id: string) => {
    // Toggle
    if (selectedTransitId === id) {
      setSelectedTransitId(null);
    } else {
      setSelectedTransitId(id);
      // Deselect the item so map focuses on transit or nothing
      onSelectItem(''); 
    }
  };

  const handleItemSelect = (id: string) => {
    onSelectItem(id);
    setSelectedTransitId(null); // Deselect transit when item selected
  };

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-screen border-t-2 border-[#1A1A1A]">
      
      {/* LEFT PANEL: The Timeline Logic */}
      <div className="lg:w-1/2 bg-[#F0F2EB] border-b-2 lg:border-b-0 lg:border-r-2 border-[#1A1A1A]">
        
        {/* Destination Header */}
        <div className="p-6 sm:p-12 border-b-2 border-[#1A1A1A]/10">
          <div className="mb-6">
             <h3 className="text-4xl font-black uppercase leading-none tracking-tighter mb-2">{config.destination}</h3>
             <div className="flex items-center gap-2 opacity-60 font-mono text-xs font-bold uppercase">
                <Calendar className="w-4 h-4" />
                <span>{config.startDate} — {config.endDate}</span>
             </div>
          </div>

          <div className="bg-[#1A1A1A] text-[#F0F2EB] p-6 rounded-xl shadow-hard">
             <div className="text-[10px] font-bold uppercase tracking-widest mb-4 opacity-70 border-b border-[#F0F2EB]/20 pb-2">Trip Parameters</div>
             <div className="grid grid-cols-2 gap-y-6 gap-x-8">
                <div>
                   <div className="text-[10px] uppercase opacity-50 mb-1">Origin</div>
                   <div className="font-bold text-sm truncate" title={config.origin}>{config.origin}</div>
                </div>
                <div>
                   <div className="text-[10px] uppercase opacity-50 mb-1">Pace</div>
                   <div className="font-bold text-sm capitalize">{config.intensity}</div>
                </div>
                <div>
                   <div className="text-[10px] uppercase opacity-50 mb-1">Transport</div>
                   <div className="font-bold text-sm capitalize">{config.mode === 'public' ? 'Public Transit' : config.mode}</div>
                </div>
                <div>
                   <div className="text-[10px] uppercase opacity-50 mb-1">Total Days</div>
                   <div className="font-bold text-sm">{totalDays}</div>
                </div>
             </div>
          </div>
        </div>
        
        {days.map((dayItems, dayIndex) => (
          <div key={dayIndex} className="p-6 sm:p-12 border-b-2 border-[#1A1A1A]/10 last:border-0 animate-fade-in-up">
             
             {/* Day Header */}
             <div className="flex items-center gap-4 mb-10">
                <div className="bg-[#1A1A1A] text-[#F0F2EB] w-12 h-12 flex items-center justify-center font-black text-xl rounded-lg shadow-hard flex-shrink-0">
                   {dayIndex + 1}
                </div>
                <div>
                   <h4 className="text-lg font-bold uppercase tracking-tight">Day {dayIndex + 1}</h4>
                   <p className="text-xs font-mono opacity-60">
                      {dayIndex === 0 ? "Arrival & Orientation" : `Exploration Phase ${dayIndex}`}
                   </p>
                </div>
             </div>

             {/* Nodes */}
             <div className="relative pl-0 sm:pl-4 space-y-8">
                {dayItems.map((item, index) => (
                  <TimelineNode 
                    key={item.id}
                    item={item} 
                    isLast={index === dayItems.length - 1} 
                    index={index}
                    onUpdate={(updates) => onUpdateItem(item.id, updates)}
                    onDelete={() => onDeleteItem(item.id)}
                    onSelect={() => handleItemSelect(item.id)}
                    isSelected={selectedItemId === item.id}
                    onTransitSelect={() => handleTransitSelect(item.id)}
                    isTransitSelected={selectedTransitId === item.id}
                  />
                ))}
             </div>
          </div>
        ))}

        {days.length < totalDays && (
           <div className="p-12 flex justify-center bg-[#E5E7DE]/30">
              <button 
                 onClick={onGenerateNextDay}
                 disabled={isGenerating}
                 className="flex items-center gap-3 px-8 py-4 bg-white border-2 border-[#1A1A1A] shadow-hard rounded-xl hover:-translate-y-1 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
              >
                 {isGenerating ? (
                    <div className="animate-spin w-4 h-4 border-2 border-[#1A1A1A] border-t-transparent rounded-full" />
                 ) : (
                    <Plus className="w-5 h-5" />
                 )}
                 <span className="text-sm font-bold uppercase tracking-widest">
                    {isGenerating ? 'Computing Logistics...' : `Unfold Day ${days.length + 1}`}
                 </span>
              </button>
           </div>
        )}
      </div>

      {/* RIGHT PANEL: Context / Map */}
      <div className="lg:w-1/2 bg-[#E5E7DE] lg:sticky lg:top-[73px] lg:h-[calc(100vh-73px)] flex flex-col">
         <div className="flex-grow relative border-l-2 border-[#1A1A1A]/10">
            <LeafletMap 
              items={allItems} 
              selectedItemId={selectedItemId}
              selectedTransitId={selectedTransitId}
              config={config}
              onAddItem={onAddItem}
            />
         </div>
      </div>

    </div>
  );
};
