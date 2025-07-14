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
}

export default function MemoryCard({ memory, onView, onDelete, isOwner = false, viewMode = 'our' }: MemoryCardProps) {
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

  const getFileIcon = (contentType: string) => {
    if (contentType.startsWith('image/')) return '🖼️';
    if (contentType.startsWith('video/')) return '🎥';
    if (contentType.startsWith('audio/')) return '🎵';
    if (contentType.includes('pdf')) return '📄';
    if (contentType.includes('document') || contentType.includes('word')) return '📝';
    return '📎';
  };

  const getCategoryColor = (category: string) => {
    const colorMap: Record<string, string> = {
      'gaming': 'bg-stone-100 text-stone-700',
      'creative': 'bg-stone-100 text-stone-700',
      'learning': 'bg-stone-100 text-stone-700',
      'work': 'bg-stone-100 text-stone-700',
      'social': 'bg-stone-100 text-stone-700',
      'notes': 'bg-stone-100 text-stone-700',
      'projects': 'bg-stone-100 text-stone-700',
      'achievements': 'bg-stone-100 text-stone-700',
      'personal': 'bg-stone-100 text-stone-700',
      'other': 'bg-stone-100 text-stone-700',
    };
    return colorMap[category] || 'bg-stone-100 text-stone-700';
  };

  return (
    <div
      className={`group relative bg-white rounded-lg border border-stone-100 overflow-hidden fashion-transition fashion-hover fashion-shadow cursor-pointer ${
        isHovered ? 'fashion-shadow-hover border-stone-200' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onView(memory)}
    >
      {/* File Preview Area */}
      <div className="relative bg-stone-50 overflow-hidden">
        {memory.fileUrl && memory.contentType?.startsWith('image/') ? (
          <div className="aspect-[4/3] relative">
          <OptimizedImage
            src={memory.fileUrl}
            alt={memory.title}
            fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          </div>
        ) : (
          <div className="aspect-[4/3] flex items-center justify-center">
            <div className="text-4xl opacity-20">
              {getFileIcon(memory.contentType || '')}
            </div>
          </div>
        )}
        
        {/* Category Badge */}
        <div className="absolute top-3 left-3">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-light ${getCategoryColor(memory.category)}`}>
            {getCategoryDisplayName(memory.category)}
          </span>
        </div>

        {/* Privacy Badge */}
        <div className="absolute top-3 right-3">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-light bg-white/90 backdrop-blur-sm text-stone-600">
            {getPrivacyDisplayName(memory.privacy)}
          </span>
        </div>

        {/* File Info Overlay */}
        {memory.fileName && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/40 to-transparent p-3">
            <div className="flex items-center space-x-2 text-white text-xs">
              <span>{getFileIcon(memory.contentType || '')}</span>
              <span className="truncate font-light">{memory.fileName}</span>
              {memory.fileSize && (
                <span className="text-xs opacity-75">({formatFileSize(memory.fileSize)})</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <h3 className="font-light text-stone-900 text-sm leading-relaxed line-clamp-2 group-hover:text-stone-700 transition-colors fashion-text">
          {memory.title}
        </h3>

        {/* Description */}
        <p className="text-xs text-stone-500 line-clamp-3 leading-relaxed font-light fashion-text">
          {memory.description}
        </p>

        {/* Tags */}
        {memory.tags && memory.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {memory.tags.slice(0, 2).map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 rounded text-xs font-light bg-stone-50 text-stone-600"
              >
                #{tag}
              </span>
            ))}
            {memory.tags.length > 2 && (
              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-light bg-stone-50 text-stone-400">
                +{memory.tags.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-stone-400 pt-2 border-t border-stone-50">
          <span className="font-light fashion-text">{formatDate(memory.createdAt)}</span>
          
          <div className="flex items-center space-x-2">
            {/* IPFS Badge */}
            {memory.ipfsCid && (
              <span className="inline-flex items-center px-2 py-1 rounded-full bg-stone-100 text-stone-600 text-xs font-light">
                🌐 IPFS
              </span>
            )}
            
            {/* Delete Button (Owner Only) */}
            {isOwner && onDelete && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 text-stone-400 hover:text-red-500 disabled:opacity-50"
                title="Delete memory"
              >
                {isDeleting ? (
                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Subtle Hover Effect */}
      <div className={`absolute inset-0 bg-stone-50/30 opacity-0 transition-opacity duration-300 ${
        isHovered ? 'opacity-100' : ''
      }`} />
    </div>
  );
} 