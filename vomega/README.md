# SyntropicOS Kernel vΩ

Hybrid UI + Node kernel prototype (vOmega). This scaffold provides a minimal hybrid setup: a Node kernel exposing planner/resonance endpoints and a browser UI (Monaco) that talks to the kernel.

Quick start (from repo root):

```bash
cd vomega
npm install
npm run run-kernel    # starts kernel on :4010
npm run run-ui        # starts UI on :4020
open http://127.0.0.1:4020
```

What's included:
- `kernel/` — Express kernel with `/resonance`, `/plan`, `/plan-slow`
- `ui/` — browser UI (Monaco) served by `ui/server.js`
- `agents/` — planner stub
- `vfs/` — simple snapshot and events JSONL overlay
- `tests/` — very small smoke test

This is a minimal baseline for the vΩ architecture; next steps are adding the Diff & Patch Engine, scheduler, multi-agent runtime, and stronger tests.
