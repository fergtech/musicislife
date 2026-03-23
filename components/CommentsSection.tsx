"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Avatar } from "@/components/Avatar";

// -- Types --

interface CommentData {
  id: string;
  listId: string;
  parentId: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: { id: string; username: string; avatarUrl: string | null };
}

interface CommentNode extends CommentData {
  replies: CommentNode[];
}

// -- Tree builder --

function buildTree(flat: CommentData[]): CommentNode[] {
  const map = new Map<string, CommentNode>();
  for (const c of flat) map.set(c.id, { ...c, replies: [] });
  const roots: CommentNode[] = [];
  for (const c of flat) {
    const node = map.get(c.id)!;
    if (c.parentId && map.has(c.parentId)) {
      map.get(c.parentId)!.replies.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

// -- Relative time --

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

// -- Main component --

interface Props {
  listId: string;
  listOwnerId: string;
  currentUserId: string | null;
  currentUserUsername: string | null;
}

export function CommentsSection({ listId, listOwnerId, currentUserId, currentUserUsername }: Props) {
  const [comments, setComments] = useState<CommentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [newText, setNewText] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    fetch(`/api/lists/${listId}/comments`)
      .then((r) => r.json())
      .then((data: CommentData[]) => { setComments(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [listId]);

  const tree = useMemo(() => buildTree(comments), [comments]);

  async function handlePost() {
    if (!newText.trim() || posting) return;
    setPosting(true);
    const res = await fetch(`/api/lists/${listId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newText.trim() }),
    });
    if (res.ok) {
      const comment: CommentData = await res.json();
      setComments((prev) => [...prev, comment]);
      setNewText("");
    }
    setPosting(false);
  }

  function handleReplyAdded(newComment: CommentData) {
    setComments((prev) => [...prev, newComment]);
  }

  function handleDeleted(id: string) {
    // Remove the comment and all its descendants
    setComments((prev) => {
      const toRemove = new Set<string>();
      function collectDescendants(cid: string) {
        toRemove.add(cid);
        prev.filter((c) => c.parentId === cid).forEach((c) => collectDescendants(c.id));
      }
      collectDescendants(id);
      return prev.filter((c) => !toRemove.has(c.id));
    });
  }

  function handleEdited(id: string, content: string, updatedAt: string) {
    setComments((prev) => prev.map((c) => c.id === id ? { ...c, content, updatedAt } : c));
  }

  return (
    <section className="space-y-4 pt-6 border-t border-surface-2">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
        Comments {comments.length > 0 && <span className="normal-case font-normal text-neutral-600">· {comments.length}</span>}
      </h2>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="flex gap-2.5 animate-pulse">
              <div className="h-7 w-7 shrink-0 rounded-full bg-surface-2" />
              <div className="flex-1 space-y-1.5 pt-0.5">
                <div className="h-3 w-24 rounded bg-surface-2" />
                <div className="h-3 w-full rounded bg-surface-2" />
                <div className="h-3 w-3/4 rounded bg-surface-2" />
              </div>
            </div>
          ))}
        </div>
      ) : tree.length === 0 ? (
        <p className="text-sm text-neutral-600">No comments yet. {currentUserId ? "Be the first!" : ""}</p>
      ) : (
        <div className="space-y-0">
          {tree.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              listId={listId}
              listOwnerId={listOwnerId}
              currentUserId={currentUserId}
              depth={0}
              onReplyAdded={handleReplyAdded}
              onDeleted={handleDeleted}
              onEdited={handleEdited}
            />
          ))}
        </div>
      )}

      {/* New comment input */}
      <div className="pt-2">
        {currentUserId ? (
          <div className="flex gap-2.5">
            {currentUserUsername && (
              <div className="shrink-0 pt-0.5">
                <Avatar username={currentUserUsername} avatarUrl={null} size={28} />
              </div>
            )}
            <div className="flex-1 space-y-2">
              <textarea
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handlePost(); }}
                placeholder="Add a comment…"
                rows={2}
                maxLength={1000}
                className="input w-full resize-none text-sm"
              />
              <button
                onClick={handlePost}
                disabled={!newText.trim() || posting}
                className="btn-primary text-sm"
              >
                {posting ? "Posting…" : "Post"}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-neutral-600">
            <a href="/login" className="text-accent hover:underline">Log in</a> to leave a comment.
          </p>
        )}
      </div>
    </section>
  );
}

// -- CommentItem (recursive) --

const MAX_INDENT_PX = 60;
const INDENT_PX = 20;

function CommentItem({
  comment,
  listId,
  listOwnerId,
  currentUserId,
  depth,
  onReplyAdded,
  onDeleted,
  onEdited,
}: {
  comment: CommentNode;
  listId: string;
  listOwnerId: string;
  currentUserId: string | null;
  depth: number;
  onReplyAdded: (c: CommentData) => void;
  onDeleted: (id: string) => void;
  onEdited: (id: string, content: string, updatedAt: string) => void;
}) {
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const [deleting, setDeleting] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const replyRef = useRef<HTMLTextAreaElement>(null);

  const isAuthor = currentUserId === comment.author.id;
  const isListOwner = currentUserId === listOwnerId;
  const wasEdited = comment.updatedAt !== comment.createdAt;
  const indent = Math.min(depth * INDENT_PX, MAX_INDENT_PX);

  async function submitReply() {
    if (!replyText.trim() || submittingReply) return;
    setSubmittingReply(true);
    const res = await fetch(`/api/lists/${listId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: replyText.trim(), parentId: comment.id }),
    });
    if (res.ok) {
      const newComment: CommentData = await res.json();
      onReplyAdded(newComment);
      setReplyText("");
      setShowReply(false);
      setCollapsed(false);
    }
    setSubmittingReply(false);
  }

  async function submitEdit() {
    if (!editText.trim()) return;
    const res = await fetch(`/api/comments/${comment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editText.trim() }),
    });
    if (res.ok) {
      const data = await res.json();
      onEdited(comment.id, data.content, data.updatedAt);
      setEditing(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch(`/api/comments/${comment.id}`, { method: "DELETE" });
    if (res.ok) onDeleted(comment.id);
    else setDeleting(false);
  }

  return (
    <div style={{ marginLeft: `${indent}px` }}>
      <div className="flex gap-2.5 py-3 border-b border-surface-2/50 last:border-0">
        <div className="shrink-0 pt-0.5">
          <Avatar username={comment.author.username} avatarUrl={comment.author.avatarUrl} size={26} />
        </div>

        <div className="min-w-0 flex-1">
          {/* Header */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-1">
            <span className="text-sm font-medium text-neutral-200">@{comment.author.username}</span>
            <span className="text-xs text-neutral-600">{relTime(comment.createdAt)}</span>
            {wasEdited && <span className="text-xs text-neutral-700">(edited)</span>}
          </div>

          {/* Content or edit mode */}
          {editing ? (
            <div className="space-y-2">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="input w-full resize-none text-sm"
                rows={3}
                maxLength={1000}
                autoFocus
              />
              <div className="flex gap-2">
                <button onClick={submitEdit} disabled={!editText.trim()} className="btn-primary text-xs py-1 px-3">Save</button>
                <button onClick={() => { setEditing(false); setEditText(comment.content); }} className="btn-secondary text-xs py-1 px-3">Cancel</button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap break-words">{comment.content}</p>
          )}

          {/* Action row */}
          {!editing && (
            <div className="flex items-center gap-3 mt-1.5">
              {currentUserId && (
                <button
                  onClick={() => { setShowReply((v) => !v); setTimeout(() => replyRef.current?.focus(), 50); }}
                  className="text-xs text-neutral-600 hover:text-neutral-300 transition-colors"
                >
                  {showReply ? "Cancel" : "Reply"}
                </button>
              )}
              {isAuthor && (
                <button onClick={() => setEditing(true)} className="text-xs text-neutral-600 hover:text-neutral-300 transition-colors">
                  Edit
                </button>
              )}
              {(isAuthor || isListOwner) && (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-xs text-neutral-600 hover:text-red-400 transition-colors"
                >
                  {deleting ? "…" : "Delete"}
                </button>
              )}
              {comment.replies.length > 0 && (
                <button
                  onClick={() => setCollapsed((v) => !v)}
                  className="text-xs text-neutral-600 hover:text-neutral-300 transition-colors"
                >
                  {collapsed
                    ? `▶ ${comment.replies.length} ${comment.replies.length === 1 ? "reply" : "replies"}`
                    : "▼ Hide"}
                </button>
              )}
            </div>
          )}

          {/* Inline reply box */}
          {showReply && (
            <div className="mt-3 space-y-2">
              <textarea
                ref={replyRef}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submitReply(); }}
                placeholder={`Replying to @${comment.author.username}…`}
                rows={2}
                maxLength={1000}
                className="input w-full resize-none text-sm"
              />
              <button
                onClick={submitReply}
                disabled={!replyText.trim() || submittingReply}
                className="btn-primary text-xs py-1 px-3"
              >
                {submittingReply ? "Posting…" : "Post reply"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Nested replies */}
      {!collapsed && comment.replies.length > 0 && (
        <div className="border-l-2 border-surface-2 ml-3">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              listId={listId}
              listOwnerId={listOwnerId}
              currentUserId={currentUserId}
              depth={depth + 1}
              onReplyAdded={onReplyAdded}
              onDeleted={onDeleted}
              onEdited={onEdited}
            />
          ))}
        </div>
      )}
    </div>
  );
}
