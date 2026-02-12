import { useState, useEffect } from 'react';
import { MessageSquare, X, Edit2, Trash2, User } from 'lucide-react';
import { apiService, ChapterComment } from '../services/api';
import { useToastNotification } from './Toast';

interface CommentsPanelProps {
  chapterId: string;
  content: string;
  highlightedComment: string | null;
  onHighlightComment: (commentId: string | null) => void;
}

interface CommentWithSelection extends ChapterComment {
  selectedText: string;
}

export default function CommentsPanel({
  chapterId,
  content,
  highlightedComment,
  onHighlightComment
}: CommentsPanelProps) {
  const toast = useToastNotification();
  const [comments, setComments] = useState<CommentWithSelection[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  useEffect(() => {
    loadComments();
  }, [chapterId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const response = await apiService.getChapterComments(chapterId);
      const commentsWithText = response.comments.map(comment => ({
        ...comment,
        selectedText: content.substring(comment.start_pos, comment.end_pos)
      }));
      setComments(commentsWithText);
    } catch (error) {
      console.error('Error loading comments:', error);
      toast.showError('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    try {
      await apiService.deleteChapterComment(commentId);
      setComments(comments.filter(c => c.id !== commentId));
      if (highlightedComment === commentId) {
        onHighlightComment(null);
      }
      toast.showSuccess('Comment deleted');
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.showError('Failed to delete comment');
    }
  };

  const handleEdit = (comment: CommentWithSelection) => {
    setEditingComment(comment.id);
    setEditText(comment.text);
  };

  const handleSaveEdit = async (commentId: string) => {
    if (!editText.trim()) {
      toast.showError('Comment text cannot be empty');
      return;
    }

    try {
      const response = await apiService.updateChapterComment(commentId, editText);
      setComments(comments.map(c =>
        c.id === commentId
          ? { ...c, ...response.comment, selectedText: c.selectedText }
          : c
      ));
      setEditingComment(null);
      setEditText('');
      toast.showSuccess('Comment updated');
    } catch (error) {
      console.error('Error updating comment:', error);
      toast.showError('Failed to update comment');
    }
  };

  const handleCancelEdit = () => {
    setEditingComment(null);
    setEditText('');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-teal-500',
      'bg-orange-500',
      'bg-red-500',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  if (loading) {
    return (
      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Comments ({comments.length})
        </h3>
        <button
          onClick={() => onHighlightComment(null)}
          className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          title="Clear highlight"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {comments.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No comments yet</p>
          <p className="text-sm mt-1">Select text in the editor to add a comment</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map(comment => (
            <div
              key={comment.id}
              className={`p-3 rounded-lg border transition-all cursor-pointer ${
                highlightedComment === comment.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
              onClick={() => onHighlightComment(comment.id)}
            >
              <div className="flex items-start gap-3">
                {/* User Avatar */}
                <div className={`w-8 h-8 rounded-full ${getAvatarColor(comment.user_name)} flex items-center justify-center text-white text-xs font-semibold flex-shrink-0`}>
                  {comment.user_avatar ? (
                    <img src={comment.user_avatar} alt={comment.user_name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span>{getUserInitials(comment.user_name)}</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Comment Header */}
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{comment.user_name}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(comment.created_at)}
                    </span>
                  </div>

                  {/* Selected Text */}
                  <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded mb-2 text-sm italic">
                    "{comment.selectedText}"
                  </div>

                  {/* Comment Text */}
                  {editingComment === comment.id ? (
                    <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-y"
                        rows={3}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit(comment.id)}
                          className="px-3 py-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm font-medium"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 text-sm font-medium"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {comment.text}
                    </p>
                  )}

                  {/* Comment Actions */}
                  {editingComment !== comment.id && (
                    <div className="flex gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleEdit(comment)}
                        className="text-gray-500 hover:text-blue-500 dark:hover:text-blue-400"
                        title="Edit comment"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(comment.id)}
                        className="text-gray-500 hover:text-red-500 dark:hover:text-red-400"
                        title="Delete comment"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
