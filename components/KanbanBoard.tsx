"use client";

import { useState } from "react";
import Link from "next/link";
import { NewIssueModal } from "./NewIssueModal";

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
  assignee: { id: string; name: string | null; email: string | null; image: string | null } | null;
  _count: { comments: number };
};

type Member = {
  id: string;
  userId: string | null;
  agentId: string | null;
  agentName: string | null;
  role: string;
  user: { id: string; name: string | null; email: string | null; image: string | null } | null;
};

const COLUMNS = [
  { id: "todo", label: "Todo", color: "bg-gray-100 text-gray-700" },
  { id: "in_progress", label: "In Progress", color: "bg-blue-100 text-blue-700" },
  { id: "in_review", label: "In Review", color: "bg-yellow-100 text-yellow-700" },
  { id: "done", label: "Done", color: "bg-green-100 text-green-700" },
];

const PRIORITY_ICONS: Record<string, string> = {
  critical: "🔴",
  high: "🟠",
  medium: "🟡",
  low: "🔵",
};

export function KanbanBoard({
  projectId,
  initialIssues,
  members,
}: {
  projectId: string;
  initialIssues: Issue[];
  members: Member[];
}) {
  const [issues, setIssues] = useState<Issue[]>(initialIssues);
  const [newIssueStatus, setNewIssueStatus] = useState<string | null>(null);

  const issuesByStatus = COLUMNS.reduce<Record<string, Issue[]>>((acc, col) => {
    acc[col.id] = issues.filter((i) => i.status === col.id);
    return acc;
  }, {});

  async function moveIssue(issueId: string, newStatus: string) {
    setIssues((prev) =>
      prev.map((i) => (i.id === issueId ? { ...i, status: newStatus } : i))
    );
    await fetch(`/api/issues/${issueId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function onIssueCreated(issue: any) {
    setIssues((prev) => [issue, ...prev]);
    setNewIssueStatus(null);
  }

  return (
    <div className="flex gap-4 p-6 min-h-full">
      {COLUMNS.map((col) => {
        const colIssues = issuesByStatus[col.id] ?? [];
        return (
          <div
            key={col.id}
            className="flex-shrink-0 w-72 flex flex-col"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const id = e.dataTransfer.getData("issueId");
              if (id) moveIssue(id, col.id);
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${col.color}`}>
                  {col.label}
                </span>
                <span className="text-xs text-gray-400">{colIssues.length}</span>
              </div>
              <button
                onClick={() => setNewIssueStatus(col.id)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
                title="Add issue"
              >
                +
              </button>
            </div>

            <div className="flex flex-col gap-2 flex-1">
              {colIssues.map((issue) => (
                <IssueCard
                  key={issue.id}
                  issue={issue}
                  projectId={projectId}
                />
              ))}

              {colIssues.length === 0 && (
                <div
                  className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center text-xs text-gray-400 min-h-[60px] flex items-center justify-center"
                >
                  Drop here
                </div>
              )}
            </div>
          </div>
        );
      })}

      {newIssueStatus && (
        <NewIssueModal
          projectId={projectId}
          defaultStatus={newIssueStatus}
          members={members}
          onClose={() => setNewIssueStatus(null)}
          onCreated={onIssueCreated}
        />
      )}
    </div>
  );
}

function IssueCard({ issue, projectId }: { issue: Issue; projectId: string }) {
  return (
    <Link href={`/projects/${projectId}/issues/${issue.id}`}>
      <div
        className="bg-white rounded-lg border border-gray-200 p-3 cursor-grab hover:shadow-sm hover:border-indigo-200 transition-all"
        draggable
        onDragStart={(e) => e.dataTransfer.setData("issueId", issue.id)}
      >
        <div className="flex items-start gap-2 mb-2">
          <span className="text-xs" title={issue.priority}>
            {PRIORITY_ICONS[issue.priority] ?? "⚪"}
          </span>
          <span className="text-xs text-gray-400 font-mono">#{issue.identifier}</span>
        </div>
        <p className="text-sm font-medium text-gray-900 line-clamp-2 mb-2">{issue.title}</p>
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {issue.labels.slice(0, 2).map((label) => (
              <span
                key={label}
                className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded"
              >
                {label}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            {issue._count.comments > 0 && (
              <span className="text-xs text-gray-400">💬 {issue._count.comments}</span>
            )}
            {issue.assignee ? (
              <div
                className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-medium text-indigo-700"
                title={issue.assignee.name ?? issue.assignee.email ?? ""}
              >
                {(issue.assignee.name ?? issue.assignee.email ?? "?")[0].toUpperCase()}
              </div>
            ) : issue.assigneeAgentId ? (
              <div
                className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center text-xs"
                title={issue.assigneeAgentName ?? "Agent"}
              >
                🤖
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
}
