import { TRPCError } from "@trpc/server";
import type { PrismaClient, Role } from "@prisma/client";

export async function assertOrgAccess(
  db: PrismaClient,
  userId: string,
  orgId: string,
): Promise<Role> {
  const m = await db.membership.findUnique({
    where: { userId_orgId: { userId, orgId } },
    select: { role: true },
  });
  if (!m) throw new TRPCError({ code: "FORBIDDEN", message: "Not a member of this organization." });
  return m.role;
}

export async function assertProjectAccess(
  db: PrismaClient,
  userId: string,
  projectId: string,
) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { id: true, orgId: true, name: true, code: true },
  });
  if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
  const role = await assertOrgAccess(db, userId, project.orgId);
  return { project, role };
}

const READ_ONLY = new TRPCError({
  code: "FORBIDDEN",
  message: "Your role is read-only (Client).",
});

// Write access: every role except CLIENT can mutate.
export async function assertCanEditOrg(
  db: PrismaClient,
  userId: string,
  orgId: string,
): Promise<Role> {
  const role = await assertOrgAccess(db, userId, orgId);
  if (role === "CLIENT") throw READ_ONLY;
  return role;
}

export async function assertCanEditProject(
  db: PrismaClient,
  userId: string,
  projectId: string,
) {
  const ctx = await assertProjectAccess(db, userId, projectId);
  if (ctx.role === "CLIENT") throw READ_ONLY;
  return ctx;
}

// Member management is Owner-only.
export async function assertOwner(
  db: PrismaClient,
  userId: string,
  orgId: string,
): Promise<Role> {
  const role = await assertOrgAccess(db, userId, orgId);
  if (role !== "OWNER")
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only an Owner can manage members.",
    });
  return role;
}
