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
  usernames?: Record<string, string>;
}

export default function MemoryGrid({
  memories,
  loading = false,
  onViewMemory,
  onDeleteMemory,
  currentUserId,
  emptyMessage = "No memories found",
  viewMode = 'our',
  usernames = {}
}: MemoryGridProps) {
  if (loading) {
    return (
      <div className="responsive-grid">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="bg-white/80 backdrop-blur-sm rounded-2xl lg:rounded-3xl border border-stone-100/50 overflow-hidden animate-pulse h-full flex flex-col shadow-sm"
          >
            <div className="aspect-[4/3] sm:aspect-[3/2] lg:aspect-[4/3] bg-gradient-to-br from-stone-100 to-stone-200/50 flex-shrink-0"></div>
            <div className="p-4 sm:p-5 lg:p-6 space-y-3 sm:space-y-4 lg:space-y-5 flex-1 flex flex-col">
              <div className="h-4 sm:h-5 lg:h-6 bg-stone-200/60 rounded-lg"></div>
              <div className="h-3 sm:h-4 lg:h-5 bg-stone-200/60 rounded-lg"></div>
              <div className="h-3 sm:h-4 lg:h-5 bg-stone-200/60 rounded-lg w-2/3"></div>
              <div className="flex space-x-2 mt-auto pt-3">
                <div className="h-8 sm:h-9 lg:h-10 w-8 sm:w-9 lg:w-10 bg-stone-200/60 rounded-full"></div>
                <div className="h-8 sm:h-9 lg:h-10 w-8 sm:w-9 lg:w-10 bg-stone-200/60 rounded-full"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (memories.length === 0) {
    return (
      <div className="text-center py-16 sm:py-20 lg:py-24 px-4">
        <div className="w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8 shadow-sm">
          <svg className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg sm:text-xl lg:text-2xl font-light text-stone-900 mb-3 sm:mb-4">No Memories Found</h3>
        <p className="text-stone-500 max-w-md mx-auto text-sm sm:text-base lg:text-lg leading-relaxed">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="responsive-grid">
      {memories.map((memory) => (
        <div key={memory.id} className="group h-full">
          <MemoryCard
            memory={memory}
            onView={onViewMemory}
            onDelete={onDeleteMemory}
            isOwner={currentUserId === memory.userId}
            viewMode={viewMode}
            username={usernames[memory.userId]}
          />
        </div>
      ))}
    </div>
  );
} 