import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveAuth, unauthorized, notFound, forbidden, badRequest } from "@/lib/api-utils";

const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  status: z.enum(["active", "archived"]).optional(),
});

async function getProjectAccess(projectId: string, actor: Awaited<ReturnType<typeof resolveAuth>>) {
  if (!actor) return null;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { organization: true },
  });
  if (!project) return null;

  if (actor.kind === "agent") {
    if (project.organizationId !== actor.organizationId) return null;
    return { project, role: "admin" as const };
  }

  const member = await prisma.member.findFirst({
    where: { projectId, userId: actor.userId },
  });

  if (!member) return null;
  return { project, role: member.role };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await resolveAuth(req);
  if (!actor) return unauthorized();

  const access = await getProjectAccess(id, actor);
  if (!access) return notFound();

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      organization: { select: { id: true, name: true, slug: true } },
      members: {
        include: { user: { select: { id: true, name: true, email: true, image: true } } },
      },
      _count: { select: { issues: true } },
    },
  });

  return NextResponse.json(project);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await resolveAuth(req);
  if (!actor) return unauthorized();

  const access = await getProjectAccess(id, actor);
  if (!access) return notFound();
  if (!["owner", "admin"].includes(access.role)) return forbidden();

  const body = await req.json();
  const parsed = updateProjectSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const project = await prisma.project.update({
    where: { id },
    data: parsed.data,
    include: { _count: { select: { issues: true, members: true } } },
  });

  return NextResponse.json(project);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await resolveAuth(req);
  if (!actor) return unauthorized();

  const access = await getProjectAccess(id, actor);
  if (!access) return notFound();
  if (access.role !== "owner") return forbidden();

  await prisma.project.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}
