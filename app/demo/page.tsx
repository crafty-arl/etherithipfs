'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import AuthLoadingPopup from '../components/AuthLoadingPopup';

interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string;
  email?: string;
}

export default function DemoPage() {
  const [user, setUser] = useState<DiscordUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/discord/user', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const userData = await response.json();
          if (userData.success) {
            setUser(userData.user);
          } else {
            // Not authenticated, redirect to main page
            router.push('/');
          }
        } else {
          // Not authenticated, redirect to main page
          router.push('/');
        }
      } catch (error) {
        console.error('Auth check error:', error);
        router.push('/');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/discord/logout', { 
        method: 'POST',
        credentials: 'include'
      });
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
      router.push('/');
    }
  };

  const handleUploadMemory = async () => {
    try {
      // Use the existing join-server API endpoint
      const response = await fetch('/api/auth/discord/join-server', {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        // Open Discord server invite URL
        const opened = window.open(data.inviteUrl, '_blank');
        
        if (!opened) {
          alert('Popup blocked. Please manually visit: ' + data.inviteUrl);
        }
      } else {
        alert(data.error || 'Failed to join server');
      }
    } catch (error) {
      console.error('Discord server join error:', error);
      alert('Failed to connect to Discord server');
    }
  };

  if (!user) {
    return <AuthLoadingPopup isOpen={loading} />;
  }

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
        {/* Demo Version Header */}
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
                    Demo Version
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

        {/* Demo Welcome Section */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-20 text-center">
          <div className="mb-8 sm:mb-12">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8 border border-amber-200">
              <svg className="w-8 h-8 sm:w-10 sm:h-10 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-3xl sm:text-5xl font-light text-stone-900 mb-4 sm:mb-6 font-serif">
              Welcome to Etherith Demo
            </h2>
            <p className="text-lg sm:text-xl text-stone-600 font-light leading-relaxed max-w-2xl mx-auto px-4">
              You&apos;re now part of our exclusive demo community. We&apos;re rolling out Etherith in phases, 
              and you have early access to experience the future of digital preservation.
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-stone-200 p-6 sm:p-12 mb-8 sm:mb-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mb-8 sm:mb-12">
              <div className="text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-stone-100 to-stone-200 rounded-xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-base sm:text-lg font-medium text-stone-900 mb-2">Secure Storage</h3>
                <p className="text-stone-600 text-sm">Your memories are encrypted and stored on IPFS</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-stone-100 to-stone-200 rounded-xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                  </svg>
                </div>
                <h3 className="text-base sm:text-lg font-medium text-stone-900 mb-2">AI Curator</h3>
                <p className="text-stone-600 text-sm">Chat with Mem Weaver to upload and organize</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-stone-100 to-stone-200 rounded-xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-base sm:text-lg font-medium text-stone-900 mb-2">Permanent Access</h3>
                <p className="text-stone-600 text-sm">Decentralized storage ensures eternal accessibility</p>
              </div>
            </div>

            <div className="border-t border-stone-200 pt-6 sm:pt-8">
              <h3 className="text-xl sm:text-2xl font-light text-stone-900 mb-4 sm:mb-6 font-serif">
                Ready to Preserve Your First Memory?
              </h3>
              <p className="text-stone-600 mb-6 sm:mb-8 max-w-2xl mx-auto text-sm sm:text-base">
                Our AI curator, Mem Weaver, is waiting in Discord to help you upload and organize your digital memories. 
                Simply share your files and let the AI handle the rest.
              </p>
              
              <button
                onClick={handleUploadMemory}
                className="inline-flex items-center justify-center space-x-2 sm:space-x-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-6 sm:px-10 py-3 sm:py-4 rounded-full font-medium text-sm sm:text-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] min-h-[44px] touch-manipulation"
                aria-label="Upload Memory to Discord"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                <span>Upload Memory</span>
                <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Coming Soon</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-stone-200 p-6 sm:p-8">
              <h3 className="text-lg sm:text-xl font-medium text-stone-900 mb-3 sm:mb-4 font-serif">Phase 1: Demo Access</h3>
              <p className="text-stone-600 text-sm leading-relaxed">
                You&apos;re experiencing our demo version with limited features. Full functionality 
                will be available as we progress through our phased rollout.
              </p>
            </div>
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-stone-200 p-6 sm:p-8">
              <h3 className="text-lg sm:text-xl font-medium text-stone-900 mb-3 sm:mb-4 font-serif">What&apos;s Next?</h3>
              <p className="text-stone-600 text-sm leading-relaxed">
                We&apos;ll notify you via Discord when new features become available. 
                Thank you for being part of our early community.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 