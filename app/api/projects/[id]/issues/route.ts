import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveAuth, unauthorized, notFound, forbidden, badRequest, recordAudit } from "@/lib/api-utils";

const createIssueSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  status: z.enum(["backlog", "todo", "in_progress", "in_review", "done", "blocked", "cancelled"]).default("todo"),
  priority: z.enum(["critical", "high", "medium", "low"]).default("medium"),
  assigneeUserId: z.string().optional(),
  assigneeAgentId: z.string().optional(),
  assigneeAgentName: z.string().optional(),
  labels: z.array(z.string()).optional(),
  parentId: z.string().optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await resolveAuth(req);
  if (!actor) return unauthorized();

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return notFound();

  if (actor.kind === "user") {
    const member = await prisma.member.findFirst({
      where: { projectId: id, userId: actor.userId },
    });
    if (!member) return forbidden();
  } else if (project.organizationId !== actor.organizationId) {
    return forbidden();
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const assigneeAgentId = searchParams.get("assigneeAgentId");
  const q = searchParams.get("q");

  const issues = await prisma.issue.findMany({
    where: {
      projectId: id,
      ...(status ? { status: status as never } : {}),
      ...(priority ? { priority: priority as never } : {}),
      ...(assigneeAgentId ? { assigneeAgentId } : {}),
      ...(q ? {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { identifier: { contains: q, mode: "insensitive" } },
        ],
      } : {}),
    },
    include: {
      assignee: { select: { id: true, name: true, email: true, image: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      _count: { select: { comments: true } },
    },
    orderBy: [{ status: "asc" }, { priority: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(issues);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await resolveAuth(req);
  if (!actor) return unauthorized();

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return notFound();

  if (actor.kind === "user") {
    const member = await prisma.member.findFirst({
      where: { projectId: id, userId: actor.userId },
    });
    if (!member) return forbidden();
  } else if (project.organizationId !== actor.organizationId) {
    return forbidden();
  }

  const body = await req.json();
  const parsed = createIssueSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const count = await prisma.issue.count({ where: { projectId: id } });
  const identifier = String(count + 1);

  const issue = await prisma.issue.create({
    data: {
      ...parsed.data,
      identifier,
      projectId: id,
      createdByUserId: actor.kind === "user" ? actor.userId : null,
      createdByAgentId: actor.kind === "agent" ? actor.agentId : null,
    },
    include: {
      assignee: { select: { id: true, name: true, email: true, image: true } },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  await recordAudit({
    issueId: issue.id,
    actor,
    action: "created",
  });

  return NextResponse.json(issue, { status: 201 });
}
