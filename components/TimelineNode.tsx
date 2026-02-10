
import React, { useState } from 'react';
import { ItineraryItem } from '../types';
import { ChevronDown, ChevronUp, Edit2, Trash2, Check, X, FileText, Footprints, Car, Train, Clock } from 'lucide-react';

interface TimelineNodeProps {
  item: ItineraryItem;
  isLast: boolean;
  index: number;
  onUpdate: (updates: Partial<ItineraryItem>) => void;
  onDelete: () => void;
  onSelect: () => void;
  isSelected: boolean;
  onTransitSelect: () => void;
  isTransitSelected: boolean;
}

export const TimelineNode: React.FC<TimelineNodeProps> = ({ 
  item, isLast, index, onUpdate, onDelete, onSelect, isSelected, onTransitSelect, isTransitSelected 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  
  // Local state for editing fields
  const [editName, setEditName] = useState(item.stop_name);
  const [editNotes, setEditNotes] = useState(item.user_notes || '');

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to remove this stop from your itinerary?")) {
      onDelete();
    }
  };

  const saveEdits = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdate({
      stop_name: editName,
      user_notes: editNotes
    });
    setIsEditing(false);
  };

  const cancelEdits = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditName(item.stop_name);
    setEditNotes(item.user_notes || '');
    setIsEditing(false);
  };

  const getTransportIcon = (method: string) => {
    const m = method.toLowerCase();
    if (m.includes('walk') || m.includes('foot')) return <Footprints className="w-3 h-3" />;
    if (m.includes('car') || m.includes('uber') || m.includes('drive') || m.includes('taxi')) return <Car className="w-3 h-3" />;
    return <Train className="w-3 h-3" />;
  };

  // Determine if we should show transit info (not for the first item/arrival)
  const hasTransit = index > 0 && (item.type === 'visit' || item.type === 'end' || item.type === 'start' || item.type === 'transit');

  // Check if the name looks like raw coordinates
  const isCoordinates = (text: string) => {
    // Matches patterns like "39.2961..., -76.604..."
    return /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(text);
  };

  const displayName = isCoordinates(item.stop_name) 
    ? (item.geo_context ? `Explore ${item.geo_context}` : "Dropped Pin") 
    : item.stop_name;

  return (
    <div className="flex flex-col w-full">
      
      {/* 1. TRANSIT LOGIC (Visualized between nodes) */}
      {hasTransit && (
        <div className="flex gap-4 sm:gap-6">
          {/* Timeline Rail for Transit */}
          <div className="relative w-4 flex justify-center flex-shrink-0">
             {/* Continuous line passing through */}
             <div className={`w-0.5 h-full transition-colors duration-300 ${isTransitSelected ? 'bg-blue-600' : 'bg-[#1A1A1A]/10'}`}></div>
          </div>
          
          {/* Transit Content */}
          <div className="pb-4 pt-1 pl-1 w-full">
             <div 
               onClick={onTransitSelect}
               className={`inline-flex flex-col items-start gap-1 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider border transition-all cursor-pointer select-none
                 ${isTransitSelected 
                   ? 'bg-blue-50 border-blue-200 text-blue-900 shadow-sm' 
                   : 'bg-[#E5E7DE] border-[#1A1A1A]/5 text-[#1A1A1A]/70 shadow-sm hover:border-[#1A1A1A]/20'
                 }`}
             >
                <div className="flex items-center gap-2">
                    {getTransportIcon(item.transport_method)}
                    <span>{item.transport_method}</span>
                    {item.transit_duration && (
                      <>
                        <span className="opacity-30">|</span>
                        <span>{item.transit_duration}</span>
                      </>
                    )}
                    {isTransitSelected ? <ChevronUp className="w-3 h-3 ml-2" /> : <ChevronDown className="w-3 h-3 ml-2" />}
                </div>

                {/* Expanded Tactical Transit Steps */}
                {isTransitSelected && item.transit_steps && item.transit_steps.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-blue-200 w-full animate-fade-in text-[10px] normal-case tracking-normal opacity-90 leading-relaxed">
                    <ul className="list-disc pl-4 space-y-1">
                      {item.transit_steps.map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ul>
                  </div>
                )}
             </div>
          </div>
        </div>
      )}

      {/* 2. CARD NODE */}
      <div 
        className={`relative flex gap-4 sm:gap-6 group transition-all duration-300 ${isSelected ? 'scale-[1.01]' : ''}`}
        onClick={onSelect}
      >
        
        {/* Timeline Rail for Card */}
        <div className="relative w-4 flex flex-col items-center flex-shrink-0">
           {/* Connection from top (if there was transit or previous node) */}
           <div className={`absolute top-0 h-6 w-0.5 transition-colors duration-300 ${isTransitSelected ? 'bg-blue-600' : 'bg-[#1A1A1A]/10'}`}></div>
           
           {/* Node Marker */}
           <div className={`w-4 h-4 mt-6 bg-[#F0F2EB] border-2 border-[#1A1A1A] rounded-full flex items-center justify-center z-10 flex-shrink-0`}>
              <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-blue-500' : 'bg-[#1A1A1A]'}`} />
           </div>
           
           {/* Line downwards to next node */}
           {!isLast && (
             <div className="absolute top-8 bottom-[-40px] w-0.5 bg-[#1A1A1A]/10"></div>
           )}
        </div>

        {/* Content Card */}
        <div className={`flex-grow w-full max-w-xl transition-all ${isSelected ? 'shadow-hard translate-x-1' : ''}`}>
          <div className={`relative bg-white border-2 ${isSelected ? 'border-[#1A1A1A]' : 'border-[#1A1A1A]/20'} rounded-sm p-5 shadow-sm hover:border-[#1A1A1A] transition-colors`}>
            
            {/* ABSOLUTE ACTIONS (Top Right) - Updated position to match screenshot */}
            <div className="absolute top-4 right-4 flex items-center gap-2 z-20 print:hidden opacity-0 group-hover:opacity-100 transition-opacity">
               {!isEditing && (
                 <>
                    <button 
                       onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} 
                       className="p-1 hover:bg-[#F0F2EB] rounded-sm text-[#1A1A1A]/40 hover:text-[#1A1A1A] transition-colors"
                       title="Edit"
                    >
                       <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                       onClick={handleDelete} 
                       className="p-1 hover:bg-red-50 rounded-sm text-[#1A1A1A]/40 hover:text-red-600 transition-colors"
                       title="Delete"
                    >
                       <Trash2 className="w-3.5 h-3.5" />
                    </button>
                 </>
               )}
               {isEditing && (
                 <>
                    <button 
                       onClick={saveEdits} 
                       className="p-1 bg-[#1A1A1A] text-white rounded-sm hover:bg-green-600 transition-colors"
                       title="Save"
                    >
                       <Check className="w-3.5 h-3.5" />
                    </button>
                    <button 
                       onClick={cancelEdits} 
                       className="p-1 bg-[#F0F2EB] text-[#1A1A1A] rounded-sm hover:bg-red-100 transition-colors"
                       title="Cancel"
                    >
                       <X className="w-3.5 h-3.5" />
                    </button>
                 </>
               )}
            </div>

            {/* Header: Tags */}
            <div className="flex items-center gap-2 mb-3 pr-16">
                 <span className="text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/60 border border-[#1A1A1A]/30 px-2 py-0.5 rounded-sm">
                    {item.category || item.type || "ACTIVITY"}
                 </span>
                 {item.geo_context && (
                    <span className="text-[10px] uppercase font-bold tracking-widest bg-[#1A1A1A] text-white px-2 py-0.5 rounded-sm shadow-sm">
                       {item.geo_context}
                    </span>
                 )}
            </div>

            {/* Title - Full Width */}
            <div className="mb-2">
              {isEditing ? (
                  <input 
                    type="text" 
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full text-lg font-bold border-b border-[#1A1A1A] focus:outline-none bg-[#F0F2EB] px-1"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <h3 className="text-xl font-bold tracking-tight text-[#1A1A1A] leading-tight w-full break-words pr-8 font-mono">
                    {displayName}
                  </h3>
                )}
            </div>

            {/* Time Badge */}
            <div className="mb-4">
               <div className="inline-flex items-center gap-2 text-[10px] font-bold bg-[#E5E7DE] px-2 py-1.5 rounded-sm text-[#1A1A1A]/80 tracking-wide">
                  <Clock className="w-3 h-3 opacity-60" />
                  <span>{item.opening_hours || "09:00 - 18:00"}</span>
               </div>
            </div>
            
            {/* Notes Section - Collapsible by default */}
            <div className="pt-3 border-t border-[#1A1A1A]/10">
               <button 
                 onClick={(e) => { e.stopPropagation(); setIsNotesOpen(!isNotesOpen); }}
                 className="flex items-center gap-2 w-full text-left group/btn"
               >
                 <FileText className="w-3 h-3 text-[#1A1A1A]/40 group-hover/btn:text-[#1A1A1A] transition-colors" />
                 <span className="text-[10px] font-bold uppercase tracking-widest text-[#1A1A1A]/40 group-hover/btn:text-[#1A1A1A] transition-colors">Notes</span>
                 {isNotesOpen ? (
                     <ChevronUp className="w-3 h-3 ml-auto opacity-40" />
                 ) : (
                     <ChevronDown className="w-3 h-3 ml-auto opacity-40" />
                 )}
               </button>
               
               {isNotesOpen && (
                 <div className="mt-2 pl-5 text-xs text-[#1A1A1A] animate-fade-in">
                   {isEditing ? (
                      <textarea 
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        placeholder="Capture the vibe..."
                        className="w-full bg-[#F0F2EB] border border-[#1A1A1A]/20 p-2 rounded-sm text-xs focus:outline-none focus:border-[#1A1A1A]"
                        rows={2}
                        maxLength={200}
                        onClick={(e) => e.stopPropagation()}
                      />
                   ) : (
                      <p className="leading-relaxed">
                         {item.user_notes || "No notes added yet."}
                      </p>
                   )}
                 </div>
               )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
