import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { IssueDetail } from "@/components/IssueDetail";

export default async function IssuePage({
  params,
}: {
  params: Promise<{ id: string; issueId: string }>;
}) {
  const { id, issueId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const member = await prisma.member.findFirst({
    where: { projectId: id, userId: session.user.id },
  });
  if (!member) notFound();

  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    include: {
      assignee: { select: { id: true, name: true, email: true, image: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, name: true } },
      parent: { select: { id: true, identifier: true, title: true, status: true } },
      children: { select: { id: true, identifier: true, title: true, status: true, priority: true } },
      comments: {
        include: { author: { select: { id: true, name: true, email: true, image: true } } },
        orderBy: { createdAt: "asc" },
      },
      auditLogs: {
        include: { actor: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!issue || issue.projectId !== id) notFound();

  const projectMembers = await prisma.member.findMany({
    where: { projectId: id },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/projects" className="hover:text-gray-900">Projects</Link>
          <span>/</span>
          <Link href={`/projects/${id}`} className="hover:text-gray-900">{issue.project.name}</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">#{issue.identifier}</span>
        </div>
      </header>

      <IssueDetail
        issue={JSON.parse(JSON.stringify(issue))}
        projectId={id}
        members={JSON.parse(JSON.stringify(projectMembers))}
        currentUserId={session.user.id}
      />
    </div>
  );
}
