import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Clock,
  Calendar,
  MessageSquare,
  CheckCircle,
  Circle,
  Edit2,
  Trash2,
  Send,
  Check,
} from 'lucide-react';
import type { TicketDetail, TicketStatus } from '../shared/types';
import { formatDateTime, formatRelativeTime } from '../utils/date';
import { getStatusConfig } from '../utils/status';

interface TicketDetailModalProps {
  isOpen: boolean;
  ticket: TicketDetail | null;
  isLoading: boolean;
  onClose: () => void;
  onStatusChange: (status: TicketStatus) => Promise<void>;
  onUpdateDetails: (title: string, description: string) => Promise<void>;
  onAddComment: (text: string) => Promise<void>;
  onDeleteRequest: () => void;
}

export const TicketDetailModal: React.FC<TicketDetailModalProps> = ({
  isOpen,
  ticket,
  isLoading,
  onClose,
  onStatusChange,
  onUpdateDetails,
  onAddComment,
  onDeleteRequest,
}) => {
  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Comment state
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  const commentsEndRef = useRef<HTMLDivElement>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ticket) {
      setEditTitle(ticket.title);
      setEditDescription(ticket.description || '');
      setIsEditing(false);
      setEditError(null);
      setCommentText('');
      setCommentError(null);
    }
  }, [ticket?.id, ticket?.updated_at]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        if (isEditing) {
          setIsEditing(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isEditing, onClose]);

  if (!isOpen) return null;

  const handleSaveEdit = async () => {
    const cleanTitle = editTitle.trim();
    if (!cleanTitle) {
      setEditError('Title cannot be empty');
      return;
    }
    try {
      setIsSavingEdit(true);
      setEditError(null);
      await onUpdateDetails(cleanTitle, editDescription.trim());
      setIsEditing(false);
    } catch (err: any) {
      setEditError(err.message || 'Failed to update ticket');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!ticket) return;
    const nextStatus: TicketStatus = ticket.status === 'Open' ? 'Resolved' : 'Open';
    await onStatusChange(nextStatus);
  };

  const handleAddCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanText = commentText.trim();
    if (!cleanText) {
      setCommentError('Comment cannot be empty');
      return;
    }
    try {
      setIsSubmittingComment(true);
      setCommentError(null);
      await onAddComment(cleanText);
      setCommentText('');
      setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    } catch (err: any) {
      setCommentError(err.message || 'Failed to add comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/45 backdrop-blur-xs transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ticket-detail-title"
    >
      <div className="w-full max-w-3xl max-h-[90vh] bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-semibold px-2 py-1 bg-neutral-200/70 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 rounded tracking-wider">
              {ticket?.key || '...'}
            </span>

            {/* Status Selector Dropdown */}
            {ticket && (
              <div className="relative inline-flex items-center">
                <select
                  value={ticket.status}
                  onChange={(e) => onStatusChange(e.target.value as TicketStatus)}
                  title="Change ticket status"
                  aria-label="Change ticket status"
                  className={`px-2.5 py-1 pr-6 text-xs font-medium rounded-md border transition-all cursor-pointer appearance-none focus:outline-hidden focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white ${
                    getStatusConfig(ticket.status).badgeClass
                  }`}
                >
                  <option value="New">New</option>
                  <option value="Updated - In Progress">Updated - In Progress</option>
                  <option value="Updated - Waiting Customer">Updated - Waiting Customer</option>
                  <option value="Updated - Closed">Updated - Closed</option>
                  <option value="Open">Open</option>
                  <option value="Resolved">Resolved</option>
                </select>
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-current opacity-60">
                  ▾
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {ticket && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="p-1.5 text-xs text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors flex items-center gap-1"
                aria-label="Edit title and description"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Edit</span>
              </button>
            )}
            <button
              onClick={onDeleteRequest}
              className="p-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors flex items-center gap-1"
              aria-label="Delete ticket"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Delete</span>
            </button>
            <div className="w-px h-4 bg-neutral-200 dark:border-neutral-800 mx-1" />
            <button
              onClick={onClose}
              aria-label="Close ticket details"
              className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading && !ticket ? (
            <div className="py-12 text-center text-sm text-neutral-400">Loading ticket details...</div>
          ) : !ticket ? (
            <div className="py-12 text-center text-sm text-neutral-400">Ticket not found</div>
          ) : (
            <>
              {/* Title & Description Section */}
              {isEditing ? (
                <div className="p-4 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-3">
                  {editError && (
                    <div className="text-xs text-red-600 dark:text-red-400">{editError}</div>
                  )}
                  <div>
                    <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white"
                      maxLength={255}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                      Description
                    </label>
                    <textarea
                      rows={4}
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white resize-y"
                      placeholder="Add details, notes, or acceptance criteria..."
                      maxLength={10000}
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      disabled={isSavingEdit}
                      className="px-3 py-1.5 text-xs text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-md transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      disabled={isSavingEdit}
                      className="px-3.5 py-1.5 text-xs font-medium text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 rounded-md transition-colors flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{isSavingEdit ? 'Saving...' : 'Save Changes'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <h1 id="ticket-detail-title" className="text-xl font-bold text-neutral-900 dark:text-white leading-snug">
                    {ticket.title}
                  </h1>

                  <div className="prose dark:prose-invert max-w-none">
                    {ticket.description ? (
                      <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed">
                        {ticket.description}
                      </p>
                    ) : (
                      <p className="text-sm italic text-neutral-400">
                        No description provided for this ticket.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Metadata Bar */}
              <div className="flex flex-wrap items-center gap-y-2 gap-x-6 py-3 px-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg text-xs text-neutral-600 dark:text-neutral-400 border border-neutral-100 dark:border-neutral-800/80">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Created:</span>
                  <span className="font-medium text-neutral-800 dark:text-neutral-200 tabular-nums">
                    {formatDateTime(ticket.created_at)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Updated:</span>
                  <span className="font-medium text-neutral-800 dark:text-neutral-200 tabular-nums">
                    {formatRelativeTime(ticket.updated_at)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Comments:</span>
                  <span className="font-medium text-neutral-800 dark:text-neutral-200 tabular-nums">
                    {ticket.comments.length}
                  </span>
                </div>
              </div>

              {/* Comments Section */}
              <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-neutral-400" />
                    <span>Activity & Comments</span>
                  </h3>
                  <span className="text-xs text-neutral-400">
                    Chronological order
                  </span>
                </div>

                {/* Comment List */}
                <div className="space-y-3">
                  {ticket.comments.length === 0 ? (
                    <div className="py-6 text-center text-xs text-neutral-400 bg-neutral-50/50 dark:bg-neutral-900/50 rounded-lg border border-dashed border-neutral-200 dark:border-neutral-800">
                      No comments yet. Add the first update below.
                    </div>
                  ) : (
                    ticket.comments.map((comment) => (
                      <div
                        key={comment.id}
                        className="p-3.5 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border border-neutral-200 dark:border-neutral-800 space-y-1.5 transition-all"
                      >
                        <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400">
                          <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                            Local User
                          </span>
                          <span className="tabular-nums" title={comment.created_at}>
                            {formatDateTime(comment.created_at)}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap leading-relaxed">
                          {comment.text}
                        </p>
                      </div>
                    ))
                  )}
                  <div ref={commentsEndRef} />
                </div>

                {/* Add Comment Form */}
                <form onSubmit={handleAddCommentSubmit} className="space-y-2 pt-2">
                  {commentError && (
                    <div className="text-xs text-red-600 dark:text-red-400">{commentError}</div>
                  )}
                  <div className="relative">
                    <textarea
                      ref={commentInputRef}
                      rows={3}
                      value={commentText}
                      onChange={(e) => {
                        setCommentText(e.target.value);
                        if (commentError) setCommentError(null);
                      }}
                      placeholder="Add an update or comment..."
                      className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-all resize-y"
                    />
                  </div>
                  <div className="flex items-center justify-end">
                    <button
                      type="submit"
                      disabled={isSubmittingComment || !commentText.trim()}
                      className="px-3.5 py-1.5 text-xs font-medium text-white bg-neutral-900 dark:bg-white dark:text-neutral-950 hover:bg-neutral-800 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-40"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSubmittingComment ? 'Posting...' : 'Add Comment'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
