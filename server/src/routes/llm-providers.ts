import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { getDatabase } from '../db/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Encryption key for API keys - uses JWT secret as base
const getEncryptionKey = (): Buffer => {
  const secret = process.env.JWT_SECRET || 'omniwriter-dev-jwt-secret-2024';
  // Derive a 32-byte key using scrypt
  return crypto.scryptSync(secret, 'omniwriter-salt', 32);
};

// Encrypt API key
const encryptApiKey = (apiKey: string): string => {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
};

// Decrypt API key
const decryptApiKey = (encrypted: string): string => {
  const key = getEncryptionKey();
  const parts = encrypted.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted data format');
  }
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedData = parts[1];
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

// Mask API key for display (show only last 4 chars)
const maskApiKey = (apiKey: string): string => {
  if (apiKey.length <= 4) return '****';
  return '*'.repeat(apiKey.length - 4) + apiKey.slice(-4);
};

// Valid provider types (matching schema)
const VALID_PROVIDER_TYPES = ['openai', 'anthropic', 'google_gemini', 'open_router', 'requesty', 'custom'] as const;
type ProviderType = typeof VALID_PROVIDER_TYPES[number];

// Map internal types to API-compatible types
const getApiProviderType = (providerType: ProviderType): 'openai' | 'anthropic' | 'google' | 'openrouter' | 'requesty' | 'custom' => {
  switch (providerType) {
    case 'google_gemini': return 'google';
    case 'open_router': return 'openrouter';
    default: return providerType;
  }
};

// Models cache (5 minute TTL)
const modelsCache = new Map<string, { models: string[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Fetch available models from provider API
const fetchModelsFromProvider = async (
  providerType: ProviderType,
  apiKey: string,
  baseUrl?: string
): Promise<string[]> => {
  const cacheKey = `${providerType}:${maskApiKey(apiKey)}`;
  const cached = modelsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.models;
  }

  const apiType = getApiProviderType(providerType);
  let models: string[] = [];

  try {
    switch (apiType) {
      case 'openai': {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        if (response.ok) {
          const data = await response.json() as { data: Array<{ id: string }> };
          models = data.data
            .map(m => m.id)
            .filter(id => id.startsWith('gpt') || id.startsWith('o1') || id.startsWith('o3'))
            .sort();
        }
        break;
      }

      case 'anthropic': {
        // Anthropic doesn't have a public models endpoint, return hardcoded list
        models = [
          'claude-3-5-sonnet-20241022',
          'claude-3-5-haiku-20241022',
          'claude-3-opus-20240229',
          'claude-3-sonnet-20240229',
          'claude-3-haiku-20240307',
          'claude-2.1',
          'claude-2.0',
          'claude-instant-1.2'
        ];
        break;
      }

      case 'google': {
        // Google Gemini - use generativelanguage API
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`
        );
        if (response.ok) {
          const data = await response.json() as { models: Array<{ name: string }> };
          models = data.models
            .map(m => m.name.replace('models/', ''))
            .filter(name => name.includes('gemini'))
            .sort();
        }
        break;
      }

      case 'openrouter': {
        const response = await fetch('https://openrouter.ai/api/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        if (response.ok) {
          const data = await response.json() as { data: Array<{ id: string }> };
          models = data.data.map(m => m.id).sort();
        }
        break;
      }

      case 'requesty': {
        const response = await fetch('https://router.requesty.ai/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        if (response.ok) {
          const data = await response.json() as { data: Array<{ id: string }> };
          models = data.data.map(m => m.id).sort();
        }
        break;
      }

      case 'custom': {
        if (baseUrl) {
          const response = await fetch(`${baseUrl}/models`, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
          });
          if (response.ok) {
            const data = await response.json() as { data: Array<{ id: string }> };
            models = data.data.map(m => m.id).sort();
          }
        }
        break;
      }
    }
  } catch (error) {
    console.error('[LLMProviders] Error fetching models:', error);
    return [];
  }

  modelsCache.set(cacheKey, { models, timestamp: Date.now() });
  return models;
};

// Test provider connection
const testProviderConnection = async (
  providerType: ProviderType,
  apiKey: string,
  baseUrl?: string
): Promise<{ success: boolean; error?: string }> => {
  const apiType = getApiProviderType(providerType);

  try {
    switch (apiType) {
      case 'openai': {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        if (response.ok) return { success: true };
        const error = await response.json().catch(() => ({})) as { error?: { message?: string } };
        return { success: false, error: error.error?.message || `HTTP ${response.status}` };
      }

      case 'anthropic': {
        // Test with a minimal message request
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 1,
            messages: [{ role: 'user', content: 'Hi' }]
          })
        });
        if (response.ok || response.status === 400) {
          // 400 might be due to minimal tokens, but auth is valid
          return { success: true };
        }
        const error = await response.json().catch(() => ({})) as { error?: { message?: string } };
        return { success: false, error: error.error?.message || `HTTP ${response.status}` };
      }

      case 'google': {
        // Use gemini-2.0-flash as the test model (gemini-pro is deprecated)
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: 'Hi' }] }] })
          }
        );
        if (response.ok) return { success: true };
        const error = await response.json().catch(() => ({})) as { error?: { message?: string } };
        return { success: false, error: error.error?.message || `HTTP ${response.status}` };
      }

      case 'openrouter': {
        const response = await fetch('https://openrouter.ai/api/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        if (response.ok) return { success: true };
        const error = await response.json().catch(() => ({})) as { error?: { message?: string } };
        return { success: false, error: error.error?.message || `HTTP ${response.status}` };
      }

      case 'requesty': {
        const response = await fetch('https://router.requesty.ai/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        if (response.ok) return { success: true };
        const error = await response.json().catch(() => ({})) as { error?: { message?: string } };
        return { success: false, error: error.error?.message || `HTTP ${response.status}` };
      }

      case 'custom': {
        if (!baseUrl) {
          return { success: false, error: 'Base URL is required for custom providers' };
        }
        const response = await fetch(`${baseUrl}/models`, {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        if (response.ok) return { success: true };
        const error = await response.json().catch(() => ({})) as { error?: { message?: string } };
        return { success: false, error: error.error?.message || `HTTP ${response.status}` };
      }

      default:
        return { success: false, error: 'Unknown provider type' };
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// GET /api/llm-providers - List all providers for user
// @ts-expect-error - AuthRequest type compatibility with router
router.get('/llm-providers', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.id;

    const providers = db.prepare(
      `SELECT id, provider_type, display_name, api_base_url, additional_config_json,
              is_active, connection_status, last_test_at, created_at, updated_at
       FROM llm_providers WHERE user_id = ? ORDER BY created_at DESC`
    ).all(userId) as Array<{
      id: string;
      provider_type: string;
      display_name: string;
      api_base_url: string | null;
      additional_config_json: string;
      is_active: number;
      connection_status: string;
      last_test_at: string | null;
      created_at: string;
      updated_at: string;
    }>;

    // Parse JSON fields
    const parsedProviders = providers.map(p => ({
      ...p,
      additional_config: JSON.parse(p.additional_config_json || '{}')
    }));

    console.log('[LLMProviders] Found', providers.length, 'providers for user:', userId);
    res.json({ providers: parsedProviders, count: providers.length });
  } catch (error) {
    console.error('[LLMProviders] List error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/llm-providers/:id - Get single provider
// @ts-expect-error - AuthRequest type compatibility with router
router.get('/llm-providers/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.id;
    const providerId = req.params.id;

    const provider = db.prepare(
      `SELECT id, provider_type, display_name, api_base_url, additional_config_json,
              is_active, connection_status, last_test_at, created_at, updated_at
       FROM llm_providers WHERE id = ? AND user_id = ?`
    ).get(providerId, userId) as {
      id: string;
      provider_type: string;
      display_name: string;
      api_base_url: string | null;
      additional_config_json: string;
      is_active: number;
      connection_status: string;
      last_test_at: string | null;
      created_at: string;
      updated_at: string;
    } | undefined;

    if (!provider) {
      res.status(404).json({ message: 'Provider not found' });
      return;
    }

    res.json({
      provider: {
        ...provider,
        additional_config: JSON.parse(provider.additional_config_json || '{}')
      }
    });
  } catch (error) {
    console.error('[LLMProviders] Get error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/llm-providers - Create new provider
// @ts-expect-error - AuthRequest type compatibility with router
router.post('/llm-providers', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.id;
    const { provider_type, display_name, api_key, api_base_url, additional_config } = req.body;

    // Validation
    if (!provider_type || !VALID_PROVIDER_TYPES.includes(provider_type)) {
      res.status(400).json({ message: 'Invalid provider type. Must be one of: ' + VALID_PROVIDER_TYPES.join(', ') });
      return;
    }

    if (!display_name || display_name.trim().length === 0) {
      res.status(400).json({ message: 'Display name is required' });
      return;
    }

    if (!api_key || api_key.trim().length === 0) {
      res.status(400).json({ message: 'API key is required' });
      return;
    }

    // Custom provider requires api_base_url
    if (provider_type === 'custom' && !api_base_url) {
      res.status(400).json({ message: 'Base URL is required for custom providers' });
      return;
    }

    const providerId = uuidv4();
    const encryptedKey = encryptApiKey(api_key);
    const additionalConfigJson = JSON.stringify(additional_config || {});

    console.log('[LLMProviders] Creating provider:', providerId, 'type:', provider_type, 'for user:', userId);

    db.prepare(
      `INSERT INTO llm_providers (id, user_id, provider_type, display_name, api_key_encrypted, api_base_url, additional_config_json, is_active, connection_status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'not_tested', datetime('now'), datetime('now'))`
    ).run(providerId, userId, provider_type, display_name.trim(), encryptedKey, api_base_url || '', additionalConfigJson);

    const provider = db.prepare(
      `SELECT id, provider_type, display_name, api_base_url, additional_config_json, is_active, connection_status, last_test_at, created_at, updated_at
       FROM llm_providers WHERE id = ?`
    ).get(providerId) as {
      id: string;
      provider_type: string;
      display_name: string;
      api_base_url: string | null;
      additional_config_json: string;
      is_active: number;
      connection_status: string;
      last_test_at: string | null;
      created_at: string;
      updated_at: string;
    };

    console.log('[LLMProviders] Provider created successfully:', providerId);
    res.status(201).json({
      message: 'Provider created successfully',
      provider: {
        ...provider,
        additional_config: JSON.parse(provider.additional_config_json || '{}')
      }
    });
  } catch (error) {
    console.error('[LLMProviders] Create error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /api/llm-providers/:id - Update provider
// @ts-expect-error - AuthRequest type compatibility with router
router.put('/llm-providers/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.id;
    const providerId = req.params.id;
    const { display_name, api_key, api_base_url, additional_config, is_active } = req.body;

    // Check ownership
    const existing = db.prepare('SELECT id FROM llm_providers WHERE id = ? AND user_id = ?').get(providerId, userId);
    if (!existing) {
      res.status(404).json({ message: 'Provider not found' });
      return;
    }

    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (display_name !== undefined) {
      if (display_name.trim().length === 0) {
        res.status(400).json({ message: 'Display name cannot be empty' });
        return;
      }
      updates.push('display_name = ?');
      values.push(display_name.trim());
    }

    if (api_key !== undefined) {
      if (api_key.trim().length === 0) {
        res.status(400).json({ message: 'API key cannot be empty' });
        return;
      }
      updates.push('api_key_encrypted = ?');
      values.push(encryptApiKey(api_key));
      // Reset connection status when API key changes
      updates.push('connection_status = ?');
      values.push('not_tested');
    }

    if (api_base_url !== undefined) {
      updates.push('api_base_url = ?');
      values.push(api_base_url || '');
    }

    if (additional_config !== undefined) {
      updates.push('additional_config_json = ?');
      values.push(JSON.stringify(additional_config));
    }

    if (is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(is_active ? 1 : 0);
    }

    if (updates.length === 0) {
      res.status(400).json({ message: 'No fields to update' });
      return;
    }

    updates.push("updated_at = datetime('now')");
    values.push(providerId);
    values.push(userId || '');

    console.log('[LLMProviders] Updating provider:', providerId);
    db.prepare(`UPDATE llm_providers SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...values);

    const provider = db.prepare(
      `SELECT id, provider_type, display_name, api_base_url, additional_config_json, is_active, connection_status, last_test_at, created_at, updated_at
       FROM llm_providers WHERE id = ?`
    ).get(providerId) as {
      id: string;
      provider_type: string;
      display_name: string;
      api_base_url: string | null;
      additional_config_json: string;
      is_active: number;
      connection_status: string;
      last_test_at: string | null;
      created_at: string;
      updated_at: string;
    };

    console.log('[LLMProviders] Provider updated successfully:', providerId);
    res.json({
      message: 'Provider updated successfully',
      provider: {
        ...provider,
        additional_config: JSON.parse(provider.additional_config_json || '{}')
      }
    });
  } catch (error) {
    console.error('[LLMProviders] Update error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /api/llm-providers/:id - Delete provider
// @ts-expect-error - AuthRequest type compatibility with router
router.delete('/llm-providers/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.id;
    const providerId = req.params.id;

    // Check if this is the active provider
    const prefs = db.prepare('SELECT selected_provider_id FROM user_preferences WHERE user_id = ?').get(userId) as
      { selected_provider_id: string | null } | undefined;

    if (prefs?.selected_provider_id === providerId) {
      res.status(400).json({ message: 'Cannot delete the active provider. Select a different provider first.' });
      return;
    }

    console.log('[LLMProviders] Deleting provider:', providerId, 'for user:', userId);
    const result = db.prepare('DELETE FROM llm_providers WHERE id = ? AND user_id = ?').run(providerId, userId);

    if (result.changes === 0) {
      res.status(404).json({ message: 'Provider not found' });
      return;
    }

    console.log('[LLMProviders] Provider deleted successfully:', providerId);
    res.json({ message: 'Provider deleted successfully' });
  } catch (error) {
    console.error('[LLMProviders] Delete error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/llm-providers/:id/test - Test provider connection
// @ts-expect-error - AuthRequest type compatibility with router
router.post('/llm-providers/:id/test', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.id;
    const providerId = req.params.id;

    const provider = db.prepare(
      'SELECT * FROM llm_providers WHERE id = ? AND user_id = ?'
    ).get(providerId, userId) as {
      id: string;
      provider_type: ProviderType;
      api_key_encrypted: string;
      api_base_url: string | null;
    } | undefined;

    if (!provider) {
      res.status(404).json({ message: 'Provider not found' });
      return;
    }

    console.log('[LLMProviders] Testing connection for provider:', providerId);

    const apiKey = decryptApiKey(provider.api_key_encrypted);
    const result = await testProviderConnection(provider.provider_type, apiKey, provider.api_base_url || undefined);

    const newStatus = result.success ? 'connected' : 'failed';
    db.prepare(
      `UPDATE llm_providers SET connection_status = ?, last_test_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
    ).run(newStatus, providerId);

    if (result.success) {
      console.log('[LLMProviders] Connection test successful for provider:', providerId);
      res.json({ success: true, message: 'Connection successful', connection_status: 'connected' });
    } else {
      console.log('[LLMProviders] Connection test failed for provider:', providerId, '-', result.error);
      res.json({ success: false, message: result.error || 'Connection failed', connection_status: 'failed' });
    }
  } catch (error) {
    console.error('[LLMProviders] Test error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/llm-providers/:id/models - Get available models
// @ts-expect-error - AuthRequest type compatibility with router
router.get('/llm-providers/:id/models', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.id;
    const providerId = req.params.id;

    const provider = db.prepare(
      'SELECT * FROM llm_providers WHERE id = ? AND user_id = ?'
    ).get(providerId, userId) as {
      id: string;
      provider_type: ProviderType;
      api_key_encrypted: string;
      api_base_url: string | null;
    } | undefined;

    if (!provider) {
      res.status(404).json({ message: 'Provider not found' });
      return;
    }

    console.log('[LLMProviders] Fetching models for provider:', providerId);

    const apiKey = decryptApiKey(provider.api_key_encrypted);
    const models = await fetchModelsFromProvider(provider.provider_type, apiKey, provider.api_base_url || undefined);

    console.log('[LLMProviders] Found', models.length, 'models for provider:', providerId);
    res.json({ models, count: models.length });
  } catch (error) {
    console.error('[LLMProviders] Models error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /api/llm-providers/preferences/llm - Save preferred provider and model
// @ts-expect-error - AuthRequest type compatibility with router
router.put('/llm-providers/preferences/llm', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.id;
    const { selected_provider_id, selected_model_id } = req.body;

    // Validate provider exists and belongs to user if specified
    if (selected_provider_id) {
      const provider = db.prepare(
        'SELECT id FROM llm_providers WHERE id = ? AND user_id = ?'
      ).get(selected_provider_id, userId);

      if (!provider) {
        res.status(400).json({ message: 'Invalid provider ID' });
        return;
      }
    }

    // Check if preferences exist
    const existing = db.prepare('SELECT id FROM user_preferences WHERE user_id = ?').get(userId);

    if (existing) {
      db.prepare(
        `UPDATE user_preferences SET selected_provider_id = ?, selected_model_id = ?, updated_at = datetime('now') WHERE user_id = ?`
      ).run(selected_provider_id || null, selected_model_id || '', userId);
    } else {
      const prefId = `pref_${userId}`;
      db.prepare(
        `INSERT INTO user_preferences (id, user_id, selected_provider_id, selected_model_id, updated_at)
         VALUES (?, ?, ?, ?, datetime('now'))`
      ).run(prefId, userId, selected_provider_id || null, selected_model_id || '');
    }

    console.log('[LLMProviders] Updated LLM preferences for user:', userId, { selected_provider_id, selected_model_id });
    res.json({ message: 'LLM preferences updated successfully', selected_provider_id, selected_model_id });
  } catch (error) {
    console.error('[LLMProviders] Preferences update error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/llm-providers/preferences/llm - Get LLM preferences (provider and model)
// @ts-expect-error - AuthRequest type compatibility with router
router.get('/llm-providers/preferences/llm', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.id;

    const prefs = db.prepare(
      'SELECT selected_provider_id, selected_model_id FROM user_preferences WHERE user_id = ?'
    ).get(userId) as { selected_provider_id: string | null; selected_model_id: string | null } | undefined;

    res.json({
      selected_provider_id: prefs?.selected_provider_id || null,
      selected_model_id: prefs?.selected_model_id || ''
    });
  } catch (error) {
    console.error('[LLMProviders] Preferences get error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
