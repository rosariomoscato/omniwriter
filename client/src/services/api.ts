const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

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

export interface ChapterVersion {
  id: string;
  chapter_id: string;
  content: string;
  version_number: number;
  created_at: string;
  change_description: string;
}

export interface Source {
  id: string;
  project_id: string | null;
  saga_id: string | null;
  user_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  content_text: string;
  source_type: 'upload' | 'web_search';
  url: string | null;
  tags_json: string;
  relevance_score: number;
  created_at: string;
}

export interface Character {
  id: string;
  project_id: string;
  saga_id: string | null;
  name: string;
  description: string;
  traits: string;
  backstory: string;
  role_in_story: string;
  relationships_json: string;
  extracted_from_upload: number;
  created_at: string;
  updated_at: string;
}

export interface CreateCharacterData {
  name: string;
  description?: string;
  traits?: string;
  backstory?: string;
  role_in_story?: string;
  relationships_json?: string;
}

export interface Saga {
  id: string;
  user_id: string;
  title: string;
  description: string;
  area: 'romanziere' | 'saggista' | 'redattore';
  created_at: string;
  updated_at: string;
}

export interface CreateSagaData {
  title: string;
  description?: string;
  area: 'romanziere' | 'saggista' | 'redattore';
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

      // Handle authentication errors
      if (response.status === 401 || response.status === 403) {
        // Clear auth state
        ApiService.clearAuth();

        // Store session expired flag for redirect
        sessionStorage.setItem('sessionExpired', 'true');

        // Throw a specific error that can be caught by components
        const authError = new Error(error.message || 'Session expired');
        (authError as any).isAuthError = true;
        (authError as any).statusCode = response.status;
        throw authError;
      }

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

  async importProject(file: File, options: {
    area: 'romanziere' | 'saggista' | 'redattore';
    genre?: string;
    description?: string;
  }): Promise<{ project: Project; chaptersCreated: number; totalWordCount: number }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('area', options.area);
    if (options.genre) formData.append('genre', options.genre);
    if (options.description) formData.append('description', options.description);

    const token = localStorage.getItem('token');
    const url = `${this.baseUrl}/projects/import`;

    const response = await fetch(url, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
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

  async getChapterVersions(chapterId: string): Promise<{ versions: ChapterVersion[] }> {
    return this.request<{ versions: ChapterVersion[] }>(`/chapters/${chapterId}/versions`);
  }

  async getChapterVersion(chapterId: string, versionId: string): Promise<{ version: ChapterVersion }> {
    return this.request<{ version: ChapterVersion }>(`/chapters/${chapterId}/versions/${versionId}`);
  }

  async restoreChapterVersion(chapterId: string, versionId: string): Promise<{ chapter: Chapter }> {
    return this.request<{ chapter: Chapter }>(`/chapters/${chapterId}/restore/${versionId}`, {
      method: 'POST',
    });
  }

  // Source endpoints
  async getProjectSources(projectId: string): Promise<{ sources: Source[]; count: number }> {
    return this.request<{ sources: Source[]; count: number }>(`/projects/${projectId}/sources`);
  }

  async uploadProjectSource(projectId: string, file: File): Promise<{ source: Source }> {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('token');
    const url = `${this.baseUrl}/projects/${projectId}/sources/upload`;

    const response = await fetch(url, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async deleteSource(sourceId: string): Promise<void> {
    await this.request<void>(`/sources/${sourceId}`, {
      method: 'DELETE',
    });
  }

  // Character endpoints
  async getProjectCharacters(projectId: string): Promise<{ characters: Character[]; count: number }> {
    return this.request<{ characters: Character[]; count: number }>(`/projects/${projectId}/characters`);
  }

  async getCharacter(id: string): Promise<{ character: Character }> {
    return this.request<{ character: Character }>(`/characters/${id}`);
  }

  async createCharacter(projectId: string, data: CreateCharacterData): Promise<{ character: Character }> {
    return this.request<{ character: Character }>(`/projects/${projectId}/characters`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCharacter(id: string, data: Partial<CreateCharacterData>): Promise<{ character: Character }> {
    return this.request<{ character: Character }>(`/characters/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCharacter(id: string): Promise<void> {
    await this.request<void>(`/characters/${id}`, {
      method: 'DELETE',
    });
  }

  // Export endpoints
  async exportProject(projectId: string, format: 'txt' | 'docx' | 'epub' | 'pdf' | 'rtf' = 'txt'): Promise<Blob> {
    const token = localStorage.getItem('token');
    const url = `${this.baseUrl}/projects/${projectId}/export`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ format }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      // Check for premium required error
      if (error.code === 'PREMIUM_REQUIRED') {
        const premiumError = new Error(error.message);
        (premiumError as any).code = 'PREMIUM_REQUIRED';
        throw premiumError;
      }
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.blob();
  }

  async getExportHistory(projectId: string): Promise<{ history: any[] }> {
    return this.request<{ history: any[] }>(`/projects/${projectId}/export/history`);
  }

  // Saga endpoints (premium feature)
  async getSagas(): Promise<{ sagas: Saga[]; count: number }> {
    return this.request<{ sagas: Saga[]; count: number }>('/sagas');
  }

  async getSaga(id: string): Promise<{ saga: Saga }> {
    return this.request<{ saga: Saga }>(`/sagas/${id}`);
  }

  async createSaga(data: CreateSagaData): Promise<{ saga: Saga }> {
    return this.request<{ saga: Saga }>('/sagas', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSaga(id: string, data: Partial<CreateSagaData>): Promise<{ saga: Saga }> {
    return this.request<{ saga: Saga }>(`/sagas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteSaga(id: string): Promise<void> {
    await this.request<void>(`/sagas/${id}`, {
      method: 'DELETE',
    });
  }

  async getSagaProjects(sagaId: string): Promise<{ projects: Project[]; count: number }> {
    return this.request<{ projects: Project[]; count: number }>(`/sagas/${sagaId}/projects`);
  }

  async createSagaProject(sagaId: string, data: CreateProjectData): Promise<{ project: Project }> {
    return this.request<{ project: Project }>(`/sagas/${sagaId}/projects`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // User profile endpoints
  async getUserProfile(): Promise<{ user: {
    id: string;
    email: string;
    name: string;
    bio: string;
    avatar_url: string;
    role: string;
    subscription_status: string;
    subscription_expires_at: string | null;
    preferred_language: string;
    theme_preference: string;
    created_at: string;
    updated_at: string;
    last_login_at: string | null;
  }}> {
    return this.request<{ user: any }>('/users/profile');
  }

  async updateUserProfile(data: {
    name?: string;
    bio?: string;
    avatar_url?: string;
    preferred_language?: 'it' | 'en';
    theme_preference?: 'light' | 'dark';
  }): Promise<{ user: any; message: string }> {
    return this.request<{ user: any; message: string }>('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async changePassword(data: {
    currentPassword: string;
    newPassword: string;
  }): Promise<{ message: string }> {
    return this.request<{ message: string }>('/users/password', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteAccount(password: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/users/account', {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    });
  }

  async getUserPreferences(): Promise<{ preferences: any }> {
    return this.request<{ preferences: any }>('/users/preferences');
  }

  async updateUserPreferences(data: {
    default_ai_model?: string;
    default_quality_setting?: 'speed' | 'balanced' | 'quality';
    dashboard_layout_json?: string;
    keyboard_shortcuts_json?: string;
  }): Promise<{ message: string }> {
    return this.request<{ message: string }>('/users/preferences', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async updateProfile(data: {
    name?: string;
    bio?: string;
    avatar_url?: string;
    preferred_language?: 'it' | 'en';
    theme_preference?: 'light' | 'dark';
  }): Promise<{ user: any }> {
    return this.request<{ user: any }>('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
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
