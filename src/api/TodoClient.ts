import type { TodoList, TodoTask, GraphListResponse, GraphTaskResponse } from "../types";

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
        results.push({ id: item.id, displayName: item.displayName });
      }
      url = data["@odata.nextLink"];
    }

    return results;
  }

  async getTasks(listId: string): Promise<TodoTask[]> {
    const results: TodoTask[] = [];
    let url: string | undefined =
      `${GRAPH_BASE}/me/todo/lists/${encodeURIComponent(listId)}/tasks?$top=500`;

    while (url) {
      const response = await this.authorizedFetch(url);
      const data: GraphTaskResponse = await response.json();
      for (const item of data.value) {
        results.push({
          id: item.id,
          title: item.title,
          status: item.status,
          dueDateTime: item.dueDateTime ?? null,
          body: item.body ?? null,
          importance: item.importance,
        });
      }
      url = data["@odata.nextLink"];
    }

    return results;
  }
}
