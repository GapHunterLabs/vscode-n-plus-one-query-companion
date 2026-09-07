/**
 * Pure text scanner -- no `vscode` dependency. New niche (not a port
 * from the Kotlin catalog, though it reuses the same brace-depth
 * loop-tracking technique already proven in this workstream's Ruby
 * Companion's Net::HTTP-in-loop scanner). Evidence: confirmed by a
 * dedicated search -- "there doesn't appear to be a dedicated N+1
 * query detector extension available in the Visual Studio Code
 * marketplace" -- existing TypeORM/Sequelize/Drizzle extensions are
 * schema visualizers/snippets, none analyzes call patterns for N+1.
 *
 * v0.1 scope, honestly noted: flags an ORM find/query call reachable
 * from inside ANY loop shape (for/for-of/for-in/while/.forEach/.map),
 * regardless of whether that call's result is actually used per-
 * iteration in a way that couldn't be batched -- a real, deliberate
 * false-positive tolerance (same principle as the Go timer-leak
 * scanner): catching the common real mistake matters more than
 * perfect precision on every edge case.
 */

export interface Hit {
  line: number; // 1-based
  ormCall: string;
}

const LOOP_HEADER = /^\s*for\s*\(.*\)\s*\{?\s*$/;
const FOR_OF_IN_HEADER = /^\s*for\s*\(\s*(const|let|var)\s+\w+\s+(of|in)\s+.+\)\s*\{?\s*$/;
const WHILE_HEADER = /^\s*while\s*\(.*\)\s*\{?\s*$/;
const CALLBACK_LOOP_HEADER = /\.(forEach|map)\s*\(\s*(async\s+)?\(?[\w,\s]*\)?\s*(:\s*\w+\s*)?=>\s*\{?\s*$/;
const BLOCK_END = /^\s*\}\s*(\))?\s*;?\s*$/;

// TypeORM/Sequelize share these method names on a repository/model.
// Drizzle uses db.select()/db.query.<table>.findFirst() instead.
const ORM_CALL = /\b(?:\w+\.)?(findOne|findOneBy|findByPk|findAndCountAll|findBy|find|findAll)\s*\(/;
const DRIZZLE_CALL = /\bdb\.(select\s*\(|query\.\w+\.(findFirst|findMany)\s*\()/;

function isLoopHeader(line: string): boolean {
  return LOOP_HEADER.test(line) || FOR_OF_IN_HEADER.test(line) || WHILE_HEADER.test(line) || CALLBACK_LOOP_HEADER.test(line);
}

function braceDelta(line: string): number {
  return (line.match(/\{/g)?.length ?? 0) - (line.match(/\}/g)?.length ?? 0);
}

export function scan(text: string): Hit[] {
  const hits: Hit[] = [];
  let loopDepth = 0; // > 0 means currently inside at least one loop
  let braceDepthSinceLoopEntry = 0;

  text.split('\n').forEach((rawLine, index) => {
    const trimmed = rawLine.trim();
    if (trimmed === '' || trimmed.startsWith('//') || trimmed.startsWith('*')) return;

    if (loopDepth === 0 && isLoopHeader(trimmed)) {
      loopDepth = 1;
      braceDepthSinceLoopEntry = braceDelta(trimmed);
      // A loop header with no opening brace on this line (unusual,
      // but valid for a single-statement for/while body) never
      // reaches depth > 0, so the very next line is still treated as
      // inside the loop by the check below -- acceptable v0.1
      // imprecision, same class as the other loop scanners here.
      return;
    }

    if (loopDepth > 0) {
      braceDepthSinceLoopEntry += braceDelta(trimmed);

      const ormMatch = ORM_CALL.exec(trimmed) ?? DRIZZLE_CALL.exec(trimmed);
      if (ormMatch) {
        hits.push({ line: index + 1, ormCall: ormMatch[0].replace(/\($/, '') });
      }

      if (braceDepthSinceLoopEntry <= 0 && BLOCK_END.test(trimmed)) {
        loopDepth = 0;
      }
    }
  });

  return hits;
}
