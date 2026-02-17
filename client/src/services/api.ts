// In development, use relative URLs to go through Vite proxy
// In production, use the VITE_API_URL if set
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

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
  tags: string[]; // Array of tag names
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
  human_model_id?: string | null;
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

export interface TokenUsage {
  tokens_input: number;
  tokens_output: number;
  total_tokens: number;
  estimated_cost: number;
}

export interface GenerationLog {
  id: string;
  project_id: string;
  chapter_id?: string;
  model_used: string;
  phase: 'structure' | 'writing' | 'revision';
  tokens_input: number;
  tokens_output: number;
  duration_ms: number;
  status: 'started' | 'completed' | 'failed' | 'cancelled';
  error_message?: string;
  created_at: string;
  token_usage?: TokenUsage;
}

export interface CreateGenerationLogData {
  project_id: string;
  chapter_id?: string;
  model_used: string;
  phase: 'structure' | 'writing' | 'revision';
  tokens_input?: number;
  tokens_output?: number;
  duration_ms?: number;
  status?: 'started' | 'completed' | 'failed' | 'cancelled';
  error_message?: string;
}

export interface AIModel {
  id: string;
  name: string;
  description: string;
  provider: string;
  tier: 'free' | 'premium';
  features: string[];
}

export interface LLMProvider {
  id: string;
  provider_type: 'openai' | 'anthropic' | 'google_gemini' | 'open_router' | 'requesty' | 'custom';
  display_name: string;
  api_base_url: string | null;
  additional_config_json?: string;
  additional_config?: Record<string, unknown>;
  is_active: number;
  connection_status: 'not_tested' | 'connected' | 'failed';
  last_test_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateLLMProviderData {
  provider_type: 'openai' | 'anthropic' | 'google_gemini' | 'open_router' | 'requesty' | 'custom';
  display_name: string;
  api_key: string;
  api_base_url?: string;
  additional_config?: Record<string, unknown>;
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

export interface ChapterComment {
  id: string;
  chapter_id: string;
  text: string;
  start_pos: number;
  end_pos: number;
  created_at: string;
  updated_at: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
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
  tags: string[]; // Parsed tags for easier use
  relevance_score: number;
  created_at: string;
  project_title?: string; // For displaying associated project name
  project_area?: string; // For displaying project area
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

export interface Location {
  id: string;
  project_id: string;
  saga_id: string | null;
  name: string;
  description: string;
  significance: string;
  extracted_from_upload: number;
  created_at: string;
  updated_at: string;
}

export interface CreateLocationData {
  name: string;
  description?: string;
  significance?: string;
}

export interface PlotEvent {
  id: string;
  project_id: string;
  saga_id: string | null;
  title: string;
  description: string;
  chapter_id: string | null;
  order_index: number;
  event_type: string;
  extracted_from_upload: number;
  created_at: string;
  updated_at: string;
}

export interface CreatePlotEventData {
  title: string;
  description?: string;
  chapter_id?: string;
  event_type?: string;
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
  private maxRetries = 3;
  private retryDelay = 1000; // 1 second

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount = 0,
    signal?: AbortSignal
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const token = localStorage.getItem('token');

    // Don't set Content-Type for FormData - let the browser set it with correct boundary
    const isFormData = options.body instanceof FormData;

    const headers: Record<string, string> = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let response: Response;

    try {
      response = await fetch(url, {
        ...options,
        headers,
        signal, // Pass abort signal to fetch
      });
    } catch (error) {
      // Check if request was aborted
      if (error instanceof Error && error.name === 'AbortError') {
        throw error; // Re-throw abort error directly
      }

      // Network error (TypeError indicates connection failure)
      if (error instanceof TypeError && retryCount < this.maxRetries) {
        console.warn(`[API] Network error, retrying... (${retryCount + 1}/${this.maxRetries})`);
        await this.delay(this.retryDelay * (retryCount + 1));
        return this.request<T>(endpoint, options, retryCount + 1, signal);
      }

      // Final retry failed or non-network error
      const networkError = new Error('Network connection failed. Please check your internet connection.');
      (networkError as any).isNetworkError = true;
      (networkError as any).retryable = retryCount < this.maxRetries;
      (networkError as any).originalError = error;
      throw networkError;
    }

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

      // Don't retry client errors (4xx) except 408 Request Timeout
      if (response.status >= 400 && response.status < 500 && response.status !== 408) {
        throw new Error(error.message || `HTTP ${response.status}`);
      }

      // Retry server errors (5xx) or 408
      if (retryCount < this.maxRetries && (response.status >= 500 || response.status === 408)) {
        console.warn(`[API] Server error ${response.status}, retrying... (${retryCount + 1}/${this.maxRetries})`);
        await this.delay(this.retryDelay * (retryCount + 1));
        return this.request<T>(endpoint, options, retryCount + 1, signal);
      }

      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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
  async getProjects(params?: {
    area?: string;
    status?: string;
    search?: string;
    sort?: string;
    tag?: string;
    page?: number;
    limit?: number;
  }, signal?: AbortSignal): Promise<{ projects: Project[]; pagination: { page: number; limit: number; total: number; totalPages: number; hasMore: boolean } }> {
    const queryParams = new URLSearchParams();
    if (params?.area) queryParams.append('area', params.area);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.sort) queryParams.append('sort', params.sort);
    if (params?.tag) queryParams.append('tag', params.tag);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const queryString = queryParams.toString();
    return this.request<{ projects: Project[]; pagination: { page: number; limit: number; total: number; totalPages: number; hasMore: boolean } }>(`/projects${queryString ? `?${queryString}` : ''}`, {}, 0, signal);
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

  async updateProject(id: string, data: Partial<CreateProjectData & { status?: 'draft' | 'in_progress' | 'completed' | 'archived' }>): Promise<{ project: Project }> {
    return this.request<{ project: Project }>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async archiveProject(id: string): Promise<{ project: Project }> {
    return this.request<{ project: Project }>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'archived' }),
    });
  }

  async unarchiveProject(id: string): Promise<{ project: Project }> {
    return this.request<{ project: Project }>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'draft' }),
    });
  }

  async deleteProject(id: string): Promise<void> {
    await this.request<void>(`/projects/${id}`, {
      method: 'DELETE',
    });
  }

  async duplicateProject(id: string): Promise<{ project: Project }> {
    return this.request<{ project: Project }>(`/projects/${id}/duplicate`, {
      method: 'POST',
    });
  }

  // Citation methods
  async getProjectCitations(projectId: string): Promise<{ citations: any[]; count: number }> {
    return this.request<{ citations: any[]; count: number }>(`/projects/${projectId}/citations`);
  }

  async createCitation(projectId: string, data: {
    title: string;
    authors?: string;
    publication_year?: string;
    publisher?: string;
    url?: string;
    page_numbers?: string;
    citation_type?: 'book' | 'journal' | 'website' | 'report' | 'other';
    notes?: string;
  }): Promise<{ citation: any }> {
    return this.request<{ citation: any }>(`/projects/${projectId}/citations`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCitation(citationId: string, data: {
    title?: string;
    authors?: string;
    publication_year?: string;
    publisher?: string;
    url?: string;
    page_numbers?: string;
    citation_type?: 'book' | 'journal' | 'website' | 'report' | 'other';
    notes?: string;
  }): Promise<{ citation: any }> {
    return this.request<{ citation: any }>(`/citations/${citationId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCitation(citationId: string): Promise<void> {
    await this.request<void>(`/citations/${citationId}`, {
      method: 'DELETE',
    });
  }

  async importProject(file: File, options: {
    area: 'romanziere' | 'saggista' | 'redattore';
    genre?: string;
    description?: string;
  }): Promise<{ project: Project; chaptersCreated: number; totalWordCount: number; message: string; renamed?: boolean; originalTitle?: string; finalTitle?: string }> {
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

  async analyzeHumanModel(id: string, language?: string): Promise<{ message: string; status: string }> {
    return this.request<{ message: string; status: string }>(`/human-models/${id}/analyze`, {
      method: 'POST',
      body: JSON.stringify({ language: language || 'it' }),
    });
  }

  async getHumanModelAnalysis(id: string): Promise<{ status: string; analysis: Record<string, unknown> }> {
    return this.request<{ status: string; analysis: Record<string, unknown> }>(`/human-models/${id}/analysis`);
  }

  async deleteHumanModelSource(id: string, sourceId: string): Promise<{ message: string; total_word_count: number }> {
    return this.request<{ message: string; total_word_count: number }>(`/human-models/${id}/sources/${sourceId}`, {
      method: 'DELETE',
    });
  }

  async uploadFileToHumanModel(id: string, file: File): Promise<{ source: HumanModelSource; total_word_count: number }> {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('token');
    const url = `${this.baseUrl}/human-models/${id}/upload`;

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

  async updateChapter(id: string, data: { title?: string; content?: string; status?: string; expected_updated_at?: string }): Promise<{ chapter: Chapter }> {
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

  // Chapter comments
  async getChapterComments(chapterId: string): Promise<{ comments: ChapterComment[] }> {
    return this.request<{ comments: ChapterComment[] }>(`/chapters/${chapterId}/comments`);
  }

  async createChapterComment(chapterId: string, data: { text: string; start_pos: number; end_pos: number }): Promise<{ comment: ChapterComment }> {
    return this.request<{ comment: ChapterComment }>(`/chapters/${chapterId}/comments`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateChapterComment(commentId: string, text: string): Promise<{ comment: ChapterComment }> {
    return this.request<{ comment: ChapterComment }>(`/chapter-comments/${commentId}`, {
      method: 'PUT',
      body: JSON.stringify({ text }),
    });
  }

  async deleteChapterComment(commentId: string): Promise<void> {
    return this.request<void>(`/chapter-comments/${commentId}`, {
      method: 'DELETE',
    });
  }

  // Redattore headline generation
  async generateHeadlines(chapterId: string): Promise<{
    headlines: Array<{ id: string; text: string; style: string }>;
    token_usage?: TokenUsage;
  }> {
    return this.request<{ headlines: Array<{ id: string; text: string; style: string }>; token_usage?: TokenUsage }>(`/chapters/${chapterId}/generate-headlines`, {
      method: 'POST',
    });
  }

  // Redattore social media snippet generation
  async generateSocialSnippets(chapterId: string): Promise<{
    snippets: {
      twitter: Array<{ id: string; text: string; characterCount: number; hashtags?: string[] }>;
      linkedin: Array<{ id: string; text: string; characterCount: number }>;
      facebook: Array<{ id: string; text: string; characterCount: number }>;
      instagram: Array<{ id: string; text: string; characterCount: number; hashtags?: string[] }>;
    };
    token_usage?: TokenUsage;
  }> {
    return this.request<{
      snippets: {
        twitter: Array<{ id: string; text: string; characterCount: number; hashtags?: string[] }>;
        linkedin: Array<{ id: string; text: string; characterCount: number }>;
        facebook: Array<{ id: string; text: string; characterCount: number }>;
        instagram: Array<{ id: string; text: string; characterCount: number; hashtags?: string[] }>;
      };
      token_usage?: TokenUsage;
    }>(`/chapters/${chapterId}/generate-social-snippets`, {
      method: 'POST',
    });
  }

  // Generate chapter content with and without Human Model for comparison
  async generateChapterComparison(chapterId: string, humanModelId: string | null, promptContext?: string): Promise<{
    chapter_id: string;
    human_model: {
      id: string;
      name: string;
      style_strength: number;
      analysis: any;
    } | null;
    baseline: {
      content: string;
      word_count: number;
      generated_at: string;
    };
    styled: {
      content: string;
      word_count: number;
      generated_at: string;
    } | null;
    differences: {
      word_count_change: number;
      percentage_change: number;
      style_elements_applied: Array<{
        element: string;
        description: string;
      }>;
    } | null;
  }> {
    return this.request<{
      chapter_id: string;
      human_model: {
        id: string;
        name: string;
        style_strength: number;
        analysis: any;
      } | null;
      baseline: {
        content: string;
        word_count: number;
        generated_at: string;
      };
      styled: {
        content: string;
        word_count: number;
        generated_at: string;
      } | null;
      differences: {
        word_count_change: number;
        percentage_change: number;
        style_elements_applied: Array<{
          element: string;
          description: string;
        }>;
      } | null;
    }>(`/chapters/${chapterId}/generate-with-comparison`, {
      method: 'POST',
      body: JSON.stringify({
        human_model_id: humanModelId,
        prompt_context: promptContext
      }),
    });
  }

  // Regenerate a single chapter (Feature #178)
  async regenerateChapter(chapterId: string, humanModelId?: string, promptContext?: string): Promise<{
    chapter: Chapter;
    message: string;
    regenerated_chapter_id: string;
    other_chapters_unchanged: Array<{ id: string; title: string; order_index: number }>;
    token_usage?: TokenUsage;
  }> {
    return this.request<{
      chapter: Chapter;
      message: string;
      regenerated_chapter_id: string;
      other_chapters_unchanged: Array<{ id: string; title: string; order_index: number }>;
      token_usage?: TokenUsage;
    }>(`/chapters/${chapterId}/regenerate`, {
      method: 'POST',
      body: JSON.stringify({
        human_model_id: humanModelId || null,
        prompt_context: promptContext || ''
      }),
    });
  }

  // Generate chapter with SSE streaming (Feature #232)
  generateChapterStream(
    chapterId: string,
    options?: {
      human_model_id?: string;
      prompt_context?: string;
    },
    callbacks?: {
      onPhase?: (phase: string, message: string) => void;
      onDelta?: (content: string) => void;
      onDone?: (data: { message: string; word_count: number; chapter_id?: string; warning?: string }) => void;
      onError?: (error: string) => void;
    }
  ): { abort: () => void; promise: Promise<void> } {
    const token = localStorage.getItem('token');
    const url = `${this.baseUrl}/chapters/${chapterId}/generate-stream`;

    const controller = new AbortController();

    const promise = (async () => {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'Accept': 'text/event-stream',
          },
          body: JSON.stringify({
            human_model_id: options?.human_model_id || null,
            prompt_context: options?.prompt_context || '',
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({ message: 'Network error' }));
          throw new Error(error.message || `HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body');
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE events
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          let eventType = '';
          for (const line of lines) {
            if (line.startsWith('event: ')) {
              eventType = line.substring(7);
            } else if (line.startsWith('data: ')) {
              const data = JSON.parse(line.substring(6));

              switch (eventType) {
                case 'phase':
                  callbacks?.onPhase?.(data.phase, data.message);
                  break;
                case 'delta':
                  callbacks?.onDelta?.(data.content);
                  break;
                case 'done':
                  callbacks?.onDone?.(data);
                  break;
                case 'error':
                  callbacks?.onError?.(data.message);
                  break;
              }

              eventType = ''; // Reset for next event
            }
          }
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          // User cancelled - this is expected
          console.log('[Generate] Generation cancelled by user');
        } else {
          callbacks?.onError?.(error.message || 'Unknown error');
        }
      }
    })();

    return {
      abort: () => controller.abort(),
      promise,
    };
  }

  // Source endpoints
  async getAllSources(): Promise<{ sources: Source[]; count: number }> {
    return this.request<{ sources: Source[]; count: number }>('/sources');
  }

  async getProjectSources(projectId: string): Promise<{ sources: Source[]; count: number }> {
    return this.request<{ sources: Source[]; count: number }>(`/projects/${projectId}/sources`);
  }

  async uploadStandaloneSource(file: File): Promise<{ source: Source }> {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('token');
    const url = `${this.baseUrl}/sources/upload`;

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

  async updateSourceTags(sourceId: string, tags: string[]): Promise<{ source: Source }> {
    return this.request<{ source: Source }>(`/sources/${sourceId}/tags`, {
      method: 'PUT',
      body: JSON.stringify({ tags }),
    });
  }

  async linkSourceToProject(sourceId: string, projectId: string): Promise<{ source: Source }> {
    return this.request<{ source: Source }>(`/sources/${sourceId}/project`, {
      method: 'PUT',
      body: JSON.stringify({ projectId }),
    });
  }

  async unlinkSourceFromProject(sourceId: string): Promise<{ message: string; sourceId: string }> {
    return this.request<{ message: string; sourceId: string }>(`/sources/${sourceId}/project`, {
      method: 'DELETE',
    });
  }

  async getSourceTags(): Promise<{ tags: string[] }> {
    return this.request<{ tags: string[] }>('/sources/tags');
  }

  async deleteTag(tagName: string): Promise<{ message: string; tagName: string; updatedCount: number }> {
    return this.request<{ message: string; tagName: string; updatedCount: number }>(`/sources/tags/${encodeURIComponent(tagName)}`, {
      method: 'DELETE',
    });
  }

  async saveWebSearchResult(data: {
    projectId: string;
    url: string;
    title: string;
    content?: string;
    tags?: string[];
  }): Promise<{ source: Source }> {
    return this.request<{ source: Source }>('/sources/web-search', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async analyzeNovel(projectId: string, file: File, language: 'it' | 'en' = 'it'): Promise<{
    message: string;
    extracted: {
      characters: number;
      locations: number;
      plotEvents: number;
    };
  }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('language', language);
    return this.request<{
      message: string;
      extracted: { characters: number; locations: number; plotEvents: number };
    }>(`/projects/${projectId}/analyze-novel`, {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set Content-Type for FormData
    });
  }

  async generateOutline(projectId: string): Promise<{
    message: string;
    outline: {
      genre: string;
      tone: string;
      total_chapters: number;
      chapters: Array<{ id: string; title: string; summary: string }>;
    };
    created: number;
  }> {
    return this.request<{
      message: string;
      outline: {
        genre: string;
        tone: string;
        total_chapters: number;
        chapters: Array<{ id: string; title: string; summary: string }>;
      };
      created: number;
    }>(`/projects/${projectId}/generate/outline`, {
      method: 'POST',
    });
  }

  // Plot hole detection (Feature #182)
  async detectPlotHoles(projectId: string, language: string = 'it'): Promise<{
    message: string;
    plot_holes: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high';
      description: string;
      chapter_references: string[];
      suggestion: string;
    }>;
    total_issues: number;
  }> {
    return this.request<{
      message: string;
      plot_holes: Array<{
        type: string;
        severity: 'low' | 'medium' | 'high';
        description: string;
        chapter_references: string[];
        suggestion: string;
      }>;
      total_issues: number;
    }>(`/projects/${projectId}/detect-plot-holes`, {
      method: 'POST',
      body: JSON.stringify({ language }),
    });
  }

  // Consistency checker across chapters (Feature #183)
  async checkConsistency(projectId: string, language: string = 'it'): Promise<{
    message: string;
    inconsistencies: Array<{
      type: 'character' | 'location' | 'timeline' | 'description';
      entity_name: string;
      description: string;
      chapter_references: string[];
      suggestion: string;
    }>;
    total_inconsistencies: number;
  }> {
    return this.request<{
      message: string;
      inconsistencies: Array<{
        type: 'character' | 'location' | 'timeline' | 'description';
        entity_name: string;
        description: string;
        chapter_references: string[];
        suggestion: string;
      }>;
      total_inconsistencies: number;
    }>(`/projects/${projectId}/check-consistency`, {
      method: 'POST',
      body: JSON.stringify({ language }),
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

  // Location endpoints
  async getProjectLocations(projectId: string): Promise<{ locations: Location[]; count: number }> {
    return this.request<{ locations: Location[]; count: number }>(`/projects/${projectId}/locations`);
  }

  async getLocation(id: string): Promise<{ location: Location }> {
    return this.request<{ location: Location }>(`/locations/${id}`);
  }

  async createLocation(projectId: string, data: CreateLocationData): Promise<{ location: Location }> {
    return this.request<{ location: Location }>(`/projects/${projectId}/locations`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateLocation(id: string, data: Partial<CreateLocationData>): Promise<{ location: Location }> {
    return this.request<{ location: Location }>(`/locations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteLocation(id: string): Promise<void> {
    await this.request<void>(`/locations/${id}`, {
      method: 'DELETE',
    });
  }

  // Plot Event endpoints
  async getProjectPlotEvents(projectId: string): Promise<{ plotEvents: PlotEvent[]; count: number }> {
    return this.request<{ plotEvents: PlotEvent[]; count: number }>(`/projects/${projectId}/plot-events`);
  }

  async getPlotEvent(id: string): Promise<{ plotEvent: PlotEvent }> {
    return this.request<{ plotEvent: PlotEvent }>(`/plot-events/${id}`);
  }

  async createPlotEvent(projectId: string, data: CreatePlotEventData): Promise<{ plotEvent: PlotEvent }> {
    return this.request<{ plotEvent: PlotEvent }>(`/projects/${projectId}/plot-events`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePlotEvent(id: string, data: Partial<CreatePlotEventData>): Promise<{ plotEvent: PlotEvent }> {
    return this.request<{ plotEvent: PlotEvent }>(`/plot-events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deletePlotEvent(id: string): Promise<void> {
    await this.request<void>(`/plot-events/${id}`, {
      method: 'DELETE',
    });
  }

  // Export endpoints
  async exportProject(projectId: string, options: string | { format: string; metadata?: any; coverImageId?: string }): Promise<Blob> {
    const token = localStorage.getItem('token');
    const url = `${this.baseUrl}/projects/${projectId}/export`;

    // Handle backward compatibility - accept string format or options object
    const bodyOptions = typeof options === 'string'
      ? { format: options }
      : options;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(bodyOptions),
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

  async batchExportChapters(projectId: string, options: { chapterIds: string[]; format: string; metadata?: any; coverImageId?: string }): Promise<Blob> {
    const token = localStorage.getItem('token');
    const url = `${this.baseUrl}/projects/${projectId}/export/batch`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(options),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
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

  async uploadSagaSource(sagaId: string, file: File): Promise<{ source: Source }> {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('token');
    const url = `${this.baseUrl}/sagas/${sagaId}/sources/upload`;

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

  async getSagaSources(sagaId: string): Promise<{ sources: Source[]; count: number }> {
    return this.request<{ sources: Source[]; count: number }>(`/sagas/${sagaId}/sources`);
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

  // Tag endpoints
  async getProjectTags(projectId: string): Promise<{ tags: string[] }> {
    return this.request<{ tags: string[] }>(`/projects/${projectId}/tags`);
  }

  async addProjectTag(projectId: string, tagName: string): Promise<{ tag: string }> {
    return this.request<{ tag: string }>(`/projects/${projectId}/tags`, {
      method: 'POST',
      body: JSON.stringify({ tag_name: tagName }),
    });
  }

  async removeProjectTag(projectId: string, tagName: string): Promise<void> {
    await this.request<void>(`/projects/${projectId}/tags/${encodeURIComponent(tagName)}`, {
      method: 'DELETE',
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

  // Generation log endpoints
  async getProjectGenerationLogs(projectId: string): Promise<{ logs: GenerationLog[]; count: number }> {
    return this.request<{ logs: GenerationLog[]; count: number }>(`/projects/${projectId}/generation-logs`);
  }

  async createGenerationLog(data: CreateGenerationLogData): Promise<{ log: GenerationLog }> {
    return this.request<{ log: GenerationLog }>('/generation-logs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateGenerationLog(logId: string, data: Partial<CreateGenerationLogData>): Promise<{ log: GenerationLog }> {
    return this.request<{ log: GenerationLog }>(`/generation-logs/${logId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // AI Model endpoints (Feature #158)
  async getAIModels(): Promise<{ models: AIModel[]; count: number }> {
    return this.request<{ models: AIModel[]; count: number }>('/ai/models');
  }

  async getAIModel(modelId: string): Promise<{ model: AIModel }> {
    return this.request<{ model: AIModel }>(`/ai/models/${modelId}`);
  }

  // LLM Provider endpoints (Feature #211)
  async getLLMProviders(): Promise<{ providers: LLMProvider[]; count: number }> {
    return this.request<{ providers: LLMProvider[]; count: number }>('/llm-providers');
  }

  async getLLMProvider(id: string): Promise<{ provider: LLMProvider }> {
    return this.request<{ provider: LLMProvider }>(`/llm-providers/${id}`);
  }

  async createLLMProvider(data: CreateLLMProviderData): Promise<{ provider: LLMProvider; message: string }> {
    return this.request<{ provider: LLMProvider; message: string }>('/llm-providers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateLLMProvider(id: string, data: Partial<CreateLLMProviderData & { is_active?: boolean }>): Promise<{ provider: LLMProvider; message: string }> {
    return this.request<{ provider: LLMProvider; message: string }>(`/llm-providers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteLLMProvider(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/llm-providers/${id}`, {
      method: 'DELETE',
    });
  }

  async testLLMProvider(id: string): Promise<{ success: boolean; message: string; connection_status: string }> {
    return this.request<{ success: boolean; message: string; connection_status: string }>(`/llm-providers/${id}/test`, {
      method: 'POST',
    });
  }

  async getLLMProviderModels(id: string): Promise<{ models: string[]; count: number }> {
    return this.request<{ models: string[]; count: number }>(`/llm-providers/${id}/models`);
  }

  async getLLMPreferences(): Promise<{ selected_provider_id: string | null; selected_model_id: string }> {
    return this.request<{ selected_provider_id: string | null; selected_model_id: string }>('/llm-providers/preferences/llm');
  }

  async updateLLMPreferences(data: { selected_provider_id?: string | null; selected_model_id?: string }): Promise<{ message: string; selected_provider_id?: string; selected_model_id?: string }> {
    return this.request<{ message: string; selected_provider_id?: string; selected_model_id?: string }>('/llm-providers/preferences/llm', {
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
