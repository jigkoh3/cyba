import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveAuth, unauthorized, badRequest } from "@/lib/api-utils";

const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  organizationId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const actor = await resolveAuth(req);
  if (!actor) return unauthorized();

  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("organizationId");

  if (actor.kind === "agent") {
    const projects = await prisma.project.findMany({
      where: {
        organizationId: actor.organizationId,
        ...(orgId ? { organizationId: orgId } : {}),
      },
      include: {
        _count: { select: { issues: true, members: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(projects);
  }

  const memberships = await prisma.member.findMany({
    where: { userId: actor.userId },
    select: { projectId: true },
  });
  const projectIds = memberships
    .map((m) => m.projectId)
    .filter(Boolean) as string[];

  const projects = await prisma.project.findMany({
    where: {
      id: { in: projectIds },
      ...(orgId ? { organizationId: orgId } : {}),
    },
    include: {
      _count: { select: { issues: true, members: true } },
      organization: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const actor = await resolveAuth(req);
  if (!actor) return unauthorized();

  const body = await req.json();
  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const { name, description } = parsed.data;

  let organizationId: string;
  if (actor.kind === "agent") {
    organizationId = actor.organizationId;
  } else {
    if (!parsed.data.organizationId) {
      let org = await prisma.organization.findFirst({
        where: {
          members: { some: { userId: actor.userId, role: { in: ["owner", "admin"] } } },
        },
      });

      if (!org) {
        org = await prisma.organization.create({
          data: {
            name: `${name} Team`,
            slug: `${name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
            members: {
              create: {
                userId: actor.userId,
                role: "owner",
              },
            },
          },
        });
      }
      organizationId = org.id;
    } else {
      organizationId = parsed.data.organizationId;
    }
  }

  const project = await prisma.project.create({
    data: {
      name,
      description,
      organizationId,
      createdByUserId: actor.kind === "user" ? actor.userId : null,
      members: {
        create: {
          organizationId,
          userId: actor.kind === "user" ? actor.userId : null,
          agentId: actor.kind === "agent" ? actor.agentId : null,
          agentName: actor.kind === "agent" ? actor.agentName : null,
          role: "owner",
        },
      },
    },
    include: {
      organization: { select: { id: true, name: true, slug: true } },
      _count: { select: { issues: true, members: true } },
    },
  });

  return NextResponse.json(project, { status: 201 });
}
