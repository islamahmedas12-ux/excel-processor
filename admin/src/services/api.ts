import axios from 'axios';

const TOKEN_KEY = 'excel_admin_token';

const client = axios.create({ baseURL: '/' });

client.interceptors.request.use(config => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.reload();
    }
    return Promise.reject(err);
  },
);

export const TOKEN_STORAGE_KEY = TOKEN_KEY;

export const adminApi = {
  async login(email: string, password: string): Promise<{ token: string; username: string; role: string }> {
    const res = await client.post('/api/v1/auth/admin/login', { email, password });
    return { token: res.data.token, ...res.data.user };
  },

  async getStats(): Promise<any> {
    const res = await client.get('/api/v1/admin/stats');
    return res.data.data;
  },

  async listUsers(): Promise<any[]> {
    const res = await client.get('/api/v1/admin/users');
    return res.data.users ?? [];
  },

  async setUserPlan(email: string, plan: string, months = 1): Promise<void> {
    await client.patch(`/api/v1/admin/users/${encodeURIComponent(email)}/plan`, { plan, months });
  },

  async setUserActive(email: string, active: boolean): Promise<void> {
    await client.patch(`/api/v1/admin/users/${encodeURIComponent(email)}/status`, { active });
  },

  async deleteUser(email: string): Promise<void> {
    await client.delete(`/api/v1/admin/users/${encodeURIComponent(email)}`);
  },

  async listSubscriptions(status?: string): Promise<any[]> {
    const res = await client.get('/api/v1/admin/subscriptions', { params: status ? { status } : {} });
    return res.data.requests ?? [];
  },

  async approveSubscription(id: string): Promise<void> {
    await client.post(`/api/v1/admin/subscriptions/${id}/approve`);
  },

  async rejectSubscription(id: string, notes = ''): Promise<void> {
    await client.post(`/api/v1/admin/subscriptions/${id}/reject`, { notes });
  },

  proofImageUrl(id: string): string {
    const token = localStorage.getItem(TOKEN_KEY) ?? '';
    return `/api/v1/admin/subscriptions/${id}/proof?token=${token}`;
  },

  async listPlans(): Promise<Record<string, any>> {
    const res = await client.get('/api/v1/admin/plans');
    return res.data.plans ?? {};
  },

  async createPlan(id: string, data: Record<string, any>): Promise<void> {
    await client.post('/api/v1/admin/plans', { id, ...data });
  },

  async updatePlan(id: string, data: Record<string, any>): Promise<void> {
    await client.patch(`/api/v1/admin/plans/${encodeURIComponent(id)}`, data);
  },

  async deletePlan(id: string): Promise<void> {
    await client.delete(`/api/v1/admin/plans/${encodeURIComponent(id)}`);
  },
};
