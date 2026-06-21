import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { extractText, getDocumentProxy } from "unpdf";
import { authOptions } from "@/server/auth";
import { db } from "@/lib/db";
import { ingestDocument } from "@/server/services/ingest";
import { detectConflicts } from "@/server/services/conflicts";
import type { Discipline } from "@prisma/client";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB
const DISCIPLINES = ["ARCH", "STRUCT", "MECH", "ELEC", "CIVIL", "SPEC", "RFI", "OTHER"];

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const projectId = String(form.get("projectId") ?? "");
  const code = String(form.get("code") ?? "").trim();
  const title = String(form.get("title") ?? "").trim();
  const revision = String(form.get("revision") ?? "A").trim() || "A";
  const disciplineRaw = String(form.get("discipline") ?? "OTHER").toUpperCase();
  const file = form.get("file");
  const clientText = String(form.get("rawText") ?? "").trim();
  const fileName =
    String(form.get("fileName") ?? "").trim() ||
    (file instanceof File ? file.name : "document.pdf");

  if (!projectId || !code || !title) {
    return NextResponse.json({ error: "projectId, code and title are required" }, { status: 400 });
  }
  if (!DISCIPLINES.includes(disciplineRaw)) {
    return NextResponse.json({ error: "Invalid discipline" }, { status: 400 });
  }

  // Access control: caller must be a member of the project's organization.
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { orgId: true },
  });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  const membership = await db.membership.findUnique({
    where: { userId_orgId: { userId: session.user.id, orgId: project.orgId } },
    select: { role: true },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (membership.role === "CLIENT")
    return NextResponse.json(
      { error: "Your role is read-only (Client)." },
      { status: 403 },
    );

  // Text source: client-extracted (incl. browser OCR) if provided, otherwise
  // parse the uploaded PDF server-side.
  let rawText = clientText;
  if (rawText.length < 10) {
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "A PDF file or extracted text is required" }, { status: 400 });
    }
    if (file.type && file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are accepted" }, { status: 415 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File exceeds 15 MB limit" }, { status: 413 });
    }
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const pdf = await getDocumentProxy(bytes);
      const result = await extractText(pdf, { mergePages: true });
      rawText = Array.isArray(result.text) ? result.text.join("\n\n") : result.text;
    } catch {
      return NextResponse.json({ error: "Could not read this PDF" }, { status: 422 });
    }
  }
  if (rawText.trim().length < 10) {
    return NextResponse.json(
      { error: "No extractable text — try a text-based PDF, or one OCR can read." },
      { status: 422 },
    );
  }

  const ingested = await ingestDocument({
    projectId,
    code,
    title,
    discipline: disciplineRaw as Discipline,
    revision,
    rawText,
    fileName,
  });

  // A new document can create or resolve contradictions — refresh them.
  const conflicts = await detectConflicts(projectId);

  return NextResponse.json({ ...ingested, conflicts: conflicts.length });
}
