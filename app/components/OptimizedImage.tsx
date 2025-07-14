'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface OptimizedImageProps {
  src: string;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  onLoad?: () => void;
  onError?: () => void;
}

export default function OptimizedImage({
  src,
  alt,
  fill = false,
  width,
  height,
  className = '',
  priority = false,
  onLoad,
  onError,
}: OptimizedImageProps) {
  const [imageSrc, setImageSrc] = useState(src);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const isCloudflareR2 = src.includes('memory-weaver-files.r2.cloudflarestorage.com');
  const maxRetries = 3;

  useEffect(() => {
    setImageSrc(src);
    setIsLoading(true);
    setHasError(false);
    setRetryCount(0);
  }, [src]);

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    onError?.();

    // Retry logic for R2 images
    if (isCloudflareR2 && retryCount < maxRetries) {
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        setIsLoading(true);
        setHasError(false);
        // Force reload by adding timestamp
        setImageSrc(`${src}${src.includes('?') ? '&' : '?'}retry=${retryCount + 1}&t=${Date.now()}`);
      }, 1000 * (retryCount + 1)); // Exponential backoff
    }
  };

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
    onLoad?.();
  };

  // For Cloudflare R2 images, use regular img tag to avoid Next.js optimization issues
  if (isCloudflareR2) {
    return (
      <div className={`relative ${fill ? 'w-full h-full' : ''} ${className}`}>
        {isLoading && (
          <div className="absolute inset-0 bg-stone-100 animate-pulse flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-stone-300 border-t-amber-500 rounded-full animate-spin"></div>
          </div>
        )}
        
        <img
          src={imageSrc}
          alt={alt}
          className={`${fill ? 'w-full h-full object-cover' : ''} ${className} ${
            isLoading ? 'opacity-0' : 'opacity-100'
          } transition-opacity duration-300`}
          style={fill ? { position: 'absolute', top: 0, left: 0 } : {}}
          onLoad={handleLoad}
          onError={handleError}
          loading={priority ? 'eager' : 'lazy'}
        />
        
        {hasError && retryCount >= maxRetries && (
          <div className="absolute inset-0 bg-stone-100 flex items-center justify-center">
            <div className="text-center text-stone-500">
              <div className="text-2xl mb-2">🖼️</div>
              <div className="text-xs">Image unavailable</div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // For other images, use Next.js Image component
  return (
    <Image
      src={imageSrc}
      alt={alt}
      fill={fill}
      width={width}
      height={height}
      className={className}
      priority={priority}
      onLoad={onLoad}
      onError={handleError}
    />
  );
} 