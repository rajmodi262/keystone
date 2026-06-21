import "dotenv/config";
import { db } from "@/lib/db";
import { answerQuestion } from "@/server/services/ask";

async function main() {
  const project = await db.project.findFirst({
    where: { org: { slug: "riverside-demo" } },
    select: { id: true, name: true },
  });
  if (!project) throw new Error("Demo project not found — run `npm run db:seed` first.");

  console.log(`Project: ${project.name}\n`);

  for (const q of [
    "What concrete strength is required?",
    "What paint system is specified?",
  ]) {
    const res = await answerQuestion(project.id, q);
    console.log(`Q: ${q}`);
    if (res.type === "conflict") {
      console.log(`  -> CONFLICT [${res.topic}]`);
      for (const s of res.sources)
        console.log(`     ${s.code} (Rev ${s.revision}): ${s.value}`);
    } else {
      console.log(`  -> ${res.answer.slice(0, 120)}`);
    }
    console.log(
      `     cited: ${res.citations.map((c) => `${c.code}(${c.score.toFixed(2)})`).join(", ")}\n`,
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
