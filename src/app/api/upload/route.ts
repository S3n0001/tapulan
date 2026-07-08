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

/**
 * Extension → accepted MIME types, matching what /api/files/[id]/[name] can
 * serve back out. Anything not on this list is rejected — in particular
 * .svg and .html/.htm are never accepted, even if the browser reports a
 * "safe" MIME type for them, since either can execute script when opened.
 */
const ALLOWED_TYPES: Record<string, string[]> = {
  ".pdf": ["application/pdf"],
  ".png": ["image/png"],
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".gif": ["image/gif"],
  ".webp": ["image/webp"],
  ".txt": ["text/plain"],
  ".csv": ["text/csv", "application/vnd.ms-excel", "text/plain"],
  ".doc": ["application/msword"],
  ".docx": [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/zip",
  ],
  ".xls": ["application/vnd.ms-excel"],
  ".xlsx": [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/zip",
  ],
  ".ppt": ["application/vnd.ms-powerpoint"],
  ".pptx": [
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/zip",
  ],
  ".zip": ["application/zip", "application/x-zip-compressed"],
};

/** Never accepted regardless of declared MIME type. */
const BLOCKED_EXTS = new Set([".svg", ".html", ".htm"]);

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

  const name = safeName(file.name);
  const ext = path.extname(name).toLowerCase();
  const declaredType = (file.type || "").split(";")[0].trim().toLowerCase();
  const acceptedTypes = ALLOWED_TYPES[ext];
  if (BLOCKED_EXTS.has(ext) || !acceptedTypes) {
    return NextResponse.json(
      { error: `File type "${ext || "unknown"}" isn't allowed.` },
      { status: 415 }
    );
  }
  // Some browsers send an empty/generic type for less common extensions
  // (e.g. .csv from certain OSes) — only reject a declared type that's
  // both present and not on the allowlist for this extension.
  if (declaredType && declaredType !== "application/octet-stream" && !acceptedTypes.includes(declaredType)) {
    return NextResponse.json(
      { error: `File type "${declaredType}" doesn't match ".${ext.slice(1)}".` },
      { status: 415 }
    );
  }

  const id = randomBytes(8).toString("hex");
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
