import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveAuth, unauthorized, notFound, forbidden, badRequest } from "@/lib/api-utils";

const inviteSchema = z.object({
  email: z.string().email().optional(),
  agentId: z.string().optional(),
  agentName: z.string().optional(),
  role: z.enum(["admin", "member", "viewer"]).default("member"),
}).refine((d) => d.email || d.agentId, { message: "email or agentId required" });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await resolveAuth(req);
  if (!actor) return unauthorized();

  const project = await prisma.project.findUnique({
    where: { id },
    include: { organization: true },
  });
  if (!project) return notFound();

  if (actor.kind === "agent" && project.organizationId !== actor.organizationId) {
    return forbidden();
  }

  if (actor.kind === "user") {
    const member = await prisma.member.findFirst({
      where: { projectId: id, userId: actor.userId },
    });
    if (!member || !["owner", "admin"].includes(member.role)) return forbidden();
  }

  const body = await req.json();
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const { email, agentId, agentName, role } = parsed.data;

  if (email) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return badRequest("User with that email not found");

    const existing = await prisma.member.findFirst({
      where: { projectId: id, userId: user.id },
    });
    if (existing) return badRequest("User is already a member");

    const member = await prisma.member.create({
      data: {
        projectId: id,
        organizationId: project.organizationId,
        userId: user.id,
        role,
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    return NextResponse.json(member, { status: 201 });
  }

  if (agentId) {
    const existing = await prisma.member.findFirst({
      where: { projectId: id, agentId },
    });
    if (existing) return badRequest("Agent is already a member");

    const member = await prisma.member.create({
      data: {
        projectId: id,
        organizationId: project.organizationId,
        agentId,
        agentName: agentName ?? "Agent",
        role,
      },
    });

    return NextResponse.json(member, { status: 201 });
  }

  return badRequest("email or agentId required");
}
