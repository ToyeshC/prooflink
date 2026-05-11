import { generateObject } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

export const SkillSchema = z.object({
  name: z.string().describe('Canonical skill name, e.g. "React Hooks", "Binary Search Trees"'),
  slug: z.string().describe('URL-safe lowercase slug, e.g. "react-hooks"'),
  category: z.enum(['programming_language', 'framework', 'data_structures', 'algorithms', 'domain_knowledge', 'tool', 'soft_skill']),
  confidenceScore: z.number().describe('0.0–1.0 based on depth of evidence'),
  evidenceSummary: z.string().describe('One sentence explaining what evidence supports this skill claim'),
  gradeContext: z.string().nullable().describe('Relevant grade/assignment context, or null'),
});

export type Skill = z.infer<typeof SkillSchema>;

export const InferredSkillsSchema = z.object({
  skills: z.array(SkillSchema),
  overallAcademicLevel: z.enum(['introductory', 'intermediate', 'advanced', 'graduate']),
  primaryDomain: z.string().describe('The main technical domain, e.g. "full-stack web development"'),
  gradeValidityAssessment: z.string().describe('Brief assessment of whether grades reflect actual skill depth'),
});

export type InferredSkills = z.infer<typeof InferredSkillsSchema>;

const SYSTEM_PROMPT = `You are an expert academic-to-professional skills analyst. Your job is to analyze student learning artifacts (syllabi, code, grades) and infer market-ready skills.

Rules:
1. Only claim skills where there is actual evidence — don't hallucinate from course names alone
2. Code files are the strongest evidence; syllabi are weaker; grades alone are weakest
3. A score of 95% on "Introduction to Python" warrants lower confidence than 80% on "Advanced Algorithms"
4. Assign confidence scores based on: code quality/complexity, grade performance, course level, and number of corroborating signals
5. Distinguish between "exposure to" (confidence < 0.5) and "demonstrated competence in" (confidence >= 0.7)
6. Map to industry-recognized skill names, not course names
7. Use the shortest canonical slug: 'python' not 'python-programming', 'git' not 'git-github-version-control', 'javascript' not 'javascript-programming'. Never emit two skills that represent the same underlying technology.`;

export async function inferSkillsFromExport(exportSummary: string): Promise<InferredSkills> {
  const useAnthropic = !!process.env.ANTHROPIC_API_KEY;

  if (!useAnthropic) {
    if (!process.env.OPENROUTER_API_KEY) throw new Error('INFERENCE ENGINE DOWN: OPENROUTER_API_KEY not set');
    if (!process.env.INFERENCE_MODEL) throw new Error('INFERENCE ENGINE DOWN: INFERENCE_MODEL not set');
  }

  const prompt = `Analyze this developer's profile and infer their market-ready skills:\n\n${exportSummary}`;
  const abortSignal = AbortSignal.timeout(120_000);

  const { object } = await generateObject(
    useAnthropic
      ? {
          model: anthropic('claude-sonnet-4-6'),
          schema: InferredSkillsSchema,
          system: SYSTEM_PROMPT,
          prompt,
          abortSignal,
        }
      : {
          model: createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY! })(
            process.env.INFERENCE_MODEL!
          ),
          schema: InferredSkillsSchema,
          system: SYSTEM_PROMPT,
          prompt,
          abortSignal,
        }
  );

  return object;
}

export function formatSkillsReport(skills: InferredSkills): string {
  const lines = [
    `Primary Domain: ${skills.primaryDomain}`,
    `Academic Level: ${skills.overallAcademicLevel}`,
    `Grade Validity: ${skills.gradeValidityAssessment}`,
    '',
    'Inferred Skills:',
  ];

  const sorted = [...skills.skills].sort((a, b) => b.confidenceScore - a.confidenceScore);
  for (const skill of sorted) {
    const pct = Math.round(skill.confidenceScore * 100);
    lines.push(`  [${pct}%] ${skill.name} (${skill.category})`);
    lines.push(`        ${skill.evidenceSummary}`);
  }

  return lines.join('\n');
}
