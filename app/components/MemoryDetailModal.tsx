'use client';

import { useState } from 'react';
import OptimizedImage from './OptimizedImage';
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
    if (contentType.startsWith('image/')) return '🖼️';
    if (contentType.startsWith('video/')) return '🎥';
    if (contentType.startsWith('audio/')) return '🎵';
    if (contentType.includes('pdf')) return '📄';
    if (contentType.includes('document') || contentType.includes('word')) return '📝';
    return '📎';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden">
          
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 z-10 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-sm"
          >
            <svg className="w-5 h-5 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Content Preview */}
          <div className="relative">
            {memory.fileUrl && memory.contentType?.startsWith('image/') ? (
              <div className="relative aspect-[16/10] bg-stone-100">
                <OptimizedImage
                  src={memory.fileUrl}
                  alt={memory.title}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              </div>
            ) : (
              <div className="aspect-[16/10] bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-4 opacity-30">
                    {getFileIcon(memory.contentType || '')}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-8 space-y-6">
            
            {/* Header */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-stone-100 text-stone-700">
                    {getCategoryDisplayName(memory.category)}
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-stone-100 text-stone-700">
                    {getPrivacyDisplayName(memory.privacy)}
                  </span>
                </div>
                
                {isOwner && onDelete && (
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="text-stone-400 hover:text-red-500 transition-colors disabled:opacity-50"
                    title="Delete memory"
                  >
                    {isDeleting ? (
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
              
              <h2 className="text-2xl font-light text-stone-900 leading-relaxed">
                {memory.title}
              </h2>
            </div>

            {/* Description */}
            <div className="prose prose-stone prose-sm max-w-none">
              <p className="text-stone-600 leading-relaxed whitespace-pre-wrap">
                {memory.description}
              </p>
            </div>

            {/* Tags */}
            {memory.tags && memory.tags.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-stone-900 uppercase tracking-wider">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {memory.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-stone-50 text-stone-600"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-stone-100">
              <div>
                <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Created</p>
                <p className="text-sm text-stone-900">{formatDate(memory.createdAt)}</p>
              </div>
              
              {username && (
                <div>
                  <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Created by</p>
                  <p className="text-sm text-stone-900">{username}</p>
                </div>
              )}
              
              {!username && memory.userId && (
                <div>
                  <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Created by</p>
                  <p className="text-sm text-stone-900">User {memory.userId.slice(-4)}</p>
                </div>
              )}
              
              {memory.fileName && (
                <div>
                  <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">File</p>
                  <p className="text-sm text-stone-900 truncate">{memory.fileName}</p>
                </div>
              )}
              
              {memory.fileSize && (
                <div>
                  <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Size</p>
                  <p className="text-sm text-stone-900">{formatFileSize(memory.fileSize)}</p>
                </div>
              )}
            </div>

            {/* Action Button */}
            {(memory.ipfsCid || memory.fileUrl) && (
              <div className="pt-6">
                <a
                  href={
                    memory.ipfsUrl || 
                    (memory.ipfsCid ? `https://ipfs.io/ipfs/${memory.ipfsCid}` : memory.fileUrl)
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center px-6 py-3 rounded-xl bg-stone-900 text-white hover:bg-stone-800 transition-colors font-medium"
                >
                  {memory.ipfsCid ? (
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    </div>
  );
} 