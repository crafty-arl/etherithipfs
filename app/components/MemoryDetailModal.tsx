'use client';

import { useState } from 'react';
import OptimizedImage from './OptimizedImage';
import { Memory } from '../types/memory';
import { getCategoryDisplayName, getPrivacyDisplayName, formatDate, formatFileSize } from '../utils/memoryApi';

interface MemoryDetailModalProps {
  memory: Memory | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (memoryId: string) => void;
  isOwner?: boolean;
}

export default function MemoryDetailModal({
  memory,
  isOpen,
  onClose,
  onDelete,
  isOwner = false
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

  const getCategoryColor = (category: string) => {
    const colorMap: Record<string, string> = {
      'gaming': 'from-purple-500 to-pink-500',
      'creative': 'from-blue-500 to-cyan-500',
      'learning': 'from-green-500 to-emerald-500',
      'work': 'from-gray-500 to-slate-500',
      'social': 'from-orange-500 to-red-500',
      'notes': 'from-yellow-500 to-amber-500',
      'projects': 'from-indigo-500 to-purple-500',
      'achievements': 'from-pink-500 to-rose-500',
      'personal': 'from-red-500 to-pink-500',
      'other': 'from-slate-500 to-gray-500',
    };
    return colorMap[category] || 'from-slate-500 to-gray-500';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-stone-200">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${getCategoryColor(memory.category)} flex items-center justify-center`}>
                <span className="text-white text-lg">
                  {getCategoryDisplayName(memory.category).charAt(0)}
                </span>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-stone-900">{memory.title}</h2>
                <p className="text-sm text-stone-500">Created {formatDate(memory.createdAt)}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r ${getCategoryColor(memory.category)} text-white`}>
                {getCategoryDisplayName(memory.category)}
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-stone-100 text-stone-700">
                {getPrivacyDisplayName(memory.privacy)}
              </span>
              <button
                onClick={onClose}
                className="p-2 text-stone-400 hover:text-stone-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* File Preview */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-stone-900">File</h3>
                <div className="bg-stone-50 rounded-2xl p-6 border border-stone-200">
                  {memory.fileUrl && memory.contentType?.startsWith('image/') ? (
                    <div className="relative aspect-video rounded-xl overflow-hidden">
                      <OptimizedImage
                        src={memory.fileUrl}
                        alt={memory.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center aspect-video bg-stone-100 rounded-xl">
                      <div className="text-center">
                        <div className="text-6xl mb-4 opacity-50">
                          {getFileIcon(memory.contentType || '')}
                        </div>
                        <p className="text-stone-600 font-medium">{memory.fileName}</p>
                        {memory.fileSize && (
                          <p className="text-sm text-stone-500">{formatFileSize(memory.fileSize)}</p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {memory.fileUrl && (
                    <div className="mt-4">
                      <a
                        href={memory.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-2 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        <span>Open File</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Memory Details */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-stone-900 mb-3">Description</h3>
                  <p className="text-stone-700 leading-relaxed whitespace-pre-wrap">
                    {memory.description}
                  </p>
                </div>

                {/* Tags */}
                {memory.tags && memory.tags.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-stone-900 mb-3">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {memory.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-stone-100 text-stone-700"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Storage Information */}
                <div>
                  <h3 className="text-lg font-medium text-stone-900 mb-3">Storage</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="font-medium text-green-800">R2 Storage</span>
                      </div>
                      <span className="text-sm text-green-600">Primary</span>
                    </div>

                    {memory.ipfsCid && (
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                            </svg>
                          </div>
                          <span className="font-medium text-blue-800">IPFS Backup</span>
                        </div>
                        <a
                          href={memory.ipfsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800 underline"
                        >
                          View
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* IPFS Details */}
                {memory.ipfsCid && (
                  <div>
                    <h3 className="text-lg font-medium text-stone-900 mb-3">IPFS Information</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-stone-50 rounded-lg">
                        <span className="text-sm font-medium text-stone-700">CID:</span>
                        <code className="text-xs text-stone-600 font-mono bg-stone-100 px-2 py-1 rounded">
                          {memory.ipfsCid}
                        </code>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-stone-50 rounded-lg">
                        <span className="text-sm font-medium text-stone-700">Gateway:</span>
                        <a
                          href={memory.ipfsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800 underline truncate ml-2"
                        >
                          {memory.ipfsUrl}
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-stone-200 bg-stone-50">
            <div className="text-sm text-stone-500">
              Memory ID: <code className="font-mono">{memory.id}</code>
            </div>
            
            <div className="flex items-center space-x-3">
              {isOwner && onDelete && (
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-lg transition-colors flex items-center space-x-2"
                >
                  {isDeleting ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span>Delete Memory</span>
                    </>
                  )}
                </button>
              )}
              
              <button
                onClick={onClose}
                className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 