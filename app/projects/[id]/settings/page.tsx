import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ProjectSettings } from "@/components/ProjectSettings";

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const member = await prisma.member.findFirst({
    where: { projectId: id, userId: session.user.id },
  });
  if (!member) notFound();

  const isAdmin = ["owner", "admin"].includes(member.role);

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true, image: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!project) notFound();

  const apiKeys = await prisma.apiKey.findMany({
    where: { organizationId: project.organizationId, userId: session.user.id },
    select: { id: true, name: true, keyPrefix: true, agentId: true, agentName: true, lastUsedAt: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/projects" className="hover:text-gray-900">Projects</Link>
          <span>/</span>
          <Link href={`/projects/${id}`} className="hover:text-gray-900">{project.name}</Link>
          <span>/</span>
          <span className="text-gray-900">Settings</span>
        </div>
      </header>

      <ProjectSettings
        project={JSON.parse(JSON.stringify(project))}
        isAdmin={isAdmin}
        currentUserId={session.user.id}
        apiKeys={JSON.parse(JSON.stringify(apiKeys))}
        organizationId={project.organizationId}
      />
    </div>
  );
}
