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
  isOwner: boolean;
  isShared: boolean;
  wellknownListName: "none" | "defaultList" | "flaggedEmails" | "unknownFutureValue";
}

export interface DateTimeTimeZone {
  dateTime: string;
  timeZone: string;
}

export interface ChecklistItem {
  id: string;
  displayName: string;
  isChecked: boolean;
  checkedDateTime: string | null;
  createdDateTime: string | null;
}

export interface LinkedResource {
  id: string;
  applicationName: string | null;
  displayName: string | null;
  externalId: string | null;
  webUrl: string | null;
}

export interface RecurrencePattern {
  type: "daily" | "weekly" | "absoluteMonthly" | "relativeMonthly" | "absoluteYearly" | "relativeYearly";
  interval: number;
  dayOfMonth?: number;
  daysOfWeek?: Array<"sunday" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday">;
  firstDayOfWeek?: "sunday" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday";
  index?: "first" | "second" | "third" | "fourth" | "last";
  month?: number;
}

export interface RecurrenceRange {
  type: "endDate" | "noEnd" | "numbered";
  startDate?: string;
  endDate?: string;
  numberOfOccurrences?: number;
  recurrenceTimeZone?: string;
}

export interface PatternedRecurrence {
  pattern: RecurrencePattern;
  range: RecurrenceRange;
}

export interface TodoTask {
  id: string;
  title: string;
  status: "notStarted" | "inProgress" | "completed" | "waitingOnOthers" | "deferred";
  importance: "low" | "normal" | "high";
  body: { content: string; contentType: "text" | "html" } | null;
  categories: string[];
  hasAttachments: boolean;
  isReminderOn: boolean;
  dueDateTime: DateTimeTimeZone | null;
  startDateTime: DateTimeTimeZone | null;
  completedDateTime: DateTimeTimeZone | null;
  reminderDateTime: DateTimeTimeZone | null;
  recurrence: PatternedRecurrence | null;
  createdDateTime: string;
  lastModifiedDateTime: string;
  bodyLastModifiedDateTime: string | null;
  checklistItems: ChecklistItem[];
  linkedResources: LinkedResource[];
}

export interface GraphListResponse {
  value: Array<{
    id: string;
    displayName: string;
    isOwner: boolean;
    isShared: boolean;
    wellknownListName: string;
  }>;
  "@odata.nextLink"?: string;
}

export interface RawTodoTask {
  id: string;
  title: string;
  status: string;
  importance: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  body?: { content: string; contentType: string };
  bodyLastModifiedDateTime?: string;
  categories?: string[];
  hasAttachments?: boolean;
  isReminderOn?: boolean;
  dueDateTime?: DateTimeTimeZone;
  startDateTime?: DateTimeTimeZone;
  completedDateTime?: DateTimeTimeZone;
  reminderDateTime?: DateTimeTimeZone;
  recurrence?: PatternedRecurrence;
  checklistItems?: Array<{
    id: string;
    displayName: string;
    isChecked: boolean;
    checkedDateTime?: string;
    createdDateTime?: string;
  }>;
  linkedResources?: Array<{
    id: string;
    applicationName?: string;
    displayName?: string;
    externalId?: string;
    webUrl?: string;
  }>;
}

export interface GraphTaskResponse {
  value: RawTodoTask[];
  "@odata.nextLink"?: string;
}

export const DEFAULT_SETTINGS: PluginSettings = {
  clientId: "",
  listMappings: [],
  defaultFolder: "MS To Do",
  syncInterval: 0,
};
