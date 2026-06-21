import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSampleProject } from "@/server/services/sample";

async function main() {
  const email = "demo@keystone.dev";
  const passwordHash = await bcrypt.hash("password123", 10);

  await db.organization.deleteMany({ where: { slug: "riverside-demo" } });

  const user = await db.user.upsert({
    where: { email },
    update: { passwordHash, name: "Demo Architect" },
    create: { email, passwordHash, name: "Demo Architect" },
  });

  const org = await db.organization.create({
    data: {
      name: "Riverside Partners",
      slug: "riverside-demo",
      memberships: { create: { userId: user.id, role: "OWNER" } },
    },
  });

  const r = await createSampleProject(org.id);

  console.log(
    `\nSeed complete: ${r.docs} docs, ${r.chunks} chunks, ${r.refs} references, ${r.conflicts} conflict(s) detected.`,
  );
  console.log(`Sign in:  demo@keystone.dev  /  password123`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
