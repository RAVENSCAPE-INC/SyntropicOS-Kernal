# Syntropic IDE Prototype

Minimal prototype for the self-modifying Syntropic IDE. Includes an Electron shell, Monaco editor (via CDN), and a tiny local `agent-host` HTTP service.

Getting started

1. Install dependencies (from `ide-prototype`):

```bash
cd ide-prototype
npm install
```

2. Start the agent host (in one terminal):

```bash
npm run start:agent
```

3. Start the Electron prototype (in another terminal):

```bash
npm start
```

Usage

- Use the file path input to open and save files from the host filesystem.
- Click "Ask Agent To Plan" to POST the current buffer (first 1k chars) to `http://127.0.0.1:3001/plan`.

Notes

- This is a minimal scaffold to iterate quickly. It uses the `preload` bridge to allow safe file I/O for the renderer.
 - This is a minimal scaffold to iterate quickly. It uses the `preload` bridge to allow safe file I/O for the renderer.
 - The IDE prototype now supports safe self-modification: before applying an agent suggestion the workspace file is backed up to `file.bak.<timestamp>`. You can rollback to the latest backup using the `Rollback` button in the Agent panel.
 - For production or more advanced development, add authentication, process supervision for the agent, and secure IPC boundaries.
