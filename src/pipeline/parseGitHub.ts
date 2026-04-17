export type GitHubRepo = {
  name: string;
  description: string | null;
  language: string | null;
  topics: string[];
  stargazers_count: number;
  fork: boolean;
  size: number;
};

export async function fetchGitHubProfile(username: string): Promise<string> {
  const headers: Record<string, string> = { 'User-Agent': 'proof-of-talent-oracle' };
  if (process.env.GITHUB_TOKEN) headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;

  const reposRes = await fetch(`https://api.github.com/users/${username}/repos?sort=pushed&per_page=30`, { headers });
  if (!reposRes.ok) {
    if (reposRes.status === 404) throw new Error(`GitHub user '${username}' not found`);
    throw new Error(`GitHub API error: ${reposRes.status}`);
  }

  const repos: GitHubRepo[] = await reposRes.json();
  const ownRepos = repos.filter(r => !r.fork).slice(0, 15);

  // Language breakdown
  const langCounts: Record<string, number> = {};
  for (const repo of ownRepos) {
    if (repo.language) langCounts[repo.language] = (langCounts[repo.language] ?? 0) + repo.size;
  }
  const totalSize = Object.values(langCounts).reduce((a, b) => a + b, 0) || 1;
  const langBreakdown = Object.entries(langCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([lang, size]) => `${lang}: ${Math.round((size / totalSize) * 100)}%`)
    .join(', ');

  // Fetch READMEs for top 3 most significant repos
  const topRepos = [...ownRepos].sort((a, b) => b.size - a.size).slice(0, 3);
  const readmes: string[] = [];
  for (const repo of topRepos) {
    try {
      const readmeRes = await fetch(
        `https://api.github.com/repos/${username}/${repo.name}/readme`,
        { headers: { ...headers, Accept: 'application/vnd.github.raw' } }
      );
      if (readmeRes.ok) {
        const text = await readmeRes.text();
        readmes.push(`Repo: ${repo.name}\n${text.slice(0, 600)}`);
      }
    } catch { /* skip */ }
  }

  const parts: string[] = [];

  parts.push(`GitHub Profile: ${username}`);
  parts.push(`Total repositories analyzed: ${ownRepos.length}`);
  parts.push(`Language breakdown: ${langBreakdown}`);

  parts.push('\n--- REPOSITORIES ---');
  for (const repo of ownRepos) {
    const topics = repo.topics.length > 0 ? ` [${repo.topics.slice(0, 5).join(', ')}]` : '';
    const desc = repo.description ? ` — ${repo.description}` : '';
    parts.push(`${repo.name} (${repo.language ?? 'unknown'})${desc}${topics}`);
  }

  if (readmes.length > 0) {
    parts.push('\n--- README SNIPPETS (top 3 repos) ---');
    for (const readme of readmes) {
      parts.push(readme);
      parts.push('');
    }
  }

  return parts.join('\n');
}
