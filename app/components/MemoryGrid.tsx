'use client';

import { Memory } from '../types/memory';
import MemoryCard from './MemoryCard';

interface MemoryGridProps {
  memories: Memory[];
  loading?: boolean;
  onViewMemory: (memory: Memory) => void;
  onDeleteMemory?: (memoryId: string) => void;
  currentUserId?: string;
  emptyMessage?: string;
  viewMode?: 'our' | 'my';
}

export default function MemoryGrid({
  memories,
  loading = false,
  onViewMemory,
  onDeleteMemory,
  currentUserId,
  emptyMessage = "No memories found",
  viewMode = 'our'
}: MemoryGridProps) {
  if (loading) {
    return (
      <div className="masonry-grid">
        {Array.from({ length: 12 }).map((_, index) => (
          <div
            key={index}
            className="masonry-item bg-white rounded-lg border border-stone-100 overflow-hidden fashion-pulse"
          >
            <div className="h-48 bg-stone-100"></div>
            <div className="p-4 space-y-3">
              <div className="h-4 bg-stone-100 rounded"></div>
              <div className="h-3 bg-stone-100 rounded"></div>
              <div className="h-3 bg-stone-100 rounded w-2/3"></div>
              <div className="flex space-x-2">
                <div className="h-6 w-12 bg-stone-100 rounded"></div>
                <div className="h-6 w-16 bg-stone-100 rounded"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (memories.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-light text-stone-900 mb-2 fashion-text">No Memories Yet</h3>
        <p className="text-stone-500 max-w-md mx-auto text-sm leading-relaxed fashion-text">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="masonry-grid">
      {memories.map((memory) => (
        <div key={memory.id} className="masonry-item">
          <MemoryCard
            memory={memory}
            onView={onViewMemory}
            onDelete={onDeleteMemory}
            isOwner={currentUserId === memory.userId}
            viewMode={viewMode}
          />
        </div>
      ))}
    </div>
  );
} 