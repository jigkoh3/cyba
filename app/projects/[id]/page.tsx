import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { KanbanBoard } from "@/components/KanbanBoard";

export default async function ProjectBoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      organization: { select: { id: true, name: true } },
      members: {
        include: { user: { select: { id: true, name: true, email: true, image: true } } },
      },
    },
  });

  if (!project) notFound();

  const member = await prisma.member.findFirst({
    where: { projectId: id, userId: session.user.id },
  });
  if (!member) notFound();

  const issues = await prisma.issue.findMany({
    where: { projectId: id },
    include: {
      assignee: { select: { id: true, name: true, email: true, image: true } },
      _count: { select: { comments: true } },
    },
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/projects" className="hover:text-gray-900">Projects</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">{project.name}</span>
        </div>
      </header>

      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{project.name}</h1>
            {project.description && (
              <p className="text-sm text-gray-600 mt-0.5">{project.description}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {project.members.slice(0, 5).map((m) =>
                m.user ? (
                  <div
                    key={m.id}
                    className="w-7 h-7 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center text-xs font-medium text-indigo-700"
                    title={m.user.name ?? m.user.email ?? "Member"}
                  >
                    {(m.user.name ?? m.user.email ?? "?")[0].toUpperCase()}
                  </div>
                ) : (
                  <div
                    key={m.id}
                    className="w-7 h-7 rounded-full bg-purple-100 border-2 border-white flex items-center justify-center text-xs font-medium text-purple-700"
                    title={m.agentName ?? "Agent"}
                  >
                    🤖
                  </div>
                )
              )}
            </div>
            <Link
              href={`/projects/${id}/settings`}
              className="text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5"
            >
              Settings
            </Link>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto">
        <KanbanBoard
          projectId={id}
          initialIssues={JSON.parse(JSON.stringify(issues))}
          members={JSON.parse(JSON.stringify(project.members))}
        />
      </div>
    </div>
  );
}
