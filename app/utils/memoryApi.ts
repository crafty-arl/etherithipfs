import { Memory, MemorySearchResult, MemoryFilters, MemoryStats, ApiResponse } from '../types/memory';

// Use local API proxy to Cloudflare Workers
const API_BASE_URL = '/api/memories';

class MemoryApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}`,
          code: data.code,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Memory API request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // Get user's personal memories
  async getMyMemories(userId: string, filters?: MemoryFilters): Promise<ApiResponse<MemorySearchResult>> {
    return this.request<MemorySearchResult>('?path=/api/memory/search', {
      method: 'POST',
      body: JSON.stringify({
        userId,
        filters: filters || {},
        type: 'personal'
      }),
    });
  }

  // Get server/community memories (members only privacy level)
  async getOurMemories(filters?: MemoryFilters): Promise<ApiResponse<MemorySearchResult>> {
    return this.request<MemorySearchResult>('?path=/api/memory/search', {
      method: 'POST',
      body: JSON.stringify({
        filters: {
          ...filters,
          privacy: 'members_only' // Use lowercase underscore format that matches database
        },
        type: 'members_only'
      }),
    });
  }

  // Get a specific memory by ID
  async getMemory(memoryId: string, requesterId: string): Promise<ApiResponse<{ memory: Memory }>> {
    return this.request<{ memory: Memory }>(`?path=/api/memory/${memoryId}`, {
      method: 'GET',
      headers: {
        'X-Requester-ID': requesterId,
      },
    });
  }

  // Get memory statistics
  async getMemoryStats(userId?: string, guildId?: string): Promise<ApiResponse<{ stats: MemoryStats }>> {
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    if (guildId) params.append('guildId', guildId);

    return this.request<{ stats: MemoryStats }>(`?path=/api/memory/stats&${params.toString()}`);
  }

  // Delete a memory
  async deleteMemory(memoryId: string, userId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`?path=/api/memory/${memoryId}`, {
      method: 'DELETE',
      body: JSON.stringify({ userId }),
    });
  }

  // Health check
  async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    return this.request<{ status: string; timestamp: string }>('?path=/api/health');
  }
}

// Export singleton instance
export const memoryApi = new MemoryApiClient();

// Helper function to format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Helper function to get category display name
export function getCategoryDisplayName(category: string): string {
  const categoryMap: Record<string, string> = {
    'gaming': '🎮 Gaming',
    'creative': '🎨 Creative',
    'learning': '📚 Learning',
    'work': '💼 Work',
    'social': '🎉 Social',
    'notes': '📝 Notes',
    'projects': '🔧 Projects',
    'achievements': '🏆 Achievements',
    'personal': '❤️ Personal',
    'other': '📊 Other',
  };
  return categoryMap[category] || category;
}

// Helper function to get privacy display name
export function getPrivacyDisplayName(privacy: string): string {
  const privacyMap: Record<string, string> = {
    'public': '🌍 Public',
    'members_only': '👥 Members Only',
    'private': '🔒 Private',
  };
  return privacyMap[privacy] || privacy;
}

// Helper function to format date
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

  if (diffInHours < 1) {
    return 'Just now';
  } else if (diffInHours < 24) {
    const hours = Math.floor(diffInHours);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (diffInHours < 168) { // 7 days
    const days = Math.floor(diffInHours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
} 