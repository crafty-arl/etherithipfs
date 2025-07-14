export interface Memory {
  id: string;
  userId: string;
  guildId: string;
  title: string;
  description: string;
  category: string;
  privacy: 'public' | 'members_only' | 'private';
  tags: string[];
  status: 'active' | 'archived' | 'deleted';
  fileCount: number;
  createdAt: string;
  updatedAt: string;
  storageKey?: string;
  ipfsCid?: string;
  ipfsUrl?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  contentType?: string;
}

export interface MemoryStats {
  totalMemories: number;
  myMemories: number;
  ourMemories: number;
  categories: Record<string, number>;
  recentActivity: number;
}

export interface MemoryFilters {
  category?: string;
  privacy?: 'public' | 'members_only' | 'private';
  tags?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  search?: string;
}

export interface MemorySearchResult {
  memories: Memory[];
  count: number;
  hasMore: boolean;
  filters?: MemoryFilters;
}

export interface MemoryUploadData {
  fileName: string;
  fileSize: number;
  contentType: string;
  storageKey: string;
  fileBuffer: number[];
}

export interface MemoryCreationData {
  title: string;
  description: string;
  category: string;
  privacy: string;
  tags: string[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string;
} 