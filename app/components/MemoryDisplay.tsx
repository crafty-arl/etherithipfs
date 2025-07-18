'use client';

import { useState, useEffect, useRef } from 'react';
import { Memory, MemoryFilters, MemoryStats } from '../types/memory';
import { memoryApi } from '../utils/memoryApi';
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
  const [viewMode, setViewMode] = useState<ViewMode>('our');
  const [myMemories, setMyMemories] = useState<Memory[]>([]);
  const [ourMemories, setOurMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState<MemoryFilters>({});
  const [error, setError] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [allTags, setAllTags] = useState<string[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [usernames, setUsernames] = useState<Record<string, string>>({});
  
  // New loading states for complete page loading
  const [memoriesLoaded, setMemoriesLoaded] = useState(false);
  const [usernamesLoaded, setUsernamesLoaded] = useState(false);
  const [statsLoaded, setStatsLoaded] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  // Check if all essential data is loaded
  const isPageFullyLoaded = memoriesLoaded && usernamesLoaded && statsLoaded;

  // Update initial load complete status
  useEffect(() => {
    if (isPageFullyLoaded && !initialLoadComplete) {
      console.log('🎉 All data loaded, showing page content');
      setInitialLoadComplete(true);
      setLoading(false);
    }
  }, [isPageFullyLoaded, initialLoadComplete]);

  // Extract and sort all unique tags from memories
  const extractTags = (memories: Memory[]) => {
    const tagSet = new Set<string>();
    memories.forEach(memory => {
      if (memory.tags && Array.isArray(memory.tags)) {
        memory.tags.forEach(tag => {
          if (tag && typeof tag === 'string') {
            tagSet.add(tag.toLowerCase().trim());
          }
        });
      }
    });
    return Array.from(tagSet).sort();
  };

  // Extract and sort all unique categories from memories
  const extractCategories = (memories: Memory[]) => {
    const categorySet = new Set<string>();
    memories.forEach(memory => {
      if (memory.category && typeof memory.category === 'string') {
        categorySet.add(memory.category.trim());
      }
    });
    return Array.from(categorySet).sort();
  };

  // Fetch Discord usernames for user IDs
  const fetchUsernames = async (userIds: string[]) => {
    console.log('👥 Fetching usernames for user IDs:', userIds);
    
    if (userIds.length === 0) {
      setUsernamesLoaded(true);
      return;
    }
    
    try {
      const response = await fetch('/api/auth/discord/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds }),
        credentials: 'include'
      });
      
      console.log('👥 Username fetch response:', response.status, response.ok);
      
      if (response.ok) {
        const data = await response.json();
        console.log('👥 Username fetch data:', data);
        
        if (data.success) {
          console.log('✅ Successfully fetched usernames:', data.users);
          setUsernames(prev => {
            const updated = { ...prev, ...data.users };
            console.log('👥 Updated usernames state:', updated);
            return updated;
          });
        } else {
          console.warn('❌ Username fetch failed:', data.error);
        }
      } else {
        const errorData = await response.text();
        console.warn('❌ Username fetch HTTP error:', response.status, errorData);
      }
    } catch (error) {
      console.error('❌ Failed to fetch usernames:', error);
    } finally {
      setUsernamesLoaded(true);
    }
  };

  // Fetch memories for both view modes
  const fetchMemories = async (mode: ViewMode) => {
    console.log(`📚 Starting to fetch ${mode} memories`);
    setMemoriesLoaded(false);
    setError(null);

    try {
      let result;
      
      if (mode === 'my') {
        result = await memoryApi.getMyMemories(user.id, filters);
      } else {
        result = await memoryApi.getOurMemories(filters);
      }

      if (result.success && result.data) {
        const freshMemories = result.data.memories || [];
        
        // Debug logging to see what the API actually returned
        console.log('📡 Raw API result:', {
          success: result.success,
          dataKeys: Object.keys(result.data),
          memoriesCount: freshMemories.length,
          firstMemory: freshMemories[0] ? {
            id: freshMemories[0].id,
            createdAt: freshMemories[0].createdAt,
            createdAtType: typeof freshMemories[0].createdAt,
            allKeys: Object.keys(freshMemories[0]),
            rawObject: freshMemories[0]
          } : null
        });
        
        if (mode === 'my') {
          setMyMemories(freshMemories);
        } else {
          setOurMemories(freshMemories);
        }
        
        // Extract tags from all memories
        const allMemories = mode === 'my' ? [...ourMemories, ...freshMemories] : [...myMemories, ...freshMemories];
        const tags = extractTags(allMemories);
        setAllTags(tags);
        
        // Extract categories from all memories
        const categories = extractCategories(allMemories);
        setAllCategories(categories);
        
        // Fetch usernames for all user IDs in memories
        const userIds = Array.from(new Set(freshMemories.map(m => m.userId).filter(Boolean)));
        console.log('🔍 Extracted user IDs from memories:', userIds);
        
        if (userIds.length > 0) {
          console.log('👥 Starting username fetch for', userIds.length, 'users');
          await fetchUsernames(userIds);
        } else {
          console.log('⚠️ No user IDs found in memories');
          setUsernamesLoaded(true);
        }
        
        setMemoriesLoaded(true);
      } else {
        setError(result.error || 'Failed to fetch memories');
        setMemoriesLoaded(true);
        setUsernamesLoaded(true);
      }
    } catch (err) {
      setError('Network error occurred');
      setMemoriesLoaded(true);
      setUsernamesLoaded(true);
    }
  };

  // Fetch statistics
  const fetchStats = async () => {
    console.log('📊 Starting to fetch stats');
    setStatsLoaded(false);

    try {
      const result = await memoryApi.getMemoryStats(user.id, guildId);
      if (result.success && result.data) {
        const freshStats = result.data.stats;
        setStats(freshStats);
        console.log('✅ Stats loaded successfully');
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
      setStats(null);
    } finally {
      setStatsLoaded(true);
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
        
        if (stats) {
          const updatedStats = {
            ...stats,
            totalMemories: stats.totalMemories - 1,
            myMemories: stats.myMemories - 1,
            ourMemories: stats.ourMemories - 1,
          };
          setStats(updatedStats);
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

  // Handle tag selection
  const handleTagSelect = (tag: string) => {
    setSelectedTags(prev => {
      if (prev.includes(tag)) {
        return prev.filter(t => t !== tag);
      } else {
        return [...prev, tag];
      }
    });
  };

  // Clear all tag filters
  const clearTagFilters = () => {
    setSelectedTags([]);
  };

  // Handle category selection
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
  };

  // Clear category filter
  const clearCategoryFilter = () => {
    setSelectedCategory('');
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSelectedTags([]);
    setSelectedCategory('');
  };

  // Handle filter changes
  const handleFilterChange = (newFilters: Partial<MemoryFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  // Handle view mode change with smooth transition
  const handleViewModeChange = (newMode: ViewMode) => {
    if (newMode === viewMode || isTransitioning) return;
    
    setIsTransitioning(true);
    setViewMode(newMode);
    
    // Fetch memories for the new mode
    if (newMode === 'my') {
      fetchMemories('my');
    } else {
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

  // Filter memories based on selected tags and category
  const getFilteredMemories = () => {
    const currentMemories = viewMode === 'my' ? myMemories : ourMemories;
    
    return currentMemories.filter(memory => {
      // Category filter
      if (selectedCategory && memory.category !== selectedCategory) {
        return false;
      }
      
      // Tag filter
      if (selectedTags.length > 0) {
        if (!memory.tags || !Array.isArray(memory.tags)) return false;
        const memoryTags = memory.tags.map(tag => tag.toLowerCase().trim());
        return selectedTags.some(selectedTag => memoryTags.includes(selectedTag));
      }
      
      return true;
    });
  };

  const getCurrentMemories = () => getFilteredMemories();

  const getEmptyMessage = () => {
    const hasFilters = selectedTags.length > 0 || selectedCategory;
    
    if (hasFilters) {
      const filterParts = [];
      if (selectedCategory) filterParts.push(`category: ${selectedCategory}`);
      if (selectedTags.length > 0) filterParts.push(`tags: ${selectedTags.join(', ')}`);
      return `No memories found with the selected ${filterParts.join(' and ')}`;
    }
    
    if (viewMode === 'my') {
      return "You haven't created any memories yet. Start by uploading your first memory through Discord!";
    } else {
      return "No members-only memories found. Memories shared with 'Members Only' privacy will appear here.";
    }
  };

  // Fetch data on mount
  useEffect(() => {
    console.log('🚀 Initial data fetch starting');
    fetchMemories('our'); // Start with "Our Memories"
    fetchStats();
  }, [user.id, guildId]);

  // Handle filters change
  useEffect(() => {
    if (initialLoadComplete) {
      if (viewMode === 'my') {
        fetchMemories('my');
      } else {
        fetchMemories('our');
      }
    }
  }, [filters]);

  // Show loading screen until everything is ready
  if (!initialLoadComplete) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        {/* Fashion-inspired minimalistic background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full opacity-[0.02]">
            <div className="absolute top-1/4 left-1/6 w-[600px] h-[600px] bg-gradient-to-r from-stone-200 to-stone-300 rounded-full blur-3xl"></div>
            <div className="absolute bottom-1/4 right-1/6 w-[400px] h-[400px] bg-gradient-to-r from-stone-100 to-stone-200 rounded-full blur-3xl"></div>
          </div>
        </div>

        <div className="relative z-10 text-center">
          <div className="w-16 h-16 mx-auto mb-6">
            <div className="w-full h-full border-4 border-stone-200 border-t-stone-900 rounded-full animate-spin"></div>
          </div>
          <h2 className="text-xl font-light text-stone-900 mb-2">Loading Memory Weaver</h2>
          <p className="text-stone-500 text-sm">
            {!memoriesLoaded && 'Fetching memories...'}
            {memoriesLoaded && !usernamesLoaded && 'Loading usernames...'}
            {memoriesLoaded && usernamesLoaded && !statsLoaded && 'Getting statistics...'}
          </p>
          
          {/* Loading progress indicators */}
          <div className="mt-6 flex justify-center space-x-4 text-xs">
            <div className={`flex items-center space-x-1 ${memoriesLoaded ? 'text-green-600' : 'text-stone-400'}`}>
              {memoriesLoaded ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              ) : (
                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              )}
              <span>Memories</span>
            </div>
            
            <div className={`flex items-center space-x-1 ${usernamesLoaded ? 'text-green-600' : 'text-stone-400'}`}>
              {usernamesLoaded ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              ) : (
                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              )}
              <span>Usernames</span>
            </div>
            
            <div className={`flex items-center space-x-1 ${statsLoaded ? 'text-green-600' : 'text-stone-400'}`}>
              {statsLoaded ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              ) : (
                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              )}
              <span>Statistics</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-white">
      {/* Fashion-inspired minimalistic background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full opacity-[0.02]">
          <div className="absolute top-1/4 left-1/6 w-[600px] h-[600px] bg-gradient-to-r from-stone-200 to-stone-300 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/6 w-[400px] h-[400px] bg-gradient-to-r from-stone-100 to-stone-200 rounded-full blur-3xl"></div>
        </div>
      </div>

      <div className="relative z-10 h-full">
        {/* Main Content Area */}
        <div className="max-w-7xl mx-auto h-full">
          <div className="flex h-full">
            
            {/* Left Sidebar - Tags */}
            <div className="w-80 border-r border-stone-100 bg-stone-50/50 backdrop-blur-sm h-full flex flex-col">
              <div className="p-6 flex flex-col h-full">
                
                {/* View Mode Selector */}
                <div className="mb-6">
                  <div className="bg-white rounded-xl p-1 shadow-sm border border-stone-200">
                    <button
                      onClick={() => handleViewModeChange('our')}
                      className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        viewMode === 'our'
                          ? 'bg-stone-100 text-stone-900 shadow-sm'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      Our Memories
                    </button>
                    <button
                      onClick={() => handleViewModeChange('my')}
                      className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        viewMode === 'my'
                          ? 'bg-stone-100 text-stone-900 shadow-sm'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      My Memories
                    </button>
                  </div>
                </div>

                {/* Stats */}
                {stats && (
                  <div className="mb-6 bg-white rounded-xl p-4 shadow-sm border border-stone-200">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-lg font-light text-stone-900">{stats.totalMemories}</p>
                        <p className="text-xs text-stone-500 uppercase tracking-wider">Total</p>
                      </div>
                      <div>
                        <p className="text-lg font-light text-stone-900">{stats.myMemories}</p>
                        <p className="text-xs text-stone-500 uppercase tracking-wider">My</p>
                      </div>
                      <div>
                        <p className="text-lg font-light text-stone-900">{stats.ourMemories}</p>
                        <p className="text-xs text-stone-500 uppercase tracking-wider">Our</p>
                      </div>
                    </div>
                  </div>
                )}

                                 {/* Category Selector */}
                 <div className="mb-6">
                   <div className="bg-white rounded-xl p-4 shadow-sm border border-stone-200">
                     <div className="flex items-center justify-between mb-3">
                       <h3 className="text-sm font-medium text-stone-900 uppercase tracking-wider">Category</h3>
                       {selectedCategory && (
                         <button
                           onClick={clearCategoryFilter}
                           className="text-xs text-stone-500 hover:text-stone-700 transition-colors"
                         >
                           Clear
                         </button>
                       )}
                     </div>
                     <select
                       value={selectedCategory}
                       onChange={(e) => handleCategoryChange(e.target.value)}
                       className="w-full px-3 py-2 rounded-lg text-sm bg-white border border-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:border-transparent"
                     >
                       <option value="">All Categories</option>
                       {allCategories.map(category => (
                         <option key={category} value={category}>{category}</option>
                       ))}
                     </select>
                   </div>
                 </div>

                {/* Tags Section */}
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-stone-900 uppercase tracking-wider">Tags</h3>
                    {selectedTags.length > 0 && (
                      <button
                        onClick={clearTagFilters}
                        className="text-xs text-stone-500 hover:text-stone-700 transition-colors"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                  
                  {/* All Tags List */}
                  <div className="overflow-y-auto flex-1 pr-2 min-h-0">
                    <div className="space-y-1">
                      {allTags.map(tag => (
                        <button
                          key={tag}
                          onClick={() => handleTagSelect(tag)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-200 flex items-center justify-between ${
                            selectedTags.includes(tag)
                              ? 'bg-stone-900 text-white shadow-sm'
                              : 'text-stone-600 hover:bg-white hover:text-stone-900 hover:shadow-sm'
                          }`}
                        >
                          <span>#{tag}</span>
                          {selectedTags.includes(tag) && (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      ))}
                      
                      {allTags.length === 0 && !loading && (
                        <p className="text-xs text-stone-400 text-center py-8">
                          No tags available
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Center Content Area */}
            <div className="flex-1 h-full">
              <div
                ref={containerRef}
                className="h-full overflow-y-auto p-6"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                <div className={`transition-opacity duration-300 ${
                  isTransitioning ? 'opacity-50' : 'opacity-100'
                }`}>
                  <MemoryGrid
                    memories={getCurrentMemories()}
                    loading={loading && getCurrentMemories().length === 0}
                    onViewMemory={handleViewMemory}
                    onDeleteMemory={handleDeleteMemory}
                    currentUserId={user.id}
                    emptyMessage={getEmptyMessage()}
                    viewMode={viewMode}
                    usernames={usernames}
                  />
                </div>
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
          username={usernames[selectedMemory.userId]}
        />
      )}
    </div>
  );
} 