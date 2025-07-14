'use client';

import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import Image from 'next/image';

interface AuthLoadingPopupProps {
  isOpen: boolean;
}

export default function AuthLoadingPopup({ isOpen }: AuthLoadingPopupProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent scroll when popup is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!mounted || !isOpen) {
    return null;
  }

  const popupContent = (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-loading-title"
      aria-describedby="auth-loading-description"
    >
      <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 max-w-sm sm:max-w-md w-full text-center">
        {/* Logo */}
        <div className="relative mb-4 sm:mb-6">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-stone-100 to-stone-200 rounded-xl flex items-center justify-center mx-auto shadow-sm border border-stone-300">
            <Image 
              src="/etherith_logo_v2.jpg" 
              alt="Etherith Logo" 
              width={80}
              height={80}
              className="w-full h-full object-contain p-2"
              priority
            />
          </div>
          <div className="absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full border-2 border-white"></div>
        </div>

        {/* Loading Animation */}
        <div className="mb-4 sm:mb-6">
          <div className="relative">
            {/* Outer rotating ring */}
            <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-3 sm:border-4 border-stone-200 border-t-amber-500 mx-auto"></div>
            {/* Inner pulsing dot */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 sm:w-3 sm:h-3 bg-amber-500 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Loading Text */}
        <div className="space-y-2 mb-4">
          <h3 
            id="auth-loading-title"
            className="text-lg sm:text-xl font-light text-stone-900 font-serif"
          >
            Connecting to Etherith
          </h3>
          <p 
            id="auth-loading-description"
            className="text-stone-600 text-sm leading-relaxed"
          >
            Checking your authentication status...
          </p>
        </div>

        {/* Animated Dots */}
        <div className="flex justify-center space-x-1 mb-4 sm:mb-6">
          <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>

        {/* Optional Status Text */}
        <div className="text-xs text-stone-500 uppercase tracking-wide">
          Secure Authentication in Progress
        </div>
      </div>
    </div>
  );

  return createPortal(popupContent, document.body);
} 