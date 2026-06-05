import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveAuth, unauthorized } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  const actor = await resolveAuth(req);
  if (!actor) return unauthorized();

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "todo,in_progress,in_review,blocked";
  const statuses = status.split(",");

  if (actor.kind === "agent") {
    const issues = await prisma.issue.findMany({
      where: {
        assigneeAgentId: actor.agentId,
        status: { in: statuses as never[] },
      },
      include: {
        project: { select: { id: true, name: true } },
        _count: { select: { comments: true } },
      },
      orderBy: [{ priority: "asc" }, { updatedAt: "desc" }],
    });
    return NextResponse.json(issues);
  }

  const issues = await prisma.issue.findMany({
    where: {
      assigneeUserId: actor.userId,
      status: { in: statuses as never[] },
    },
    include: {
      project: { select: { id: true, name: true } },
      _count: { select: { comments: true } },
    },
    orderBy: [{ priority: "asc" }, { updatedAt: "desc" }],
  });

  return NextResponse.json(issues);
}
