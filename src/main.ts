import { Plugin, Notice } from "obsidian";
import { MsalAuth } from "./auth/MsalAuth";
import { TodoClient } from "./api/TodoClient";
import { SyncEngine } from "./sync/SyncEngine";
import { MsTodoSettingsTab } from "./ui/SettingsTab";
import { DEFAULT_SETTINGS, type PluginSettings } from "./types";

export default class MsTodoSyncPlugin extends Plugin {
	settings!: PluginSettings;
	auth!: MsalAuth;
	todoClient!: TodoClient;
	syncEngine!: SyncEngine;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.auth = new MsalAuth(this.settings.clientId);
		this.todoClient = new TodoClient(() => this.auth.getToken());
		this.syncEngine = new SyncEngine(this.app.vault, this.todoClient);

		this.addSettingTab(new MsTodoSettingsTab(this.app, this));

		this.addCommand({
			id: "sync-ms-todo",
			name: "Sync MS To Do",
			callback: async () => {
				await this.runSync();
			},
		});

		if (this.settings.syncInterval > 0) {
			this.startAutoSync(this.settings.syncInterval);
		}

		console.log("MS To Do Sync plugin loaded.");
	}

	onunload(): void {
		console.log("MS To Do Sync plugin unloaded.");
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<PluginSettings>
		);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	async runSync(): Promise<void> {
		const signedIn = await this.auth.isSignedIn();
		if (!signedIn) {
			new Notice(
				"MS To Do Sync: Not signed in. Please configure the plugin in Settings."
			);
			return;
		}

		const enabledCount = this.settings.listMappings.filter((m) => m.enabled).length;
		if (enabledCount === 0) {
			new Notice("MS To Do Sync: No lists enabled. Enable lists in Settings.");
			return;
		}

		new Notice("MS To Do Sync: Starting sync…");

		try {
			const summary = await this.syncEngine.syncAll(this.settings);

			const parts: string[] = [
				`MS To Do Sync: Done. ${summary.listsProcessed} list(s), ${summary.tasksWritten} task(s).`,
			];
			if (summary.errors.length > 0) {
				parts.push(`Errors: ${summary.errors.join("; ")}`);
			}

			new Notice(parts.join("\n"), summary.errors.length > 0 ? 8000 : 4000);
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			new Notice(`MS To Do Sync: Sync failed — ${msg}`, 8000);
			console.error("MS To Do Sync error:", err);
		}
	}

	private startAutoSync(intervalMinutes: number): void {
		const ms = intervalMinutes * 60 * 1000;
		this.registerInterval(
			window.setInterval(async () => {
				try {
					await this.runSync();
				} catch (err) {
					console.error("MS To Do auto-sync error:", err);
				}
			}, ms)
		);
	}
}
