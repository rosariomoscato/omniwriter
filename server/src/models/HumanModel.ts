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

export interface CreateHumanModelInput {
  name: string;
  description?: string;
  model_type: 'romanziere_advanced' | 'saggista_basic' | 'redattore_basic';
  style_strength?: number;
}
