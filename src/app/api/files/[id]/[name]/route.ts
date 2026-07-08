import { NextResponse } from "next/server";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import path from "node:path";

/**
 * Streams an uploaded material back. IDs are server-generated hex.
 *
 * The body is streamed off disk (never buffered whole into memory) and the
 * route honours HTTP Range requests. That second part is what makes PDFs and
 * large images feel fast: browser PDF viewers (PDFium, pdf.js) fetch a file
 * progressively — the trailer/xref first, then a range per page as you scroll —
 * so without `Accept-Ranges`/206 the browser has to pull the entire file down
 * before it can paint page one. Range support lets a 25 MB printout open on
 * the first page immediately and lets big images stream instead of arriving in
 * one buffered lump.
 */

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

type Resolved = {
  filePath: string;
  name: string;
  size: number;
};

/** Validate the id, resolve the on-disk path, and stat it. null ⇒ 404. */
async function resolve(
  params: Promise<{ id: string; name: string }>
): Promise<Resolved | null> {
  const { id, name: rawName } = await params;
  if (!/^[a-f0-9]{16}$/.test(id)) return null;

  const name = path.basename(decodeURIComponent(rawName));
  const dataDir = process.env.DATA_DIR || path.join(process.cwd(), "data");
  const filePath = path.join(dataDir, "uploads", id, name);

  try {
    const info = await stat(filePath);
    if (!info.isFile()) return null;
    return { filePath, name, size: info.size };
  } catch {
    return null;
  }
}

/** Headers shared by every successful response (200, 206, and HEAD). */
function baseHeaders(name: string): Record<string, string> {
  const ext = path.extname(name).toLowerCase();
  const disposition = INLINE.has(ext) ? "inline" : "attachment";
  return {
    "Content-Type": TYPES[ext] ?? "application/octet-stream",
    "Content-Disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(name)}`,
    // ranges are the whole point — advertise support so the browser asks
    "Accept-Ranges": "bytes",
    // content-addressed ids never change — cache hard so a metered phone
    // doesn't re-download the same PDF every hour
    "Cache-Control": "private, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
  };
}

/**
 * Parse a single-range `Range` header against the file size.
 *  - null      → no Range header; serve the whole file (200)
 *  - "invalid" → unsatisfiable / malformed; caller answers 416
 *  - {start,end} → inclusive byte range to serve (206)
 * Multi-range ("bytes=0-9,20-29") is deliberately unsupported; browsers only
 * ever send one range for media, so we treat the rare multi-range as invalid.
 */
function parseRange(
  header: string | null,
  size: number
): { start: number; end: number } | null | "invalid" {
  if (!header) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m) return "invalid";
  const [, rawStart, rawEnd] = m;
  if (rawStart === "" && rawEnd === "") return "invalid";

  let start: number;
  let end: number;
  if (rawStart === "") {
    // suffix form: last N bytes
    const suffix = Number(rawEnd);
    if (!Number.isFinite(suffix) || suffix === 0) return "invalid";
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(rawStart);
    end = rawEnd === "" ? size - 1 : Number(rawEnd);
  }

  if (!Number.isFinite(start) || !Number.isFinite(end)) return "invalid";
  if (start > end || start >= size || start < 0) return "invalid";
  if (end >= size) end = size - 1;
  return { start, end };
}

/** Node read stream → web ReadableStream the Response body accepts. */
function fileStream(filePath: string, start: number, end: number): ReadableStream<Uint8Array> {
  const node = createReadStream(filePath, { start, end });
  return Readable.toWeb(node) as unknown as ReadableStream<Uint8Array>;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; name: string }> }
): Promise<NextResponse> {
  const file = await resolve(params);
  if (!file) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const { filePath, name, size } = file;
  const headers = baseHeaders(name);
  const parsed = parseRange(request.headers.get("range"), size);

  if (parsed === "invalid") {
    return new NextResponse(null, {
      status: 416,
      headers: { ...headers, "Content-Range": `bytes */${size}` },
    });
  }

  const start = parsed ? parsed.start : 0;
  const end = parsed ? parsed.end : Math.max(0, size - 1);
  // an empty file has no bytes to stream; answer 200 with a zero-length body
  const length = size === 0 ? 0 : end - start + 1;

  return new NextResponse(size === 0 ? null : fileStream(filePath, start, end), {
    status: parsed ? 206 : 200,
    headers: {
      ...headers,
      "Content-Length": String(length),
      ...(parsed ? { "Content-Range": `bytes ${start}-${end}/${size}` } : {}),
    },
  });
}

/** Some PDF viewers probe with HEAD to learn the size and range support. */
export async function HEAD(
  _request: Request,
  { params }: { params: Promise<{ id: string; name: string }> }
): Promise<NextResponse> {
  const file = await resolve(params);
  if (!file) return NextResponse.json({ error: "Not found." }, { status: 404 });

  return new NextResponse(null, {
    status: 200,
    headers: { ...baseHeaders(file.name), "Content-Length": String(file.size) },
  });
}
