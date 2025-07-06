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

  if (!mounted || !isOpen) {
    return null;
  }

  const popupContent = (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md mx-4 text-center">
        {/* Logo */}
        <div className="relative mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-stone-100 to-stone-200 rounded-xl flex items-center justify-center mx-auto shadow-sm border border-stone-300">
            <Image 
              src="/etherith_logo_v2.jpg" 
              alt="Etherith" 
              width={80}
              height={80}
              className="w-full h-full object-contain p-2"
            />
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full border-2 border-white"></div>
        </div>

        {/* Loading Animation */}
        <div className="mb-6">
          <div className="relative">
            {/* Outer rotating ring */}
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-stone-200 border-t-amber-500 mx-auto"></div>
            {/* Inner pulsing dot */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Loading Text */}
        <div className="space-y-2">
          <h3 className="text-xl font-light text-stone-900 font-serif">
            Connecting to Etherith
          </h3>
          <p className="text-stone-600 text-sm">
            Checking your authentication status...
          </p>
        </div>

        {/* Animated Dots */}
        <div className="flex justify-center space-x-1 mt-4">
          <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>

        {/* Optional Status Text */}
        <div className="mt-6 text-xs text-stone-500 uppercase tracking-wide">
          Secure Authentication in Progress
        </div>
      </div>
    </div>
  );

  return createPortal(popupContent, document.body);
} 