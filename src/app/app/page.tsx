import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { db } from "@/lib/db";
import { SignOutButton } from "./sign-out-button";

const roleColor: Record<string, string> = {
  OWNER: "var(--blueprint)",
  ARCHITECT: "var(--blueprint)",
  ENGINEER: "var(--hazard)",
  CONTRACTOR: "var(--muted)",
  CLIENT: "var(--muted-2)",
};

export default async function AppHome() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/sign-in");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      memberships: {
        select: {
          role: true,
          org: {
            select: {
              id: true,
              name: true,
              slug: true,
              _count: { select: { projects: true } },
              projects: {
                orderBy: { createdAt: "desc" },
                select: {
                  id: true,
                  name: true,
                  code: true,
                  _count: { select: { documents: true, conflicts: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  return (
    <main className="relative min-h-screen">
      <div className="lt-grid" />

      <header className="relative z-10 flex items-center justify-between border-b border-line px-8 py-5">
        <div className="flex items-center gap-3">
          <div className="relative h-5 w-5">
            <span className="absolute inset-0 border-[1.5px] border-blueprint" />
            <span className="absolute inset-0 rotate-45 border-[1.5px] border-blueprint opacity-50" />
          </div>
          <span className="text-[13px] font-semibold tracking-[0.3em]">
            KEYSTONE
          </span>
          <span className="mono ml-2 inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 text-[9px] tracking-[0.2em] text-blueprint">
            <span className="lt-blip h-1.5 w-1.5 rounded-full bg-blueprint" />
            MONITORING
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="mono text-[11px] text-muted">{user?.email}</span>
          <SignOutButton />
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-4xl px-6 py-14">
        <p className="mono text-[10px] tracking-[0.24em] text-muted-2">
          WORKSPACES
        </p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight">
          Welcome back, {user?.name?.split(" ")[0] ?? "there"}.
        </h1>
        <p className="mt-2 text-sm text-muted">
          Your organizations and roles. Projects and documents come next.
        </p>

        <div className="mt-10 grid gap-px overflow-hidden rounded border border-line bg-line sm:grid-cols-2">
          {user?.memberships.map((m) => (
            <div key={m.org.id} className="bg-graphite/80 p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">{m.org.name}</h3>
                <span
                  className="mono rounded px-2 py-1 text-[9px] tracking-[0.16em]"
                  style={{
                    color: roleColor[m.role] ?? "var(--muted)",
                    border: `1px solid ${roleColor[m.role] ?? "var(--muted)"}33`,
                  }}
                >
                  {m.role}
                </span>
              </div>
              <p className="mono mt-3 text-[11px] tracking-[0.08em] text-muted">
                /{m.org.slug} · {m.org._count.projects} project
                {m.org._count.projects === 1 ? "" : "s"}
              </p>

              <div className="mt-4 space-y-2">
                {m.org.projects.map((p) => (
                  <a
                    key={p.id}
                    href={`/app/projects/${p.id}`}
                    className="group flex items-center justify-between rounded border border-line bg-ink/40 px-3 py-2.5 transition-colors hover:border-blueprint"
                  >
                    <span className="text-[13px] text-chalk group-hover:text-blueprint">
                      {p.name}
                    </span>
                    <span className="mono text-[9px] tracking-[0.12em] text-muted-2">
                      {p._count.documents} DOCS
                      {p._count.conflicts > 0 && (
                        <span className="text-danger">
                          {" "}
                          · {p._count.conflicts} ⚠
                        </span>
                      )}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
