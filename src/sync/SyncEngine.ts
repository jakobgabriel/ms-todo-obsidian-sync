import { normalizePath, TFile, TFolder, type Vault } from "obsidian";
import type {
  TodoTask,
  PatternedRecurrence,
  PluginSettings,
} from "../types";
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

    const checkbox = this.statusToCheckbox(task.status);
    let line = `${checkbox} ${task.title}`;

    // Categories → Obsidian #tags (sanitised for tag format)
    if (task.categories.length > 0) {
      const tags = task.categories
        .map((c) =>
          `#${c.replace(/[^a-zA-Z0-9À-ɏ_\-/]/g, "-").replace(/^-+|-+$/g, "")}`
        )
        .join(" ");
      line += ` ${tags}`;
    }

    // Obsidian Tasks emoji fields in canonical order: 🔁 🛫 📅 ✅ priority
    if (task.recurrence) {
      line += ` 🔁 ${this.formatRecurrence(task.recurrence)}`;
    }
    if (task.startDateTime) {
      line += ` 🛫 ${task.startDateTime.dateTime.substring(0, 10)}`;
    }
    if (task.dueDateTime) {
      line += ` 📅 ${task.dueDateTime.dateTime.substring(0, 10)}`;
    }
    if (task.completedDateTime) {
      line += ` ✅ ${task.completedDateTime.dateTime.substring(0, 10)}`;
    }
    if (task.importance === "high") {
      line += " 🔼";
    } else if (task.importance === "low") {
      line += " 🔽";
    }

    lines.push(line);

    // Body / notes
    if (task.body?.content?.trim()) {
      const content =
        task.body.contentType === "html"
          ? this.stripHtml(task.body.content).trim()
          : task.body.content.trim();
      for (const noteLine of content.split(/\r?\n/).filter((l) => l.trim())) {
        lines.push(`    - ${noteLine.trim()}`);
      }
    }

    // Checklist items (sub-tasks)
    for (const item of task.checklistItems) {
      const box = item.isChecked ? "[x]" : "[ ]";
      let itemLine = `    - ${box} ${item.displayName}`;
      if (item.isChecked && item.checkedDateTime) {
        itemLine += ` ✅ ${item.checkedDateTime.substring(0, 10)}`;
      }
      lines.push(itemLine);
    }

    // Linked resources
    for (const link of task.linkedResources) {
      const label = link.displayName ?? link.applicationName ?? "Link";
      if (link.webUrl) {
        lines.push(`    - 🔗 [${label}](${link.webUrl})`);
      } else {
        const extra = link.externalId ? ` (id: ${link.externalId})` : "";
        lines.push(`    - 🔗 ${label}${extra}`);
      }
    }

    // Reminder
    if (task.isReminderOn && task.reminderDateTime) {
      const dt = task.reminderDateTime.dateTime.substring(0, 16).replace("T", " ");
      const tz = task.reminderDateTime.timeZone;
      lines.push(`    - ⏰ Reminder: ${dt} (${tz})`);
    }

    // Attachments notice (Graph API does not expose attachment content for To Do)
    if (task.hasAttachments) {
      lines.push(`    - 📎 Has attachments (open in MS To Do to view)`);
    }

    // Hidden metadata: Graph ID + timestamps preserved for future two-way sync
    const created = task.createdDateTime.substring(0, 10);
    const modified = task.lastModifiedDateTime.substring(0, 10);
    lines.push(`    %% id: ${task.id} | created: ${created} | modified: ${modified} %%`);

    return lines;
  }

  private statusToCheckbox(status: TodoTask["status"]): string {
    switch (status) {
      case "completed":       return "- [x]";
      case "inProgress":      return "- [/]";
      case "waitingOnOthers": return "- [?]";
      case "deferred":        return "- [-]";
      default:                return "- [ ]";
    }
  }

  private formatRecurrence(rec: PatternedRecurrence): string {
    const { pattern } = rec;
    const n = pattern.interval;

    switch (pattern.type) {
      case "daily":
        return n === 1 ? "every day" : `every ${n} days`;
      case "weekly": {
        const days = (pattern.daysOfWeek ?? [])
          .map((d) => d.charAt(0).toUpperCase() + d.slice(1))
          .join(", ");
        const base = n === 1 ? "every week" : `every ${n} weeks`;
        return days ? `${base} on ${days}` : base;
      }
      case "absoluteMonthly":
      case "relativeMonthly":
        return n === 1 ? "every month" : `every ${n} months`;
      case "absoluteYearly":
      case "relativeYearly":
        return n === 1 ? "every year" : `every ${n} years`;
      default:
        return "recurring";
    }
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
      await this.ensureFolder(parts.slice(0, -1).join("/"));
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
      if (!this.vault.getAbstractFileByPath(current)) {
        await this.vault.createFolder(current);
      }
    }
  }

  async syncAll(settings: PluginSettings): Promise<SyncSummary> {
    const summary: SyncSummary = { listsProcessed: 0, tasksWritten: 0, errors: [] };

    for (const mapping of settings.listMappings.filter((m) => m.enabled)) {
      try {
        summary.tasksWritten += await this.syncList(mapping.listId, mapping.filePath);
        summary.listsProcessed++;
      } catch (err) {
        summary.errors.push(
          `${mapping.listName}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    return summary;
  }
}
