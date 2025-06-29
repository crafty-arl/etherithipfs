'use client';

import { useState, useEffect } from 'react';

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

  // Load files on component mount
  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
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
  };

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

  const getFileTypeIcon = (type: string) => {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-amber-50">
      {/* Subtle Afrofuturism-inspired background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full opacity-[0.03]">
          <div className="absolute top-1/4 left-1/6 w-[800px] h-[800px] bg-gradient-to-r from-amber-600 via-orange-500 to-red-500 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/6 w-[600px] h-[600px] bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>
      </div>

      <div className="relative z-10">
        {/* Sophisticated Header */}
        <header className="border-b border-stone-200 bg-white/80 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-stone-100 to-stone-200 rounded-xl flex items-center justify-center shadow-sm border border-stone-300">
                    <img 
                      src="/etherith_logo_v2.jpg" 
                      alt="Etherith" 
                      className="w-full h-full object-contain p-2"
                    />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full border-2 border-white"></div>
                </div>
                <div>
                  <h1 className="text-4xl font-light text-stone-900 tracking-wide font-serif">
                    ETHERITH
                  </h1>
                  <p className="text-stone-600 text-sm font-light tracking-wider uppercase">
                    Living Archive
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-stone-700 font-light">
                  {uploadedFiles.length} Preserved Memories
                </p>
                <p className="text-xs text-stone-500 tracking-wide uppercase">
                  Permanent · Decentralized · Accessible
                </p>
              </div>
            </div>

            <div className="mt-8 text-center max-w-3xl mx-auto">
              <p className="text-lg text-stone-700 font-light leading-relaxed mb-6">
                A reverent space for cultural preservation. Each contribution tells a story,
                preserves a moment, honors a memory. Upload through conversations with 
                <span className="font-medium text-stone-900"> Mem Weaver</span>, our AI curator.
              </p>
              
              <div className="inline-flex items-center space-x-4 bg-stone-900 text-white px-8 py-3 rounded-full hover:bg-stone-800 transition-colors cursor-pointer">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                <span className="font-medium">Begin Your Contribution</span>
              </div>
            </div>
          </div>
        </header>

        {/* Success Messages */}
        {error && (
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between">
              <span className="text-amber-800 font-medium">{error}</span>
              <button
                onClick={clearError}
                className="text-amber-600 hover:text-amber-800 ml-4"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Controls & Filters */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search memories, tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64 pl-10 pr-4 py-2 border border-stone-300 rounded-full bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
              <svg className="w-4 h-4 text-stone-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <div className="flex items-center space-x-6">
              {/* Filters */}
              <div className="flex items-center space-x-2">
                {(['all', 'document', 'image', 'audio', 'other'] as FilterType[]).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      activeFilter === filter
                        ? 'bg-stone-900 text-white'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </button>
                ))}
              </div>

              {/* View Toggle */}
              <div className="flex items-center bg-stone-100 rounded-full p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-full transition-colors ${
                    viewMode === 'grid' ? 'bg-white shadow-sm' : ''
                  }`}
                >
                  <svg className="w-4 h-4 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-full transition-colors ${
                    viewMode === 'list' ? 'bg-white shadow-sm' : ''
                  }`}
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
        <div className="max-w-7xl mx-auto px-6 pb-20">
          {filteredFiles.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-24 h-24 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-8">
                <svg className="w-12 h-12 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <h3 className="text-2xl font-light text-stone-900 mb-4 font-serif">
                Archive Awaiting Memories
              </h3>
              <p className="text-stone-600 mb-8 max-w-md mx-auto">
                The community archive is ready for its first preservation.
                Begin the journey through Discord.
              </p>
            </div>
          ) : (
            <div className={
              viewMode === 'grid' 
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                : 'space-y-4'
            }>
              {filteredFiles.map((file) => (
                viewMode === 'grid' ? (
                  // Grid View
                  <div
                    key={file.id}
                    className="group bg-white/80 backdrop-blur-sm rounded-2xl border border-stone-200 hover:border-amber-300 hover:shadow-lg transition-all duration-300 overflow-hidden"
                  >
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-amber-700">
                          {getFileTypeIcon(file.type || 'other')}
                        </div>
                        <span className="text-xs text-stone-500 bg-stone-100 px-2 py-1 rounded-full">
                          {new Date(file.uploadedAt).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>

                      <h3 className="font-medium text-stone-900 mb-2 font-serif truncate" title={file.filename}>
                        {file.filename}
                      </h3>
                      
                      <div className="flex flex-wrap gap-1 mb-4">
                        {file.tags?.slice(0, 3).map((tag) => (
                          <span key={tag} className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>

                      <div className="mb-4">
                        <p className="text-xs text-stone-600 mb-2 uppercase tracking-wide">Content Identifier</p>
                        <div className="flex items-center gap-2 bg-stone-50 rounded-lg p-2">
                          <code className="text-xs text-stone-700 font-mono truncate flex-1">
                            {file.cid}
                          </code>
                          <button
                            onClick={() => copyToClipboard(file.cid)}
                            className="p-1 hover:bg-stone-200 rounded transition-colors"
                            title="Copy CID"
                          >
                            <svg className="w-4 h-4 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <a
                          href={`http://100.75.134.128:8080/ipfs/${file.cid}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          Access Memory
                        </a>
                      </div>
                    </div>
                  </div>
                ) : (
                  // List View
                  <div
                    key={file.id}
                    className="bg-white/80 backdrop-blur-sm rounded-xl border border-stone-200 hover:border-amber-300 transition-all duration-300 p-6"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="text-amber-700">
                          {getFileTypeIcon(file.type || 'other')}
                        </div>
                        <div>
                          <h3 className="font-medium text-stone-900 font-serif">{file.filename}</h3>
                          <div className="flex items-center space-x-4 mt-1">
                            <span className="text-sm text-stone-600">{file.size}</span>
                            <span className="text-sm text-stone-500">
                              {new Date(file.uploadedAt).toLocaleDateString()}
                            </span>
                            <div className="flex gap-1">
                              {file.tags?.slice(0, 2).map((tag) => (
                                <span key={tag} className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded-full">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => copyToClipboard(file.cid)}
                          className="p-2 hover:bg-stone-100 rounded transition-colors"
                          title="Copy CID"
                        >
                          <svg className="w-4 h-4 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                        <a
                          href={`http://100.75.134.128:8080/ipfs/${file.cid}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          Access
                        </a>
                      </div>
                    </div>
                  </div>
                )
              ))}
            </div>
          )}
        </div>

        {/* Elegant Footer */}
        <footer className="border-t border-stone-200 bg-stone-50">
          <div className="max-w-7xl mx-auto px-6 py-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
              <div>
                <h4 className="font-medium text-stone-900 mb-3">Preservation</h4>
                <p className="text-sm text-stone-600 leading-relaxed">
                  Every contribution becomes part of humanity's permanent digital heritage,
                  stored across the decentralized web.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-stone-900 mb-3">Access</h4>
                <p className="text-sm text-stone-600 leading-relaxed">
                  Content remains accessible indefinitely through IPFS,
                  independent of traditional server infrastructure.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-stone-900 mb-3">Community</h4>
                <p className="text-sm text-stone-600 leading-relaxed">
                  Join our Discord community to contribute your own memories
                  to this living archive.
                </p>
              </div>
            </div>
            
            <div className="border-t border-stone-200 mt-8 pt-8 text-center">
              <p className="text-xs text-stone-500 tracking-wide uppercase">
                Gateway: <code className="bg-stone-100 px-2 py-1 rounded">gateway.etherith.io</code>
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
