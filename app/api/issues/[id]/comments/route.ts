import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveAuth, unauthorized, notFound, forbidden, badRequest, recordAudit } from "@/lib/api-utils";

const createCommentSchema = z.object({
  body: z.string().min(1),
});

async function checkIssueAccess(issueId: string, actor: Awaited<ReturnType<typeof resolveAuth>>) {
  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    include: { project: { include: { organization: true } } },
  });
  if (!issue) return null;

  if (actor?.kind === "agent") {
    if (issue.project.organizationId !== actor.organizationId) return null;
    return issue;
  }

  if (actor?.kind === "user") {
    const member = await prisma.member.findFirst({
      where: { projectId: issue.projectId, userId: actor.userId },
    });
    if (!member) return null;
    return issue;
  }

  return null;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await resolveAuth(req);
  if (!actor) return unauthorized();

  const issue = await checkIssueAccess(id, actor);
  if (!issue) return notFound();

  const { searchParams } = new URL(req.url);
  const after = searchParams.get("after");

  const comments = await prisma.comment.findMany({
    where: {
      issueId: id,
      ...(after ? { createdAt: { gt: (await prisma.comment.findUnique({ where: { id: after } }))?.createdAt } } : {}),
    },
    include: {
      author: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(comments);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await resolveAuth(req);
  if (!actor) return unauthorized();

  const issue = await checkIssueAccess(id, actor);
  if (!issue) return notFound();

  const body = await req.json();
  const parsed = createCommentSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const comment = await prisma.comment.create({
    data: {
      issueId: id,
      body: parsed.data.body,
      authorUserId: actor.kind === "user" ? actor.userId : null,
      authorAgentId: actor.kind === "agent" ? actor.agentId : null,
      authorAgentName: actor.kind === "agent" ? actor.agentName : null,
    },
    include: {
      author: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  await recordAudit({
    issueId: id,
    actor,
    action: "commented",
    metadata: { commentId: comment.id },
  });

  return NextResponse.json(comment, { status: 201 });
}
