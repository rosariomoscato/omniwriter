const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  user: {
    id: number;
    email: string;
    name: string;
    role: string;
  };
  token: string;
}

export interface Project {
  id: string;
  user_id: string;
  saga_id: string | null;
  title: string;
  description: string;
  area: 'romanziere' | 'saggista' | 'redattore';
  genre: string;
  tone: string;
  target_audience: string;
  pov: string;
  word_count_target: number;
  status: 'draft' | 'in_progress' | 'completed' | 'archived';
  human_model_id: string | null;
  settings_json: string;
  word_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectData {
  title: string;
  description?: string;
  area: 'romanziere' | 'saggista' | 'redattore';
  genre?: string;
  tone?: string;
  target_audience?: string;
  pov?: string;
  word_count_target?: number;
  saga_id?: string;
  settings_json?: string;
}

export interface HumanModel {
  id: string;
  user_id: string;
  name: string;
  description: string;
  model_type: 'romanziere_advanced' | 'saggista_basic' | 'redattore_basic';
  analysis_result_json: string;
  total_word_count: number;
  training_status: 'pending' | 'analyzing' | 'ready' | 'failed';
  style_strength: number;
  created_at: string;
  updated_at: string;
}

export interface HumanModelSource {
  id: string;
  human_model_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  word_count: number;
  uploaded_at: string;
}

export interface CreateHumanModelData {
  name: string;
  description?: string;
  model_type: 'romanziere_advanced' | 'saggista_basic' | 'redattore_basic';
  style_strength?: number;
}

export interface Chapter {
  id: string;
  project_id: string;
  title: string;
  content: string;
  order_index: number;
  status: 'draft' | 'generated' | 'revised' | 'final';
  word_count: number;
  created_at: string;
  updated_at: string;
}

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const token = localStorage.getItem('token');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Auth endpoints
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async logout(): Promise<void> {
    await this.request<void>('/auth/logout', {
      method: 'POST',
    });
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  async getCurrentUser(): Promise<AuthResponse['user']> {
    return this.request<AuthResponse['user']>('/auth/me');
  }

  async forgotPassword(email: string): Promise<void> {
    await this.request<void>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, password: string): Promise<void> {
    await this.request<void>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  }

  // Project endpoints
  async getProjects(params?: { area?: string; status?: string; search?: string; sort?: string }): Promise<{ projects: Project[]; count: number }> {
    const queryParams = new URLSearchParams();
    if (params?.area) queryParams.append('area', params.area);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.sort) queryParams.append('sort', params.sort);

    const queryString = queryParams.toString();
    return this.request<{ projects: Project[]; count: number }>(`/projects${queryString ? `?${queryString}` : ''}`);
  }

  async getProject(id: string): Promise<{ project: Project }> {
    return this.request<{ project: Project }>(`/projects/${id}`);
  }

  async createProject(data: CreateProjectData): Promise<{ project: Project }> {
    return this.request<{ project: Project }>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProject(id: string, data: Partial<CreateProjectData>): Promise<{ project: Project }> {
    return this.request<{ project: Project }>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteProject(id: string): Promise<void> {
    await this.request<void>(`/projects/${id}`, {
      method: 'DELETE',
    });
  }

  // Human Model endpoints
  async getHumanModels(): Promise<{ models: HumanModel[]; count: number }> {
    return this.request<{ models: HumanModel[]; count: number }>('/human-models');
  }

  async getHumanModel(id: string): Promise<{ model: HumanModel; sources: HumanModelSource[] }> {
    return this.request<{ model: HumanModel; sources: HumanModelSource[] }>(`/human-models/${id}`);
  }

  async createHumanModel(data: CreateHumanModelData): Promise<{ model: HumanModel }> {
    return this.request<{ model: HumanModel }>('/human-models', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateHumanModel(id: string, data: Partial<CreateHumanModelData>): Promise<{ model: HumanModel }> {
    return this.request<{ model: HumanModel }>(`/human-models/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteHumanModel(id: string): Promise<void> {
    await this.request<void>(`/human-models/${id}`, {
      method: 'DELETE',
    });
  }

  async uploadToHumanModel(id: string, file_name: string, file_type: string, content_text: string): Promise<{ source: HumanModelSource; total_word_count: number }> {
    return this.request<{ source: HumanModelSource; total_word_count: number }>(`/human-models/${id}/upload`, {
      method: 'POST',
      body: JSON.stringify({ file_name, file_type, content_text }),
    });
  }

  async analyzeHumanModel(id: string): Promise<{ message: string; status: string }> {
    return this.request<{ message: string; status: string }>(`/human-models/${id}/analyze`, {
      method: 'POST',
    });
  }

  async getHumanModelAnalysis(id: string): Promise<{ status: string; analysis: Record<string, unknown> }> {
    return this.request<{ status: string; analysis: Record<string, unknown> }>(`/human-models/${id}/analysis`);
  }

  // Chapter endpoints
  async getProjectChapters(projectId: string): Promise<{ chapters: Chapter[] }> {
    return this.request<{ chapters: Chapter[] }>(`/projects/${projectId}/chapters`);
  }

  async getChapter(id: string): Promise<{ chapter: Chapter }> {
    return this.request<{ chapter: Chapter }>(`/chapters/${id}`);
  }

  async createChapter(projectId: string, data: { title: string }): Promise<{ chapter: Chapter }> {
    return this.request<{ chapter: Chapter }>(`/projects/${projectId}/chapters`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateChapter(id: string, data: { title?: string; content?: string; status?: string }): Promise<{ chapter: Chapter }> {
    return this.request<{ chapter: Chapter }>(`/chapters/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteChapter(id: string): Promise<void> {
    await this.request<void>(`/chapters/${id}`, {
      method: 'DELETE',
    });
  }

  async reorderChapter(id: string, newOrderIndex: number): Promise<void> {
    await this.request<void>(`/chapters/${id}/reorder`, {
      method: 'PUT',
      body: JSON.stringify({ newOrderIndex }),
    });
  }

  // Helper to store auth data
  static setAuth(user: AuthResponse['user'], token: string) {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
  }

  static getAuth(): { user: AuthResponse['user'] | null; token: string | null } {
    const user = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    return {
      user: user ? JSON.parse(user) : null,
      token: token || null,
    };
  }

  static clearAuth() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  }
}

export const apiService = new ApiService();
export { ApiService };
export default ApiService;
