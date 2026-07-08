"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Click-to-edit text: renders as the text itself until clicked, then swaps
 * to a borderless control styled identically — editing feels like touching
 * the document, not opening a form. InlineText commits on blur/Enter and
 * treats empty as "revert"; InlineTextArea commits on blur (or ⌘/Ctrl+Enter)
 * and allows empty, so details can be cleared.
 */

interface InlineProps {
  value: string;
  onCommit: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const TEXT =
  "block w-full cursor-text rounded-[3px] text-left outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--ring)_45%,transparent)]";
const EDIT =
  "block w-full rounded-[3px] border-none bg-[color-mix(in_oklab,var(--brand)_7%,transparent)] p-0 text-left outline-none placeholder:text-faint";

/** Character offset at a click point, so the caret lands where the eye is. */
function caretIndexAt(x: number, y: number): number | null {
  const doc = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
  };
  if (doc.caretPositionFromPoint) {
    const p = doc.caretPositionFromPoint(x, y);
    return p && p.offsetNode.nodeType === Node.TEXT_NODE ? p.offset : null;
  }
  const r = doc.caretRangeFromPoint?.(x, y);
  return r && r.startContainer.nodeType === Node.TEXT_NODE ? r.startOffset : null;
}

export function InlineText({ value, onCommit, placeholder, disabled, className }: InlineProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const caretRef = useRef<number | null>(null);
  const cancelRef = useRef(false);
  const refocusRef = useRef(false);

  useLayoutEffect(() => {
    if (editing) {
      const el = inputRef.current;
      if (!el) return;
      const at = Math.min(caretRef.current ?? el.value.length, el.value.length);
      el.focus({ preventScroll: true });
      el.setSelectionRange(at, at);
    } else if (refocusRef.current) {
      refocusRef.current = false;
      buttonRef.current?.focus({ preventScroll: true });
    }
  }, [editing]);

  if (disabled) {
    return (
      <span className={cn("block w-full text-left", !value && "text-faint", className)}>
        {value || placeholder || " "}
      </span>
    );
  }

  if (!editing) {
    return (
      <button
        ref={buttonRef}
        type="button"
        className={cn(TEXT, !value && "text-faint", className)}
        onClick={(e) => {
          caretRef.current = e.detail === 0 ? null : caretIndexAt(e.clientX, e.clientY);
          cancelRef.current = false;
          setDraft(value);
          setEditing(true);
        }}
      >
        {value || placeholder || " "}
      </button>
    );
  }

  return (
    <input
      ref={inputRef}
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        setEditing(false);
        if (cancelRef.current) return;
        const next = draft.trim();
        if (next && next !== value) onCommit(next);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          refocusRef.current = true;
          inputRef.current?.blur();
        } else if (e.key === "Escape") {
          // stopPropagation alone can't shield an enclosing Panel — React
          // delegates at the document root, where the Panel also listens
          e.stopPropagation();
          e.nativeEvent.stopImmediatePropagation();
          cancelRef.current = true;
          refocusRef.current = true;
          inputRef.current?.blur();
        }
      }}
      className={cn(EDIT, className)}
    />
  );
}

export function InlineTextArea({ value, onCommit, placeholder, disabled, className }: InlineProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const buttonRef = useRef<HTMLButtonElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const caretRef = useRef<number | null>(null);
  const cancelRef = useRef(false);
  const refocusRef = useRef(false);

  // exactly as tall as its content, growing as you type
  useLayoutEffect(() => {
    const el = areaRef.current;
    if (!editing || !el) return;
    el.style.height = "0";
    el.style.height = `${el.scrollHeight}px`;
  }, [editing, draft]);

  useLayoutEffect(() => {
    if (editing) {
      const el = areaRef.current;
      if (!el) return;
      const at = Math.min(caretRef.current ?? el.value.length, el.value.length);
      el.focus({ preventScroll: true });
      el.setSelectionRange(at, at);
    } else if (refocusRef.current) {
      refocusRef.current = false;
      buttonRef.current?.focus({ preventScroll: true });
    }
  }, [editing]);

  if (disabled) {
    return (
      <span
        className={cn(
          "block w-full whitespace-pre-wrap break-words text-left",
          !value && "text-faint",
          className
        )}
      >
        {value || placeholder || " "}
      </span>
    );
  }

  if (!editing) {
    return (
      <button
        ref={buttonRef}
        type="button"
        className={cn(TEXT, "whitespace-pre-wrap break-words", !value && "text-faint", className)}
        onClick={(e) => {
          caretRef.current = e.detail === 0 ? null : caretIndexAt(e.clientX, e.clientY);
          cancelRef.current = false;
          setDraft(value);
          setEditing(true);
        }}
      >
        {value || placeholder || " "}
      </button>
    );
  }

  return (
    <textarea
      ref={areaRef}
      rows={1}
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        setEditing(false);
        if (cancelRef.current) return;
        const next = draft.trim();
        if (next !== value) onCommit(next);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          // ⌘/Ctrl+Enter commits without also firing a Panel-level save
          e.preventDefault();
          e.stopPropagation();
          e.nativeEvent.stopImmediatePropagation();
          refocusRef.current = true;
          areaRef.current?.blur();
        } else if (e.key === "Escape") {
          e.stopPropagation();
          e.nativeEvent.stopImmediatePropagation();
          cancelRef.current = true;
          refocusRef.current = true;
          areaRef.current?.blur();
        }
      }}
      className={cn(EDIT, "resize-none overflow-hidden", className)}
    />
  );
}
