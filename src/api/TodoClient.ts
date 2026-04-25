import type {
  TodoList,
  TodoTask,
  GraphListResponse,
  GraphTaskResponse,
  RawTodoTask,
} from "../types";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

export class TodoClient {
  private getToken: () => Promise<string | null>;

  constructor(getToken: () => Promise<string | null>) {
    this.getToken = getToken;
  }

  private async authorizedFetch(url: string): Promise<Response> {
    const token = await this.getToken();
    if (!token) {
      throw new Error("Not authenticated. Please sign in via plugin settings.");
    }
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Graph API error ${response.status}: ${body}`);
    }
    return response;
  }

  async getLists(): Promise<TodoList[]> {
    const results: TodoList[] = [];
    let url: string | undefined = `${GRAPH_BASE}/me/todo/lists`;

    while (url) {
      const response = await this.authorizedFetch(url);
      const data: GraphListResponse = await response.json();
      for (const item of data.value) {
        results.push({
          id: item.id,
          displayName: item.displayName,
          isOwner: item.isOwner,
          isShared: item.isShared,
          wellknownListName: item.wellknownListName as TodoList["wellknownListName"],
        });
      }
      url = data["@odata.nextLink"];
    }

    return results;
  }

  async getTasks(listId: string): Promise<TodoTask[]> {
    const results: TodoTask[] = [];
    let url: string | undefined =
      `${GRAPH_BASE}/me/todo/lists/${encodeURIComponent(listId)}/tasks` +
      `?$top=500&$expand=checklistItems,linkedResources`;

    while (url) {
      const response = await this.authorizedFetch(url);
      const data: GraphTaskResponse = await response.json();
      for (const raw of data.value) {
        results.push(this.mapTask(raw));
      }
      url = data["@odata.nextLink"];
    }

    return results;
  }

  private mapTask(raw: RawTodoTask): TodoTask {
    return {
      id: raw.id,
      title: raw.title,
      status: raw.status as TodoTask["status"],
      importance: (raw.importance as TodoTask["importance"]) ?? "normal",
      body: raw.body
        ? { content: raw.body.content, contentType: raw.body.contentType as "text" | "html" }
        : null,
      categories: raw.categories ?? [],
      hasAttachments: raw.hasAttachments ?? false,
      isReminderOn: raw.isReminderOn ?? false,
      dueDateTime: raw.dueDateTime ?? null,
      startDateTime: raw.startDateTime ?? null,
      completedDateTime: raw.completedDateTime ?? null,
      reminderDateTime: raw.reminderDateTime ?? null,
      recurrence: raw.recurrence ?? null,
      createdDateTime: raw.createdDateTime,
      lastModifiedDateTime: raw.lastModifiedDateTime,
      bodyLastModifiedDateTime: raw.bodyLastModifiedDateTime ?? null,
      checklistItems: (raw.checklistItems ?? []).map((ci) => ({
        id: ci.id,
        displayName: ci.displayName,
        isChecked: ci.isChecked,
        checkedDateTime: ci.checkedDateTime ?? null,
        createdDateTime: ci.createdDateTime ?? null,
      })),
      linkedResources: (raw.linkedResources ?? []).map((lr) => ({
        id: lr.id,
        applicationName: lr.applicationName ?? null,
        displayName: lr.displayName ?? null,
        externalId: lr.externalId ?? null,
        webUrl: lr.webUrl ?? null,
      })),
    };
  }
}
