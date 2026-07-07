import {
  getOpenTaskCount,
  getSettings,
  getStrands,
  getSubjects,
  getTaskTypes,
} from "@/lib/queries";
import { jsonOk, requireToken } from "@/lib/api/cli";

/**
 * Everything the CLI needs to validate and autocomplete task input:
 * subjects, types, strands, and the section identity for the banner.
 */
export async function GET(req: Request) {
  const auth = requireToken(req);
  if (auth instanceof Response) return auth;

  const settings = getSettings();
  return jsonOk({
    section: settings.sectionName,
    schoolYear: settings.schoolYear,
    openTasks: getOpenTaskCount(),
    strands: getStrands().map((s) => s.code),
    subjects: getSubjects().map((s) => ({
      id: s.id,
      short: s.short,
      name: s.name,
      strand: s.strand,
      teacher: s.teacher?.name ?? null,
    })),
    types: getTaskTypes().map((t) => ({ id: t.id, short: t.short, name: t.name })),
  });
}
