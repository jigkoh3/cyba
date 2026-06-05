import { NextRequest, NextResponse } from "next/server";
import { auth } from "./auth";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

export type AuthContext =
  | { kind: "user"; userId: string }
  | { kind: "agent"; agentId: string; agentName: string; organizationId: string };

export async function resolveAuth(req: NextRequest): Promise<AuthContext | null> {
  const authHeader = req.headers.get("authorization");

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const prefix = token.slice(0, 8);
    const keys = await prisma.apiKey.findMany({
      where: { keyPrefix: prefix },
    });

    for (const key of keys) {
      const valid = await bcrypt.compare(token, key.keyHash);
      if (valid) {
        await prisma.apiKey.update({
          where: { id: key.id },
          data: { lastUsedAt: new Date() },
        });
        return {
          kind: "agent",
          agentId: key.agentId ?? key.userId,
          agentName: key.agentName ?? "Agent",
          organizationId: key.organizationId,
        };
      }
    }
    return null;
  }

  const session = await auth();
  if (session?.user?.id) {
    return { kind: "user", userId: session.user.id };
  }

  return null;
}

export function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function notFound(message = "Not found") {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function serverError(message = "Internal server error") {
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function recordAudit({
  issueId,
  actor,
  action,
  field,
  oldValue,
  newValue,
  metadata,
}: {
  issueId: string;
  actor: AuthContext;
  action: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
  metadata?: Record<string, string | number | boolean | null>;
}) {
  await prisma.auditLog.create({
    data: {
      issueId,
      actorUserId: actor.kind === "user" ? actor.userId : null,
      actorAgentId: actor.kind === "agent" ? actor.agentId : null,
      actorAgentName: actor.kind === "agent" ? actor.agentName : null,
      action,
      field,
      oldValue,
      newValue,
      metadata: metadata as never ?? undefined,
    },
  });
}

export function generateIssueIdentifier(existingCount: number): string {
  return String(existingCount + 1);
}
