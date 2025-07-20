'use client';

import { useState, useEffect } from 'react';

interface AnimatedDialMenuProps {
  tags: string[];
  selectedTags: string[];
  onTagSelect: (tag: string) => void;
  onClearAll: () => void;
  isCollapsed?: boolean;
}

export default function AnimatedDialMenu({ 
  tags, 
  selectedTags, 
  onTagSelect, 
  onClearAll,
  isCollapsed = false 
}: AnimatedDialMenuProps) {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter tags based on search
  const filteredTags = tags.filter(tag => 
    tag.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Limit displayed tags
  const displayTags = filteredTags.slice(0, 12);
  const hasMoreTags = filteredTags.length > 12;

  if (isCollapsed) return null;

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-stone-200 h-full flex flex-col">
      {/* Header with clear option */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-stone-900 uppercase tracking-wider">Tags</h3>
          {selectedTags.length > 0 && (
            <span className="bg-stone-100 text-stone-600 text-xs px-2 py-1 rounded-full">
              {selectedTags.length}
            </span>
          )}
        </div>
        {selectedTags.length > 0 && (
          <button
            onClick={onClearAll}
            className="text-xs text-stone-500 hover:text-stone-700 transition-colors duration-200"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Search Input */}
      {tags.length > 8 && (
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500 focus:border-transparent transition-colors"
          />
        </div>
      )}

      {/* Tags List */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-1">
          {displayTags.map((tag) => {
            const isSelected = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                onClick={() => onTagSelect(tag)}
                className={`
                  w-full px-3 py-2 rounded-lg text-sm font-light text-left transition-all duration-200
                  flex items-center justify-between group
                  ${isSelected 
                    ? 'bg-stone-900 text-white shadow-sm' 
                    : 'bg-stone-50 text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                  }
                `}
              >
                <span className="truncate">#{tag}</span>
                {isSelected && (
                  <svg className="w-4 h-4 text-white opacity-80" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>

        {/* More tags indicator */}
        {hasMoreTags && (
          <div className="mt-4 text-center">
            <p className="text-xs text-stone-500">
              +{filteredTags.length - 12} more tags
              {searchTerm && ' (try searching)'}
            </p>
          </div>
        )}

        {/* No tags message */}
        {displayTags.length === 0 && searchTerm && (
          <div className="text-center py-8">
            <p className="text-sm text-stone-500">No tags found</p>
            <button
              onClick={() => setSearchTerm('')}
              className="text-xs text-stone-400 hover:text-stone-600 mt-2 transition-colors"
            >
              Clear search
            </button>
          </div>
        )}

        {/* Empty state */}
        {tags.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-stone-500">No tags available</p>
          </div>
        )}
      </div>

      {/* Selected tags summary */}
      {selectedTags.length > 0 && (
        <div className="mt-4 pt-4 border-t border-stone-100">
          <div className="flex flex-wrap gap-1">
            {selectedTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-1 bg-stone-900 text-white text-xs rounded-md"
              >
                {tag}
                <button
                  onClick={() => onTagSelect(tag)}
                  className="hover:text-stone-300 transition-colors"
                  title={`Remove ${tag}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 