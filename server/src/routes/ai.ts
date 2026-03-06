// @ts-nocheck
import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Available AI models configuration
const AI_MODELS = {
  openai: {
    provider: 'OpenAI',
    models: [
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        description: 'Fast and intelligent, great for most tasks',
        provider: 'OpenAI',
        tier: 'user',
        features: ['fast', 'creative', 'analytical']
      },
      {
        id: 'gpt-4',
        name: 'GPT-4',
        description: 'Most capable model for complex tasks',
        provider: 'OpenAI',
        tier: 'user',
        features: ['creative', 'analytical', 'detailed']
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        description: 'Fast and cost-effective for simple tasks',
        provider: 'OpenAI',
        tier: 'user',
        features: ['fast', 'efficient']
      }
    ]
  },
  anthropic: {
    provider: 'Anthropic',
    models: [
      {
        id: 'claude-3-opus',
        name: 'Claude 3 Opus',
        description: 'Most powerful model for complex writing',
        provider: 'Anthropic',
        tier: 'user',
        features: ['creative', 'nuanced', 'long-context']
      },
      {
        id: 'claude-3-sonnet',
        name: 'Claude 3 Sonnet',
        description: 'Balanced performance and speed',
        provider: 'Anthropic',
        tier: 'user',
        features: ['balanced', 'intelligent']
      },
      {
        id: 'claude-3-haiku',
        name: 'Claude 3 Haiku',
        description: 'Fastest model for quick generation',
        provider: 'Anthropic',
        tier: 'user',
        features: ['fast', 'efficient']
      }
    ]
  }
};

// GET /api/ai/models
// Get available AI models
router.get('/models', (req, res: Response) => {
  try {
    // Flatten all models into a single array
    const allModels = Object.values(AI_MODELS).flatMap(provider => provider.models);

    console.log('[AI] Returning available models:', allModels.length);
    res.json({
      models: allModels,
      count: allModels.length
    });
  } catch (error) {
    console.error('[AI] Get models error:', error);
    res.status(500).json({ message: 'Failed to fetch AI models' });
  }
});

// GET /api/ai/models/:id
// Get details for a specific model
router.get('/models/:id', (req, res: Response) => {
  try {
    const { id } = req.params;

    // Find the model
    const allModels = Object.values(AI_MODELS).flatMap(provider => provider.models);
    const model = allModels.find(m => m.id === id);

    if (!model) {
      return res.status(404).json({ message: 'Model not found' });
    }

    console.log('[AI] Returning model details:', id);
    res.json({ model });
  } catch (error) {
    console.error('[AI] Get model error:', error);
    res.status(500).json({ message: 'Failed to fetch model details' });
  }
});

export default router;
