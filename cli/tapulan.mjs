#!/usr/bin/env node
/**
 * tapulan — the section's requirements tracker, from a terminal.
 *
 * Pairs with a running Tapulan server: `tapulan login` exchanges the admin
 * password for a personal token (revocable under Admin → Settings), then
 * `tapulan add` posts tasks without ever opening the website.
 *
 * Zero dependencies; Node 18+. Config lives at ~/.tapulan.json.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";

const CONFIG_PATH = path.join(os.homedir(), ".tapulan.json");
const DEFAULT_URL = "http://localhost:3000";

/* ------------------------------------------------------------------ ansi */

const tty = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code) => (s) => (tty ? `\x1b[${code}m${s}\x1b[0m` : String(s));
const bold = paint("1");
const dim = paint("2");
const red = paint("31");
const yellow = paint("33");
const green = paint("32");
const blue = paint("94"); // the cobalt signal
const mono = (s) => s; // vocabulary marker — times, dates, ids

/* ---------------------------------------------------------------- config */

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  } catch {
    return null;
  }
}

function saveConfig(cfg) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2) + "\n", { mode: 0o600 });
}

function deleteConfig() {
  try {
    fs.unlinkSync(CONFIG_PATH);
  } catch {
    /* already gone */
  }
}

/* ------------------------------------------------------------------- api */

class CliError extends Error {}

async function api(cfg, pathname, { method = "GET", body, token = cfg?.token } = {}) {
  const url = `${cfg.url}${pathname}`;
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: {
        ...(body ? { "content-type": "application/json" } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new CliError(`Can't reach ${cfg.url} — is the site running?`);
  }
  let json;
  try {
    json = await res.json();
  } catch {
    throw new CliError(`Unexpected reply from ${url} (HTTP ${res.status}).`);
  }
  if (!json.ok) throw new CliError(json.error ?? `HTTP ${res.status}`);
  return json.data;
}

function requireLogin() {
  const cfg = loadConfig();
  if (!cfg?.token || !cfg?.url) {
    throw new CliError("Not paired yet. Run `tapulan login` first.");
  }
  return cfg;
}

/* --------------------------------------------------------------- prompts */

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) =>
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    })
  );
}

/** Password prompt with muted echo (works in PowerShell, cmd, and POSIX shells). */
function askHidden(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  process.stdout.write(question);
  rl._writeToOutput = () => {}; // echo nothing
  return new Promise((resolve) =>
    rl.question("", (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer.trim());
    })
  );
}

/* ----------------------------------------------------------------- dates */

const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const WEEKDAY_FULL = [
  "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
];
const MONTHS = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec",
];

const toISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

/**
 * Natural date → YYYY-MM-DD (local). Accepts: today · tomorrow/tom (and
 * bukas/ugma) · mon…sun · next fri · +3 · 2026-07-15 · 7/15 · jul 15 · 15 jul.
 */
function parseDue(raw, now = new Date()) {
  const s = raw.trim().toLowerCase().replace(/\s+/g, " ");
  if (!s) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const shift = (days) => toISO(new Date(today.getTime() + days * 86_400_000));

  if (["today", "tod", "now"].includes(s)) return shift(0);
  if (["tomorrow", "tom", "tmr", "bukas", "ugma"].includes(s)) return shift(1);

  const plus = /^\+(\d{1,3})$/.exec(s);
  if (plus) return shift(Number(plus[1]));

  const week = /^(next )?([a-z]{3,9})$/.exec(s);
  if (week) {
    const token = week[2];
    // exact abbrev or full name only — "mond"/"satx" must NOT resolve to a
    // real-but-wrong day; the section only meets Mon–Fri so reject sat/sun
    const idx = WEEKDAYS.findIndex((w, i) => token === w || token === WEEKDAY_FULL[i]);
    if (idx !== -1 && idx !== 0 && idx !== 6) {
      let days = (idx - today.getDay() + 7) % 7;
      if (week[1]) days = days === 0 ? 7 : days + 7;
      return shift(days);
    }
  }

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return Number.isNaN(d.getTime()) ? null : toISO(d);
  }

  const slash = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/.exec(s); // M/D[/Y]
  const named =
    /^([a-z]{3,9}) (\d{1,2})$/.exec(s) ?? // jul 15
    (() => {
      const m = /^(\d{1,2}) ([a-z]{3,9})$/.exec(s); // 15 jul
      return m ? [m[0], m[2], m[1]] : null;
    })();

  let month = null;
  let day = null;
  let year = null;
  if (slash) {
    month = Number(slash[1]);
    day = Number(slash[2]);
    year = slash[3] ? Number(slash[3].length === 2 ? `20${slash[3]}` : slash[3]) : null;
  } else if (named) {
    const idx = MONTHS.findIndex((m) => named[1].startsWith(m));
    if (idx === -1) return null;
    month = idx + 1;
    day = Number(named[2]);
  } else {
    return null;
  }

  if (!month || !day || month > 12 || day > 31) return null;
  let d = new Date(year ?? today.getFullYear(), month - 1, day);
  if (Number.isNaN(d.getTime()) || d.getMonth() !== month - 1) return null;
  // no year given and the date already passed → they mean next year
  if (year === null && d < today) d = new Date(d.getFullYear() + 1, month - 1, day);
  return toISO(d);
}

/** Compact label the app uses: 3d overdue · Today · Tomorrow · Jul 15. */
function dueLabel(iso, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const [y, m, d] = iso.split("-").map(Number);
  const days = Math.round((new Date(y, m - 1, d) - today) / 86_400_000);
  if (days < 0) return { text: `${-days}d overdue`, tone: "danger" };
  if (days === 0) return { text: "Today", tone: "warn" };
  if (days === 1) return { text: "Tomorrow", tone: "soon" };
  const label = new Date(y, m - 1, d).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
  });
  return { text: days <= 6 ? `${WEEKDAYS[new Date(y, m - 1, d).getDay()]} · ${label}` : label, tone: "normal" };
}

const TONE = { danger: red, warn: yellow, soon: (s) => s, normal: dim };

/* ------------------------------------------------------------------ args */

function parseArgs(argv, flagDefs) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const def = flagDefs[arg];
    if (def) {
      if (def.takesValue) {
        flags[def.name] = argv[++i] ?? "";
      } else {
        flags[def.name] = true;
      }
    } else if (arg.startsWith("-") && arg !== "-") {
      throw new CliError(`Unknown flag ${arg}. See \`tapulan help\`.`);
    } else {
      positional.push(arg);
    }
  }
  return { flags, positional };
}

const F = (name, takesValue = true) => ({ name, takesValue });

/* -------------------------------------------------------------- commands */

async function cmdLogin(argv) {
  const { flags, positional } = parseArgs(argv, {
    "--url": F("url"),
    "--label": F("label"),
  });
  const existing = loadConfig();
  const url = (flags.url ?? positional[0] ?? existing?.url ?? DEFAULT_URL).replace(/\/+$/, "");
  const label =
    flags.label ?? `${os.userInfo().username}@${os.hostname()}`.slice(0, 60);

  console.log(`Pairing with ${blue(url)} as ${bold(label)}`);
  const password = await askHidden("Admin password: ");
  if (!password) throw new CliError("No password given.");

  const data = await api({ url }, "/api/cli/auth", {
    method: "POST",
    body: { password, label },
  });
  saveConfig({ url, token: data.token, label: data.label });
  console.log(green("✓") + ` Paired. Token saved to ${dim(CONFIG_PATH)}`);
  console.log(dim("  Revoke it anytime under Admin → Settings → CLI access."));
}

async function cmdLogout() {
  const cfg = loadConfig();
  if (!cfg?.token) {
    console.log(dim("Not paired — nothing to do."));
    return;
  }
  try {
    await api(cfg, "/api/cli/auth", { method: "DELETE" });
    console.log(green("✓") + " Token revoked on the server.");
  } catch (err) {
    console.log(yellow("!") + ` Couldn't revoke remotely (${err.message})`);
    console.log(dim("  Revoke it under Admin → Settings → CLI access."));
  }
  deleteConfig();
  console.log(green("✓") + " Local credentials removed.");
}

async function cmdStatus() {
  const cfg = requireLogin();
  const [who, meta] = await Promise.all([
    api(cfg, "/api/cli/auth"),
    api(cfg, "/api/cli/meta"),
  ]);
  console.log(`${bold(meta.section)} ${dim("·")} ${dim(meta.schoolYear)}`);
  console.log(`${dim("server")}   ${blue(cfg.url)}`);
  console.log(`${dim("token")}    ${who.label} ${dim(`(since ${who.createdAt.slice(0, 10)})`)}`);
  console.log(`${dim("open")}     ${meta.openTasks} task${meta.openTasks === 1 ? "" : "s"}`);
}

async function pickFrom(items, render, promptText, matcher) {
  items.forEach((item, i) =>
    console.log(`  ${dim(String(i + 1).padStart(2))} ${render(item)}`)
  );
  for (;;) {
    const answer = await ask(promptText);
    if (!answer) continue;
    const byNumber = /^\d+$/.test(answer) ? items[Number(answer) - 1] : undefined;
    const found = byNumber ?? items.find((item) => matcher(item, answer));
    if (found) return found;
    console.log(red("✗") + " No match — give a number or a code from the list.");
  }
}

async function cmdAdd(argv) {
  const { flags, positional } = parseArgs(argv, {
    "--subject": F("subject"), "-s": F("subject"),
    "--type": F("type"), "-t": F("type"),
    "--due": F("due"), "-d": F("due"),
    "--time": F("time"),
    "--points": F("points"), "-p": F("points"),
    "--note": F("note"), "-n": F("note"),
    "--details": F("details"),
    "--link": F("link"),
    "--tentative": F("tentative", false),
  });
  const cfg = requireLogin();
  const meta = await api(cfg, "/api/cli/meta");

  let title = positional.join(" ").trim();
  if (!title) title = await ask("Title: ");
  if (!title) throw new CliError("A task needs a title.");

  let subject = flags.subject;
  if (!subject) {
    console.log(bold("Subject"));
    const picked = await pickFrom(
      meta.subjects,
      (s) =>
        `${bold(s.short.padEnd(8))} ${s.name}${s.strand ? dim(` (${s.strand})`) : ""}`,
      "Subject (number or code): ",
      (s, q) => s.short.toLowerCase() === q.toLowerCase()
    );
    subject = picked.short;
  }

  let type = flags.type;
  if (!type) {
    console.log(bold("Type"));
    const picked = await pickFrom(
      meta.types,
      (t) => `${bold(t.short.padEnd(8))} ${t.name}`,
      "Type (number or code): ",
      (t, q) =>
        t.short.toLowerCase() === q.toLowerCase() || t.name.toLowerCase() === q.toLowerCase()
    );
    type = picked.short;
  }

  let due = flags.due ? parseDue(flags.due) : null;
  if (flags.due && !due) throw new CliError(`Couldn't read the date "${flags.due}".`);
  while (!due) {
    const answer = await ask("Due (today · tomorrow · fri · jul 15): ");
    due = parseDue(answer);
    if (!due) console.log(red("✗") + " Couldn't read that date — try again.");
  }

  const body = {
    title,
    subject,
    type,
    due,
    time: flags.time ?? null,
    details: flags.details ?? "",
    note: flags.note ?? null,
    points: flags.points !== undefined ? Number(flags.points) : null,
    tentative: Boolean(flags.tentative),
    links: flags.link ? [{ url: flags.link }] : [],
  };
  if (flags.points !== undefined && !Number.isFinite(body.points)) {
    throw new CliError(`Points must be a number, got "${flags.points}".`);
  }

  const created = await api(cfg, "/api/cli/tasks", { method: "POST", body });
  const label = dueLabel(created.due);
  console.log(
    `${green("✓")} Added ${dim(`#${created.id}`)} ${bold(created.type.toUpperCase())} ${created.title}` +
      ` ${dim("·")} ${created.subject} ${dim("·")} ${TONE[label.tone](label.text)}` +
      (created.status === "tentative" ? ` ${yellow("· unconfirmed")}` : "")
  );
}

async function cmdList(argv) {
  const { flags } = parseArgs(argv, {
    "--all": F("all", false),
    "--json": F("json", false),
  });
  const cfg = requireLogin();
  const { tasks } = await api(cfg, `/api/cli/tasks${flags.all ? "?all=1" : ""}`);

  if (flags.json) {
    console.log(JSON.stringify(tasks, null, 2));
    return;
  }
  if (tasks.length === 0) {
    console.log(dim("All clear — nothing open."));
    return;
  }

  const width = Math.max(...tasks.map((t) => t.title.length));
  const titleW = Math.min(Math.max(width, 12), 46);
  for (const t of tasks) {
    const label = dueLabel(t.due);
    const flagsCol = [
      t.movedFrom ? yellow("moved") : null,
      t.status === "tentative" ? yellow("unconfirmed") : null,
      t.status === "done" ? green("done") : null,
      t.status === "cancelled" ? dim("cancelled") : null,
    ]
      .filter(Boolean)
      .join(" ");
    const title = t.title.length > titleW ? `${t.title.slice(0, titleW - 1)}…` : t.title;
    console.log(
      [
        dim(`#${String(t.id).padStart(3)}`),
        bold(t.type.toUpperCase().padEnd(5)),
        title.padEnd(titleW),
        mono(t.subject.padEnd(6)),
        TONE[label.tone](label.text.padEnd(12)),
        flagsCol,
      ]
        .join("  ")
        .trimEnd()
    );
  }
}

async function cmdMove(argv) {
  const { flags, positional } = parseArgs(argv, {
    "--note": F("note"), "-n": F("note"),
    "--confirmed": F("confirmed", false),
  });
  const [idRaw, ...dateParts] = positional;
  const id = Number(idRaw);
  if (!Number.isInteger(id)) throw new CliError("Usage: tapulan move <id> <date> [--confirmed]");
  const to = parseDue(dateParts.join(" "));
  if (!to) throw new CliError(`Couldn't read the date "${dateParts.join(" ")}".`);

  const cfg = requireLogin();
  const data = await api(cfg, `/api/cli/tasks/${id}`, {
    method: "PATCH",
    body: { move: { to, tentative: !flags.confirmed, note: flags.note ?? null } },
  });
  const label = dueLabel(data.due);
  console.log(
    `${green("✓")} Moved ${dim(`#${data.id}`)} ${data.title}` +
      ` ${dim("·")} ${data.movedFrom ? `${data.movedFrom} → ` : ""}${data.due}` +
      ` ${TONE[label.tone](`(${label.text})`)}` +
      (data.status === "tentative" ? ` ${yellow("· unconfirmed")}` : "")
  );
}

async function cmdSetStatus(argv, status, verb) {
  const id = Number(argv[0]);
  if (!Number.isInteger(id)) throw new CliError(`Usage: tapulan ${verb} <id>`);
  const cfg = requireLogin();
  const data = await api(cfg, `/api/cli/tasks/${id}`, {
    method: "PATCH",
    body: { status },
  });
  console.log(`${green("✓")} ${bold(verb)} ${dim(`#${data.id}`)} ${data.title}`);
}

async function cmdCancel(argv) {
  const { flags, positional } = parseArgs(argv, { "--reason": F("reason"), "-r": F("reason") });
  const id = Number(positional[0]);
  if (!Number.isInteger(id)) throw new CliError("Usage: tapulan cancel <id> [reason…]");
  // reason: a --reason flag, or any words after the id ("cancel 4 teacher out")
  const text = flags.reason ?? positional.slice(1).join(" ").trim();
  const reason = text ? text : null;
  const cfg = requireLogin();
  const data = await api(cfg, `/api/cli/tasks/${id}`, {
    method: "PATCH",
    body: { status: "cancelled", reason },
  });
  console.log(
    `${green("✓")} ${bold("cancel")} ${dim(`#${data.id}`)} ${data.title}` +
      (data.cancelReason ? ` ${dim("·")} ${dim(data.cancelReason)}` : "")
  );
}

async function cmdRemove(argv) {
  const { flags, positional } = parseArgs(argv, { "--yes": F("yes", false), "-y": F("yes", false) });
  const id = Number(positional[0]);
  if (!Number.isInteger(id)) throw new CliError("Usage: tapulan rm <id> [--yes]");
  const cfg = requireLogin();
  if (!flags.yes) {
    const answer = await ask(`Delete task #${id} for the whole section? (y/N) `);
    if (answer.toLowerCase() !== "y") {
      console.log(dim("Kept."));
      return;
    }
  }
  const data = await api(cfg, `/api/cli/tasks/${id}`, { method: "DELETE" });
  console.log(`${green("✓")} Deleted ${dim(`#${data.id}`)} ${data.title}`);
}

function cmdHelp() {
  const rows = [
    ["login [url]", "pair with a Tapulan server (asks for the admin password)"],
    ["logout", "revoke this machine's token and forget it"],
    ["status", "server, token, and open-task count"],
    ["", ""],
    ["add [title]", "add a task — prompts for anything missing"],
    ["  -s, --subject", "subject code (cpar, pr2, …)"],
    ["  -t, --type", "type (quiz, ut, asgn, peta, …)"],
    ["  -d, --due", "today · tomorrow · fri · next mon · +3 · jul 15"],
    ["  --time HH:MM", "due time"],
    ["  -p, --points", "points"],
    ["  -n, --note", "clarification note"],
    ["  --details", "coverage / format details"],
    ["  --link URL", "attach a material link"],
    ["  --tentative", "post as unconfirmed"],
    ["", ""],
    ["list [--all] [--json]", "open tasks (--all includes done & cancelled)"],
    ["move <id> <date>", "reschedule — records old → new honestly"],
    ["  --confirmed", "teacher already confirmed the new date"],
    ["done <id>", "mark done for the whole section"],
    ["confirm <id>", "confirm a tentative date"],
    ["cancel <id> [reason]", "mark cancelled — optional reason shown to the section"],
    ["rm <id> [--yes]", "delete outright"],
  ];
  console.log(`${bold("tapulan")} ${dim("— the app does the remembering so you don't have to")}\n`);
  for (const [cmd, desc] of rows) {
    console.log(cmd ? `  ${cmd.padEnd(24)} ${dim(desc)}` : "");
  }
  console.log(`\n${dim(`config: ${CONFIG_PATH}`)}`);
}

/* ------------------------------------------------------------------ main */

const COMMANDS = {
  login: cmdLogin,
  logout: cmdLogout,
  status: cmdStatus,
  whoami: cmdStatus,
  add: cmdAdd,
  new: cmdAdd,
  list: cmdList,
  ls: cmdList,
  move: cmdMove,
  done: (argv) => cmdSetStatus(argv, "done", "done"),
  confirm: (argv) => cmdSetStatus(argv, "confirmed", "confirm"),
  cancel: cmdCancel,
  rm: cmdRemove,
  remove: cmdRemove,
  help: cmdHelp,
  "--help": cmdHelp,
  "-h": cmdHelp,
};

const [, , command, ...rest] = process.argv;
const run = COMMANDS[command ?? "help"];

if (!run) {
  console.error(red("✗") + ` Unknown command "${command}". See \`tapulan help\`.`);
  process.exit(1);
}

try {
  await run(rest);
} catch (err) {
  if (err instanceof CliError) {
    console.error(red("✗") + ` ${err.message}`);
  } else {
    console.error(red("✗") + ` Unexpected error: ${err?.message ?? err}`);
  }
  process.exit(1);
}
