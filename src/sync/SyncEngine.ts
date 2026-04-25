import { normalizePath, TFile, TFolder, type Vault } from "obsidian";
import type { TodoTask, PluginSettings } from "../types";
import type { TodoClient } from "../api/TodoClient";

export interface SyncSummary {
  listsProcessed: number;
  tasksWritten: number;
  errors: string[];
}

export class SyncEngine {
  private vault: Vault;
  private client: TodoClient;

  constructor(vault: Vault, client: TodoClient) {
    this.vault = vault;
    this.client = client;
  }

  formatTask(task: TodoTask): string[] {
    const lines: string[] = [];
    const checkbox = task.status === "completed" ? "- [x]" : "- [ ]";
    let line = `${checkbox} ${task.title}`;

    if (task.dueDateTime) {
      const datePart = task.dueDateTime.dateTime.substring(0, 10);
      line += ` 📅 ${datePart}`;
    }

    if (task.importance === "high") {
      line += " ⏫";
    }

    lines.push(line);

    if (task.body && task.body.content && task.body.content.trim()) {
      const content =
        task.body.contentType === "html"
          ? this.stripHtml(task.body.content).trim()
          : task.body.content.trim();

      if (content) {
        const noteLines = content.split(/\r?\n/).filter((l) => l.trim());
        for (const noteLine of noteLines) {
          lines.push(`    - ${noteLine.trim()}`);
        }
      }
    }

    return lines;
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<\/?(p|div|br|li|tr)[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ");
  }

  buildFileContent(tasks: TodoTask[]): string {
    if (tasks.length === 0) {
      return "<!-- No tasks in this list -->\n";
    }
    const lines: string[] = [];
    for (const task of tasks) {
      lines.push(...this.formatTask(task));
    }
    return lines.join("\n") + "\n";
  }

  async syncList(listId: string, filePath: string): Promise<number> {
    const tasks = await this.client.getTasks(listId);
    const content = this.buildFileContent(tasks);
    const normalizedPath = normalizePath(filePath);

    const parts = normalizedPath.split("/");
    if (parts.length > 1) {
      const dir = parts.slice(0, -1).join("/");
      await this.ensureFolder(dir);
    }

    const existing = this.vault.getAbstractFileByPath(normalizedPath);

    if (existing instanceof TFolder) {
      throw new Error(`Path ${normalizedPath} exists as a folder, cannot write file.`);
    }

    if (existing instanceof TFile) {
      await this.vault.modify(existing, content);
    } else {
      await this.vault.create(normalizedPath, content);
    }

    return tasks.length;
  }

  private async ensureFolder(folderPath: string): Promise<void> {
    const parts = folderPath.split("/");
    let current = "";
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      const existing = this.vault.getAbstractFileByPath(current);
      if (!existing) {
        await this.vault.createFolder(current);
      }
    }
  }

  async syncAll(settings: PluginSettings): Promise<SyncSummary> {
    const summary: SyncSummary = {
      listsProcessed: 0,
      tasksWritten: 0,
      errors: [],
    };

    const enabledMappings = settings.listMappings.filter((m) => m.enabled);

    for (const mapping of enabledMappings) {
      try {
        const count = await this.syncList(mapping.listId, mapping.filePath);
        summary.listsProcessed++;
        summary.tasksWritten += count;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        summary.errors.push(`${mapping.listName}: ${msg}`);
      }
    }

    return summary;
  }
}
