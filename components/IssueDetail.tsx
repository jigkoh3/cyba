"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type User = { id: string; name: string | null; email: string | null; image: string | null };
type Member = { id: string; userId: string | null; agentId: string | null; agentName: string | null; role: string; user: User | null };

type AuditLog = {
  id: string;
  action: string;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  actorUserId: string | null;
  actorAgentId: string | null;
  actorAgentName: string | null;
  createdAt: string;
  actor: User | null;
};

type Comment = {
  id: string;
  body: string;
  authorUserId: string | null;
  authorAgentId: string | null;
  authorAgentName: string | null;
  createdAt: string;
  author: User | null;
};

type Issue = {
  id: string;
  identifier: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigneeUserId: string | null;
  assigneeAgentId: string | null;
  assigneeAgentName: string | null;
  labels: string[];
  createdAt: string;
  updatedAt: string;
  assignee: User | null;
  createdBy: User | null;
  project: { id: string; name: string };
  parent: { id: string; identifier: string; title: string; status: string } | null;
  children: { id: string; identifier: string; title: string; status: string; priority: string }[];
  comments: Comment[];
  auditLogs: AuditLog[];
};

const STATUS_OPTIONS = ["backlog", "todo", "in_progress", "in_review", "done", "blocked", "cancelled"];
const PRIORITY_OPTIONS = ["critical", "high", "medium", "low"];
const PRIORITY_ICONS: Record<string, string> = { critical: "🔴", high: "🟠", medium: "🟡", low: "🔵" };
const STATUS_COLORS: Record<string, string> = {
  backlog: "bg-gray-100 text-gray-600",
  todo: "bg-gray-100 text-gray-700",
  in_progress: "bg-blue-100 text-blue-700",
  in_review: "bg-yellow-100 text-yellow-700",
  done: "bg-green-100 text-green-700",
  blocked: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-400",
};

export function IssueDetail({
  issue: initialIssue,
  projectId,
  members,
  currentUserId,
}: {
  issue: Issue;
  projectId: string;
  members: Member[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [issue, setIssue] = useState(initialIssue);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(issue.title);

  async function updateField(field: string, value: unknown) {
    const res = await fetch(`/api/issues/${issue.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    if (res.ok) {
      const updated = await res.json();
      setIssue((prev) => ({ ...prev, ...updated }));
    }
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    setSubmitting(true);
    const res = await fetch(`/api/issues/${issue.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: comment }),
    });
    if (res.ok) {
      const c = await res.json();
      setIssue((prev) => ({ ...prev, comments: [...prev.comments, c] }));
      setComment("");
    }
    setSubmitting(false);
  }

  async function deleteIssue() {
    if (!confirm("Delete this issue?")) return;
    await fetch(`/api/issues/${issue.id}`, { method: "DELETE" });
    router.push(`/projects/${projectId}`);
  }

  async function saveTitle() {
    if (titleDraft.trim() && titleDraft !== issue.title) {
      await updateField("title", titleDraft.trim());
    }
    setEditingTitle(false);
  }

  const humanMembers = members.filter((m) => m.userId && m.user);
  const agentMembers = members.filter((m) => m.agentId);

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 flex gap-8">
      <div className="flex-1 min-w-0">
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
          {editingTitle ? (
            <input
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") setEditingTitle(false); }}
              className="w-full text-xl font-semibold text-gray-900 border-b border-indigo-500 focus:outline-none pb-1 mb-4"
            />
          ) : (
            <h1
              className="text-xl font-semibold text-gray-900 mb-4 cursor-pointer hover:text-indigo-600"
              onClick={() => setEditingTitle(true)}
            >
              {issue.title}
            </h1>
          )}

          {issue.description ? (
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{issue.description}</p>
          ) : (
            <p className="text-sm text-gray-400 italic">No description</p>
          )}

          {issue.labels.length > 0 && (
            <div className="flex gap-1.5 mt-4 flex-wrap">
              {issue.labels.map((l) => (
                <span key={l} className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full">{l}</span>
              ))}
            </div>
          )}
        </div>

        {issue.parent && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
            <div className="text-xs text-gray-500 mb-1">Parent issue</div>
            <Link href={`/projects/${projectId}/issues/${issue.parent.id}`} className="text-sm text-indigo-600 hover:underline">
              #{issue.parent.identifier} — {issue.parent.title}
            </Link>
          </div>
        )}

        {issue.children.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
            <div className="text-xs text-gray-500 mb-2">Sub-issues ({issue.children.length})</div>
            <div className="space-y-1">
              {issue.children.map((c) => (
                <Link key={c.id} href={`/projects/${projectId}/issues/${c.id}`} className="flex items-center gap-2 text-sm hover:text-indigo-600">
                  <span>{PRIORITY_ICONS[c.priority]}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${STATUS_COLORS[c.status]}`}>{c.status}</span>
                  <span>#{c.identifier} — {c.title}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Comments</h2>

          {issue.comments.length === 0 && (
            <p className="text-sm text-gray-400 mb-4">No comments yet.</p>
          )}

          <div className="space-y-4 mb-4">
            {issue.comments.map((c) => (
              <div key={c.id} className="flex gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${
                  c.authorAgentId ? "bg-purple-100 text-purple-700" : "bg-indigo-100 text-indigo-700"
                }`}>
                  {c.authorAgentId ? "🤖" : (c.author?.name ?? c.author?.email ?? "?")[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-xs font-medium text-gray-900">
                      {c.authorAgentId ? (c.authorAgentName ?? "Agent") : (c.author?.name ?? c.author?.email ?? "Unknown")}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(c.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.body}</p>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={submitComment} className="flex gap-2">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment…"
              rows={2}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
            <button
              type="submit"
              disabled={submitting || !comment.trim()}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 self-end"
            >
              Post
            </button>
          </form>
        </div>
      </div>

      <div className="w-56 flex-shrink-0">
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select
              value={issue.status}
              onChange={(e) => updateField("status", e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s.replace("_", " ")}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Priority</label>
            <select
              value={issue.priority}
              onChange={(e) => updateField("priority", e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>{PRIORITY_ICONS[p]} {p}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Assignee</label>
            <select
              value={
                issue.assigneeUserId
                  ? issue.assigneeUserId
                  : issue.assigneeAgentId
                  ? `agent:${issue.assigneeAgentId}`
                  : ""
              }
              onChange={(e) => {
                const v = e.target.value;
                if (v.startsWith("agent:")) {
                  const agentId = v.slice(6);
                  const agent = members.find((m) => m.agentId === agentId);
                  updateField("assigneeAgentId", agentId);
                  updateField("assigneeUserId", null);
                  updateField("assigneeAgentName", agent?.agentName ?? "Agent");
                } else if (v) {
                  updateField("assigneeUserId", v);
                  updateField("assigneeAgentId", null);
                } else {
                  updateField("assigneeUserId", null);
                  updateField("assigneeAgentId", null);
                }
              }}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Unassigned</option>
              {humanMembers.length > 0 && (
                <optgroup label="Team">
                  {humanMembers.map((m) => (
                    <option key={m.id} value={m.userId!}>
                      {m.user!.name ?? m.user!.email}
                    </option>
                  ))}
                </optgroup>
              )}
              {agentMembers.length > 0 && (
                <optgroup label="Agents">
                  {agentMembers.map((m) => (
                    <option key={m.id} value={`agent:${m.agentId}`}>
                      🤖 {m.agentName}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          <div className="pt-2 border-t border-gray-100">
            <div className="text-xs text-gray-400 space-y-1">
              <div>Created {new Date(issue.createdAt).toLocaleDateString()}</div>
              <div>Updated {new Date(issue.updatedAt).toLocaleDateString()}</div>
              {issue.createdBy && (
                <div>By {issue.createdBy.name ?? issue.createdBy.email}</div>
              )}
            </div>
          </div>

          <button
            onClick={deleteIssue}
            className="w-full text-xs text-red-500 hover:text-red-700 hover:bg-red-50 py-1.5 rounded-lg transition-colors"
          >
            Delete issue
          </button>
        </div>

        {issue.auditLogs.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 mt-4">
            <h3 className="text-xs font-semibold text-gray-500 mb-3">Activity</h3>
            <div className="space-y-2">
              {issue.auditLogs.slice(0, 10).map((log) => (
                <div key={log.id} className="text-xs text-gray-500">
                  <span className="font-medium text-gray-700">
                    {log.actorAgentId ? (log.actorAgentName ?? "Agent") : (log.actor?.name ?? "Unknown")}
                  </span>{" "}
                  {log.action === "status_changed"
                    ? `changed status: ${log.oldValue} → ${log.newValue}`
                    : log.action === "commented"
                    ? "commented"
                    : log.field
                    ? `updated ${log.field}`
                    : log.action}
                  <div className="text-gray-400">{new Date(log.createdAt).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
