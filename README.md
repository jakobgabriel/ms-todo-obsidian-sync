# MS To Do Sync

An [Obsidian](https://obsidian.md) plugin that syncs your Microsoft To Do tasks into your vault as Markdown files, using the [Microsoft Graph API](https://learn.microsoft.com/en-us/graph/api/resources/todo-overview).

Tasks are formatted using [Obsidian Tasks](https://obsidian-tasks-group.github.io/obsidian-tasks/) syntax — checkboxes, due dates, and priorities all included.

## Features

- **One-way sync** (To Do → vault) — pull tasks on demand or on a schedule
- **Obsidian Tasks format** — `- [ ] Task title 📅 2024-03-15`
- **Completed tasks** — synced as `- [x] Task title`
- **Due dates** — formatted as `📅 YYYY-MM-DD`
- **High priority** — formatted with `⏫`
- **Task notes** — appear as indented sub-bullets
- **Per-list file mapping** — map each To Do list to any vault path
- **Auto-created folders** — missing parent folders are created automatically
- **Auto-sync interval** — optional scheduled sync (e.g., every 15 minutes)

## Requirements

- Obsidian 1.4 or later (desktop only)
- A Microsoft account with access to Microsoft To Do
- An Azure app registration (free, takes ~5 minutes)

## Azure App Registration

You need to register a free Azure app to give the plugin permission to read your tasks. No credit card is required.

1. Go to the [Azure portal app registrations](https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade) and click **New registration**
2. Give it any name (e.g., `Obsidian MS To Do Sync`)
3. Under **Supported account types**, choose **Accounts in any organizational directory and personal Microsoft accounts**
4. Click **Register**
5. Copy the **Application (client) ID** — you will paste this into the plugin settings
6. In the left sidebar click **Authentication** → **Add a platform** → **Mobile and desktop applications**
7. Add this redirect URI: `https://login.microsoftonline.com/common/oauth2/nativeclient`
8. Click **Configure**
9. In the left sidebar click **API permissions** → **Add a permission** → **Microsoft Graph** → **Delegated permissions**
10. Search for and add: `Tasks.ReadWrite` and `User.Read`
11. Click **Add permissions** (admin consent is not required for delegated permissions)

## Installation

### From the community store (recommended)

1. Open Obsidian → Settings → Community plugins → Browse
2. Search for **MS To Do Sync** and click Install, then Enable

### Manual installation

1. Download `main.js` and `manifest.json` from the [latest release](https://github.com/jakobgabriel/ms-todo-obsidian-sync/releases/latest)
2. Create folder `<your-vault>/.obsidian/plugins/mstodo-sync/`
3. Copy both files into that folder
4. Enable the plugin in Obsidian → Settings → Community plugins

## Plugin Setup

1. Open Settings → **MS To Do Sync**
2. Paste your **Azure Client ID** into the field
3. Click **Sign In** — a Microsoft login popup will appear
4. Complete sign-in with your Microsoft account
5. Your To Do lists appear below — toggle on the lists you want to sync
6. Optionally change the vault file path for each list
7. Click **Sync Now** or run the **Sync MS To Do** command from the command palette

## Task Format

Tasks are written in [Obsidian Tasks](https://obsidian-tasks-group.github.io/obsidian-tasks/) format:

```markdown
- [ ] Buy groceries 📅 2024-03-15
- [x] Completed task
- [ ] High priority task ⏫
- [ ] Task with a note
    - The note content appears here as a sub-bullet
```

## Settings

| Setting | Default | Description |
|---|---|---|
| Azure Client ID | — | Your Azure app's Application (client) ID |
| Sign In / Sign Out | — | Authenticate with your Microsoft account |
| List toggles | off | Enable each To Do list you want to sync |
| File path per list | `MS To Do/<list name>.md` | Vault path where tasks are written |
| Default folder | `MS To Do` | Base folder used for auto-generated paths |
| Auto-sync interval | `0` | Minutes between automatic syncs (0 = manual only) |

## Command

**Sync MS To Do** — available in the command palette (Ctrl/Cmd+P). Pulls all enabled lists and shows a notice with the result.

## Roadmap

- **P2** — Two-way sync: checking off a task in Obsidian marks it complete in To Do
- **P2** — Configurable auto-sync interval without restart
- **P3** — Create new To Do tasks from Obsidian (`- [ ] task #todo`)
- **P3** — Task priorities (High/Medium/Low)

## Development

```bash
git clone https://github.com/jakobgabriel/ms-todo-obsidian-sync
cd ms-todo-obsidian-sync
npm install
npm run dev      # watch mode — rebuilds main.js on save
npm run build    # production build
npm run typecheck
```

### Project structure

```
src/
  main.ts           # Plugin entry point
  types.ts          # TypeScript interfaces
  auth/
    MsalAuth.ts     # OAuth2 PKCE via MSAL.js
  api/
    TodoClient.ts   # Microsoft Graph API client
  sync/
    SyncEngine.ts   # Markdown formatting and vault writes
  ui/
    SettingsTab.ts  # Plugin settings UI
```

## License

MIT © jakobgabriel
