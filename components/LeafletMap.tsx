
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { ItineraryItem, TripConfig } from '../types';
import { generateItemFromCoordinates } from '../services/geminiService';
import { GlobalSearch } from './GlobalSearch';
import { RefreshCw, Star, Clock, Lightbulb, X, Plus, Check } from 'lucide-react';

interface LeafletMapProps {
  items: ItineraryItem[];
  selectedItemId: string | null;
  selectedTransitId?: string | null;
  config: TripConfig;
  onAddItem: (item: ItineraryItem) => void;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({ items, selectedItemId, selectedTransitId, config, onAddItem }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const searchLayerRef = useRef<L.LayerGroup | null>(null);
  
  const [isAdding, setIsAdding] = useState(false);
  const [mapCenter, setMapCenter] = useState<{lat: number, lng: number} | undefined>(undefined);
  const [showSearchAreaBtn, setShowSearchAreaBtn] = useState(false);
  const [isSearchingArea, setIsSearchingArea] = useState(false);
  const [intelItem, setIntelItem] = useState<ItineraryItem | null>(null);

  // Keep latest props in refs
  const onAddItemRef = useRef(onAddItem);
  const configRef = useRef(config);

  useEffect(() => { onAddItemRef.current = onAddItem; }, [onAddItem]);
  useEffect(() => { configRef.current = config; }, [config]);
  
  // Sync selected item with Intel Sheet
  useEffect(() => {
     if (selectedItemId) {
        const item = items.find(i => i.id === selectedItemId);
        setIntelItem(item || null);
     } else {
        // Only clear if we are not in preview mode
        if (intelItem && items.find(i => i.id === intelItem.id)) {
            setIntelItem(null);
        }
     }
  }, [selectedItemId, items]);

  // Handle Global Search Selection
  const handleSearchSelect = async (lat: number, lng: number, name: string) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    map.flyTo([lat, lng], 16, { duration: 1.5 });
    
    // Preview Mode
    setIsAdding(true);
    try {
       const newItem = await generateItemFromCoordinates(lat, lng, configRef.current);
       if (name) newItem.stop_name = name;
       setIntelItem(newItem);
    } catch (err) {
       console.error(err);
    } finally {
       setIsAdding(false);
    }
  };

  const addItemAtLocation = async (lat: number, lng: number, name?: string) => {
      setIsAdding(true);
      try {
         const newItem = await generateItemFromCoordinates(lat, lng, configRef.current);
         if (name) newItem.stop_name = name;
         onAddItemRef.current(newItem);
      } catch (err) {
         console.error(err);
      } finally {
         setIsAdding(false);
      }
  };

  const handleSearchThisArea = async () => {
      const map = mapInstanceRef.current;
      if (!map) return;

      setIsSearchingArea(true);
      const bounds = map.getBounds();
      const bbox = `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`;
      
      try {
          const res = await fetch(`https://photon.komoot.io/api/?q=attraction&bbox=${bbox}&limit=10`);
          const data = await res.json();
          
          if (searchLayerRef.current) {
              searchLayerRef.current.clearLayers();
              
              data.features.forEach((f: any) => {
                  const lat = f.geometry.coordinates[1];
                  const lng = f.geometry.coordinates[0];
                  const name = f.properties.name || "Unknown Spot";
                  
                  const marker = L.circleMarker([lat, lng], {
                      radius: 5,
                      fillColor: 'white',
                      fillOpacity: 1,
                      color: '#1A1A1A',
                      weight: 2,
                      dashArray: '3, 3'
                  });

                  marker.bindPopup(`
                    <div class="p-2 text-center font-mono">
                      <div class="text-xs font-bold mb-1">${name}</div>
                      <div class="text-[10px] opacity-60 mb-2">${f.properties.city || ''}</div>
                      <button id="add-search-btn-${lat}-${lng}" class="bg-[#1A1A1A] text-[#F0F2EB] px-2 py-1 rounded-sm text-[10px] font-bold uppercase hover:opacity-80">
                        Add
                      </button>
                    </div>
                  `);
                  
                  marker.on('popupopen', () => {
                      setTimeout(() => {
                         const btn = document.getElementById(`add-search-btn-${lat}-${lng}`);
                         if (btn) {
                             btn.onclick = () => {
                                 map.closePopup();
                                 addItemAtLocation(lat, lng, name);
                                 marker.remove();
                             }
                         }
                      }, 10);
                  });

                  marker.addTo(searchLayerRef.current!);
              });
          }
          setShowSearchAreaBtn(false);
      } catch (e) {
          console.error("Search area failed", e);
      } finally {
          setIsSearchingArea(false);
      }
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
    }

    const container = mapContainerRef.current;
    const map = L.map(container, {
      zoomControl: false,
      attributionControl: false
    }).setView([0, 0], 2);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy;OpenStreetMap, &copy;CartoDB',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);
    
    L.control.attribution({ position: 'bottomright' }).addTo(map);
    
    const layerGroup = L.layerGroup().addTo(map);
    const routeLayer = L.layerGroup().addTo(map);
    const searchLayer = L.layerGroup().addTo(map);
    
    mapInstanceRef.current = map;
    layerGroupRef.current = layerGroup;
    routeLayerRef.current = routeLayer;
    searchLayerRef.current = searchLayer;

    // Track movement
    map.on('moveend', () => {
        const center = map.getCenter();
        setMapCenter({ lat: center.lat, lng: center.lng });
        setShowSearchAreaBtn(true);
    });

    map.on('click', async (e: L.LeafletMouseEvent) => {
      setIntelItem(null); 
      const { lat, lng } = e.latlng;
      const popupContent = `
        <div class="p-2 text-center font-mono">
          <div class="text-xs font-bold mb-2">Add this spot?</div>
          <button id="add-spot-btn-${lat}-${lng}" class="bg-[#1A1A1A] text-[#F0F2EB] px-3 py-1 rounded-sm text-xs font-bold uppercase hover:opacity-80">
            Add to Itinerary
          </button>
        </div>
      `;

      L.popup()
        .setLatLng(e.latlng)
        .setContent(popupContent)
        .openOn(map);

      setTimeout(() => {
         const btn = document.getElementById(`add-spot-btn-${lat}-${lng}`);
         if (btn) {
           btn.onclick = async () => {
              map.closePopup();
              addItemAtLocation(lat, lng);
           };
         }
      }, 50);
    });

    return () => {
      if (map) map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Markers & Route
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layers = layerGroupRef.current;
    const routes = routeLayerRef.current;
    const dayColors = ['#1A1A1A', '#4A4A4A', '#717171', '#9E9E9E', '#C2C2C2'];

    if (layers && routes && map) {
      layers.clearLayers();
      routes.clearLayers();
      
      const validItems = items.filter(item => item.coordinates?.lat && item.coordinates?.lng);
      
      if (validItems.length > 1) {
          for (let i = 0; i < validItems.length - 1; i++) {
              const start = validItems[i];
              const end = validItems[i+1];
              const isSegmentActive = selectedTransitId === end.id; 

              L.polyline([[start.coordinates.lat, start.coordinates.lng], [end.coordinates.lat, end.coordinates.lng]], {
                  color: isSegmentActive ? '#3B82F6' : '#1A1A1A',
                  weight: isSegmentActive ? 5 : 2,
                  opacity: isSegmentActive ? 1 : 0.3,
                  dashArray: isSegmentActive ? undefined : '5, 10',
                  lineCap: 'round'
              }).addTo(routes);

              if (isSegmentActive) {
                   const bounds = L.latLngBounds(
                       [start.coordinates.lat, start.coordinates.lng],
                       [end.coordinates.lat, end.coordinates.lng]
                   );
                   map.fitBounds(bounds, { padding: [100, 100], maxZoom: 15 });
              }
          }
      }

      validItems.forEach((item, index) => {
          const isSelected = item.id === selectedItemId;
          const dayIdx = item.dayNumber ? item.dayNumber - 1 : 0;
          const markerColor = dayColors[dayIdx % dayColors.length];
          const markerRadius = isSelected ? 14 : 10;

          const marker = L.circleMarker([item.coordinates.lat, item.coordinates.lng], {
            radius: markerRadius,
            fillColor: isSelected ? '#3B82F6' : markerColor,
            fillOpacity: 1,
            color: '#F0F2EB',
            weight: 3,
            opacity: 1
          });

          marker.bindTooltip(`${index + 1}`, { 
              permanent: true, 
              direction: 'center', 
              className: 'marker-label' 
          });
          
          marker.on('click', () => {
              setIntelItem(item);
          });
          
          marker.addTo(layers);
      });

      if (intelItem && !items.find(i => i.id === intelItem.id) && intelItem.coordinates) {
          const previewMarker = L.circleMarker([intelItem.coordinates.lat, intelItem.coordinates.lng], {
            radius: 14,
            fillColor: 'transparent',
            fillOpacity: 0,
            color: '#3B82F6',
            weight: 3,
            dashArray: '4, 4',
            opacity: 1
          });
          previewMarker.addTo(layers);
      }

      if (!selectedItemId && !selectedTransitId && validItems.length > 0 && !mapCenter) {
           const coords = validItems.map(i => [i.coordinates.lat, i.coordinates.lng] as [number, number]);
           const bounds = L.latLngBounds(coords);
           map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      }
    }
  }, [items, selectedItemId, selectedTransitId, intelItem]); 

  // FlyTo
  useEffect(() => {
     const map = mapInstanceRef.current;
     if (!map || !selectedItemId) return;
     const selectedItem = items.find(i => i.id === selectedItemId);
     if (selectedItem?.coordinates) {
        map.flyTo([selectedItem.coordinates.lat, selectedItem.coordinates.lng], 15, {
           duration: 1.0,
           easeLinearity: 0.25
        });
     }
  }, [selectedItemId, items]);

  const isPreview = intelItem && !items.find(i => i.id === intelItem.id);

  return (
    <div className="w-full h-full relative group overflow-hidden">
       <div ref={mapContainerRef} className="absolute inset-0 z-0 bg-[#F0F2EB]" />
       <GlobalSearch onSelectLocation={handleSearchSelect} bias={mapCenter} />
       
       <style>{`
         .marker-label {
           background: transparent;
           border: none;
           box-shadow: none;
           color: #F0F2EB;
           font-family: 'JetBrains Mono', monospace;
           font-weight: bold;
           font-size: 11px; 
         }
       `}</style>

       {showSearchAreaBtn && !isAdding && (
         <button 
           onClick={handleSearchThisArea}
           className="absolute top-20 left-1/2 -translate-x-1/2 z-[900] bg-white border-2 border-[#1A1A1A] shadow-hard px-4 py-2 rounded-full flex items-center gap-2 hover:bg-[#F0F2EB] transition-colors"
         >
            {isSearchingArea ? (
               <div className="animate-spin w-3 h-3 border-2 border-[#1A1A1A] border-t-transparent rounded-full" />
            ) : (
               <RefreshCw className="w-3 h-3 text-[#1A1A1A]" />
            )}
            <span className="text-xs font-bold uppercase tracking-widest text-[#1A1A1A]">Search This Area</span>
         </button>
       )}

       {/* Intel Sheet Overlay */}
       {intelItem && (
         <div className="absolute bottom-0 left-0 right-0 bg-white border-t-2 border-[#1A1A1A] z-[1000] animate-slide-up shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="p-6">
                {/* Header */}
                <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 pr-4">
                        <h3 className="text-xl md:text-2xl font-black uppercase tracking-tighter leading-none mb-2">{intelItem.stop_name}</h3>
                        <div className="flex items-center gap-2 text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-widest">
                            {intelItem.geo_context && <span>{intelItem.geo_context}</span>}
                            {intelItem.rating && (
                                <span className="flex items-center gap-1 text-[#1A1A1A]">
                                    <span className="w-1 h-1 bg-black rounded-full" /> {intelItem.rating}
                                </span>
                            )}
                        </div>
                    </div>
                    <button onClick={() => setIntelItem(null)} className="p-2 hover:bg-[#1A1A1A]/5 rounded-full -mt-2 -mr-2">
                        <X className="w-6 h-6 text-[#1A1A1A]" />
                    </button>
                </div>

                {/* Time Badge */}
                <div className="mb-4">
                    <div className="inline-flex items-center gap-2 text-[10px] font-bold bg-[#E5E7DE] px-2 py-1.5 rounded-sm border border-[#1A1A1A]/5 text-[#1A1A1A]/80 tracking-wide uppercase">
                        <Clock className="w-3 h-3 opacity-60" />
                        <span>{intelItem.opening_hours || "Hours: Check Online"}</span>
                    </div>
                </div>

                {/* Rationale - Featured prominently like screenshot */}
                {intelItem.rationale && (
                   <div className="flex items-start gap-4 mb-6">
                        {/* Blue bar indicator */}
                        <div className="w-1 self-stretch bg-blue-500 rounded-full flex-shrink-0" />
                        <p className="text-sm font-medium leading-relaxed text-[#1A1A1A]">
                            {intelItem.rationale}
                        </p>
                   </div>
                )}

                {/* Photos Grid - Two Column Big Boxes */}
                <div className="grid grid-cols-2 gap-2 mb-6 h-48">
                    {intelItem.photos && intelItem.photos.length > 0 ? (
                        intelItem.photos.slice(0, 2).map((photo, i) => (
                            <div key={i} className="relative w-full h-full bg-[#F0F2EB] border border-[#1A1A1A]/10 overflow-hidden group">
                                <img 
                                    src={photo} 
                                    alt={`View ${i+1}`} 
                                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                                    onError={(e) => {
                                        e.currentTarget.onerror = null; 
                                        e.currentTarget.src = `https://placehold.co/600x400/EEE/31343C?text=${encodeURIComponent(intelItem.category || 'VIEW')}`;
                                    }}
                                />
                            </div>
                        ))
                    ) : (
                        // Fallback placeholders - Matches screenshot style with large text
                        <>
                           <div className="bg-[#F0F2EB] border border-[#1A1A1A]/10 flex items-center justify-center">
                               <img 
                                   src={`https://placehold.co/600x400/EEE/31343C?text=${encodeURIComponent(intelItem.category || 'TOUR')}`} 
                                   alt="Placeholder" 
                                   className="w-full h-full object-cover"
                               />
                           </div>
                           <div className="bg-[#F0F2EB] border border-[#1A1A1A]/10 flex items-center justify-center">
                               <img 
                                   src={`https://placehold.co/600x400/EEE/31343C?text=${encodeURIComponent(intelItem.category || 'TOUR')}`} 
                                   alt="Placeholder" 
                                   className="w-full h-full object-cover"
                               />
                           </div>
                        </>
                    )}
                </div>

                {/* Tactical Tips - Yellow Box */}
                {intelItem.tactical_tips && intelItem.tactical_tips.length > 0 && (
                    <div className="bg-[#FFF9E5] border border-[#FFEeba] p-4 rounded-sm mb-8">
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-amber-900 mb-3">
                            <Lightbulb className="w-3.5 h-3.5" /> Tips
                        </div>
                        <ul className="space-y-2">
                            {intelItem.tactical_tips.map((tip, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-xs font-medium text-amber-900/80 leading-snug">
                                    <span className="mt-1.5 w-1 h-1 bg-amber-400 rounded-full flex-shrink-0" />
                                    {tip}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Add to Itinerary Action - Footer Style */}
                <div className="border-t-2 border-[#1A1A1A] border-dashed pt-6">
                    {isPreview ? (
                        <button 
                            onClick={() => {
                                if (intelItem) {
                                    onAddItemRef.current(intelItem);
                                }
                            }}
                            className="w-full py-4 bg-[#1A1A1A] text-[#F0F2EB] font-bold uppercase tracking-widest text-sm hover:opacity-90 flex items-center justify-center gap-2 shadow-hard border border-black"
                        >
                            <Plus className="w-4 h-4" /> Add to Itinerary
                        </button>
                    ) : (
                        <div className="w-full py-2 text-[#1A1A1A]/40 font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                            <Check className="w-4 h-4" /> Added to Itinerary
                        </div>
                    )}
                </div>
            </div>
         </div>
       )}

       {isAdding && (
         <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000] bg-[#1A1A1A] text-[#F0F2EB] px-4 py-2 rounded-full shadow-hard flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest">Adding Location...</span>
         </div>
       )}
    </div>
  );
};
