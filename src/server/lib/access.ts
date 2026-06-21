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
