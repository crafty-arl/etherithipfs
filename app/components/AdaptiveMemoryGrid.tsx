'use client';

import { useState } from 'react';
import { Memory } from '../types/memory';
import MemoryCard from './MemoryCard';
import { getCategoryDisplayName, getPrivacyDisplayName, formatDate, formatFileSize } from '../utils/memoryApi';

interface AdaptiveMemoryGridProps {
  memories: Memory[];
  loading?: boolean;
  onViewMemory: (memory: Memory) => void;
  onDeleteMemory?: (memoryId: string) => void;
  currentUserId?: string;
  emptyMessage?: string;
  viewMode?: 'our' | 'my';
  usernames?: Record<string, string>;
}

export default function AdaptiveMemoryGrid({
  memories,
  loading = false,
  onViewMemory,
  onDeleteMemory,
  currentUserId,
  emptyMessage = "No memories found",
  viewMode = 'our',
  usernames = {}
}: AdaptiveMemoryGridProps) {

  // Categorize memories by content type
  const categorizeMemories = () => {
    const visual: Memory[] = [];
    const documents: Memory[] = [];
    const audio: Memory[] = [];
    const other: Memory[] = [];

    memories.forEach(memory => {
      const contentType = memory.contentType || '';
      if (contentType.startsWith('image/') || contentType.startsWith('video/')) {
        visual.push(memory);
      } else if (contentType.includes('pdf') || contentType.includes('document') || 
                contentType.includes('word') || contentType.startsWith('text/') ||
                contentType.includes('json') || contentType.includes('xml')) {
        documents.push(memory);
      } else if (contentType.startsWith('audio/')) {
        audio.push(memory);
      } else {
        other.push(memory);
      }
    });

    return { visual, documents, audio, other };
  };

  const { visual, documents, audio, other } = categorizeMemories();

  // Get responsive file type icon
  const getFileIcon = (contentType: string, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = {
      sm: 'w-3 h-3 sm:w-4 sm:h-4',
      md: 'w-4 h-4 sm:w-5 sm:h-5',
      lg: 'w-5 h-5 sm:w-6 sm:h-6'
    };

    if (contentType.startsWith('image/')) {
      return (
        <svg className={`${sizeClasses[size]} text-blue-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    }
    if (contentType.startsWith('video/')) {
      return (
        <svg className={`${sizeClasses[size]} text-purple-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      );
    }
    if (contentType.startsWith('audio/')) {
      return (
        <svg className={`${sizeClasses[size]} text-green-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
      );
    }
    if (contentType.includes('pdf')) {
      return (
        <svg className={`${sizeClasses[size]} text-red-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    }
    if (contentType.includes('document') || contentType.includes('word')) {
      return (
        <svg className={`${sizeClasses[size]} text-blue-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    }
    return (
      <svg className={`${sizeClasses[size]} text-stone-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
      </svg>
    );
  };

  // Responsive list view component for non-visual content
  const MemoryListItem = ({ memory }: { memory: Memory }) => (
    <div
      onClick={() => onViewMemory(memory)}
      className="group flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-stone-100/50 hover:border-stone-200/80 hover:shadow-lg hover:bg-white/90 transition-all duration-300 cursor-pointer"
    >
      {/* File Icon */}
      <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-stone-50 rounded-lg flex items-center justify-center group-hover:bg-stone-100 transition-colors">
        {getFileIcon(memory.contentType || '', 'md')}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 w-full">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-stone-900 truncate group-hover:text-stone-800 transition-colors text-sm sm:text-base">
              {memory.title}
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 line-clamp-2 sm:line-clamp-1 mt-1">
              {memory.description}
            </p>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-xs text-stone-500">
              <span className="whitespace-nowrap">{formatDate(memory.createdAt)}</span>
              <span className="whitespace-nowrap">{getCategoryDisplayName(memory.category)}</span>
              {memory.fileSize && <span className="whitespace-nowrap">{formatFileSize(memory.fileSize)}</span>}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity self-end sm:self-start">
            {(memory.ipfsCid || memory.fileUrl) && (
              <a
                href={memory.ipfsUrl || (memory.ipfsCid ? `https://ipfs.io/ipfs/${memory.ipfsCid}` : memory.fileUrl)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-2 text-stone-500 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
                title="Open file"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
            {onDeleteMemory && currentUserId === memory.userId && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteMemory(memory.id);
                }}
                className="p-2 text-stone-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete memory"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Responsive table view component
  const MemoryTable = ({ memories: tableMemories }: { memories: Memory[] }) => (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-stone-100/50 overflow-hidden">
      {/* Mobile Card View */}
      <div className="block lg:hidden">
        <div className="space-y-3 p-4">
          {tableMemories.map((memory) => (
            <div
              key={memory.id}
              onClick={() => onViewMemory(memory)}
              className="border border-stone-100 rounded-lg p-3 hover:bg-stone-50/50 cursor-pointer group transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  {getFileIcon(memory.contentType || '', 'sm')}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-stone-900 truncate text-sm">{memory.title}</h4>
                  <p className="text-xs text-stone-500 truncate mt-1">{memory.description}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-stone-400">
                    <span>{getCategoryDisplayName(memory.category)}</span>
                    {memory.fileSize && <span>{formatFileSize(memory.fileSize)}</span>}
                    <span>{formatDate(memory.createdAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-100 group-hover:opacity-100 transition-opacity">
                  {(memory.ipfsCid || memory.fileUrl) && (
                    <a
                      href={memory.ipfsUrl || (memory.ipfsCid ? `https://ipfs.io/ipfs/${memory.ipfsCid}` : memory.fileUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1 text-stone-500 hover:text-stone-700 rounded"
                      title="Open file"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                  {onDeleteMemory && currentUserId === memory.userId && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteMemory(memory.id);
                      }}
                      className="p-1 text-stone-500 hover:text-red-600 rounded"
                      title="Delete memory"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-stone-50/80">
            <tr>
              <th className="text-left py-3 px-4 font-medium text-stone-700 text-sm">File</th>
              <th className="text-left py-3 px-4 font-medium text-stone-700 text-sm">Title</th>
              <th className="text-left py-3 px-4 font-medium text-stone-700 text-sm">Category</th>
              <th className="text-left py-3 px-4 font-medium text-stone-700 text-sm">Size</th>
              <th className="text-left py-3 px-4 font-medium text-stone-700 text-sm">Date</th>
              <th className="text-left py-3 px-4 font-medium text-stone-700 text-sm">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tableMemories.map((memory) => (
              <tr
                key={memory.id}
                onClick={() => onViewMemory(memory)}
                className="border-t border-stone-100 hover:bg-stone-50/50 cursor-pointer group transition-colors"
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    {getFileIcon(memory.contentType || '', 'sm')}
                    <span className="text-sm text-stone-600 font-mono truncate max-w-24">
                      {memory.fileName || 'Unknown'}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="max-w-48">
                    <p className="font-medium text-stone-900 truncate">{memory.title}</p>
                    <p className="text-xs text-stone-500 truncate">{memory.description}</p>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-stone-100 text-stone-600">
                    {getCategoryDisplayName(memory.category)}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm text-stone-600">
                  {memory.fileSize ? formatFileSize(memory.fileSize) : '—'}
                </td>
                <td className="py-3 px-4 text-sm text-stone-600">
                  {formatDate(memory.createdAt)}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {(memory.ipfsCid || memory.fileUrl) && (
                      <a
                        href={memory.ipfsUrl || (memory.ipfsCid ? `https://ipfs.io/ipfs/${memory.ipfsCid}` : memory.fileUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 text-stone-500 hover:text-stone-700 rounded"
                        title="Open file"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )}
                    {onDeleteMemory && currentUserId === memory.userId && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteMemory(memory.id);
                        }}
                        className="p-1 text-stone-500 hover:text-red-600 rounded"
                        title="Delete memory"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Responsive loading skeletons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="bg-white/80 rounded-xl border border-stone-100 animate-pulse h-48 sm:h-64"></div>
          ))}
        </div>
      </div>
    );
  }

  if (memories.length === 0) {
    return (
      <div className="text-center py-12 sm:py-16 px-4">
        <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
          <svg className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg sm:text-xl font-light text-stone-900 mb-2 sm:mb-3">No Memories Found</h3>
        <p className="text-stone-500 max-w-md mx-auto text-sm sm:text-base">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Visual Content - Responsive Cards */}
      {visual.length > 0 && (
        <div>
          <h2 className="text-base sm:text-lg font-medium text-stone-900 mb-3 sm:mb-4 flex items-center gap-2 px-1">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Visual Content ({visual.length})</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {visual.map((memory) => (
              <MemoryCard
                key={memory.id}
                memory={memory}
                onView={onViewMemory}
                onDelete={onDeleteMemory}
                isOwner={currentUserId === memory.userId}
                viewMode={viewMode}
                username={usernames[memory.userId]}
              />
            ))}
          </div>
        </div>
      )}

      {/* Documents - Responsive List */}
      {documents.length > 0 && (
        <div>
          <h2 className="text-base sm:text-lg font-medium text-stone-900 mb-3 sm:mb-4 flex items-center gap-2 px-1">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Documents ({documents.length})</span>
          </h2>
          <div className="space-y-2 sm:space-y-3">
            {documents.map((memory) => (
              <MemoryListItem key={memory.id} memory={memory} />
            ))}
          </div>
        </div>
      )}

      {/* Audio - Responsive List */}
      {audio.length > 0 && (
        <div>
          <h2 className="text-base sm:text-lg font-medium text-stone-900 mb-3 sm:mb-4 flex items-center gap-2 px-1">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            <span>Audio Files ({audio.length})</span>
          </h2>
          <div className="space-y-2 sm:space-y-3">
            {audio.map((memory) => (
              <MemoryListItem key={memory.id} memory={memory} />
            ))}
          </div>
        </div>
      )}

      {/* Other Files - Responsive Table/Cards */}
      {other.length > 0 && (
        <div>
          <h2 className="text-base sm:text-lg font-medium text-stone-900 mb-3 sm:mb-4 flex items-center gap-2 px-1">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            <span>Other Files ({other.length})</span>
          </h2>
          <MemoryTable memories={other} />
        </div>
      )}
    </div>
  );
} 