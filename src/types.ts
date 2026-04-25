export interface PluginSettings {
  clientId: string;
  listMappings: ListMapping[];
  defaultFolder: string;
  syncInterval: number;
}

export interface ListMapping {
  listId: string;
  listName: string;
  filePath: string;
  enabled: boolean;
}

export interface TodoList {
  id: string;
  displayName: string;
}

export interface TodoTask {
  id: string;
  title: string;
  status: "notStarted" | "inProgress" | "completed" | "waitingOnOthers" | "deferred";
  dueDateTime: { dateTime: string; timeZone: string } | null;
  body: { content: string; contentType: "text" | "html" } | null;
  importance: "low" | "normal" | "high";
}

export interface GraphListResponse {
  value: Array<{ id: string; displayName: string }>;
  "@odata.nextLink"?: string;
}

export interface GraphTaskResponse {
  value: TodoTask[];
  "@odata.nextLink"?: string;
}

export const DEFAULT_SETTINGS: PluginSettings = {
  clientId: "",
  listMappings: [],
  defaultFolder: "MS To Do",
  syncInterval: 0,
};
