import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveAuth, unauthorized, badRequest } from "@/lib/api-utils";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

const createKeySchema = z.object({
  name: z.string().min(1).max(100),
  organizationId: z.string(),
  agentId: z.string().optional(),
  agentName: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
});

export async function GET(req: NextRequest) {
  const actor = await resolveAuth(req);
  if (!actor) return unauthorized();
  if (actor.kind !== "user") return unauthorized("API key management requires user session");

  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("organizationId");

  const keys = await prisma.apiKey.findMany({
    where: {
      userId: actor.userId,
      ...(orgId ? { organizationId: orgId } : {}),
    },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      agentId: true,
      agentName: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(keys);
}

export async function POST(req: NextRequest) {
  const actor = await resolveAuth(req);
  if (!actor) return unauthorized();
  if (actor.kind !== "user") return unauthorized("API key creation requires user session");

  const body = await req.json();
  const parsed = createKeySchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const rawKey = `cyba_${uuidv4().replace(/-/g, "")}`;
  const keyPrefix = rawKey.slice(0, 8);
  const keyHash = await bcrypt.hash(rawKey, 10);

  const key = await prisma.apiKey.create({
    data: {
      name: parsed.data.name,
      keyHash,
      keyPrefix,
      organizationId: parsed.data.organizationId,
      userId: actor.userId,
      agentId: parsed.data.agentId,
      agentName: parsed.data.agentName,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
    },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      agentId: true,
      agentName: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ ...key, key: rawKey }, { status: 201 });
}
