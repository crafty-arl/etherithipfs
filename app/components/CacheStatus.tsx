'use client';

import { useState, useEffect } from 'react';
import { getCacheInfo, isStorageAvailable } from '../utils/localStorage';

interface CacheStatusProps {
  className?: string;
}

export default function CacheStatus({ className = '' }: CacheStatusProps) {
  const [cacheInfo, setCacheInfo] = useState<{ size: number; keys: string[] }>({ size: 0, keys: [] });
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    setIsAvailable(isStorageAvailable());
    if (isStorageAvailable()) {
      setCacheInfo(getCacheInfo());
    }
  }, []);

  if (!isAvailable) {
    return null;
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className={`flex items-center space-x-2 text-xs text-stone-500 ${className}`}>
      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
      <span>Cached: {formatSize(cacheInfo.size)}</span>
    </div>
  );
} 