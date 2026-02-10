
import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { InputSection } from './components/InputSection';
import { Timeline } from './components/Timeline';
import { ItineraryItem, TripConfig, AppState } from './types';
import { generateDayItinerary } from './services/geminiService';
import { optimizeRouteSequence } from './actions/optimize-route';
import { AlertCircle, ArrowLeft, Wand2 } from 'lucide-react';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.CONFIG);
  const [tripConfig, setTripConfig] = useState<TripConfig | null>(null);
  const [days, setDays] = useState<ItineraryItem[][]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Hydrate state from URL (Share Feature)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const data = params.get('data');
    if (data) {
      try {
        const decoded = JSON.parse(atob(data));
        if (decoded.config && decoded.days) {
          setTripConfig(decoded.config);
          setDays(decoded.days);
          setAppState(AppState.VIEWING);
        }
      } catch (e) {
        console.error("Failed to parse shared itinerary", e);
      }
    }
  }, []);

  const calculateTotalDays = (config: TripConfig) => {
    const start = new Date(config.startDate);
    const end = new Date(config.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const handleStartTrip = async (config: TripConfig) => {
    setTripConfig(config);
    setAppState(AppState.VIEWING);
    await generateNextDay(config, []);
  };

  const generateNextDay = async (config: TripConfig, currentDays: ItineraryItem[][]) => {
    setIsGenerating(true);
    setErrorMsg(null);
    try {
        const nextDayIndex = currentDays.length + 1;
        const previousStops = currentDays.flat().map(item => item.stop_name);
        const newDayItems = await generateDayItinerary(nextDayIndex, config, previousStops);
        setDays(prev => [...prev, newDayItems]);
    } catch (error) {
        console.error(error);
        setErrorMsg("Failed to generate logistics. Please try again.");
    } finally {
        setIsGenerating(false);
    }
  };

  const handleOptimizeDay = async (dayIndex: number) => {
    setIsOptimizing(true);
    const dayItems = days[dayIndex];
    if (!dayItems) return;

    try {
      const sortedIds = await optimizeRouteSequence(dayItems);
      
      // Reorder items based on returned IDs
      const itemMap = new Map(dayItems.map(i => [i.id, i]));
      const newOrder = sortedIds.map(id => itemMap.get(id)).filter(Boolean) as ItineraryItem[];
      
      // Append any missing items (safety check)
      const missing = dayItems.filter(i => !sortedIds.includes(i.id));
      const finalOrder = [...newOrder, ...missing];

      setDays(prev => {
        const newDays = [...prev];
        newDays[dayIndex] = finalOrder;
        return newDays;
      });
    } catch (e) {
      console.error("Optimization error", e);
      setErrorMsg("Optimization failed. Try again.");
    } finally {
      setIsOptimizing(false);
    }
  };

  // CRUD Handlers
  const handleUpdateItem = (id: string, updates: Partial<ItineraryItem>) => {
    setDays(prevDays => prevDays.map(dayItems => 
      dayItems.map(item => item.id === id ? { ...item, ...updates } : item)
    ));
  };

  const handleDeleteItem = (id: string) => {
    setDays(prevDays => prevDays.map(dayItems => 
      dayItems.filter(item => item.id !== id)
    ).filter(dayItems => dayItems.length > 0));
  };

  const handleAddItem = async (newItem: ItineraryItem) => {
    // 1. Determine which day to add to (currently simply the last day)
    let currentDaysSnapshot = [...days];
    let dayIndex = currentDaysSnapshot.length > 0 ? currentDaysSnapshot.length - 1 : 0;
    
    // Assign Day Number to new item
    const itemWithDay = { ...newItem, dayNumber: dayIndex + 1 };
    
    // Initialize day if it doesn't exist
    if (currentDaysSnapshot.length === 0) {
        currentDaysSnapshot = [[itemWithDay]];
    } else {
        currentDaysSnapshot[dayIndex] = [...currentDaysSnapshot[dayIndex], itemWithDay];
    }

    // 2. Immediate Optimistic Update
    setDays(currentDaysSnapshot);

    // 3. Trigger Optimization on the *updated* list snapshot
    const dayToOptimize = currentDaysSnapshot[dayIndex];
    
    // Only optimize if we have a reasonable number of items
    if (dayToOptimize.length >= 3) {
        setIsOptimizing(true);
        try {
            const sortedIds = await optimizeRouteSequence(dayToOptimize);
            
            // Reconstruct order
            const itemMap = new Map(dayToOptimize.map(i => [i.id, i]));
            const newOrder = sortedIds.map(id => itemMap.get(id)).filter(Boolean) as ItineraryItem[];
            
            // Catch missing items (e.g. if AI hallucinates IDs)
            const missing = dayToOptimize.filter(i => !sortedIds.includes(i.id));
            const finalOrder = [...newOrder, ...missing];

            // 4. Final State Update
            setDays(prev => {
                const freshDays = [...prev];
                if (freshDays[dayIndex]) {
                    freshDays[dayIndex] = finalOrder;
                }
                return freshDays;
            });
        } catch (e) {
            console.error("Auto-optimization failed", e);
        } finally {
            setIsOptimizing(false);
        }
    }
  };

  const handleShare = () => {
    if (!tripConfig || days.length === 0) return;
    const payload = { config: tripConfig, days };
    const encoded = btoa(JSON.stringify(payload));
    const url = `${window.location.origin}${window.location.pathname}?data=${encoded}`;
    navigator.clipboard.writeText(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const resetApp = () => {
    setAppState(AppState.CONFIG);
    setDays([]);
    setTripConfig(null);
    setSelectedItemId(null);
    window.history.replaceState({}, '', window.location.pathname);
  };

  return (
    <div className="min-h-screen flex flex-col font-mono text-[#1A1A1A] bg-[#F0F2EB]">
      <Header 
        onShare={handleShare} 
        onPrint={handlePrint}
        showActions={appState === AppState.VIEWING}
      />
      
      {appState === AppState.CONFIG && (
        <main className="flex-grow container mx-auto px-4 py-12">
          <div className="text-center mb-12 space-y-4 max-w-2xl mx-auto">
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter leading-[0.9]">
              PLAYbook
            </h2>
            <p className="text-lg opacity-70 leading-relaxed max-w-lg mx-auto">
               Your instant adventure co-pilot, who turns sudden free time into an optimized travel plan. Start building your itinerary PLAYbook!
            </p>
          </div>
          <InputSection isLoading={false} onStart={handleStartTrip} />
        </main>
      )}

      {appState === AppState.VIEWING && tripConfig && (
        <div className="flex-grow flex flex-col">
            <div className="container mx-auto px-6 py-4 flex justify-between items-center print:hidden">
                <button onClick={resetApp} className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:opacity-60 transition-opacity">
                    <ArrowLeft className="w-4 h-4" /> Reset Configuration
                </button>
                {isOptimizing && (
                   <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-600 animate-pulse">
                      <Wand2 className="w-4 h-4" /> Optimizing Sequence...
                   </div>
                )}
            </div>
            
            {days.length === 0 && isGenerating && (
                <div className="flex-grow flex flex-col items-center justify-center space-y-4 opacity-50">
                    <div className="animate-spin w-8 h-8 border-4 border-[#1A1A1A] border-t-transparent rounded-full" />
                    <p className="text-xs font-bold uppercase tracking-widest">Initializing Day 1 Protocol...</p>
                </div>
            )}

            {errorMsg && (
                <div className="max-w-lg mx-auto m-8 p-4 border-2 border-red-900/10 bg-red-50 text-red-900 rounded-lg flex items-center gap-3">
                    <AlertCircle className="w-5 h-5"/>
                    <span className="text-sm font-bold">{errorMsg}</span>
                </div>
            )}

            {days.length > 0 && (
                <Timeline 
                    days={days} 
                    config={tripConfig} 
                    totalDays={calculateTotalDays(tripConfig)}
                    onGenerateNextDay={() => generateNextDay(tripConfig, days)}
                    isGenerating={isGenerating}
                    onUpdateItem={handleUpdateItem}
                    onDeleteItem={handleDeleteItem}
                    onAddItem={handleAddItem}
                    onSelectItem={setSelectedItemId}
                    selectedItemId={selectedItemId}
                />
            )}
        </div>
      )}
    </div>
  );
};

export default App;
