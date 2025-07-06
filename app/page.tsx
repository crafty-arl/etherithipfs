'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import DiscordAuthPopup from './components/DiscordAuthPopup';
import AuthLoadingPopup from './components/AuthLoadingPopup';

interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string;
  email?: string;
}

interface UploadedFile {
  id: string;
  filename: string;
  cid: string;
  uploadedAt: string;
  size: string;
  contributor?: string;
  tags?: string[];
  type?: 'document' | 'image' | 'audio' | 'other';
}

type ViewMode = 'grid' | 'list';
type FilterType = 'all' | 'document' | 'image' | 'audio' | 'other';

export default function Home() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDiscordAuth, setShowDiscordAuth] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const router = useRouter();

  const fetchFiles = useCallback(async () => {
    try {
      const response = await fetch('/api/files');
      const data = await response.json();
      
      if (data.success) {
        // Enhance files with metadata
        const enhancedFiles = data.files.map((file: UploadedFile) => ({
          ...file,
          type: getFileType(file.filename),
          contributor: 'Community Member', // This would come from Discord data
          tags: generateTags(file.filename)
        }));
        setUploadedFiles(enhancedFiles);
      } else {
        console.error('Failed to fetch files:', data.error);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
    }
  }, []);

  // Load files on component mount
  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  // Check if user is already authenticated and redirect to demo
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/discord/user', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const userData = await response.json();
          if (userData.success) {
            // User is authenticated, redirect to demo page
            router.push('/demo');
            return;
          }
        }
        // User not authenticated, show preview page
      } catch (error) {
        // User not authenticated, stay on main page
        console.log('User not authenticated');
      } finally {
        setAuthLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const getFileType = (filename: string): 'document' | 'image' | 'audio' | 'other' => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
      case 'svg':
        return 'image';
      case 'mp3':
      case 'wav':
      case 'flac':
      case 'aac':
        return 'audio';
      case 'pdf':
      case 'doc':
      case 'docx':
      case 'txt':
      case 'md':
        return 'document';
      default:
        return 'other';
    }
  };

  const generateTags = (filename: string): string[] => {
    // This would be enhanced with AI-generated tags in production
    const ext = filename.split('.').pop()?.toLowerCase();
    const baseTags = ['community', 'preserved'];
    
    switch (ext) {
      case 'jpg':
      case 'jpeg':
      case 'png':
        return [...baseTags, 'visual', 'memory'];
      case 'mp3':
      case 'wav':
        return [...baseTags, 'audio', 'voice'];
      case 'pdf':
      case 'doc':
        return [...baseTags, 'knowledge', 'text'];
      default:
        return baseTags;
    }
  };

  const copyToClipboard = (text: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setError('Content identifier copied successfully');
        setTimeout(() => setError(null), 3000);
        return;
      }).catch(() => {
        fallbackCopyToClipboard(text);
        return;
      });
    } else {
      fallbackCopyToClipboard(text);
    }
  };

  const fallbackCopyToClipboard = (text: string) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      const result = document.execCommand('copy');
      if (result) {
        setError('Content identifier copied successfully');
        setTimeout(() => setError(null), 3000);
      } else {
        setError('Unable to copy. Please select manually.');
        setTimeout(() => setError(null), 3000);
      }
    } catch (err) {
      setError('Copy function not supported in this browser.');
      setTimeout(() => setError(null), 3000);
    } finally {
      document.body.removeChild(textArea);
    }
  };

  const getFileTypeIcon = (type: string | undefined) => {
    switch (type) {
      case 'image':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'audio':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        );
      case 'document':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'other':
      default:
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
    }
  };

  const filteredFiles = uploadedFiles.filter(file => {
    const matchesFilter = activeFilter === 'all' || file.type === activeFilter;
    const matchesSearch = file.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         file.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const clearError = () => {
    setError(null);
  };

  const handleDiscordSuccess = (discordUser: DiscordUser) => {
    // Redirect to demo page after successful authentication
    router.push('/demo');
  };

  // Show loading popup while checking authentication
  if (authLoading) {
    return <AuthLoadingPopup isOpen={true} />;
  }

  // Mock data for preview
  const mockFiles: UploadedFile[] = [
    {
      id: 'demo-1',
      filename: 'family_reunion_2023.jpg',
      cid: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
      uploadedAt: '2024-01-15T10:30:00Z',
      size: '2.4 MB',
      contributor: 'Sarah M.',
      tags: ['family', 'memories', 'visual', 'community'],
      type: 'image'
    },
    {
      id: 'demo-2',
      filename: 'grandmas_secret_recipe.pdf',
      cid: 'QmNLei78zWmzUdbeRB3CiUfAizWUrbeeZh5K1rhAQKCh51',
      uploadedAt: '2024-01-14T15:45:00Z',
      size: '1.2 MB',
      contributor: 'Marcus J.',
      tags: ['recipe', 'family', 'knowledge', 'heritage'],
      type: 'document'
    },
    {
      id: 'demo-3',
      filename: 'childhood_lullaby.mp3',
      cid: 'QmRAQB6YaCyidP37UdDnjFY5vQuiBrcqdyoW1CuDgwxkD4',
      uploadedAt: '2024-01-13T20:15:00Z',
      size: '3.8 MB',
      contributor: 'Amara K.',
      tags: ['music', 'childhood', 'voice', 'cultural'],
      type: 'audio'
    },
    {
      id: 'demo-4',
      filename: 'historical_neighborhood_map.png',
      cid: 'QmYHNbxWjkgFh1HvEDqWrZJh2xkUFBD8vPQZGfZnA3pQm2',
      uploadedAt: '2024-01-12T12:00:00Z',
      size: '5.1 MB',
      contributor: 'David L.',
      tags: ['history', 'neighborhood', 'preservation', 'visual'],
      type: 'image'
    },
    {
      id: 'demo-5',
      filename: 'oral_history_interview.mp3',
      cid: 'QmTpNMWfJk5a6UxBfnCPBzXhJfYnBEQ3gLh5zUQDqWpR78',
      uploadedAt: '2024-01-11T14:30:00Z',
      size: '45.2 MB',
      contributor: 'Elena R.',
      tags: ['oral history', 'interview', 'voice', 'stories'],
      type: 'audio'
    },
    {
      id: 'demo-6',
      filename: 'community_garden_plans.pdf',
      cid: 'QmUVXJqQrZfAm8bJhKgLHQeP4kXzBqNvRxY3DFsGHKL91m',
      uploadedAt: '2024-01-10T09:20:00Z',
      size: '2.9 MB',
      contributor: 'Jordan T.',
      tags: ['community', 'garden', 'plans', 'knowledge'],
      type: 'document'
    },
    {
      id: 'demo-7',
      filename: 'street_art_documentation.jpg',
      cid: 'QmPvJgTnNxJKfRhP2bLKGhQ8xVzWkMpJYxRq5kSgFdL3n4',
      uploadedAt: '2024-01-09T16:45:00Z',
      size: '4.7 MB',
      contributor: 'Alex C.',
      tags: ['art', 'street', 'culture', 'visual'],
      type: 'image'
    },
    {
      id: 'demo-8',
      filename: 'local_business_directory.txt',
      cid: 'QmWzNgQvJkMxBfPsLhKqGrYtZxVcDfEhSaQpRnUmTyHj85',
      uploadedAt: '2024-01-08T11:10:00Z',
      size: '156 KB',
      contributor: 'Maya P.',
      tags: ['business', 'directory', 'community', 'knowledge'],
      type: 'other'
    }
  ];

  const mockFilteredFiles = mockFiles.filter(file => {
    const matchesFilter = activeFilter === 'all' || file.type === activeFilter;
    const matchesSearch = file.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         file.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-amber-50">
      {/* Demo Overlay */}
      <div className="fixed top-0 left-0 right-0 bg-amber-500 text-white text-center py-2 px-4 z-50">
        <p className="text-xs sm:text-sm font-medium">
          🎯 Preview Mode - Connect with Discord to contribute your own memories
        </p>
      </div>

      {/* Subtle Afrofuturism-inspired background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full opacity-[0.03]">
          <div className="absolute top-1/4 left-1/6 w-[400px] h-[400px] sm:w-[800px] sm:h-[800px] bg-gradient-to-r from-amber-600 via-orange-500 to-red-500 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/6 w-[300px] h-[300px] sm:w-[600px] sm:h-[600px] bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>
      </div>

      <div className="relative z-10 pt-8 sm:pt-10">
        {/* Sophisticated Header */}
        <header className="border-b border-stone-200 bg-white/80 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-3 sm:space-x-6">
                <div className="relative">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-stone-100 to-stone-200 rounded-xl flex items-center justify-center shadow-sm border border-stone-300">
                    <Image 
                      src="/etherith_logo_v2.jpg" 
                      alt="Etherith Logo" 
                      width={64}
                      height={64}
                      className="w-full h-full object-contain p-2"
                      priority
                    />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full border-2 border-white"></div>
                </div>
                <div className="text-center sm:text-left">
                  <h1 className="text-2xl sm:text-4xl font-light text-stone-900 tracking-wide font-serif">
                    ETHERITH
                  </h1>
                  <p className="text-stone-600 text-xs sm:text-sm font-light tracking-wider uppercase">
                    Living Archive
                  </p>
                </div>
              </div>
              
              <div className="text-center sm:text-right">
                <p className="text-stone-700 font-light text-sm sm:text-base">
                  {mockFiles.length} Preserved Memories
                </p>
                <p className="text-xs text-stone-500 tracking-wide uppercase">
                  Preview Mode · Community Contributions
                </p>
              </div>
            </div>

            <div className="mt-6 sm:mt-8 text-center max-w-3xl mx-auto">
              <p className="text-sm sm:text-lg text-stone-700 font-light leading-relaxed mb-4 sm:mb-6 px-2">
                A reverent space for cultural preservation. Each contribution tells a story,
                preserves a moment, honors a memory. See what our community has shared, then
                <span className="font-medium text-stone-900"> connect with Discord</span> to add your own memories.
              </p>
              
              <button 
                onClick={() => {
                  console.log('🔵 Connect button clicked - opening Discord auth popup');
                  setShowDiscordAuth(true);
                }}
                className="inline-flex items-center space-x-2 sm:space-x-4 bg-stone-900 text-white px-4 sm:px-8 py-3 rounded-full hover:bg-stone-800 transition-colors cursor-pointer min-h-[44px] touch-manipulation"
                aria-label="Connect with Discord to contribute memories"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                <span className="font-medium text-sm sm:text-base">Connect & Contribute</span>
              </button>
            </div>
          </div>
        </header>

        {/* Success Messages */}
        {error && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between">
              <span className="text-amber-800 font-medium text-sm sm:text-base flex-1 pr-2">{error}</span>
              <button
                onClick={clearError}
                className="text-amber-600 hover:text-amber-800 flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Close notification"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Controls & Filters */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex flex-col space-y-4 lg:flex-row lg:justify-between lg:items-center lg:space-y-0">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search memories, tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64 pl-10 pr-4 py-3 border border-stone-300 rounded-full bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm sm:text-base"
                aria-label="Search memories and tags"
              />
              <svg className="w-4 h-4 text-stone-400 absolute left-3 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-stone-500 uppercase tracking-wide mb-1 sm:mb-0 w-full sm:w-auto">Filter:</span>
                {(['all', 'document', 'image', 'audio', 'other'] as FilterType[]).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-colors min-h-[44px] touch-manipulation ${
                      activeFilter === filter
                        ? 'bg-stone-900 text-white'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                    aria-pressed={activeFilter === filter}
                  >
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </button>
                ))}
              </div>

              {/* View Toggle */}
              <div className="flex items-center bg-stone-100 rounded-full p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-full transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${
                    viewMode === 'grid' ? 'bg-white shadow-sm' : ''
                  }`}
                  aria-label="Grid view"
                  aria-pressed={viewMode === 'grid'}
                >
                  <svg className="w-4 h-4 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-full transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${
                    viewMode === 'list' ? 'bg-white shadow-sm' : ''
                  }`}
                  aria-label="List view"
                  aria-pressed={viewMode === 'list'}
                >
                  <svg className="w-4 h-4 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Archive Display */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
          <div className={
            viewMode === 'grid' 
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6'
              : 'space-y-4'
          }>
            {mockFilteredFiles.map((file) => (
              viewMode === 'grid' ? (
                // Grid View - Add demo overlay
                <div
                  key={file.id}
                  className="group bg-white/80 backdrop-blur-sm rounded-2xl border border-stone-200 hover:border-amber-300 hover:shadow-lg transition-all duration-300 overflow-hidden relative"
                >
                  {/* Demo Badge */}
                  <div className="absolute top-2 right-2 bg-amber-500 text-white text-xs px-2 py-1 rounded-full z-10">
                    Preview
                  </div>
                  
                  <div className="p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="text-amber-600">
                          {getFileTypeIcon(file.type)}
                        </div>
                        <div>
                          <h3 className="font-medium text-stone-900 truncate text-sm sm:text-base">
                            {file.filename}
                          </h3>
                          <p className="text-xs text-stone-500">
                            {file.contributor}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 sm:space-y-3">
                      <div className="flex items-center justify-between text-xs sm:text-sm text-stone-600">
                        <span>Size: {file.size}</span>
                        <span>
                          {new Date(file.uploadedAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1 sm:gap-2">
                        {file.tags?.slice(0, 3).map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-stone-100 text-stone-600 rounded-full text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                        {file.tags && file.tags.length > 3 && (
                          <span className="px-2 py-1 bg-stone-100 text-stone-600 rounded-full text-xs">
                            +{file.tags.length - 3}
                          </span>
                        )}
                      </div>

                      <div className="pt-3 sm:pt-4 border-t border-stone-100 space-y-2">
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-stone-500 truncate">
                              {file.cid}
                            </p>
                          </div>
                          <button
                            onClick={() => copyToClipboard(file.cid)}
                            className="flex-shrink-0 p-1 text-stone-400 hover:text-stone-600 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                            aria-label="Copy content identifier"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                        <button
                          onClick={() => setShowDiscordAuth(true)}
                          className="w-full bg-stone-100 text-stone-700 py-2 px-3 rounded-lg hover:bg-stone-200 transition-colors text-xs sm:text-sm font-medium min-h-[44px] touch-manipulation"
                        >
                          Connect to Access
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // List View - Add demo overlay
                <div
                  key={file.id}
                  className="group bg-white/80 backdrop-blur-sm rounded-xl border border-stone-200 hover:border-amber-300 hover:shadow-lg transition-all duration-300 overflow-hidden relative"
                >
                  {/* Demo Badge */}
                  <div className="absolute top-2 right-2 bg-amber-500 text-white text-xs px-2 py-1 rounded-full z-10">
                    Preview
                  </div>
                  
                  <div className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                      <div className="flex items-center space-x-3">
                        <div className="text-amber-600 flex-shrink-0">
                          {getFileTypeIcon(file.type)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium text-stone-900 truncate text-sm sm:text-base">
                            {file.filename}
                          </h3>
                          <p className="text-xs sm:text-sm text-stone-500">
                            {file.contributor} • {file.size} • {new Date(file.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => copyToClipboard(file.cid)}
                          className="p-2 text-stone-400 hover:text-stone-600 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                          aria-label="Copy content identifier"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    
                    <div className="mt-3 sm:mt-4 flex flex-wrap gap-1 sm:gap-2">
                      {file.tags?.slice(0, 5).map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-stone-100 text-stone-600 rounded-full text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                      {file.tags && file.tags.length > 5 && (
                        <span className="px-2 py-1 bg-stone-100 text-stone-600 rounded-full text-xs">
                          +{file.tags.length - 5}
                        </span>
                      )}
                    </div>
                    
                    <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-stone-100">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                        <div className="flex items-center space-x-2 min-w-0">
                          <p className="text-xs text-stone-500 truncate">
                            {file.cid}
                          </p>
                        </div>
                        <button
                          onClick={() => setShowDiscordAuth(true)}
                          className="bg-stone-100 text-stone-700 py-2 px-4 rounded-lg hover:bg-stone-200 transition-colors text-xs sm:text-sm font-medium min-h-[44px] touch-manipulation"
                        >
                          Connect to Access
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            ))}
          </div>
        </div>
      </div>

      {/* Discord Auth Popup */}
      {showDiscordAuth && (
        <DiscordAuthPopup
          isOpen={showDiscordAuth}
          onClose={() => setShowDiscordAuth(false)}
          onSuccess={handleDiscordSuccess}
        />
      )}
    </div>
  );
}
