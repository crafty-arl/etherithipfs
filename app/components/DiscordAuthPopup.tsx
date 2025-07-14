'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';

interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string;
  email?: string;
}

interface DiscordAuthPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user: DiscordUser) => void;
}

export default function DiscordAuthPopup({ isOpen, onClose, onSuccess }: DiscordAuthPopupProps) {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<DiscordUser | null>(null);
  const [isJoiningServer, setIsJoiningServer] = useState(false);

  console.log('🔵 DiscordAuthPopup rendered with isOpen:', isOpen);

  // Handle Discord OAuth flow
  const handleDiscordAuth = async () => {
    console.log('🔵 Starting Discord authentication flow...');
    setIsAuthenticating(true);
    setError(null);

    try {
      // Get Discord OAuth URL from our API
      console.log('🔵 Fetching Discord OAuth URL...');
      const response = await fetch('/api/auth/discord/url');
      
      console.log('🔵 OAuth URL response status:', response.status);
      
      if (!response.ok) {
        console.error('❌ Failed to fetch OAuth URL:', response.status, response.statusText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('🔵 Discord OAuth URL response:', data);

      if (!data.success) {
        console.error('❌ OAuth URL generation failed:', data.error);
        throw new Error(data.error || 'Failed to get Discord auth URL');
      }

      console.log('🔵 Opening Discord OAuth popup...');
      // Open Discord OAuth in a popup window
      const popup = window.open(
        data.authUrl,
        'discord-auth',
        'width=500,height=700,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        console.error('❌ Popup was blocked');
        throw new Error('Popup blocked. Please allow popups for this site.');
      }

      console.log('🔵 Popup opened successfully, waiting for authentication...');

      // Track if we received a message from the popup
      let messageReceived = false;

      // Listen for messages from the popup
      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) {
          console.log('⚠️ Ignoring message from different origin:', event.origin);
          return;
        }

        console.log('🔵 Received message from popup:', event.data);
        messageReceived = true;

        try {
          if (event.data.type === 'DISCORD_AUTH_SUCCESS') {
            console.log('✅ Discord auth success received');
            popup.close();
            console.log('🔵 Fetching user data...');
            
            // Fetch user data from our API
            const userResponse = await fetch('/api/auth/discord/user', {
              credentials: 'include'
            });
            
            console.log('🔵 User data response status:', userResponse.status);
            const userData = await userResponse.json();
            console.log('🔵 User data response:', userData);
            
            if (userData.success) {
              console.log('✅ User authentication successful:', userData.user);
              setUser(userData.user);
              onSuccess?.(userData.user);
            } else {
              console.error('❌ Failed to get user data:', userData.error);
              throw new Error(userData.error || 'Failed to get user data');
            }
          } else if (event.data.type === 'DISCORD_AUTH_ERROR') {
            console.error('❌ Discord OAuth Error:', event.data);
            popup.close();
            const errorMessage = event.data.error || event.data.message || 'Authentication failed';
            throw new Error(`Discord Authentication Error: ${errorMessage}`);
          }
        } catch (messageError) {
          console.error('❌ Message handling error:', messageError);
          popup.close();
          setError(messageError instanceof Error ? messageError.message : 'Authentication failed');
          setIsAuthenticating(false);
        }
      };

      // Timeout fallback - close popup after 5 minutes
      const timeoutId = setTimeout(() => {
        if (!popup.closed) {
          console.log('⏰ Authentication timeout reached');
          popup.close();
          clearInterval(checkClosed);
          window.removeEventListener('message', handleMessageWithCleanup);
          setIsAuthenticating(false);
          setError('Authentication timed out. Please try again.');
        }
      }, 300000); // 5 minutes

      // Clean up timeout when message is received
      const handleMessageWithCleanup = (event: MessageEvent) => {
        clearTimeout(timeoutId);
        clearInterval(checkClosed);
        handleMessage(event);
      };

      window.addEventListener('message', handleMessageWithCleanup);

      // Check if popup was closed manually (with a small delay to avoid race conditions)
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          console.log('🔵 Popup closed detected. Message received:', messageReceived, 'User:', !!user);
          clearInterval(checkClosed);
          clearTimeout(timeoutId);
          window.removeEventListener('message', handleMessageWithCleanup);
          setIsAuthenticating(false);
          
          // Only show cancellation error if we didn't receive a message and have no user
          if (!messageReceived && !user) {
            console.log('⚠️ Setting cancellation error - no message received and no user');
            setError('Authentication was cancelled or the popup was closed');
          }
        }
      }, 1000);

    } catch (error) {
      console.error('❌ Discord auth error:', error);
      setError(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Handle joining Discord server
  const handleJoinServer = async () => {
    setIsJoiningServer(true);
    setError(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch('/api/auth/discord/join-server', {
        method: 'POST',
        credentials: 'include',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        // Redirect to Discord invite link
        const opened = window.open(data.inviteUrl, '_blank');
        
        if (!opened) {
          setError('Popup blocked. Please manually visit: ' + data.inviteUrl);
          return;
        }
        
        // Close popup after successful join
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        throw new Error(data.error || 'Failed to join server');
      }
    } catch (error) {
      console.error('Discord server join error:', error);
      
      if (error instanceof Error && error.name === 'AbortError') {
        setError('Request timed out. Please check your connection and try again.');
      } else if (error instanceof TypeError && error.message.includes('fetch')) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError(error instanceof Error ? error.message : 'Failed to join server');
      }
    } finally {
      setIsJoiningServer(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/discord/logout', {
        method: 'POST',
        credentials: 'include'
      });
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Check if user is already authenticated on mount
  useEffect(() => {
    if (isOpen) {
      const checkAuth = async () => {
        try {
          const response = await fetch('/api/auth/discord/user', {
            credentials: 'include'
          });
          const data = await response.json();
          if (data.success) {
            setUser(data.user);
          }
        } catch (error) {
          console.error('Auth check error:', error);
        }
      };
      checkAuth();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const popupContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              <h2 className="text-xl font-semibold">Join Etherith Community</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="mt-2 text-purple-100">
            Connect with Discord to access our community and contribute to the archive
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {!user ? (
            <div className="text-center">
              <div className="mb-6">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Authenticate with Discord
                </h3>
                <p className="text-gray-600 text-sm">
                  Connect your Discord account to join our community and start preserving memories
                </p>
              </div>

              <button
                onClick={handleDiscordAuth}
                disabled={isAuthenticating}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                {isAuthenticating ? (
                  <>
                    <svg className="animate-spin w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                    </svg>
                    <span>Connect with Discord</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="text-center">
              <div className="mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full overflow-hidden border-2 border-green-200">
                  {user.avatar ? (
                    <Image 
                      src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`} 
                      alt={user.username}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-green-100 flex items-center justify-center">
                      <span className="text-green-600 font-semibold text-lg">
                        {user.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">
                  Welcome, {user.username}!
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  You&apos;re successfully authenticated. Ready to join our Discord community?
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleJoinServer}
                  disabled={isJoiningServer}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                >
                  {isJoiningServer ? (
                    <>
                      <svg className="animate-spin w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Joining Server...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span>Join Etherith Discord</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleLogout}
                  className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors text-sm"
                >
                  Disconnect Discord
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(popupContent, document.body);
} 