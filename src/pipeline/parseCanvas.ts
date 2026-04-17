import AdmZip from 'adm-zip';
import path from 'path';

export type CanvasExport = {
  syllabi: string[];
  codeFiles: { name: string; content: string }[];
  gradeEntries: GradeEntry[];
  courseNames: string[];
};

export type GradeEntry = {
  assignment: string;
  score: string | null;
  possiblePoints: string | null;
  submissionDate: string | null;
};

const CODE_EXTENSIONS = new Set(['.ts', '.js', '.py', '.java', '.cpp', '.c', '.rs', '.go', '.rb', '.swift', '.kt', '.cs', '.html', '.css', '.sql', '.sh', '.r', '.scala', '.dart']);
const TEXT_EXTENSIONS = new Set(['.txt', '.md', '.pdf', '.docx', '.html']);

export function parseCanvasExport(zipPath: string): CanvasExport {
  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();

  const syllabi: string[] = [];
  const codeFiles: { name: string; content: string }[] = [];
  const gradeEntries: GradeEntry[] = [];
  const courseNames: string[] = [];

  for (const entry of entries) {
    if (entry.isDirectory) continue;
    const name = entry.entryName.toLowerCase();
    const ext = path.extname(name);

    if (name.includes('syllabus') || name.includes('course_settings')) {
      try {
        const content = entry.getData().toString('utf8');
        syllabi.push(content.slice(0, 8000));
        const courseMatch = content.match(/<title>([^<]+)<\/title>/i) || content.match(/course_name["\s:]+([^\n"]+)/i);
        if (courseMatch) courseNames.push(courseMatch[1].trim());
      } catch { /* skip unreadable files */ }
    }

    if (CODE_EXTENSIONS.has(ext) && entry.header.size < 100_000) {
      try {
        const content = entry.getData().toString('utf8');
        codeFiles.push({ name: entry.entryName, content: content.slice(0, 5000) });
      } catch { /* skip */ }
    }

    if (name.includes('grade') || name.includes('submission') || ext === '.csv') {
      try {
        const content = entry.getData().toString('utf8');
        gradeEntries.push(...parseGradeCsv(content));
      } catch { /* skip */ }
    }
  }

  return { syllabi, codeFiles, gradeEntries, courseNames };
}

function parseGradeCsv(csv: string): GradeEntry[] {
  const lines = csv.split('\n').filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
  const assignmentIdx = headers.findIndex(h => h.includes('assignment') || h.includes('title'));
  const scoreIdx = headers.findIndex(h => h.includes('score') || h.includes('grade'));
  const possibleIdx = headers.findIndex(h => h.includes('possible') || h.includes('max'));
  const dateIdx = headers.findIndex(h => h.includes('date') || h.includes('submitted'));

  return lines.slice(1).map(line => {
    const cols = line.split(',').map(c => c.trim().replace(/"/g, ''));
    return {
      assignment: assignmentIdx >= 0 ? cols[assignmentIdx] ?? '' : '',
      score: scoreIdx >= 0 ? cols[scoreIdx] ?? null : null,
      possiblePoints: possibleIdx >= 0 ? cols[possibleIdx] ?? null : null,
      submissionDate: dateIdx >= 0 ? cols[dateIdx] ?? null : null,
    };
  }).filter(e => e.assignment);
}

export function summarizeExport(parsed: CanvasExport): string {
  const parts: string[] = [];

  if (parsed.courseNames.length > 0) {
    parts.push(`Courses: ${parsed.courseNames.join(', ')}`);
  }

  if (parsed.syllabi.length > 0) {
    parts.push(`\n--- SYLLABI (${parsed.syllabi.length} found) ---`);
    for (const syllabus of parsed.syllabi.slice(0, 3)) {
      parts.push(syllabus.slice(0, 2000));
    }
  }

  if (parsed.codeFiles.length > 0) {
    parts.push(`\n--- CODE FILES (${parsed.codeFiles.length} found) ---`);
    for (const file of parsed.codeFiles.slice(0, 10)) {
      parts.push(`\nFile: ${file.name}\n${file.content.slice(0, 1000)}`);
    }
  }

  if (parsed.gradeEntries.length > 0) {
    const completed = parsed.gradeEntries.filter(e => e.score !== null);
    parts.push(`\n--- GRADES (${completed.length}/${parsed.gradeEntries.length} completed) ---`);
    for (const entry of completed.slice(0, 30)) {
      parts.push(`${entry.assignment}: ${entry.score}/${entry.possiblePoints ?? '?'}`);
    }
  }

  return parts.join('\n');
}
