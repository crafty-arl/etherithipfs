'use client';

import { useState } from 'react';
import OptimizedImage from './OptimizedImage';
import { Memory } from '../types/memory';
import { getCategoryDisplayName, getPrivacyDisplayName, formatDate, formatFileSize } from '../utils/memoryApi';

interface MemoryCardProps {
  memory: Memory;
  onView: (memory: Memory) => void;
  onDelete?: (memoryId: string) => void;
  isOwner?: boolean;
  viewMode?: 'our' | 'my';
  username?: string;
}

export default function MemoryCard({ memory, onView, onDelete, isOwner = false, viewMode = 'our', username }: MemoryCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onDelete || isDeleting) return;
    
    setIsDeleting(true);
    try {
      await onDelete(memory.id);
    } catch (error) {
      console.error('Failed to delete memory:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Elegant hieroglyphic-style icons
  const getFileIcon = (contentType: string) => {
    if (contentType.startsWith('image/')) {
      return (
        <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    }
    if (contentType.startsWith('video/')) {
      return (
        <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      );
    }
    if (contentType.startsWith('audio/')) {
      return (
        <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
      );
    }
    if (contentType.includes('pdf')) {
      return (
        <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    }
    if (contentType.includes('document') || contentType.includes('word')) {
      return (
        <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    }
    // Default file icon
    return (
      <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
      </svg>
    );
  };

  const getCategoryColor = (category: string) => {
    const colorMap: Record<string, string> = {
      'documents': 'bg-stone-50 text-stone-600 border-stone-100',
      'stories': 'bg-stone-50 text-stone-600 border-stone-100',
      'audio_video': 'bg-stone-50 text-stone-600 border-stone-100',
      'images_visuals': 'bg-stone-50 text-stone-600 border-stone-100',
      'research_articles': 'bg-stone-50 text-stone-600 border-stone-100',
      'guides_howtos': 'bg-stone-50 text-stone-600 border-stone-100',
      'history_timelines': 'bg-stone-50 text-stone-600 border-stone-100',
      'cultural_knowledge': 'bg-stone-50 text-stone-600 border-stone-100',
      'quotes_notes': 'bg-stone-50 text-stone-600 border-stone-100',
    };
    return colorMap[category] || 'bg-stone-50 text-stone-600 border-stone-100';
  };

  return (
    <div
      className={`group relative bg-white/80 backdrop-blur-sm rounded-2xl lg:rounded-3xl border border-stone-100/50 overflow-hidden cursor-pointer h-full flex flex-col transition-all duration-500 ease-out ${
        isHovered ? 'border-stone-200/80 shadow-lg shadow-stone-200/50 bg-white/90' : 'shadow-sm shadow-stone-100/50'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onView(memory)}
    >
      {/* File Preview Area - Minimalist Design */}
      <div className="relative overflow-hidden flex-shrink-0">
        {(memory.ipfsCid || memory.fileUrl) && memory.contentType?.startsWith('image/') ? (
          <div className="aspect-[4/3] sm:aspect-[3/2] lg:aspect-[4/3] relative">
            {memory.ipfsCid ? (
              <img
                src={`https://gateway.pinata.cloud/ipfs/${memory.ipfsCid}`}
                alt={memory.title}
                className="w-full h-full object-cover transition-all duration-700 ease-out group-hover:scale-[1.02]"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (target.src.includes('gateway.pinata.cloud')) {
                    target.src = `https://cloudflare-ipfs.com/ipfs/${memory.ipfsCid}`;
                  } else if (target.src.includes('cloudflare-ipfs.com')) {
                    target.src = `https://dweb.link/ipfs/${memory.ipfsCid}`;
                  } else if (target.src.includes('dweb.link') && memory.fileUrl) {
                    target.src = memory.fileUrl;
                  }
                }}
              />
            ) : (
              <OptimizedImage
                src={memory.fileUrl || ''}
                alt={memory.title}
                fill
                className="object-cover transition-all duration-700 ease-out group-hover:scale-[1.02]"
              />
            )}
            {/* Subtle overlay for better text contrast */}
            <div className="absolute inset-0 bg-gradient-to-t from-stone-900/10 via-transparent to-transparent" />
          </div>
        ) : (
          <div className="aspect-[4/3] sm:aspect-[3/2] lg:aspect-[4/3] flex items-center justify-center bg-gradient-to-br from-stone-50 to-stone-100/50">
            <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-stone-300 transition-all duration-500 group-hover:text-stone-400 group-hover:scale-110">
              {getFileIcon(memory.contentType || '')}
            </div>
          </div>
        )}
        
        {/* Minimalist Category Badge */}
        <div className="absolute top-3 sm:top-4 lg:top-5 left-3 sm:left-4 lg:left-5">
          <span className={`inline-flex items-center px-2.5 sm:px-3 py-1 rounded-full text-xs font-light border backdrop-blur-md ${getCategoryColor(memory.category)}`}>
            {getCategoryDisplayName(memory.category)}
          </span>
        </div>

        {/* Elegant Privacy Indicator */}
        <div className="absolute top-3 sm:top-4 lg:top-5 right-3 sm:right-4 lg:right-5">
          <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-stone-400/60 backdrop-blur-md border border-white/50" title={getPrivacyDisplayName(memory.privacy)} />
        </div>
      </div>

      {/* Content Area - Elegant Minimalist Layout */}
      <div className="p-4 sm:p-5 lg:p-6 space-y-3 sm:space-y-4 lg:space-y-5 flex-1 flex flex-col">
        {/* Title - Refined Typography */}
        <h3 className="font-light text-stone-800 text-sm sm:text-base lg:text-lg leading-relaxed line-clamp-2 group-hover:text-stone-900 transition-colors duration-300 tracking-wide">
          {memory.title}
        </h3>

        {/* Description - Subtle and Clean */}
        <p className="text-xs sm:text-sm lg:text-base text-stone-500 line-clamp-2 leading-relaxed font-light flex-1 tracking-wide">
          {memory.description}
        </p>

        {/* Footer - Minimalist Design */}
        <div className="flex items-center justify-between text-xs sm:text-sm text-stone-400 pt-3 border-t border-stone-100/50 gap-3 mt-auto">
          <div className="flex flex-col min-w-0 flex-1 space-y-1">
            <span className="font-light tracking-wide">{formatDate(memory.createdAt)}</span>
            {memory.userId && (
              <span className="text-xs text-stone-400 truncate font-light">
                {username || `User ${memory.userId.slice(-4)}`}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2 flex-shrink-0">
            {/* Elegant View Button */}
            {(memory.ipfsCid || memory.fileUrl) && (
              <a
                href={
                  memory.ipfsUrl || 
                  (memory.ipfsCid ? `https://ipfs.io/ipfs/${memory.ipfsCid}` : memory.fileUrl)
                }
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-stone-50 text-stone-500 hover:bg-stone-100 hover:text-stone-700 transition-all duration-300 border border-stone-100 group/btn"
                onClick={(e) => e.stopPropagation()}
                title="View Content"
              >
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-300 group-hover/btn:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
            
            {/* Elegant Delete Button */}
            {isOwner && onDelete && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-stone-50 text-stone-400 hover:bg-red-50 hover:text-red-500 transition-all duration-300 border border-stone-100 opacity-0 group-hover:opacity-100 sm:opacity-100 lg:opacity-0 lg:group-hover:opacity-100 group/btn"
                title="Delete memory"
              >
                {isDeleting ? (
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-300 group-hover/btn:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 