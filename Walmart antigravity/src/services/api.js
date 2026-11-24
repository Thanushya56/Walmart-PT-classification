// src/services/api.js
// Client API Service for Streamlined Image + PT Classification

let currentUserId = localStorage.getItem('walmart_pt_user_id') || 'usr_admin_001';
let currentWorkspaceId = localStorage.getItem('walmart_pt_ws_id') || 'ws_walmart_main';

export function getCurrentUserId() {
  return currentUserId;
}

export function setCurrentUserId(userId) {
  currentUserId = userId;
  localStorage.setItem('walmart_pt_user_id', userId);
}

export function getCurrentWorkspaceId() {
  return currentWorkspaceId;
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'x-user-id': currentUserId,
    'x-workspace-id': currentWorkspaceId,
    ...options.headers,
  };

  const response = await fetch(path, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `HTTP error ${response.status}`);
  }

  return data;
}

export const api = {
  // Auth
  async getMe() {
    return request('/api/auth/me');
  },

  async loginWithGmail(email, full_name, avatar_url) {
    const res = await request('/api/auth/login-gmail', {
      method: 'POST',
      body: JSON.stringify({ email, full_name, avatar_url }),
    });
    if (res.user?.id) {
      setCurrentUserId(res.user.id);
    }
    return res;
  },

  async updateProfile(data) {
    return request('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async switchUser(userId) {
    const res = await request('/api/auth/switch', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
    setCurrentUserId(userId);
    return res;
  },

  // Simple Upload (Image + Walmart PT only)
  async uploadImage(payload) {
    return request('/api/upload', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Images list
  async getImages(params = {}) {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.pt) query.append('pt', params.pt);
    if (params.category) query.append('category', params.category);
    return request(`/api/images?${query.toString()}`);
  },

  async updateImagePt(imageId, ptName) {
    return request(`/api/images/${imageId}/pt`, {
      method: 'PATCH',
      body: JSON.stringify({ ptName }),
    });
  },

  async deleteImage(imageId) {
    return request(`/api/images/${imageId}`, {
      method: 'DELETE',
    });
  },

  // Automatic PT Groups with Creator Tracking
  async getPtGroups() {
    return request('/api/pt-groups');
  },

  async renamePtGroup(oldPtName, newPtName) {
    return request('/api/pt-groups/rename', {
      method: 'PATCH',
      body: JSON.stringify({ oldPtName, newPtName }),
    });
  },

  async deletePtGroup(ptName) {
    return request(`/api/pt-groups/${encodeURIComponent(ptName)}`, {
      method: 'DELETE',
    });
  },

  // Smart Image Search (Ctrl + V Image paste)
  async searchByImage(imageData) {
    return request('/api/smart-search/image', {
      method: 'POST',
      body: JSON.stringify({ imageData }),
    });
  },

  // Walmart Taxonomy Autocomplete
  async searchTaxonomy(q = '', category = '') {
    const query = new URLSearchParams({ q, category });
    return request(`/api/taxonomy/search?${query.toString()}`);
  },

  async getCategories() {
    return request('/api/taxonomy/categories');
  },

  // Team Management & Invitations
  async getMembers() {
    return request('/api/members');
  },

  async updateMemberRole(memberId, role) {
    return request(`/api/members/${memberId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  },

  async removeMember(memberId) {
    return request(`/api/members/${memberId}`, {
      method: 'DELETE',
    });
  },

  async getInvitations() {
    return request('/api/invitations');
  },

  async sendInvitation(email, role) {
    return request('/api/invitations/send', {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    });
  },

  async verifyInvitation(workspaceId, email, token) {
    return request(`/api/invitations/verify?workspaceId=${encodeURIComponent(workspaceId)}&email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`);
  },

  async acceptInvitation(workspaceId, email, token, profileData = {}) {
    const res = await request('/api/invitations/accept', {
      method: 'POST',
      body: JSON.stringify({
        workspaceId,
        email,
        token,
        full_name: profileData.full_name || profileData.fullName,
        avatar_url: profileData.avatar_url || profileData.avatarUrl,
      }),
    });
    if (res.user?.id) {
      setCurrentUserId(res.user.id);
    }
    return res;
  },

  async cancelInvitation(invitationId) {
    return request(`/api/invitations/${invitationId}/cancel`, {
      method: 'POST',
    });
  },

  async resendInvitation(invitationId) {
    return request(`/api/invitations/${invitationId}/resend`, {
      method: 'POST',
    });
  },

  // Team Activity Logs
  async getActivityLogs() {
    return request('/api/activity-logs');
  },

  // Workspace Stats
  async getWorkspaceStats() {
    return request('/api/workspace/stats');
  },

  // Legacy mappings
  async getProducts(params = {}) {
    return this.getImages(params);
  },
  async createProduct(data) {
    return this.uploadImage({ image: data.images?.[0]?.url || data.image, ptName: data.ptName });
  },
  async updateProduct(id, data) {
    return this.updateImagePt(id, data.ptName);
  },
  async deleteProduct(id) {
    return this.deleteImage(id);
  },
};
