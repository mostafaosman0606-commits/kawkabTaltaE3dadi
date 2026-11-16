import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/services/uuid.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const uuidModule = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('legacy conversation IDs are converted to valid UUIDs', () => {
  const id = uuidModule.ensureUUID('conv-1793730502909-6jb6h');
  assert.match(id, uuidModule.UUID_REGEX);
});

test('valid UUIDs are preserved without mutation', () => {
  const id = '550e8400-e29b-41d4-a716-446655440000';
  assert.equal(uuidModule.ensureUUID(id), id);
});

test('UUID validation rejects legacy and malformed values', () => {
  assert.equal(uuidModule.isValidUUID('conv-1793730502909-6jb6h'), false);
  assert.equal(uuidModule.isValidUUID('not-a-uuid'), false);
  assert.equal(uuidModule.isValidUUID(null), false);
});
