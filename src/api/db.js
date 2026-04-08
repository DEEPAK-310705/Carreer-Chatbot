// Database API helper for CareerBot frontend
// All calls are fire-and-forget friendly — failures are logged, not thrown

const API_BASE = '/api';

// ==================
// Session
// ==================

export const getOrCreateSession = async (sessionId) => {
  try {
    const res = await fetch(`${API_BASE}/users/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
};

export const savePreferences = async (sessionId, preferences) => {
  try {
    const res = await fetch(`${API_BASE}/users/preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, preferences }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
};

export const loadPreferences = async (sessionId) => {
  try {
    const res = await fetch(`${API_BASE}/users/preferences?sessionId=${sessionId}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.preferences;
  } catch {
    return null;
  }
};

// ==================
// Conversations
// ==================

export const listConversations = async (sessionId) => {
  try {
    const res = await fetch(`${API_BASE}/conversations?sessionId=${sessionId}`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
};

export const getConversation = async (conversationId) => {
  try {
    const res = await fetch(`${API_BASE}/conversations/${conversationId}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
};

export const createConversation = async (sessionId, mode, messages = []) => {
  try {
    const res = await fetch(`${API_BASE}/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, mode, messages }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
};

export const updateConversation = async (conversationId, data) => {
  try {
    const res = await fetch(`${API_BASE}/conversations/${conversationId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
};

export const addMessage = async (conversationId, role, content, voice) => {
  try {
    const res = await fetch(`${API_BASE}/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, content, voice }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
};

export const deleteConversation = async (conversationId) => {
  try {
    const res = await fetch(`${API_BASE}/conversations/${conversationId}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch {
    return false;
  }
};

export const deleteAllConversations = async (sessionId) => {
  try {
    const res = await fetch(`${API_BASE}/conversations?sessionId=${sessionId}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch {
    return false;
  }
};

// ==================
// Resume History
// ==================

export const getResumeHistory = async (sessionId) => {
  try {
    const res = await fetch(`${API_BASE}/resume/history?sessionId=${sessionId}`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
};

// ==================
// Health
// ==================

export const checkHealth = async () => {
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
};
