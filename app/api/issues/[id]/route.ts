import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveAuth, unauthorized, notFound, forbidden, badRequest, recordAudit } from "@/lib/api-utils";

const VALID_TRANSITIONS: Record<string, string[]> = {
  backlog: ["todo", "in_progress", "cancelled"],
  todo: ["in_progress", "backlog", "cancelled"],
  in_progress: ["in_review", "todo", "blocked", "done", "cancelled"],
  in_review: ["in_progress", "done", "blocked", "cancelled"],
  done: ["in_progress"],
  blocked: ["todo", "in_progress", "cancelled"],
  cancelled: ["todo"],
};

const updateIssueSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  status: z.enum(["backlog", "todo", "in_progress", "in_review", "done", "blocked", "cancelled"]).optional(),
  priority: z.enum(["critical", "high", "medium", "low"]).optional(),
  assigneeUserId: z.string().nullable().optional(),
  assigneeAgentId: z.string().nullable().optional(),
  assigneeAgentName: z.string().nullable().optional(),
  labels: z.array(z.string()).optional(),
});

async function getIssueWithAccess(issueId: string, actor: Awaited<ReturnType<typeof resolveAuth>>) {
  if (!actor) return null;

  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    include: { project: { include: { organization: true } } },
  });
  if (!issue) return null;

  if (actor.kind === "agent") {
    if (issue.project.organizationId !== actor.organizationId) return null;
    return issue;
  }

  const member = await prisma.member.findFirst({
    where: { projectId: issue.projectId, userId: actor.userId },
  });
  if (!member) return null;
  return issue;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await resolveAuth(req);
  if (!actor) return unauthorized();

  const issue = await getIssueWithAccess(id, actor);
  if (!issue) return notFound();

  const full = await prisma.issue.findUnique({
    where: { id },
    include: {
      assignee: { select: { id: true, name: true, email: true, image: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, name: true } },
      parent: { select: { id: true, identifier: true, title: true, status: true } },
      children: { select: { id: true, identifier: true, title: true, status: true, priority: true } },
      _count: { select: { comments: true } },
    },
  });

  return NextResponse.json(full);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await resolveAuth(req);
  if (!actor) return unauthorized();

  const existing = await getIssueWithAccess(id, actor);
  if (!existing) return notFound();

  const body = await req.json();
  const parsed = updateIssueSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const { status, ...rest } = parsed.data;

  if (status && status !== existing.status) {
    const allowed = VALID_TRANSITIONS[existing.status] ?? [];
    if (!allowed.includes(status)) {
      return badRequest(
        `Invalid transition: ${existing.status} → ${status}. Allowed: ${allowed.join(", ")}`
      );
    }

    await recordAudit({
      issueId: id,
      actor,
      action: "status_changed",
      field: "status",
      oldValue: existing.status,
      newValue: status,
    });
  }

  const changedFields = Object.entries(rest).filter(
    ([key, val]) => val !== undefined && val !== (existing as Record<string, unknown>)[key]
  );

  for (const [field, newValue] of changedFields) {
    await recordAudit({
      issueId: id,
      actor,
      action: "updated",
      field,
      oldValue: String((existing as Record<string, unknown>)[field] ?? ""),
      newValue: String(newValue ?? ""),
    });
  }

  const issue = await prisma.issue.update({
    where: { id },
    data: { ...rest, ...(status ? { status } : {}) },
    include: {
      assignee: { select: { id: true, name: true, email: true, image: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, name: true } },
      _count: { select: { comments: true } },
    },
  });

  return NextResponse.json(issue);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await resolveAuth(req);
  if (!actor) return unauthorized();

  const existing = await getIssueWithAccess(id, actor);
  if (!existing) return notFound();

  if (actor.kind === "user") {
    const member = await prisma.member.findFirst({
      where: { projectId: existing.projectId, userId: actor.userId },
    });
    if (!member || !["owner", "admin"].includes(member.role)) return forbidden();
  }

  await prisma.issue.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}
