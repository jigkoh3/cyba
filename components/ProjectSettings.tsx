"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type User = { id: string; name: string | null; email: string | null; image: string | null };
type Member = { id: string; userId: string | null; agentId: string | null; agentName: string | null; role: string; user: User | null };
type ApiKey = { id: string; name: string; keyPrefix: string; agentId: string | null; agentName: string | null; lastUsedAt: string | null; createdAt: string };
type Project = { id: string; name: string; description: string | null; status: string; members: Member[] };

export function ProjectSettings({
  project,
  isAdmin,
  currentUserId,
  apiKeys: initialKeys,
  organizationId,
}: {
  project: Project;
  isAdmin: boolean;
  currentUserId: string;
  apiKeys: ApiKey[];
  organizationId: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteAgentId, setInviteAgentId] = useState("");
  const [inviteAgentName, setInviteAgentName] = useState("");
  const [inviteType, setInviteType] = useState<"user" | "agent">("user");
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ ok: boolean; message: string } | null>(null);

  const [apiKeys, setApiKeys] = useState(initialKeys);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyAgentId, setNewKeyAgentId] = useState("");
  const [newKeyAgentName, setNewKeyAgentName] = useState("");
  const [creatingKey, setCreatingKey] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  async function saveProject(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  async function inviteMember(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setInviteResult(null);
    const body = inviteType === "user"
      ? { email: inviteEmail }
      : { agentId: inviteAgentId, agentName: inviteAgentName };
    const res = await fetch(`/api/projects/${project.id}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setInviteResult({ ok: res.ok, message: res.ok ? "Member added" : (data.error ?? "Failed") });
    if (res.ok) {
      setInviteEmail("");
      setInviteAgentId("");
      setInviteAgentName("");
      router.refresh();
    }
    setInviting(false);
  }

  async function createApiKey(e: React.FormEvent) {
    e.preventDefault();
    setCreatingKey(true);
    const res = await fetch("/api/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newKeyName,
        organizationId,
        agentId: newKeyAgentId || undefined,
        agentName: newKeyAgentName || undefined,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setCreatedKey(data.key);
      setApiKeys((prev) => [data, ...prev]);
      setNewKeyName("");
      setNewKeyAgentId("");
      setNewKeyAgentName("");
    }
    setCreatingKey(false);
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">
      {isAdmin && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Project details</h2>
          <form onSubmit={saveProject} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {saved ? "Saved!" : saving ? "Saving…" : "Save changes"}
            </button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Members ({project.members.length})</h2>
        <div className="space-y-2 mb-6">
          {project.members.map((m) => (
            <div key={m.id} className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                m.agentId ? "bg-purple-100 text-purple-700" : "bg-indigo-100 text-indigo-700"
              }`}>
                {m.agentId ? "🤖" : (m.user?.name ?? m.user?.email ?? "?")[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900">
                  {m.agentId ? (m.agentName ?? m.agentId) : (m.user?.name ?? m.user?.email)}
                </div>
                {m.agentId
                  ? <div className="text-xs text-gray-400">Agent · ID: {m.agentId}</div>
                  : <div className="text-xs text-gray-400">{m.user?.email}</div>
                }
              </div>
              <span className="text-xs text-gray-500 capitalize">{m.role}</span>
            </div>
          ))}
        </div>

        {isAdmin && (
          <div className="pt-4 border-t border-gray-100">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Invite member</h3>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setInviteType("user")}
                className={`text-xs px-3 py-1 rounded-full ${inviteType === "user" ? "bg-indigo-100 text-indigo-700" : "text-gray-500 hover:text-gray-700"}`}
              >
                User
              </button>
              <button
                onClick={() => setInviteType("agent")}
                className={`text-xs px-3 py-1 rounded-full ${inviteType === "agent" ? "bg-purple-100 text-purple-700" : "text-gray-500 hover:text-gray-700"}`}
              >
                AI Agent
              </button>
            </div>
            <form onSubmit={inviteMember} className="flex gap-2">
              {inviteType === "user" ? (
                <input
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  type="email"
                  required
                  placeholder="team@company.com"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              ) : (
                <div className="flex-1 flex gap-2">
                  <input
                    value={inviteAgentId}
                    onChange={(e) => setInviteAgentId(e.target.value)}
                    required
                    placeholder="Agent ID"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    value={inviteAgentName}
                    onChange={(e) => setInviteAgentName(e.target.value)}
                    placeholder="Agent name"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}
              <button
                type="submit"
                disabled={inviting}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {inviting ? "Adding…" : "Add"}
              </button>
            </form>
            {inviteResult && (
              <p className={`text-xs mt-2 ${inviteResult.ok ? "text-green-600" : "text-red-600"}`}>
                {inviteResult.message}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-2">API Keys</h2>
        <p className="text-sm text-gray-600 mb-4">
          Create API keys for AI agents to authenticate with the Sprint Board API using <code className="bg-gray-100 px-1 rounded">Authorization: Bearer &lt;key&gt;</code>.
        </p>

        {createdKey && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-xs font-medium text-green-800 mb-1">API key created — copy it now, it will not be shown again:</p>
            <code className="text-xs text-green-900 break-all font-mono">{createdKey}</code>
            <button onClick={() => setCreatedKey(null)} className="block mt-2 text-xs text-green-600 hover:underline">Dismiss</button>
          </div>
        )}

        {apiKeys.length > 0 && (
          <div className="space-y-2 mb-4">
            {apiKeys.map((k) => (
              <div key={k.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">{k.name}</div>
                  <div className="text-xs text-gray-400">
                    <code className="font-mono">{k.keyPrefix}…</code>
                    {k.agentName && ` · Agent: ${k.agentName}`}
                    {k.lastUsedAt && ` · Last used: ${new Date(k.lastUsedAt).toLocaleDateString()}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={createApiKey} className="space-y-3 pt-4 border-t border-gray-100">
          <h3 className="text-sm font-medium text-gray-700">Create new key</h3>
          <div className="grid grid-cols-2 gap-2">
            <input
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              required
              placeholder="Key name (e.g. My Agent)"
              className="col-span-2 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              value={newKeyAgentId}
              onChange={(e) => setNewKeyAgentId(e.target.value)}
              placeholder="Agent ID (optional)"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              value={newKeyAgentName}
              onChange={(e) => setNewKeyAgentName(e.target.value)}
              placeholder="Agent name (optional)"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            disabled={creatingKey || !newKeyName.trim()}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {creatingKey ? "Creating…" : "Create API key"}
          </button>
        </form>
      </div>
    </div>
  );
}
