# Roadmap: solid2-compiler

This folder is a parallel roadmap. `GOAL.md` has the outcome. Each node is a folder under `nodes/`.

Rules for agents working on a node:

- Branch from `1.0` and target `1.0`. Never `main`.
- Work only on your own node. Edit files inside your brief's owned paths and your own `nodes/<id>/` folder.
- Do not edit other briefs, `status` fields, contracts or `GOAL.md`. The orchestrator owns them.
- If a contract is wrong, write `contracts/<name>.change-request.md` and adapt locally. Do not edit the contract.
- Keep snapshots unchanged unless your brief says the output changes. Run `pnpm -C packages/core test` before you finish.
- Add a changeset for any change under `packages/`.
- Keep notes in your `log.md`. Finish by writing `outcome.md` from the template.
- Read the outcomes of your direct dependencies. Do not read other nodes' logs.

Script: `python3 <skill>/scripts/plan.py <root> context <id>` lists the files to load for a node.
