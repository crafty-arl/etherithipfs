'use client';

import { useState, useEffect, useRef } from 'react';
import { Memory } from '../types/memory';

interface FileViewerProps {
  memory: Memory;
  className?: string;
  showControls?: boolean;
  fullscreen?: boolean;
  onFullscreenToggle?: () => void;
}

export default function FileViewer({ 
  memory, 
  className = '', 
  showControls = true,
  fullscreen = false,
  onFullscreenToggle 
}: FileViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Get the best available URL for the file
  const getFileUrl = () => {
    if (memory.ipfsUrl) return memory.ipfsUrl;
    if (memory.ipfsCid) return `https://gateway.pinata.cloud/ipfs/${memory.ipfsCid}`;
    if (memory.fileUrl) return memory.fileUrl;
    return null;
  };

  // Get alternative URLs for fallback
  const getFallbackUrls = () => {
    const urls = [];
    if (memory.ipfsCid) {
      urls.push(`https://gateway.pinata.cloud/ipfs/${memory.ipfsCid}`);
      urls.push(`https://cloudflare-ipfs.com/ipfs/${memory.ipfsCid}`);
      urls.push(`https://dweb.link/ipfs/${memory.ipfsCid}`);
      urls.push(`https://ipfs.io/ipfs/${memory.ipfsCid}`);
    }
    if (memory.fileUrl && !urls.includes(memory.fileUrl)) {
      urls.push(memory.fileUrl);
    }
    return urls;
  };

  // Initialize file URL
  useEffect(() => {
    const url = getFileUrl();
    if (url) {
      setCurrentUrl(url);
      setIsLoading(false);
    } else {
      setError('No file URL available');
      setIsLoading(false);
    }
  }, [memory]);

  // Handle URL fallback on error
  const handleUrlError = () => {
    const fallbackUrls = getFallbackUrls();
    const currentIndex = fallbackUrls.indexOf(currentUrl);
    
    if (currentIndex < fallbackUrls.length - 1) {
      const nextUrl = fallbackUrls[currentIndex + 1];
      console.log(`Trying fallback URL: ${nextUrl}`);
      setCurrentUrl(nextUrl);
    } else {
      setError('Failed to load file from all available sources');
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get content type or default
  const contentType = memory.contentType || '';

  // Render loading state
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center bg-stone-100 ${className}`}>
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-stone-500">Loading file...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className={`flex items-center justify-center bg-stone-100 ${className}`}>
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 text-stone-300 mx-auto mb-3">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm text-stone-500 mb-2">{error}</p>
          <a
            href={currentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-xs text-stone-600 hover:text-stone-800 underline"
          >
            Try direct link
            <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>
    );
  }

  // IMAGE VIEWER
  if (contentType.startsWith('image/')) {
    return (
      <div className={`relative bg-stone-100 ${className}`}>
        <img
          src={currentUrl}
          alt={memory.title}
          className="w-full h-full object-contain"
          onError={handleUrlError}
          onLoad={() => setError(null)}
        />
        {showControls && (
          <div className="absolute top-2 right-2 flex gap-2">
            {onFullscreenToggle && (
              <button
                onClick={onFullscreenToggle}
                className="p-2 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors"
                title={fullscreen ? "Exit fullscreen" : "View fullscreen"}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={fullscreen ? "M9 9V4.5M9 9H4.5M9 9L3.75 3.75M15 9V4.5M15 9h4.5M15 9l5.25-5.25M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 15v4.5M15 15h4.5m0 0L20.25 20.25" : "M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M20.25 3.75v4.5m0-4.5h-4.5m4.5 0L15 9m5.25 11.25v-4.5m0 4.5h-4.5m4.5 0L15 15m-5.25 5.25v-4.5m0 4.5h4.5m-4.5 0L9 15"} />
                </svg>
              </button>
            )}
            <a
              href={currentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors"
              title="Open in new tab"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        )}
      </div>
    );
  }

  // VIDEO VIEWER
  if (contentType.startsWith('video/')) {
    return (
      <div className={`relative bg-stone-900 ${className}`}>
        <video
          ref={videoRef}
          src={currentUrl}
          className="w-full h-full"
          controls
          preload="metadata"
          onError={handleUrlError}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
        >
          Your browser does not support the video tag.
        </video>
        {showControls && (
          <div className="absolute top-2 right-2 flex gap-2">
            <a
              href={currentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors"
              title="Open in new tab"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        )}
      </div>
    );
  }

  // AUDIO VIEWER
  if (contentType.startsWith('audio/')) {
    return (
      <div className={`relative bg-gradient-to-br from-stone-800 to-stone-900 text-white ${className}`}>
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 text-white/70">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <h3 className="font-medium text-lg mb-1">{memory.fileName}</h3>
            <p className="text-white/60 text-sm">
              {memory.fileSize && formatFileSize(memory.fileSize)}
            </p>
          </div>
          
          <audio
            ref={audioRef}
            src={currentUrl}
            className="w-full max-w-md"
            controls
            preload="metadata"
            onError={handleUrlError}
          >
            Your browser does not support the audio tag.
          </audio>
          
          {showControls && (
            <div className="mt-4">
              <a
                href={currentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors text-sm"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Open in new tab
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }

  // PDF VIEWER
  if (contentType.includes('pdf')) {
    return (
      <div className={`relative bg-white ${className}`}>
        <iframe
          src={`${currentUrl}#toolbar=1&navpanes=1&scrollbar=1`}
          className="w-full h-full border-0"
          title={memory.fileName}
          onError={handleUrlError}
        />
        {showControls && (
          <div className="absolute top-2 right-2 flex gap-2">
            <a
              href={currentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors"
              title="Open in new tab"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        )}
      </div>
    );
  }

  // TEXT/CODE VIEWER
  if (contentType.startsWith('text/') || 
      contentType.includes('javascript') || 
      contentType.includes('json') || 
      contentType.includes('xml') ||
      contentType.includes('css') ||
      contentType.includes('html')) {
    return (
      <div className={`relative bg-stone-50 ${className}`}>
        <iframe
          src={currentUrl}
          className="w-full h-full border-0"
          title={memory.fileName}
          onError={handleUrlError}
        />
        {showControls && (
          <div className="absolute top-2 right-2 flex gap-2">
            <a
              href={currentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors"
              title="Open in new tab"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        )}
      </div>
    );
  }

  // GENERIC FILE VIEWER (fallback for documents, archives, etc.)
  return (
    <div className={`relative bg-gradient-to-br from-stone-100 to-stone-200 ${className}`}>
      <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 mx-auto mb-4 text-stone-400">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="font-medium text-lg mb-2 text-stone-800">{memory.fileName}</h3>
          <p className="text-stone-600 text-sm mb-4">
            {contentType || 'Unknown file type'} • {memory.fileSize && formatFileSize(memory.fileSize)}
          </p>
          
          <div className="space-y-3">
            <a
              href={currentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 bg-stone-800 text-white rounded-lg hover:bg-stone-900 transition-colors text-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open File
            </a>
            
            <a
              href={currentUrl}
              download={memory.fileName}
              className="inline-flex items-center px-4 py-2 bg-stone-600 text-white rounded-lg hover:bg-stone-700 transition-colors text-sm ml-2"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download
            </a>
          </div>
          
          {memory.ipfsCid && (
            <div className="mt-4 p-3 bg-stone-50 rounded-lg">
              <p className="text-xs text-stone-500 mb-1">IPFS CID</p>
              <code className="text-xs text-stone-700 font-mono break-all">{memory.ipfsCid}</code>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 