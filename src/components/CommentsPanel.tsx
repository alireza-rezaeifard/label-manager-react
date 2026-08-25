import { useState, useEffect, useRef, useCallback } from "react";
import type { Comment } from "../types";
import { MessageSquare, Reply, AtSign, Send, Trash2, Clock, User, ChevronDown, ChevronRight } from 'lucide-react';

const COMMENTS_KEY = 'label-studio-comments';

function loadComments(): Record<string, Comment[]> {
  try { return JSON.parse(localStorage.getItem(COMMENTS_KEY) || '{}'); } catch { return {}; }
}

function saveComments(all: Record<string, Comment[]>) {
  try { localStorage.setItem(COMMENTS_KEY, JSON.stringify(all)); } catch {} 
}

interface CommentsPanelProps {
  recordId: string;
  recordCode: string;
  teamMembers: string[];
  serverMode: boolean;
  userName: string;
  userId?: number;
}

export default function CommentsPanel({ recordId, recordCode, teamMembers, serverMode, userName, userId }: CommentsPanelProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mentionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const all = loadComments();
    setComments(all[recordId] || []);
  }, [recordId]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (mentionRef.current && !mentionRef.current.contains(e.target as Node)) {
        setShowMentions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const persistComments = useCallback((updated: Comment[]) => {
    const all = loadComments();
    all[recordId] = updated;
    saveComments(all);
    setComments(updated);
  }, [recordId]);

  const handleInputChange = (value: string) => {
    setNewComment(value);
    const lastAt = value.lastIndexOf('@');
    if (lastAt !== -1) {
      const after = value.slice(lastAt + 1);
      if (!after.includes(' ')) {
        setMentionFilter(after);
        setShowMentions(true);
        return;
      }
    }
    setShowMentions(false);
  };

  const insertMention = (member: string) => {
    const lastAt = newComment.lastIndexOf('@');
    const before = newComment.slice(0, lastAt);
    setNewComment(`${before}@${member} `);
    setShowMentions(false);
    inputRef.current?.focus();
  };

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    const mentions: string[] = [];
    const mentionRegex = /@(\w+)/g;
    let match;
    while ((match = mentionRegex.exec(newComment)) !== null) {
      mentions.push(match[1]);
    }

    const comment: Comment = {
      id: `comment_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      recordId,
      recordCode,
      userId,
      userName,
      text: newComment.trim(),
      mentions,
      parentId: replyTo || undefined,
      createdAt: new Date().toISOString(),
    };

    const updated = [...comments, comment];
    persistComments(updated);
    setNewComment('');
    setReplyTo(null);
  };

  const handleDelete = (id: string) => {
    const updated = comments.filter(c => c.id !== id && c.parentId !== id);
    persistComments(updated);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const topLevel = comments.filter(c => !c.parentId);
  const getReplies = (parentId: string) => comments.filter(c => c.parentId === parentId);

  const toggleThread = (id: string) => {
    setExpandedThreads(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('fa-IR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const filteredMentions = teamMembers.filter(m =>
    m.toLowerCase().includes(mentionFilter.toLowerCase())
  );

  return (
    <div className="cp">
      <div className="cp-header">
        <MessageSquare className="cp-header-icon" />
        <span className="cp-header-title">نظرات و گفتگو</span>
        <span className="cp-header-count">{comments.length}</span>
      </div>

      {/* ── Comment List ── */}
      <div className="cp-list">
        {topLevel.length === 0 && (
          <div className="cp-empty">
            <MessageSquare className="cp-empty-icon" />
            <span>هنوز نظری ثبت نشده است. اولین نظر را بنویسید.</span>
          </div>
        )}
        {topLevel.map(comment => {
          const replies = getReplies(comment.id);
          const isExpanded = expandedThreads.has(comment.id);
          return (
            <div key={comment.id} className="cp-thread">
              <div className="cp-comment">
                <div className="cp-comment-avatar">
                  <User className="cp-avatar-icon" />
                </div>
                <div className="cp-comment-body">
                  <div className="cp-comment-header">
                    <span className="cp-comment-author">{comment.userName}</span>
                    <span className="cp-comment-time">
                      <Clock className="cp-time-icon" />
                      {formatDate(comment.createdAt)}
                    </span>
                  </div>
                  <div className="cp-comment-text">
                    {comment.text.split(/(@\w+)/).map((part, i) =>
                      part.startsWith('@') ? (
                        <span key={i} className="cp-mention">@{part.slice(1)}</span>
                      ) : part
                    )}
                  </div>
                  <div className="cp-comment-actions">
                    <button className="cp-action-btn" onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}>
                      <Reply className="cp-action-icon" /> پاسخ
                    </button>
                    <button className="cp-action-btn danger" onClick={() => handleDelete(comment.id)}>
                      <Trash2 className="cp-action-icon" /> حذف
                    </button>
                    {replies.length > 0 && (
                      <button className="cp-action-btn" onClick={() => toggleThread(comment.id)}>
                        {isExpanded ? <ChevronDown className="cp-action-icon" /> : <ChevronRight className="cp-action-icon" />}
                        {replies.length} پاسخ
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Replies ── */}
              {replies.length > 0 && isExpanded && (
                <div className="cp-replies">
                  {replies.map(reply => (
                    <div key={reply.id} className="cp-comment reply">
                      <div className="cp-comment-avatar small">
                        <User className="cp-avatar-icon" />
                      </div>
                      <div className="cp-comment-body">
                        <div className="cp-comment-header">
                          <span className="cp-comment-author">{reply.userName}</span>
                          <span className="cp-comment-time">
                            <Clock className="cp-time-icon" />
                            {formatDate(reply.createdAt)}
                          </span>
                        </div>
                        <div className="cp-comment-text">
                          {reply.text.split(/(@\w+)/).map((part, i) =>
                            part.startsWith('@') ? (
                              <span key={i} className="cp-mention">@{part.slice(1)}</span>
                            ) : part
                          )}
                        </div>
                        <div className="cp-comment-actions">
                          <button className="cp-action-btn danger" onClick={() => handleDelete(reply.id)}>
                            <Trash2 className="cp-action-icon" /> حذف
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Reply Indicator ── */}
      {replyTo && (
        <div className="cp-reply-indicator">
          <Reply className="cp-reply-icon" />
          <span>در حال پاسخ به نظر</span>
          <button className="cp-reply-cancel" onClick={() => setReplyTo(null)}>لغو</button>
        </div>
      )}

      {/* ── Input ── */}
      <div className="cp-input-area">
        <div className="cp-input-wrap">
          <textarea
            ref={inputRef}
            className="cp-input"
            value={newComment}
            onChange={e => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="نظر خود را بنویسید... (برای @mention از @ استفاده کنید)"
            rows={2}
            dir="auto"
          />
          <button className="cp-send-btn" onClick={handleSubmit} disabled={!newComment.trim()}>
            <Send className="cp-send-icon" />
          </button>
        </div>

        {/* ── Mentions Dropdown ── */}
        {showMentions && filteredMentions.length > 0 && (
          <div className="cp-mentions-dropdown" ref={mentionRef}>
            <div className="cp-mentions-header">
              <AtSign className="cp-mentions-icon" />
              <span>اشخاص</span>
            </div>
            {filteredMentions.map(member => (
              <div key={member} className="cp-mention-item" onClick={() => insertMention(member)}>
                <User className="cp-mention-item-icon" />
                <span>{member}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .cp {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .cp-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid var(--border-color);
        }

        .cp-header-icon {
          width: 16px;
          height: 16px;
          color: var(--primary);
        }

        .cp-header-title {
          font-weight: 700;
          font-size: 0.875rem;
        }

        .cp-header-count {
          margin-right: auto;
          font-size: 0.75rem;
          padding: 0.15rem 0.5rem;
          border-radius: 10px;
          background: var(--hover-bg);
          color: var(--text-color);
          opacity: 0.7;
        }

        .cp-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          max-height: 400px;
          overflow-y: auto;
        }

        .cp-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          padding: 2rem;
          opacity: 0.4;
          text-align: center;
          font-size: 0.8125rem;
        }

        .cp-empty-icon {
          width: 32px;
          height: 32px;
        }

        .cp-thread {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .cp-comment {
          display: flex;
          gap: 0.625rem;
          padding: 0.75rem;
          background: var(--hover-bg);
          border-radius: 10px;
        }

        .cp-comment.reply {
          margin-left: 2rem;
          background: rgba(15, 118, 110, 0.03);
          border: 1px solid var(--border-color);
        }

        .cp-comment-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--primary), #14b8a6);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .cp-comment-avatar.small {
          width: 26px;
          height: 26px;
        }

        .cp-avatar-icon {
          width: 16px;
          height: 16px;
          color: white;
        }

        .cp-comment-avatar.small .cp-avatar-icon {
          width: 13px;
          height: 13px;
        }

        .cp-comment-body {
          flex: 1;
          min-width: 0;
        }

        .cp-comment-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.25rem;
        }

        .cp-comment-author {
          font-weight: 600;
          font-size: 0.8125rem;
        }

        .cp-comment-time {
          font-size: 0.6875rem;
          opacity: 0.45;
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .cp-time-icon {
          width: 11px;
          height: 11px;
        }

        .cp-comment-text {
          font-size: 0.8125rem;
          line-height: 1.6;
          word-break: break-word;
        }

        .cp-mention {
          color: var(--primary);
          font-weight: 600;
          background: rgba(15, 118, 110, 0.06);
          padding: 0.05rem 0.3rem;
          border-radius: 3px;
        }

        .cp-comment-actions {
          display: flex;
          gap: 0.75rem;
          margin-top: 0.5rem;
        }

        .cp-action-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          background: none;
          border: none;
          padding: 0.2rem 0.4rem;
          font-size: 0.6875rem;
          color: var(--text-color);
          opacity: 0.5;
          cursor: pointer;
          font-family: inherit;
          border-radius: 4px;
          transition: all 0.15s;
        }

        .cp-action-btn:hover {
          opacity: 1;
          background: var(--border-color);
        }

        .cp-action-btn.danger:hover {
          color: var(--danger);
        }

        .cp-action-icon {
          width: 12px;
          height: 12px;
        }

        .cp-replies {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .cp-reply-indicator {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          background: rgba(15, 118, 110, 0.06);
          border-radius: 8px;
          font-size: 0.75rem;
        }

        .cp-reply-icon {
          width: 14px;
          height: 14px;
          color: var(--primary);
        }

        .cp-reply-cancel {
          margin-right: auto;
          background: none;
          border: none;
          color: var(--danger);
          font-size: 0.75rem;
          cursor: pointer;
          font-family: inherit;
        }

        .cp-input-area {
          position: relative;
        }

        .cp-input-wrap {
          display: flex;
          gap: 0.5rem;
          align-items: flex-end;
        }

        .cp-input {
          flex: 1;
          padding: 0.625rem 0.875rem;
          border: 1px solid var(--border-color);
          border-radius: 10px;
          background: var(--bg-body);
          color: var(--text-color);
          font-size: 0.8125rem;
          font-family: inherit;
          resize: vertical;
          min-height: 44px;
          transition: border-color 0.15s;
        }

        .cp-input:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.08);
        }

        .cp-input::placeholder {
          opacity: 0.35;
        }

        .cp-send-btn {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          border: none;
          background: linear-gradient(135deg, var(--primary), #14b8a6);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s;
          flex-shrink: 0;
        }

        .cp-send-btn:hover {
          box-shadow: 0 4px 12px rgba(15, 118, 110, 0.3);
          transform: translateY(-1px);
        }

        .cp-send-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          transform: none;
        }

        .cp-send-icon {
          width: 18px;
          height: 18px;
        }

        .cp-mentions-dropdown {
          position: absolute;
          bottom: 100%;
          left: 0;
          right: 52px;
          margin-bottom: 0.375rem;
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 10px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
          z-index: 100;
          overflow: hidden;
        }

        .cp-mentions-header {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.6875rem;
          font-weight: 600;
          opacity: 0.5;
          border-bottom: 1px solid var(--border-color);
        }

        .cp-mentions-icon {
          width: 12px;
          height: 12px;
        }

        .cp-mention-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          cursor: pointer;
          font-size: 0.8125rem;
          transition: background 0.1s;
        }

        .cp-mention-item:hover {
          background: var(--hover-bg);
        }

        .cp-mention-item-icon {
          width: 14px;
          height: 14px;
          opacity: 0.5;
        }
      `}</style>
    </div>
  );
}
