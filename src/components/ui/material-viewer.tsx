"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Link2,
  X,
} from "lucide-react";
import type { TaskLink } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { usePresence } from "@/hooks/use-presence";
import { IconButton } from "./icon-button";

/**
 * Look at a task's materials without leaving the app. Uploaded files
 * (/api/files/…, same-origin, controlled headers) preview in place — images
 * inline, PDFs and text in a framed pane; office/zip files that can't render
 * fall back to a download card; external links keep their honest "opens in a
 * new tab" affordance. Prev/next walks the whole attachment list so a student
 * can flip through a set of printouts the way they'd flip pages.
 *
 * (Framing uploaded files needs X-Frame-Options: SAMEORIGIN — see next.config.)
 */

const IMAGE_EXT = new Set(["png", "jpg", "jpeg", "gif", "webp", "avif"]);
const FRAME_EXT = new Set(["pdf", "txt", "csv"]);

/** Raster stills Next's optimizer can safely shrink (no animation to lose). */
const OPTIMIZE_EXT = new Set(["png", "jpg", "jpeg"]);

/**
 * Hand the inline <img> a resized copy from Next's image optimizer instead of
 * the multi-megabyte original — same-origin, re-encoded to WebP/AVIF, cached.
 * A phone photo or flatbed scan is often several thousand pixels wide; the
 * viewer never shows it larger than ~1080px, so 2048px is already retina-sharp
 * while cutting the transfer to a fraction. GIF/WebP/AVIF pass through
 * untouched so animation survives, and the header "Open" link always points at
 * the full-resolution original.
 */
function displaySrc(src: string, ext: string): string {
  if (OPTIMIZE_EXT.has(ext)) {
    return `/_next/image?url=${encodeURIComponent(src)}&w=2048&q=75`;
  }
  return src;
}

function extOf(url: string): string {
  const clean = url.split(/[?#]/)[0];
  const m = clean.match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toLowerCase() : "";
}

export function isFileUrl(url: string): boolean {
  return url.startsWith("/api/files/");
}

export type PreviewKind = "image" | "frame" | "file" | "link";

export function previewKind(link: TaskLink): PreviewKind {
  if (link.kind === "file" || isFileUrl(link.url)) {
    const e = extOf(link.url);
    if (IMAGE_EXT.has(e)) return "image";
    if (FRAME_EXT.has(e)) return "frame";
    return "file";
  }
  return "link";
}

/** True when the viewer can render it in place (vs. download / open-out). */
export function isPreviewable(link: TaskLink): boolean {
  const k = previewKind(link);
  return k === "image" || k === "frame";
}

/** Only ever hand a safe http(s) or own-upload URL to an <img>/<iframe>/<a>. */
function safeSrc(url: string): string | null {
  if (isFileUrl(url)) return url;
  try {
    const p = new URL(url, "https://tapulan.invalid");
    if (p.protocol === "http:" || p.protocol === "https:") return url;
  } catch {
    // not parseable
  }
  return null;
}

export function MaterialViewer({
  links,
  index,
  onIndex,
  onClose,
}: {
  links: TaskLink[];
  /** which material is open, or null when the viewer is closed */
  index: number | null;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const open = index !== null;
  const { mounted, state } = usePresence(open);
  const ref = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const many = links.length > 1;
  const at = index ?? 0;
  const step = (dir: 1 | -1) => onIndex((at + dir + links.length) % links.length);

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // capture-phase + stop so one Escape closes only the viewer, not the
        // task panel listening at the document root behind it
        e.stopPropagation();
        onClose();
      } else if (many && e.key === "ArrowRight") {
        e.preventDefault();
        step(1);
      } else if (many && e.key === "ArrowLeft") {
        e.preventDefault();
        step(-1);
      } else if (e.key === "Tab" && ref.current) {
        const items = [
          ...ref.current.querySelectorAll<HTMLElement>(
            'button, [href], [tabindex]:not([tabindex="-1"])'
          ),
        ].filter((n) => n.offsetParent !== null);
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        const a = document.activeElement;
        if (e.shiftKey && (a === first || a === ref.current)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && a === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey, true);
      restoreRef.current?.focus?.({ preventScroll: true });
    };
  }, [open, at, links.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!mounted || typeof document === "undefined") return null;
  const link = index !== null ? links[index] : null;
  if (!link) return null;

  const kind = previewKind(link);
  const src = safeSrc(link.url);
  const openText = kind === "link" ? "Open link" : isPreviewable(link) ? "Open" : "Download";
  const OpenIcon = kind === "link" || isPreviewable(link) ? ExternalLink : Download;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex flex-col p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Material: ${link.label}`}
    >
      <div
        data-state={state}
        className="anim-fade absolute inset-0 bg-[oklch(0.08_0.004_80/0.62)]"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={ref}
        tabIndex={-1}
        data-state={state}
        className="anim-pop relative z-10 m-auto flex h-[88dvh] w-full max-w-[min(1080px,96vw)] flex-col overflow-hidden rounded-[var(--r-panel)] border border-line bg-pop shadow-[var(--shadow-overlay)] outline-none lg:h-[86vh]"
      >
        {/* header */}
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line pl-3 pr-2">
          <KindIcon kind={kind} />
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">
            {link.label}
          </span>
          {many && (
            <span className="tnum shrink-0 font-mono text-[11px] text-faint">
              {at + 1} / {links.length}
            </span>
          )}
          {src && (
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="tap inline-flex h-7 shrink-0 items-center gap-1.5 rounded-[var(--r-control)] px-2 text-[12px] font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink"
              title={`${openText} in a new tab`}
            >
              <OpenIcon className="size-3.5" />
              <span className="hidden sm:inline">{openText}</span>
            </a>
          )}
          <IconButton aria-label="Close" onClick={onClose}>
            <X className="size-4" />
          </IconButton>
        </header>

        {/* stage */}
        <div className="relative min-h-0 flex-1 bg-[color-mix(in_oklab,var(--ink)_5%,var(--bg))]">
          {kind === "image" && src ? (
            <div className="flex h-full w-full items-center justify-center overflow-auto p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={displaySrc(src, extOf(link.url))}
                alt={link.label}
                decoding="async"
                className="max-h-full max-w-full rounded-[6px] object-contain shadow-[var(--shadow-pop)]"
              />
            </div>
          ) : kind === "frame" && src ? (
            <iframe src={src} title={link.label} className="h-full w-full border-0 bg-bg" />
          ) : (
            <FallbackCard link={link} kind={kind} src={src} />
          )}

          {many && (
            <>
              <NavArrow dir="prev" onClick={() => step(-1)} />
              <NavArrow dir="next" onClick={() => step(1)} />
            </>
          )}
        </div>

        {/* filmstrip — switch between attachments */}
        {many && (
          <div className="flex shrink-0 gap-1.5 overflow-x-auto border-t border-line p-2 no-scrollbar">
            {links.map((l, i) => (
              <button
                key={l.id}
                type="button"
                onClick={() => onIndex(i)}
                aria-current={i === index ? "true" : undefined}
                className={cn(
                  "tap flex h-8 shrink-0 items-center gap-1.5 rounded-[6px] border px-2 text-[11.5px]",
                  i === index
                    ? "border-[color-mix(in_oklab,var(--brand)_55%,var(--line))] bg-[color-mix(in_oklab,var(--brand)_12%,var(--bg))] text-ink"
                    : "border-line bg-surface text-muted hover:border-line-strong hover:text-ink"
                )}
              >
                <KindIcon kind={previewKind(l)} small />
                <span className="max-w-[150px] truncate">{l.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

function KindIcon({ kind, small = false }: { kind: PreviewKind; small?: boolean }) {
  const cls = cn("shrink-0 text-muted", small ? "size-3.5" : "size-4");
  if (kind === "image") return <ImageIcon className={cls} />;
  if (kind === "link") return <Link2 className={cls} />;
  return <FileText className={cls} />;
}

function NavArrow({ dir, onClick }: { dir: "prev" | "next"; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === "prev" ? "Previous material" : "Next material"}
      className={cn(
        "tap absolute top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-line bg-pop/90 text-muted shadow-[var(--shadow-pop)] backdrop-blur transition-colors hover:text-ink",
        dir === "prev" ? "left-2" : "right-2"
      )}
    >
      {dir === "prev" ? <ChevronLeft className="size-5" /> : <ChevronRight className="size-5" />}
    </button>
  );
}

/** Office/zip files and external links can't render inline — offer the exit. */
function FallbackCard({
  link,
  kind,
  src,
}: {
  link: TaskLink;
  kind: PreviewKind;
  src: string | null;
}) {
  const isLink = kind === "link";
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <div className="grid size-14 place-items-center rounded-[14px] border border-line bg-surface">
        {isLink ? (
          <Link2 className="size-6 text-muted" strokeWidth={1.75} />
        ) : (
          <FileText className="size-6 text-muted" strokeWidth={1.75} />
        )}
      </div>
      <div className="max-w-xs">
        <p className="text-[14px] font-semibold text-ink">{link.label}</p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
          {src
            ? isLink
              ? "External links open in a new tab."
              : "This file type can’t be previewed here — download it to open."
            : "This link’s address isn’t safe to open."}
        </p>
      </div>
      {src && (
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="tap inline-flex h-8 items-center gap-1.5 rounded-[var(--r-control)] bg-brand px-3 text-[13px] font-medium text-on-brand transition-colors hover:bg-brand-hover"
        >
          {isLink ? <ExternalLink className="size-3.5" /> : <Download className="size-3.5" />}
          {isLink ? "Open link" : "Download"}
        </a>
      )}
    </div>
  );
}
