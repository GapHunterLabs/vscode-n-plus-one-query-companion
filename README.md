# N+1 Query Companion (VS Code)

Flags a TypeORM/Sequelize/Drizzle find/query call inside a loop — the
classic N+1 query anti-pattern. No data leaves your editor.

**v0.1, new niche.** Not a port from the Gap Hunter Labs IntelliJ-
family catalog. Evidence: confirmed by a dedicated search — *"there
doesn't appear to be a dedicated N+1 query detector extension
available in the Visual Studio Code marketplace"* — existing
TypeORM/Sequelize/Drizzle extensions are schema visualizers or
snippets, none analyzes call patterns for N+1.

## What it does

Live, on any `.ts`/`.tsx`/`.js`/`.jsx` file: tracks loop scope
(`for`, `for...of`, `for...in`, `while`, `.forEach`, `.map`, including
nested loops) via a brace-depth scan, and flags a TypeORM/Sequelize
find-one-shaped call (`findOne`, `findOneBy`, `findByPk`, `find`,
`findBy`, ...) or a Drizzle `db.select(`/`db.query.<table>.findFirst/
findMany(` reached from inside that scope.

```
for (const id of ids) {
  const user = await userRepo.findOne({ where: { id } }); // flagged
}
```

**v0.1 scope, honestly noted:** flags any ORM call reachable from
inside a loop, regardless of whether its result could actually be
batched — a deliberate false-positive tolerance (catching the common
real mistake matters more than perfect precision on every case, same
principle already used by this workstream's Go Timer Leak Companion).

## Privacy

See [PRIVACY.md](PRIVACY.md) — zero network calls, everything runs
against files already open in your editor.

## Development

```bash
npm install
npm run compile   # or: npm run watch
npm test
```

To build an installable package without publishing:

```bash
npx @vscode/vsce package
```

## License

Apache License 2.0 — see [LICENSE](LICENSE).
