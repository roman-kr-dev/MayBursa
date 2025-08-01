import type { Intuition, Tag } from '@monorepo/shared-types';

const API_BASE = '/api';

export const api = {
  // Tags
  async getTags(): Promise<Tag[]> {
    const response = await fetch(`${API_BASE}/tags`);
    if (!response.ok) throw new Error('Failed to fetch tags');
    return response.json();
  },

  // Intuitions
  async getIntuitions(params?: {
    search?: string;
    tags?: string[];
    minConfidence?: number;
  }): Promise<Intuition[]> {
    const searchParams = new URLSearchParams();
    
    if (params?.search) {
      searchParams.append('search', params.search);
    }
    
    if (params?.tags && params.tags.length > 0) {
      searchParams.append('tags', params.tags.join(','));
    }
    
    if (params?.minConfidence !== undefined) {
      searchParams.append('minConfidence', params.minConfidence.toString());
    }
    
    const url = `${API_BASE}/intuitions${searchParams.toString() ? `?${searchParams}` : ''}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch intuitions');
    return response.json();
  },

  async getIntuition(id: string): Promise<Intuition> {
    const response = await fetch(`${API_BASE}/intuitions/${id}`);
    if (!response.ok) throw new Error('Failed to fetch intuition');
    return response.json();
  },

  async createIntuition(data: Omit<Intuition, 'id' | 'createdAt' | 'updatedAt'>): Promise<Intuition> {
    const response = await fetch(`${API_BASE}/intuitions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create intuition');
    return response.json();
  },

  async updateIntuition(id: string, data: Partial<Omit<Intuition, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Intuition> {
    const response = await fetch(`${API_BASE}/intuitions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update intuition');
    return response.json();
  },

  async deleteIntuition(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/intuitions/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete intuition');
  },
};