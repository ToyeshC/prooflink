/**
 * Proof of Talent Oracle — End-to-End Demo
 *
 * Usage:
 *   npx tsx src/demo.ts <path-to-canvas-export.zip> <student-wallet-address>
 *   npx tsx src/demo.ts --mock <student-wallet-address>
 *
 * The --mock flag generates a synthetic Canvas export for testing without a real ZIP.
 */
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const __dirname_compat = new URL('.', import.meta.url).pathname;
dotenv.config({ path: path.join(__dirname_compat, '../.env') });

import { parseCanvasExport, summarizeExport } from './pipeline/parseCanvas.js';
import { inferSkillsFromExport, formatSkillsReport } from './pipeline/inferSkills.js';
import { mintAllSkillAttestations } from './pipeline/mintAttestation.js';
import { indexAttestation, startOracleServer } from './api/oracle.js';

async function runPipeline(zipPathOrMock: string, studentWallet: string, skipMint = false) {
  console.log('\n=== PROOF OF TALENT ORACLE ===');
  console.log(`Student wallet: ${studentWallet}\n`);

  // Step 1: Parse Canvas export
  console.log('Step 1: Parsing Canvas export...');
  let exportSummary: string;

  if (zipPathOrMock === '--mock') {
    exportSummary = getMockExportSummary();
    console.log('(Using mock Canvas data)\n');
  } else {
    const parsed = parseCanvasExport(zipPathOrMock);
    exportSummary = summarizeExport(parsed);
    console.log(`Found: ${parsed.syllabi.length} syllabi, ${parsed.codeFiles.length} code files, ${parsed.gradeEntries.length} grade entries\n`);
  }

  // Step 2: LLM skill inference
  console.log('Step 2: Running LLM skill inference...');
  const inferredSkills = await inferSkillsFromExport(exportSummary);
  console.log('\n' + formatSkillsReport(inferredSkills) + '\n');

  const qualifyingSkills = inferredSkills.skills.filter(s => s.confidenceScore >= 0.5);
  console.log(`${qualifyingSkills.length}/${inferredSkills.skills.length} skills qualify for attestation (confidence >= 50%)\n`);

  if (skipMint) {
    console.log('(--skip-mint flag: skipping on-chain attestation)');
    return;
  }

  // Step 3: Mint SAS attestations
  console.log('Step 3: Minting SAS attestations on Solana...');
  const attestations = await mintAllSkillAttestations(
    studentWallet,
    qualifyingSkills.map(s => ({
      slug: s.slug,
      confidenceScore: s.confidenceScore,
      evidenceSummary: s.evidenceSummary,
    }))
  );

  // Step 4: Index in oracle
  console.log('\nStep 4: Indexing attestations in oracle...');
  for (const att of attestations) {
    indexAttestation(studentWallet, att.skill, att.attestationAddress);
    console.log(`  ✓ ${att.skill}: ${att.attestationAddress}`);
  }

  console.log(`\n=== DONE ===`);
  console.log(`${attestations.length} skill attestations minted and indexed.`);
  console.log(`\nVerify any skill:`);
  console.log(`  curl http://localhost:3000/api/verify?wallet=${studentWallet}&skill=<slug>`);
  console.log(`\nView full profile:`);
  console.log(`  curl http://localhost:3000/api/profile/${studentWallet}`);
}

function getMockExportSummary(): string {
  return `Courses: CS301 - Data Structures & Algorithms, CS450 - Full Stack Web Development, CS410 - Database Systems

--- SYLLABI ---
CS301: Topics include arrays, linked lists, trees, graphs, dynamic programming, sorting algorithms.
CS450: React, Node.js, Express, PostgreSQL, REST API design, JWT authentication, deployment.
CS410: SQL, normalization, indexing, query optimization, transactions.

--- CODE FILES ---
File: assignments/cs450/todo-app/src/components/TodoList.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useTodos } from '../hooks/useTodos';
const TodoList: React.FC = () => {
  const { todos, addTodo, deleteTodo, toggleTodo } = useTodos();
  return <div>{todos.map(todo => <TodoItem key={todo.id} {...todo} onDelete={deleteTodo} onToggle={toggleTodo} />)}</div>;
};

File: assignments/cs301/dijkstra.py
import heapq
def dijkstra(graph, start):
    dist = {node: float('inf') for node in graph}
    dist[start] = 0
    pq = [(0, start)]
    while pq:
        d, u = heapq.heappop(pq)
        for v, w in graph[u].items():
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                heapq.heappush(pq, (dist[v], v))
    return dist

File: assignments/cs410/query_optimizer.sql
-- Complex join with index hints and CTEs
WITH ranked_orders AS (
  SELECT customer_id, COUNT(*) as order_count, SUM(total) as revenue
  FROM orders WHERE created_at > NOW() - INTERVAL '30 days'
  GROUP BY customer_id HAVING COUNT(*) > 5
)
SELECT c.name, r.revenue FROM customers c JOIN ranked_orders r ON c.id = r.customer_id
ORDER BY r.revenue DESC LIMIT 100;

--- GRADES ---
CS450 - React Final Project: 94/100
CS301 - Algorithm Analysis Midterm: 88/100
CS301 - Dynamic Programming Assignment: 92/100
CS410 - Database Design Project: 96/100
CS450 - REST API Assignment: 91/100`;
}

// CLI entrypoint
const args = process.argv.slice(2);
const skipMint = args.includes('--skip-mint');
const filteredArgs = args.filter(a => a !== '--skip-mint');

if (filteredArgs.length < 2) {
  console.error('Usage: npx tsx src/demo.ts <canvas-export.zip|--mock> <student-wallet> [--skip-mint]');
  process.exit(1);
}

const [zipPath, studentWallet] = filteredArgs;

// Start oracle server in background, then run pipeline
startOracleServer(3000);
await runPipeline(zipPath, studentWallet, skipMint);
