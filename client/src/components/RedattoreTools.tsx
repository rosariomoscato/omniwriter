import { useState, useEffect } from 'react';
import { Type, Hash, Share2, MessageCircle, Linkedin, Facebook, Instagram, Twitter, Loader2, Check, Coins } from 'lucide-react';
import { apiService, Chapter, TokenUsage } from '../services/api';
import { useToastNotification } from './Toast';

interface RedattoreToolsProps {
  chapter: Chapter;
  projectArea: string;
}

interface HeadlineOption {
  id: string;
  text: string;
  style: string;
}

interface SocialSnippet {
  id: string;
  text: string;
  characterCount: number;
  hashtags?: string[];
}

interface SocialSnippets {
  twitter: SocialSnippet[];
  linkedin: SocialSnippet[];
  facebook: SocialSnippet[];
  instagram: SocialSnippet[];
}

export default function RedattoreTools({ chapter, projectArea }: RedattoreToolsProps) {
  const toast = useToastNotification();
  const [activeTab, setActiveTab] = useState<'headlines' | 'social'>('headlines');
  const [headlines, setHeadlines] = useState<HeadlineOption[]>([]);
  const [socialSnippets, setSocialSnippets] = useState<SocialSnippets | null>(null);
  const [selectedHeadline, setSelectedHeadline] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<'twitter' | 'linkedin' | 'facebook' | 'instagram'>('twitter');
  const [selectedSnippets, setSelectedSnippets] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [tokenUsage, setTokenUsage] = useState<TokenUsage | null>(null);

  // Check if this is a Redattore project
  const isRedattore = projectArea === 'redattore';

  // Reset state when chapter changes
  useEffect(() => {
    setHeadlines([]);
    setSocialSnippets(null);
    setSelectedHeadline(null);
    setSelectedSnippets({});
    setTokenUsage(null);
  }, [chapter.id]);

  const handleGenerateHeadlines = async () => {
    if (!isRedattore) return;

    setLoading(true);
    try {
      const response = await apiService.generateHeadlines(chapter.id);
      setHeadlines(response.headlines);
      setSelectedHeadline(null);
      setTokenUsage(response.token_usage || null);
      toast.success('Headline options generated!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate headlines');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSocialSnippets = async () => {
    if (!isRedattore) return;

    setLoading(true);
    try {
      const response = await apiService.generateSocialSnippets(chapter.id);
      setSocialSnippets(response.snippets);
      setSelectedSnippets({});
      setTokenUsage(response.token_usage || null);
      toast.success('Social media snippets generated!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate social snippets');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectHeadline = async (headline: HeadlineOption) => {
    try {
      await apiService.updateChapter(chapter.id, { title: headline.text });
      setSelectedHeadline(headline.id);
      toast.success('Headline applied successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to apply headline');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setSelectedSnippets({ ...selectedSnippets, [id]: text });
    toast.success('Copied to clipboard!');
    setTimeout(() => {
      setSelectedSnippets(prev => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
    }, 2000);
  };

  const getCharacterCountColor = (count: number, max: number) => {
    const percentage = (count / max) * 100;
    if (percentage > 90) return 'text-red-600 dark:text-red-400';
    if (percentage > 75) return 'text-orange-600 dark:text-orange-400';
    return 'text-green-600 dark:text-green-400';
  };

  if (!isRedattore) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Type className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Strumenti Redattore
          </h2>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('headlines')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'headlines'
              ? 'border-b-2 border-rose-500 text-rose-600 dark:text-rose-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          <span className="flex items-center gap-2">
            <Type className="w-4 h-4" />
            Headline Options
          </span>
        </button>
        <button
          onClick={() => setActiveTab('social')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'social'
              ? 'border-b-2 border-rose-500 text-rose-600 dark:text-rose-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          <span className="flex items-center gap-2">
            <Share2 className="w-4 h-4" />
            Social Snippets
          </span>
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'headlines' && (
          <div>
            {headlines.length === 0 ? (
              <div className="text-center py-8">
                <Type className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Generate multiple headline options for your article
                </p>
                <button
                  onClick={handleGenerateHeadlines}
                  disabled={loading}
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors inline-flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Type className="w-4 h-4" />
                      Generate Headlines
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    Headline Options
                  </h3>
                  <button
                    onClick={handleGenerateHeadlines}
                    disabled={loading}
                    className="text-sm text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 disabled:text-gray-400 font-medium"
                  >
                    Regenerate
                  </button>
                </div>

                {/* Token Usage Display (Feature #156) */}
                {tokenUsage && headlines.length > 0 && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-900">
                    <div className="flex items-center gap-2 mb-2">
                      <Coins className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                        Token Usage
                      </span>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Input Tokens:</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {tokenUsage.tokens_input.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Output Tokens:</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {tokenUsage.tokens_output.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between pt-1.5 border-t border-blue-200 dark:border-blue-900">
                        <span className="text-gray-900 dark:text-gray-100 font-medium">Total Tokens:</span>
                        <span className="text-blue-600 dark:text-blue-400 font-bold">
                          {tokenUsage.total_tokens.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between pt-1.5 border-t border-blue-200 dark:border-blue-900">
                        <span className="text-gray-600 dark:text-gray-400">Estimated Cost:</span>
                        <span className="font-medium text-green-600 dark:text-green-400">
                          ${tokenUsage.estimated_cost.toFixed(4)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {headlines.map((headline) => (
                  <div
                    key={headline.id}
                    className={`p-4 rounded-lg border-2 transition-all cursor-pointer hover:border-rose-400 ${
                      selectedHeadline === headline.id
                        ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                    onClick={() => handleSelectHeadline(headline)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                          {headline.text}
                        </p>
                        <span className="text-xs text-gray-600 dark:text-gray-400 inline-block px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
                          {headline.style}
                        </span>
                      </div>
                      {selectedHeadline === headline.id && (
                        <div className="flex-shrink-0">
                          <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center">
                            <Check className="w-4 h-4" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'social' && (
          <div>
            {socialSnippets === null ? (
              <div className="text-center py-8">
                <Share2 className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Generate social media snippets for different platforms
                </p>
                <button
                  onClick={handleGenerateSocialSnippets}
                  disabled={loading}
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors inline-flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4" />
                      Generate Social Snippets
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Platform selector tabs */}
                <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 pb-3">
                  <button
                    onClick={() => setSelectedPlatform('twitter')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                      selectedPlatform === 'twitter'
                        ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Twitter className="w-4 h-4" />
                    Twitter/X
                  </button>
                  <button
                    onClick={() => setSelectedPlatform('linkedin')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                      selectedPlatform === 'linkedin'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Linkedin className="w-4 h-4" />
                    LinkedIn
                  </button>
                  <button
                    onClick={() => setSelectedPlatform('facebook')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                      selectedPlatform === 'facebook'
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Facebook className="w-4 h-4" />
                    Facebook
                  </button>
                  <button
                    onClick={() => setSelectedPlatform('instagram')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                      selectedPlatform === 'instagram'
                        ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Instagram className="w-4 h-4" />
                    Instagram
                  </button>
                </div>

                {/* Snippets for selected platform */}
                <div className="space-y-3">
                  {socialSnippets[selectedPlatform]?.map((snippet) => (
                    <div
                      key={snippet.id}
                      className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1">
                          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                            {snippet.text}
                          </p>
                        </div>
                        <button
                          onClick={() => copyToClipboard(snippet.text, snippet.id)}
                          className="flex-shrink-0 p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          title="Copy to clipboard"
                        >
                          {selectedSnippets[snippet.id] ? (
                            <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                          ) : (
                            <MessageCircle className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          {/* Character count */}
                          <span className={getCharacterCountColor(snippet.characterCount, selectedPlatform === 'twitter' ? 280 : selectedPlatform === 'instagram' ? 2200 : selectedPlatform === 'linkedin' ? 3000 : 63206)}>
                            {snippet.characterCount} / {selectedPlatform === 'twitter' ? '280' : selectedPlatform === 'instagram' ? '2200' : selectedPlatform === 'linkedin' ? '3000' : '63206'} chars
                          </span>
                          {/* Hashtags */}
                          {snippet.hashtags && snippet.hashtags.length > 0 && (
                            <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                              <Hash className="w-3 h-3" />
                              <span>{snippet.hashtags.join(', ')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Token Usage Display (Feature #156) */}
                {tokenUsage && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-900">
                    <div className="flex items-center gap-2 mb-2">
                      <Coins className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                        Token Usage
                      </span>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Input Tokens:</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {tokenUsage.tokens_input.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Output Tokens:</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {tokenUsage.tokens_output.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between pt-1.5 border-t border-blue-200 dark:border-blue-900">
                        <span className="text-gray-900 dark:text-gray-100 font-medium">Total Tokens:</span>
                        <span className="text-blue-600 dark:text-blue-400 font-bold">
                          {tokenUsage.total_tokens.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between pt-1.5 border-t border-blue-200 dark:border-blue-900">
                        <span className="text-gray-600 dark:text-gray-400">Estimated Cost:</span>
                        <span className="font-medium text-green-600 dark:text-green-400">
                          ${tokenUsage.estimated_cost.toFixed(4)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Platform info */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <Hash className="w-4 h-4 flex-shrink-0" />
                    <div>
                      <p className="font-medium mb-1">Platform character limits:</p>
                      <ul className="space-y-0.5">
                        <li>• <strong>Twitter/X:</strong> 280 characters</li>
                        <li>• <strong>LinkedIn:</strong> 3,000 characters</li>
                        <li>• <strong>Facebook:</strong> 63,206 characters</li>
                        <li>• <strong>Instagram:</strong> 2,200 characters</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
