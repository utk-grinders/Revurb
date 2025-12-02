import { supabase } from './supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api';

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Not authenticated');
  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json'
  };
}

async function request(endpoint, options = {}) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: { ...headers, ...options.headers }
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || 'Request failed');
  }
  
  if (response.status === 204) return null;
  return response.json();
}

export const notesApi = {
  getNearby: (lat, lng) => request(`/notes/nearby?lat=${lat}&lng=${lng}`),
  
  getMine: () => request('/notes/mine'),
  
  getOne: (id) => request(`/notes/${id}`),
  
  create: async (data) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Not authenticated');
    
    const formData = new FormData();
    formData.append('type', data.type);
    formData.append('latitude', data.latitude.toString());
    formData.append('longitude', data.longitude.toString());
    
    if (data.type === 'text') {
      formData.append('content', data.content);
    } else if (data.audio) {
      formData.append('audio', {
        uri: data.audio.uri,
        type: 'audio/m4a',
        name: 'recording.m4a'
      });
    }
    
    const response = await fetch(`${API_URL}/notes`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${session.access_token}` },
      body: formData
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || 'Failed to create note');
    }
    
    return response.json();
  },
  
  delete: (id) => request(`/notes/${id}`, { method: 'DELETE' }),
  
  createReply: async (noteId, data) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Not authenticated');
    
    const formData = new FormData();
    formData.append('type', data.type);
    
    if (data.type === 'text') {
      formData.append('content', data.content);
    } else if (data.audio) {
      formData.append('audio', {
        uri: data.audio.uri,
        type: 'audio/m4a',
        name: 'reply.m4a'
      });
    }
    
    const response = await fetch(`${API_URL}/notes/${noteId}/replies`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${session.access_token}` },
      body: formData
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || 'Failed to create reply');
    }
    
    return response.json();
  }
};

export const settingsApi = {
  get: () => request('/settings'),
  update: (data) => request('/settings', {
    method: 'PUT',
    body: JSON.stringify(data)
  })
};




