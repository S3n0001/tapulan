import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

/** Streams an uploaded material back. IDs are server-generated hex. */

export const runtime = "nodejs";

const TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".zip": "application/zip",
};

/** Types the browser can show inline; everything else downloads. */
const INLINE = new Set([".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".txt"]);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; name: string }> }
): Promise<NextResponse> {
  const { id, name: rawName } = await params;
  if (!/^[a-f0-9]{16}$/.test(id)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const name = path.basename(decodeURIComponent(rawName));
  const dataDir = process.env.DATA_DIR || path.join(process.cwd(), "data");
  const filePath = path.join(dataDir, "uploads", id, name);

  let data: Buffer;
  try {
    data = await fs.readFile(filePath);
  } catch {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const ext = path.extname(name).toLowerCase();
  const disposition = INLINE.has(ext) ? "inline" : "attachment";
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": TYPES[ext] ?? "application/octet-stream",
      "Content-Length": String(data.byteLength),
      "Content-Disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(name)}`,
      // content-addressed ids never change — cache hard so a metered phone
      // doesn't re-download the same PDF every hour
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
