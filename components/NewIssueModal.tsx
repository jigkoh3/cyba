"use client";

import { useState } from "react";

type Member = {
  id: string;
  userId: string | null;
  agentId: string | null;
  agentName: string | null;
  role: string;
  user: { id: string; name: string | null; email: string | null; image: string | null } | null;
};

export function NewIssueModal({
  projectId,
  defaultStatus,
  members,
  onClose,
  onCreated,
}: {
  projectId: string;
  defaultStatus: string;
  members: Member[];
  onClose: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onCreated: (issue: any) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [assigneeUserId, setAssigneeUserId] = useState("");
  const [assigneeAgentId, setAssigneeAgentId] = useState("");
  const [labels, setLabels] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const body: Record<string, unknown> = {
      title,
      description: description || undefined,
      status: defaultStatus,
      priority,
      labels: labels ? labels.split(",").map((l) => l.trim()).filter(Boolean) : [],
    };

    if (assigneeUserId) body.assigneeUserId = assigneeUserId;
    if (assigneeAgentId) {
      const agent = members.find((m) => m.agentId === assigneeAgentId);
      body.assigneeAgentId = assigneeAgentId;
      body.assigneeAgentName = agent?.agentName ?? "Agent";
    }

    const res = await fetch(`/api/projects/${projectId}/issues`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const issue = await res.json();
      onCreated(issue);
    }
    setLoading(false);
  }

  const humanMembers = members.filter((m) => m.userId && m.user);
  const agentMembers = members.filter((m) => m.agentId);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-4">New issue</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Issue title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-gray-400">(optional)</span></label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="Describe the issue…"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="critical">🔴 Critical</option>
                <option value="high">🟠 High</option>
                <option value="medium">🟡 Medium</option>
                <option value="low">🔵 Low</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <div className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-600">
                {defaultStatus.replace("_", " ")}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assign to</label>
            <select
              value={assigneeUserId || (assigneeAgentId ? `agent:${assigneeAgentId}` : "")}
              onChange={(e) => {
                const v = e.target.value;
                if (v.startsWith("agent:")) {
                  setAssigneeAgentId(v.slice(6));
                  setAssigneeUserId("");
                } else {
                  setAssigneeUserId(v);
                  setAssigneeAgentId("");
                }
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Unassigned</option>
              {humanMembers.length > 0 && (
                <optgroup label="Team members">
                  {humanMembers.map((m) => (
                    <option key={m.id} value={m.userId!}>
                      {m.user!.name ?? m.user!.email}
                    </option>
                  ))}
                </optgroup>
              )}
              {agentMembers.length > 0 && (
                <optgroup label="AI agents">
                  {agentMembers.map((m) => (
                    <option key={m.id} value={`agent:${m.agentId}`}>
                      🤖 {m.agentName ?? m.agentId}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Labels <span className="text-gray-400">(comma-separated)</span></label>
            <input
              type="text"
              value={labels}
              onChange={(e) => setLabels(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="bug, feature, urgent"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? "Creating…" : "Create issue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
