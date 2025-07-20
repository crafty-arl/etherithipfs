'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Memory, MemoryFilters, MemoryStats } from '../types/memory';
import { memoryApi } from '../utils/memoryApi';
import AdaptiveMemoryGrid from './AdaptiveMemoryGrid';
import MemoryDetailModal from './MemoryDetailModal';
import AnimatedDialMenu from './AnimatedDialMenu';

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
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
        categorySet.add(memory.category.toLowerCase().trim());
      }
    });
    return Array.from(categorySet).sort();
  };

  // Fetch usernames for all user IDs
  const fetchUsernames = async (userIds: string[]) => {
    console.log('👥 Fetching usernames for user IDs:', userIds);
    setUsernamesLoaded(false);
    
    try {
      if (userIds.length === 0) {
        console.log('📝 No user IDs to fetch usernames for');
        setUsernamesLoaded(true);
        return;
      }

      const result = await memoryApi.getUsernames(userIds);
      if (result.success && result.data) {
        console.log('📇 Successfully fetched usernames:', result.data);
        setUsernames(result.data);
      } else {
        console.warn('⚠️ Failed to fetch usernames:', result.error);
      }
    } catch (error) {
      console.error('❌ Error fetching usernames:', error);
    } finally {
      setUsernamesLoaded(true);
    }
  };

  // Fetch stats
  const fetchStats = useCallback(async () => {
    console.log('📊 Fetching memory stats');
    setStatsLoaded(false);
    
    try {
      const result = await memoryApi.getStats();
      if (result.success && result.data) {
        console.log('📊 Successfully fetched stats:', result.data);
        setStats(result.data);
      } else {
        console.warn('⚠️ Failed to fetch stats:', result.error);
      }
    } catch (error) {
      console.error('❌ Error fetching stats:', error);
    } finally {
      setStatsLoaded(true);
    }
  }, []);

  // Fetch memories for both view modes
  const fetchMemories = useCallback(async (mode: ViewMode) => {
    console.log(`📚 Starting to fetch ${mode} memories`);
    setMemoriesLoaded(false);
    setError(null);

    try {
      let result;
      
      if (mode === 'my') {
        if (!user?.id) {
          console.warn('⚠️ Cannot fetch my memories: user.id is undefined');
          setMyMemories([]);
          setMemoriesLoaded(true);
          return;
        }
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
        if (userIds.length > 0) {
          await fetchUsernames(userIds);
        } else {
          setUsernamesLoaded(true);
        }
        
        console.log(`✅ Successfully fetched ${freshMemories.length} ${mode} memories`);
      } else {
        console.error(`❌ Failed to fetch ${mode} memories:`, result.error);
        setError(result.error || `Failed to load ${mode} memories`);
        
        if (mode === 'my') {
          setMyMemories([]);
        } else {
          setOurMemories([]);
        }
        setUsernamesLoaded(true);
      }
    } catch (error) {
      console.error(`❌ Error fetching ${mode} memories:`, error);
      setError(`Error loading ${mode} memories`);
      
      if (mode === 'my') {
        setMyMemories([]);
      } else {
        setOurMemories([]);
      }
      setUsernamesLoaded(true);
    } finally {
      setMemoriesLoaded(true);
    }
  }, [user?.id, filters]);

  // Initial data load
  useEffect(() => {
    console.log('🚀 MemoryDisplay: Starting initial data load');
    
    // Start concurrent data fetching
    Promise.all([
      fetchMemories(viewMode),
      fetchStats()
    ]).then(() => {
      console.log('🎉 All initial data loading operations completed');
    }).catch(error => {
      console.error('❌ Error during initial data load:', error);
    });
  }, [user?.id, filters, guildId, fetchMemories, fetchStats, viewMode]);

  // Handle memory deletion
  const handleDeleteMemory = async (memoryId: string) => {
    try {
      if (!user?.id) {
        console.warn('⚠️ Cannot delete memory: user.id is undefined');
        return;
      }
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

  // Get appropriate empty message
  const getEmptyMessage = () => {
    if (selectedTags.length > 0 || selectedCategory) {
      return 'No memories match your current filters. Try adjusting your search criteria.';
    }
    
    if (viewMode === 'my') {
      return 'You haven\'t created any memories yet. Use the Discord /remember command to create your first memory!';
    } else {
      return 'No community memories found. Be the first to share a memory with the /remember command in Discord!';
    }
  };

  // Show loading overlay for the entire component until initial load is complete
  if (!initialLoadComplete) {
    return (
      <div className="h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-stone-600 font-light">Loading memories...</p>
          <p className="text-stone-400 text-sm mt-2">
            {!memoriesLoaded ? 'Fetching memories...' : 
             !usernamesLoaded ? 'Loading user information...' : 
             !statsLoaded ? 'Getting statistics...' : 
             'Almost ready...'}
          </p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-stone-900 mb-2">Unable to Load Memories</h3>
          <p className="text-stone-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors"
          >
            Try Again
          </button>
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
          <div className="flex h-full relative">
            
            {/* Sidebar Toggle Button */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={`fixed top-1/2 z-30 w-12 h-12 bg-white/90 backdrop-blur-md border border-stone-200/50 rounded-r-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group ${
                sidebarCollapsed ? 'left-0' : 'left-80'
              }`}
              style={{ transform: 'translateY(-50%)' }}
            >
              <svg 
                className={`w-5 h-5 text-stone-600 group-hover:text-stone-900 transition-transform duration-300 ${
                  sidebarCollapsed ? 'rotate-0' : 'rotate-180'
                }`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            
            {/* Left Sidebar - Collapsible */}
            <div className={`${
              sidebarCollapsed ? 'w-0 overflow-hidden' : 'w-80'
            } border-r border-stone-100 bg-stone-50/50 backdrop-blur-sm h-full flex flex-col transition-all duration-300 ease-out`}>
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

                {/* Tags Selector */}
                <div className="flex-1 flex flex-col min-h-0">
                  {allTags.length > 0 ? (
                    <AnimatedDialMenu
                      tags={allTags}
                      selectedTags={selectedTags}
                      onTagSelect={handleTagSelect}
                      onClearAll={clearTagFilters}
                      isCollapsed={sidebarCollapsed}
                    />
                  ) : (
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-stone-200 h-full flex flex-col items-center justify-center">
                      <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center mb-3">
                        <svg className="w-6 h-6 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                        </svg>
                      </div>
                      <p className="text-sm text-stone-500">No tags available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Main Content Area */}
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
                  <AdaptiveMemoryGrid
                    memories={getCurrentMemories()}
                    loading={loading && getCurrentMemories().length === 0}
                    onViewMemory={handleViewMemory}
                    onDeleteMemory={handleDeleteMemory}
                    currentUserId={user?.id}
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
          isOwner={user?.id === selectedMemory.userId}
          username={usernames[selectedMemory.userId]}
        />
      )}
    </div>
  );
} 