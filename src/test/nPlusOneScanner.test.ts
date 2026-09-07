import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scan } from '../nPlusOneScanner';

test('scan flags a TypeORM findOne inside a for-of loop', () => {
  const text = ['for (const id of ids) {', '  const user = await userRepo.findOne({ where: { id } });', '}'].join('\n');
  const hits = scan(text);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].line, 2);
});

test('scan flags a Sequelize findByPk inside a classic for loop', () => {
  const text = ['for (let i = 0; i < ids.length; i++) {', '  const user = await User.findByPk(ids[i]);', '}'].join('\n');
  const hits = scan(text);
  assert.equal(hits.length, 1);
});

test('scan flags an ORM call inside .forEach', () => {
  const text = ['ids.forEach(async (id) => {', '  const user = await userRepo.findOne(id);', '});'].join('\n');
  const hits = scan(text);
  assert.equal(hits.length, 1);
});

test('scan flags a Drizzle query inside a loop', () => {
  const text = ['for (const id of ids) {', '  const row = await db.query.users.findFirst({ where: eq(users.id, id) });', '}'].join('\n');
  const hits = scan(text);
  assert.equal(hits.length, 1);
});

test('scan does not flag an ORM call outside any loop', () => {
  const text = 'const user = await userRepo.findOne({ where: { id } });';
  assert.equal(scan(text).length, 0);
});

test('scan does not flag a batched findAll/find-many call outside a loop', () => {
  const text = 'const users = await userRepo.find({ where: { id: In(ids) } });';
  assert.equal(scan(text).length, 0);
});

test('scan stops tracking once the loop closes', () => {
  const text = [
    'for (const id of ids) {',
    '  doSomethingElse(id);',
    '}',
    'const user = await userRepo.findOne({ where: { id: 1 } });',
  ].join('\n');
  assert.equal(scan(text).length, 0);
});

test('scan handles a nested loop correctly', () => {
  const text = [
    'for (const a of as) {',
    '  for (const b of bs) {',
    '    const x = await repo.findOne({ where: { a, b } });',
    '  }',
    '}',
  ].join('\n');
  const hits = scan(text);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].line, 3);
});

test('scan ignores commented-out lines', () => {
  const text = ['for (const id of ids) {', '  // const user = await userRepo.findOne(id);', '}'].join('\n');
  assert.equal(scan(text).length, 0);
});
