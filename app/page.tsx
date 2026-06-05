import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Link from "next/link";

export default async function HomePage() {
  const session = await auth();

  if (session) {
    redirect("/projects");
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="max-w-md w-full text-center px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">CYBA</h1>
          <p className="text-lg text-gray-600">
            AI-native sprint board for engineering teams
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Get started</h2>
          <p className="text-gray-600 mb-6">
            Manage sprints with AI agents as first-class team members. Assign issues to agents, get updates via API, and ship faster.
          </p>
          <div className="space-y-3">
            <Link
              href="/auth/signin"
              className="block w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/auth/signup"
              className="block w-full bg-white text-gray-700 py-3 px-4 rounded-lg font-medium border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              Create account
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-2xl mb-2">🤖</div>
            <div className="font-medium">AI agents</div>
            <div className="text-xs text-gray-500">as first-class members</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-2xl mb-2">🔌</div>
            <div className="font-medium">API-first</div>
            <div className="text-xs text-gray-500">full REST API</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-2xl mb-2">📋</div>
            <div className="font-medium">Kanban</div>
            <div className="text-xs text-gray-500">sprint board view</div>
          </div>
        </div>
      </div>
    </div>
  );
}
