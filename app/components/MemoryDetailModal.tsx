'use client';

import { useState } from 'react';
import OptimizedImage from './OptimizedImage';
import FileViewer from './FileViewer';
import { Memory } from '../types/memory';
import { getCategoryDisplayName, getPrivacyDisplayName, formatDate, formatFileSize } from '../utils/memoryApi';

interface MemoryDetailModalProps {
  memory: Memory;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (memoryId: string) => void;
  isOwner?: boolean;
  username?: string;
}

export default function MemoryDetailModal({
  memory,
  isOpen,
  onClose,
  onDelete,
  isOwner = false,
  username
}: MemoryDetailModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!isOpen || !memory) return null;

  const handleDelete = async () => {
    if (!onDelete || isDeleting) return;
    
    setIsDeleting(true);
    try {
      await onDelete(memory.id);
      onClose();
    } catch (error) {
      console.error('Failed to delete memory:', error);
    } finally {
      setIsDeleting(false);
    }
  };

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

  return (
    <>
      <div className="mobile-modal">
        {/* Elegant Backdrop */}
        <div 
          className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
        
        {/* Modal - Elegant Minimalist Design */}
        <div className="mobile-modal-content sm:max-w-2xl lg:max-w-4xl xl:max-w-5xl bg-white/95 backdrop-blur-md border border-stone-200/50 shadow-2xl">
          
          {/* Elegant Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 sm:top-5 lg:top-6 right-4 sm:right-5 lg:right-6 z-10 w-10 h-10 sm:w-11 sm:h-11 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white transition-all duration-300 shadow-sm border border-stone-200/50 group"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-stone-500 group-hover:text-stone-700 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* File Viewer - Supports All File Types */}
          <div className="relative">
            {(memory.fileUrl || memory.ipfsCid || memory.ipfsUrl) ? (
              <FileViewer
                memory={memory}
                className="aspect-[16/10] sm:aspect-[16/9] lg:aspect-[16/10] rounded-xl overflow-hidden"
                showControls={true}
                fullscreen={isFullscreen}
                onFullscreenToggle={() => setIsFullscreen(!isFullscreen)}
              />
            ) : (
              <div className="aspect-[16/10] sm:aspect-[16/9] lg:aspect-[16/10] bg-gradient-to-br from-stone-50 to-stone-100/80 flex items-center justify-center rounded-xl">
                <div className="text-center">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 text-stone-300 mx-auto">
                    {getFileIcon(memory.contentType || '')}
                  </div>
                  <p className="text-sm text-stone-500 mt-4">No file available</p>
                </div>
              </div>
            )}
          </div>

          {/* Content - Enhanced Responsive Layout */}
          <div className="p-6 sm:p-8 lg:p-10">
            <div className="mb-6 sm:mb-8">
              <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-light text-stone-900 mb-2 sm:mb-3 lg:mb-4 leading-tight">{memory.title}</h1>
              <p className="text-sm sm:text-base lg:text-lg text-stone-600 font-light leading-relaxed">{memory.description}</p>
            </div>

            {/* Tags - Enhanced Mobile Friendly */}
            {memory.tags && memory.tags.length > 0 && (
              <div className="mb-6 sm:mb-8">
                <p className="text-xs sm:text-sm text-stone-500 uppercase tracking-wider mb-2 sm:mb-3">Tags</p>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {memory.tags.map((tag, index) => (
                    <span 
                      key={index} 
                      className="px-2 sm:px-3 py-1 sm:py-1.5 bg-stone-100 text-stone-700 text-xs sm:text-sm font-light rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata Grid - Enhanced Responsive */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 mb-6 sm:mb-8">
              <div>
                <p className="text-xs sm:text-sm text-stone-500 uppercase tracking-wider mb-1 sm:mb-2">Created By</p>
                <p className="text-sm sm:text-base lg:text-lg text-stone-900 truncate" title={username || 'Unknown User'}>
                  {username || 'Unknown User'}
                </p>
              </div>
              
              <div>
                <p className="text-xs sm:text-sm text-stone-500 uppercase tracking-wider mb-1 sm:mb-2">Date</p>
                <p className="text-sm sm:text-base lg:text-lg text-stone-900">{formatDate(memory.createdAt)}</p>
              </div>
              
              <div>
                <p className="text-xs sm:text-sm text-stone-500 uppercase tracking-wider mb-1 sm:mb-2">Category</p>
                <p className="text-sm sm:text-base lg:text-lg text-stone-900">{getCategoryDisplayName(memory.category)}</p>
              </div>
              
              <div>
                <p className="text-xs sm:text-sm text-stone-500 uppercase tracking-wider mb-1 sm:mb-2">Privacy</p>
                <p className="text-sm sm:text-base lg:text-lg text-stone-900">{getPrivacyDisplayName(memory.privacy)}</p>
              </div>
              
              {memory.fileName && (
                <div className="sm:col-span-1">
                  <p className="text-xs sm:text-sm text-stone-500 uppercase tracking-wider mb-1 sm:mb-2">File</p>
                  <p className="text-sm sm:text-base lg:text-lg text-stone-900 truncate" title={memory.fileName}>{memory.fileName}</p>
                </div>
              )}
              
              {memory.fileSize && (
                <div>
                  <p className="text-xs sm:text-sm text-stone-500 uppercase tracking-wider mb-1 sm:mb-2">Size</p>
                  <p className="text-sm sm:text-base lg:text-lg text-stone-900">{formatFileSize(memory.fileSize)}</p>
                </div>
              )}
            </div>

            {/* Action Button - Enhanced Mobile */}
            {(memory.ipfsCid || memory.fileUrl) && (
              <div className="pt-6 sm:pt-8">
                <a
                  href={
                    memory.ipfsUrl || 
                    (memory.ipfsCid ? `https://ipfs.io/ipfs/${memory.ipfsCid}` : memory.fileUrl)
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 rounded-2xl lg:rounded-3xl bg-stone-800/90 backdrop-blur-sm text-white hover:bg-stone-900 transition-all duration-300 font-light text-sm sm:text-base lg:text-lg shadow-lg hover:shadow-xl border border-stone-700/20"
                >
                  {memory.ipfsCid ? (
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  )}
                  View Content
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen File Viewer */}
      {isFullscreen && (
        <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center">
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={() => setIsFullscreen(false)}
              className="p-3 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
              title="Exit fullscreen"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <FileViewer
            memory={memory}
            className="w-full h-full"
            showControls={true}
            fullscreen={true}
            onFullscreenToggle={() => setIsFullscreen(false)}
          />
        </div>
      )}
    </>
  );
} 