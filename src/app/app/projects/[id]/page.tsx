import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { db } from "@/lib/db";
import { ProjectWorkspace } from "@/components/workspace/project-workspace";
import { SignOutButton } from "../../sign-out-button";

export default async function ProjectPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/sign-in");

  const project = await db.project.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, code: true, orgId: true, org: { select: { name: true } } },
  });
  if (!project) notFound();

  const membership = await db.membership.findUnique({
    where: { userId_orgId: { userId: session.user.id, orgId: project.orgId } },
    select: { role: true },
  });
  if (!membership) notFound();

  return (
    <main className="relative min-h-screen">
      <div className="lt-grid" />

      <header className="relative z-10 flex items-center justify-between border-b border-line px-8 py-5">
        <div className="flex items-center gap-4">
          <Link href="/app" className="flex items-center gap-3">
            <div className="relative h-5 w-5">
              <span className="absolute inset-0 border-[1.5px] border-blueprint" />
              <span className="absolute inset-0 rotate-45 border-[1.5px] border-blueprint opacity-50" />
            </div>
            <span className="text-[13px] font-semibold tracking-[0.3em]">
              KEYSTONE
            </span>
          </Link>
          <span className="mono text-[11px] text-muted-2">/</span>
          <span className="mono text-[11px] text-muted">{project.org.name}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="mono text-[11px] text-muted">{session.user.email}</span>
          <SignOutButton />
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-6xl px-6 py-10">
        <p className="mono text-[10px] tracking-[0.24em] text-muted-2">
          {project.code} · {membership.role}
        </p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight">
          {project.name}
        </h1>
        <p className="mt-2 text-sm text-muted">
          Live dependency graph and contradiction monitoring across the document set.
        </p>

        <div className="mt-8">
          <ProjectWorkspace
            projectId={project.id}
            canEdit={membership.role !== "CLIENT"}
          />
        </div>
      </section>
    </main>
  );
}
