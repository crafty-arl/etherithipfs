'use client';

import { useState, useEffect, useRef } from 'react';
import { Memory, MemoryFilters, MemoryStats } from '../types/memory';
import { memoryApi } from '../utils/memoryApi';
import { getCachedMemories, cacheMemories, getCachedStats, cacheStats, isStorageAvailable } from '../utils/localStorage';
import MemoryGrid from './MemoryGrid';
import MemoryDetailModal from './MemoryDetailModal';

interface MemoryDisplayProps {
  user: {
    id: string;
    username: string;
    avatar: string;
  };
  guildId?: string;
}

type ViewMode = 'our' | 'my';

export default function MemoryDisplay({ user, guildId }: MemoryDisplayProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('our'); // Start with "Our Memories"
  const [myMemories, setMyMemories] = useState<Memory[]>([]);
  const [ourMemories, setOurMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState<MemoryFilters>({});
  const [error, setError] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  // Fetch memories for both view modes
  const fetchMemories = async (mode: ViewMode) => {
    setLoading(true);
    setError(null);

    // Try to load from cache first if storage is available
    if (isStorageAvailable()) {
      const cachedMemories = getCachedMemories(user.id, mode);
      if (cachedMemories && cachedMemories.length > 0) {
        if (mode === 'my') {
          setMyMemories(cachedMemories);
        } else {
          setOurMemories(cachedMemories);
        }
        setLoading(false);
        // Continue loading fresh data in background
      }
    }

    try {
      let result;
      
      if (mode === 'my') {
        result = await memoryApi.getMyMemories(user.id, filters);
      } else {
        // For "Our Memories", do NOT send userId or guildId, just filter by privacy
        result = await memoryApi.getOurMemories(filters);
      }

      if (result.success && result.data) {
        const freshMemories = result.data.memories || [];
        
        if (mode === 'my') {
          setMyMemories(freshMemories);
        } else {
          setOurMemories(freshMemories);
        }
        
        // Cache the fresh data
        if (isStorageAvailable()) {
          cacheMemories(user.id, mode, freshMemories);
        }
      } else {
        setError(result.error || 'Failed to fetch memories');
        // Don't clear memories if we have cached data
        if (!isStorageAvailable() || !getCachedMemories(user.id, mode)) {
          if (mode === 'my') {
            setMyMemories([]);
          } else {
            setOurMemories([]);
          }
        }
      }
    } catch (err) {
      setError('Network error occurred');
      // Don't clear memories if we have cached data
      if (!isStorageAvailable() || !getCachedMemories(user.id, mode)) {
        if (mode === 'my') {
          setMyMemories([]);
        } else {
          setOurMemories([]);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch statistics
  const fetchStats = async () => {
    // Try to load from cache first if storage is available
    if (isStorageAvailable()) {
      const cachedStats = getCachedStats(user.id, guildId);
      if (cachedStats) {
        setStats(cachedStats);
        // Continue loading fresh data in background
      }
    }

    try {
      const result = await memoryApi.getMemoryStats(user.id, guildId);
      if (result.success && result.data) {
        const freshStats = result.data.stats;
        setStats(freshStats);
        
        // Cache the fresh data
        if (isStorageAvailable()) {
          cacheStats(user.id, guildId, freshStats);
        }
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
      // Keep cached stats if available
      if (!isStorageAvailable() || !getCachedStats(user.id, guildId)) {
        setStats(null);
      }
    }
  };

  // Handle memory deletion
  const handleDeleteMemory = async (memoryId: string) => {
    try {
      const result = await memoryApi.deleteMemory(memoryId, user.id);
      if (result.success) {
        const updatedMyMemories = myMemories.filter(m => m.id !== memoryId);
        const updatedOurMemories = ourMemories.filter(m => m.id !== memoryId);
        setMyMemories(updatedMyMemories);
        setOurMemories(updatedOurMemories);
        
        // Update cache
        if (isStorageAvailable()) {
          cacheMemories(user.id, 'my', updatedMyMemories);
          cacheMemories(user.id, 'our', updatedOurMemories);
        }
        
        if (stats) {
          const updatedStats = {
            ...stats,
            totalMemories: stats.totalMemories - 1,
            myMemories: stats.myMemories - 1,
            ourMemories: stats.ourMemories - 1,
          };
          setStats(updatedStats);
          
          // Update stats cache
          if (isStorageAvailable()) {
            cacheStats(user.id, guildId, updatedStats);
          }
        }
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      console.error('Failed to delete memory:', err);
      alert('Failed to delete memory. Please try again.');
    }
  };

  // Handle memory view
  const handleViewMemory = (memory: Memory) => {
    setSelectedMemory(memory);
    setIsModalOpen(true);
  };

  // Handle filter changes
  const handleFilterChange = (newFilters: Partial<MemoryFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  // Handle view mode change with smooth transition
  const handleViewModeChange = (newMode: ViewMode) => {
    if (newMode === viewMode) return;
    
    setIsTransitioning(true);
    setViewMode(newMode);
    
    // Fetch memories for the new mode if not already loaded
    if (newMode === 'my' && myMemories.length === 0) {
      fetchMemories('my');
    } else if (newMode === 'our' && ourMemories.length === 0) {
      fetchMemories('our');
    }
    
    setTimeout(() => setIsTransitioning(false), 300);
  };

  // Touch handlers for swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].clientX;
    handleSwipe();
  };

  const handleSwipe = () => {
    const swipeThreshold = 50;
    const diff = touchStartX.current - touchEndX.current;
    
    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0 && viewMode === 'our') {
        // Swipe left on "Our Memories" -> go to "My Memories"
        handleViewModeChange('my');
      } else if (diff < 0 && viewMode === 'my') {
        // Swipe right on "My Memories" -> go to "Our Memories"
        handleViewModeChange('our');
      }
    }
  };

  // Fetch data on mount and when dependencies change
  useEffect(() => {
    fetchMemories('our'); // Start with "Our Memories"
    fetchStats();
  }, [user.id, guildId]);

  // Fetch memories when filters change
  useEffect(() => {
    if (viewMode === 'my') {
      fetchMemories('my');
    } else {
      fetchMemories('our');
    }
  }, [filters]);

  const getCurrentMemories = () => viewMode === 'my' ? myMemories : ourMemories;
  const getCurrentLoading = () => loading && getCurrentMemories().length === 0;

  const getEmptyMessage = () => {
    if (viewMode === 'my') {
      return "You haven't created any memories yet. Start by uploading your first memory through Discord!";
    } else {
      return "No members-only memories found. Memories shared with 'Members Only' privacy will appear here.";
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Fashion-inspired minimalistic background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full opacity-[0.02]">
          <div className="absolute top-1/4 left-1/6 w-[600px] h-[600px] bg-gradient-to-r from-stone-200 to-stone-300 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/6 w-[400px] h-[400px] bg-gradient-to-r from-stone-100 to-stone-200 rounded-full blur-3xl"></div>
        </div>
      </div>

      <div className="relative z-10">
        {/* Minimalistic Header */}
        <header className="border-b border-stone-100 bg-white/90 backdrop-blur-sm sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-stone-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-light text-stone-900 tracking-wide fashion-text">
                    Memory Weaver
                  </h1>
                  <p className="text-stone-500 text-sm font-light fashion-text">
                    Digital Memory Preservation
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-stone-200">
                    <img 
                      src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`}
                      alt={`${user.username}'s avatar`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="text-right">
                    <p className="text-stone-900 font-medium text-sm fashion-text">{user.username}</p>
                    <p className="text-xs text-stone-500 fashion-text">Connected</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Sliding Navigation */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col space-y-8">
            {/* View Mode Slider */}
            <div className="flex items-center justify-center">
              <div className="relative bg-stone-50 rounded-2xl p-1 flex items-center">
                <button
                  onClick={() => handleViewModeChange('our')}
                  className={`relative px-8 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                    viewMode === 'our'
                      ? 'text-stone-900 bg-white shadow-sm'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Our Memories
                  {viewMode === 'our' && (
                    <div className="absolute inset-0 bg-white rounded-xl shadow-sm transition-all duration-300"></div>
                  )}
                </button>
                <button
                  onClick={() => handleViewModeChange('my')}
                  className={`relative px-8 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                    viewMode === 'my'
                      ? 'text-stone-900 bg-white shadow-sm'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  My Memories
                  {viewMode === 'my' && (
                    <div className="absolute inset-0 bg-white rounded-xl shadow-sm transition-all duration-300"></div>
                  )}
                </button>
              </div>
            </div>

            {/* Stats Display */}
            {stats && (
              <div className="flex justify-center">
                                 <div className="flex space-x-8 text-center">
                   <div>
                     <p className="text-2xl font-light text-stone-900 fashion-text">{stats.totalMemories}</p>
                     <p className="text-xs text-stone-500 uppercase tracking-wider fashion-text">Total</p>
                   </div>
                   <div>
                     <p className="text-2xl font-light text-stone-900 fashion-text">{stats.myMemories}</p>
                     <p className="text-xs text-stone-500 uppercase tracking-wider fashion-text">My</p>
                   </div>
                   <div>
                     <p className="text-2xl font-light text-stone-900 fashion-text">{stats.ourMemories}</p>
                     <p className="text-xs text-stone-500 uppercase tracking-wider fashion-text">Our</p>
                   </div>
                 </div>
              </div>
            )}

            {/* Memory Grid Container with Swipe Support */}
            <div 
              ref={containerRef}
              className="relative overflow-hidden"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <div className={`transition-transform duration-300 ease-out ${
                isTransitioning ? 'opacity-50' : 'opacity-100'
              }`}>
                <MemoryGrid
                  memories={getCurrentMemories()}
                  loading={getCurrentLoading()}
                  onViewMemory={handleViewMemory}
                  onDeleteMemory={handleDeleteMemory}
                  currentUserId={user.id}
                  emptyMessage={getEmptyMessage()}
                  viewMode={viewMode}
                />
              </div>
              
                             {/* Swipe Indicators */}
               <div className="absolute top-1/2 left-4 transform -translate-y-1/2 swipe-indicator">
                 {viewMode === 'our' && (
                   <div className="w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg">
                     <svg className="w-4 h-4 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                     </svg>
                   </div>
                 )}
               </div>
               <div className="absolute top-1/2 right-4 transform -translate-y-1/2 swipe-indicator">
                 {viewMode === 'my' && (
                   <div className="w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg">
                     <svg className="w-4 h-4 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                     </svg>
                   </div>
                 )}
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Memory Detail Modal */}
      {selectedMemory && (
        <MemoryDetailModal
          memory={selectedMemory}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedMemory(null);
          }}
          onDelete={handleDeleteMemory}
          isOwner={user.id === selectedMemory.userId}
        />
      )}
    </div>
  );
} 