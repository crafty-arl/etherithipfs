'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import DiscordAuthPopup from './components/DiscordAuthPopup';
import AuthLoadingPopup from './components/AuthLoadingPopup';
import EtherithLandingPopup from './components/EtherithLandingPopup';
import MemoryDisplay from './components/MemoryDisplay';

interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string;
  email?: string;
}

export default function Home() {
  const [user, setUser] = useState<DiscordUser | null>(null);
  const [showDiscordAuth, setShowDiscordAuth] = useState(false);
  const [showLandingPopup, setShowLandingPopup] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [guildId, setGuildId] = useState<string | undefined>(undefined);
  const router = useRouter();

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/discord/user', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const userData = await response.json();
          if (userData.success) {
            // User is authenticated, show the main application
            setUser(userData.user);
            setShowLandingPopup(false);
            
            // Try to get guild ID from the user data or session
            if (userData.guildId) {
              setGuildId(userData.guildId);
            }
          } else {
            // User not authenticated, show landing popup
            setShowLandingPopup(true);
          }
        } else {
          // User not authenticated, show landing popup
          setShowLandingPopup(true);
        }
      } catch (error) {
        // User not authenticated, show landing popup
        console.log('User not authenticated');
        setShowLandingPopup(true);
      } finally {
        setAuthLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleDiscordSuccess = (discordUser: DiscordUser) => {
    setUser(discordUser);
    setShowLandingPopup(false);
    setShowDiscordAuth(false);
  };

  const handleJoinDiscord = () => {
    setShowLandingPopup(false);
    setShowDiscordAuth(true);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/discord/logout', { 
        method: 'POST',
        credentials: 'include'
      });
      setUser(null);
      setShowLandingPopup(true);
    } catch (error) {
      console.error('Logout error:', error);
      setUser(null);
      setShowLandingPopup(true);
    }
  };

  // Show loading popup while checking authentication
  if (authLoading) {
    return <AuthLoadingPopup isOpen={true} />;
  }

  // Show landing popup for non-authenticated users
  if (!user && showLandingPopup) {
    return (
      <>
        <EtherithLandingPopup
          isOpen={showLandingPopup}
          onClose={() => setShowLandingPopup(false)}
          onJoinDiscord={handleJoinDiscord}
        />
        {showDiscordAuth && (
          <DiscordAuthPopup
            isOpen={showDiscordAuth}
            onClose={() => {
              setShowDiscordAuth(false);
              setShowLandingPopup(true);
            }}
            onSuccess={handleDiscordSuccess}
          />
        )}
      </>
    );
  }

  // Show Memory Weaver application for authenticated users
  if (user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-amber-50">
        {/* Subtle Afrofuturism-inspired background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full opacity-[0.03]">
            <div className="absolute top-1/4 left-1/6 w-[400px] h-[400px] sm:w-[800px] sm:h-[800px] bg-gradient-to-r from-amber-600 via-orange-500 to-red-500 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/6 w-[300px] h-[300px] sm:w-[600px] sm:h-[600px] bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 rounded-full blur-3xl animate-pulse delay-1000"></div>
          </div>
        </div>

        <div className="relative z-10">
          {/* Application Header */}
          <header className="border-b border-stone-200 bg-white/80 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
              <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
                <div className="flex items-center space-x-3 sm:space-x-6">
                  <div className="relative">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-stone-100 to-stone-200 rounded-xl flex items-center justify-center shadow-sm border border-stone-300">
                      <Image 
                        src="/etherith_logo_v2.jpg" 
                        alt="Etherith Logo" 
                        width={64}
                        height={64}
                        className="w-full h-full object-contain p-2"
                        priority
                      />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full border-2 border-white"></div>
                  </div>
                  <div className="text-center sm:text-left">
                    <h1 className="text-2xl sm:text-4xl font-light text-stone-900 tracking-wide font-serif">
                      ETHERITH
                    </h1>
                    <p className="text-stone-600 text-xs sm:text-sm font-light tracking-wider uppercase">
                      Memory Weaver
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 border-stone-300 flex-shrink-0">
                      <Image 
                        src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`}
                        alt={`${user.username}'s avatar`}
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="text-center sm:text-right">
                      <p className="text-stone-900 font-medium text-sm sm:text-base">{user.username}</p>
                      <p className="text-xs text-stone-500">Connected</p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="text-stone-600 hover:text-stone-900 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                    aria-label="Logout"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </header>

          {/* Memory Display SPA */}
          <MemoryDisplay 
            user={{
              id: user.id,
              username: user.username,
              avatar: user.avatar
            }}
            guildId={guildId}
          />
        </div>
      </div>
    );
  }

  // Fallback - show landing popup
  return (
    <EtherithLandingPopup
      isOpen={true}
      onClose={() => setShowLandingPopup(false)}
      onJoinDiscord={handleJoinDiscord}
    />
  );
}
