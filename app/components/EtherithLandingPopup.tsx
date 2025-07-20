'use client';

import { useState, useEffect } from 'react';

interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string;
  email?: string;
}

interface EtherithLandingPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onJoinDiscord?: () => void;
  onAuthSuccess?: (user: DiscordUser) => void;
  authError?: string | null;
}

export default function EtherithLandingPopup({ 
  isOpen, 
  onClose, 
  onJoinDiscord,
  onAuthSuccess,
  authError
}: EtherithLandingPopupProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setLoading(false);
    }
  }, [isOpen]);

  // Update error state when authError prop changes
  useEffect(() => {
    if (authError) {
      setError(authError);
    }
  }, [authError]);

  const handleDiscordAuth = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get Discord auth URL
      const response = await fetch('/api/auth/discord/url');
      const data = await response.json();
      
      if (data.success && data.authUrl) {
        // Call the optional onJoinDiscord callback for any additional logic
        if (onJoinDiscord) {
          onJoinDiscord();
        }
        
        // Redirect to Discord auth - this will handle the full auth flow
        window.location.href = data.authUrl;
      } else {
        setError('Failed to connect to Discord. Please try again.');
      }
    } catch (error) {
      console.error('Discord auth error:', error);
      setError('Connection failed. Please check your internet and try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 backdrop-blur-sm rounded-3xl max-w-lg w-full shadow-2xl border border-white/20">
        {/* Header */}
        <div className="relative p-12 pb-8 text-center">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-full hover:bg-stone-50 transition-all duration-200"
            aria-label="Close"
          >
            <svg className="w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <div className="mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-stone-50 to-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
              <img 
                src="/etherith_logo_v2.jpg" 
                alt="Etherith Logo" 
                className="w-full h-full object-contain p-3 rounded-2xl"
              />
            </div>
            <h1 className="text-4xl font-light text-stone-900 tracking-wider font-serif mb-2">
                ETHERITH
              </h1>
            <p className="text-stone-500 font-light tracking-wide text-sm">
                Digital Memory Preservation
              </p>
        </div>

          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-light text-stone-800 mb-4 tracking-wide">
                Memory Weaver
              </h2>
              <p className="text-stone-600 leading-relaxed text-sm max-w-md mx-auto">
                Preserve your community's stories and memories on the decentralized web. 
                Connect with Discord to start contributing to shared cultural heritage.
              </p>
            </div>

            {/* Minimalist Features */}
            <div className="space-y-3 py-4">
              <div className="flex items-center justify-center space-x-3 text-stone-600">
                <div className="w-1.5 h-1.5 bg-amber-400 rounded-full"></div>
                <span className="text-sm font-light">Permanent IPFS Storage</span>
              </div>
              <div className="flex items-center justify-center space-x-3 text-stone-600">
                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                <span className="text-sm font-light">Community Driven</span>
              </div>
              <div className="flex items-center justify-center space-x-3 text-stone-600">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                <span className="text-sm font-light">Censorship Resistant</span>
              </div>
            </div>
              </div>
            </div>

            {/* Call to Action */}
        <div className="px-12 pb-12">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
              <p className="text-red-600 text-sm font-light text-center">{error}</p>
            </div>
          )}

              <button
            onClick={handleDiscordAuth}
            disabled={loading}
            className="w-full bg-stone-900 hover:bg-stone-800 disabled:bg-stone-400 text-white py-4 px-8 rounded-2xl transition-all duration-200 flex items-center justify-center space-x-3 group shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="font-light tracking-wide">Connecting...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                <span className="font-light tracking-wide">Join Discord & Access Gallery</span>
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </>
            )}
              </button>

          {/* Subtle Documentation Link */}
          <div className="mt-6 text-center">
                  <a
                    href="https://github.com/etherithbot/MEMORY_WEAVER_PLAN.md"
                    target="_blank"
                    rel="noopener noreferrer"
              className="text-stone-400 hover:text-stone-600 text-xs font-light tracking-wide transition-colors duration-200"
            >
              Learn more about the platform →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}