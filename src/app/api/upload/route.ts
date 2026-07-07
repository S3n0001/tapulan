import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { isAdmin } from "@/lib/auth";

/**
 * Admin-only material upload. Files land in data/uploads/<id>/<name> next
 * to the SQLite database, and are served back via /api/files/<id>/<name>.
 * The returned URL is what gets stored on a task_links row.
 */

export const runtime = "nodejs";

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB — printouts, slides, PDFs

/** Allowlist sanitizer: letters, digits, dot, underscore, space, dash. */
function safeName(raw: string): string {
  const base = path
    .basename(raw)
    .replace(/[^A-Za-z0-9._ -]+/g, "_")
    .replace(/_{2,}/g, "_")
    .trim();
  return (base || "file").slice(0, 120);
}

export async function POST(request: Request): Promise<NextResponse> {
  // CSRF defense: a cross-site page can auto-submit a multipart form under the
  // admin's cookie, so reject when the browser-set Origin isn't our own host
  const origin = request.headers.get("origin");
  if (origin) {
    let originHost: string | null = null;
    try {
      originHost = new URL(origin).host;
    } catch {
      originHost = null;
    }
    if (originHost !== request.headers.get("host")) {
      return NextResponse.json({ error: "Cross-site upload blocked." }, { status: 403 });
    }
  }

  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Not signed in as admin." }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected a file upload." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Pick a file to upload." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Files are capped at 25 MB." }, { status: 413 });
  }

  const id = randomBytes(8).toString("hex");
  const name = safeName(file.name);
  const dataDir = process.env.DATA_DIR || path.join(process.cwd(), "data");
  const dir = path.join(dataDir, "uploads", id);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));

  return NextResponse.json({
    url: `/api/files/${id}/${encodeURIComponent(name)}`,
    name,
    size: file.size,
  });
}
