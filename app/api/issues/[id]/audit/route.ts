import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveAuth, unauthorized, notFound } from "@/lib/api-utils";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await resolveAuth(req);
  if (!actor) return unauthorized();

  const issue = await prisma.issue.findUnique({
    where: { id },
    include: { project: { include: { organization: true } } },
  });
  if (!issue) return notFound();

  if (actor.kind === "user") {
    const member = await prisma.member.findFirst({
      where: { projectId: issue.projectId, userId: actor.userId },
    });
    if (!member) return notFound();
  } else if (issue.project.organizationId !== actor.organizationId) {
    return notFound();
  }

  const logs = await prisma.auditLog.findMany({
    where: { issueId: id },
    include: {
      actor: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(logs);
}
