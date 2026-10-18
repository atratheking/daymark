export const STORAGE_KEY = "ticktick-study-v1";
export const uid = () => crypto.randomUUID();
export const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export function addDays(value, days) {
  const d = new Date(`${value}T12:00:00`);
  d.setDate(d.getDate() + days);
  return localDate(d);
}
export function nextDue(date, repeat) {
  if (!date || !repeat) return "";
  if (repeat === "daily") return addDays(date, 1);
  if (repeat === "weekly") return addDays(date, 7);
  const d = new Date(date + "T12:00:00");
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, end));
  return localDate(d);
}
export function createTask(title, overrides = {}) {
  return {
    id: uid(),
    title: title.trim(),
    notes: "",
    listId: "inbox",
    due: "",
    time: "",
    priority: 0,
    tags: [],
    subtasks: [],
    done: false,
    deleted: false,
    repeat: "",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}
export function toggleTask(state, id) {
  const task = state.tasks.find((t) => t.id === id);
  if (!task) return state;
  const done = !task.done;
  let tasks = state.tasks.map((t) =>
    t.id === id ? { ...t, done, completedAt: done ? new Date().toISOString() : null } : t,
  );
  if (
    done &&
    task.repeat &&
    task.due &&
    !state.tasks.some((t) => t.recurrenceParentId === task.id)
  ) {
    tasks.push({
      ...task,
      id: uid(),
      recurrenceParentId: task.id,
      due: nextDue(task.due, task.repeat),
      done: false,
      completedAt: null,
      subtasks: task.subtasks.map((s) => ({ ...s, id: uid(), done: false })),
      createdAt: new Date().toISOString(),
    });
  }
  return { ...state, tasks };
}
export function matchesView(t, view, today = localDate()) {
  if (view === "trash") return t.deleted;
  if (t.deleted) return false;
  if (view === "completed") return t.done;
  if (t.done) return false;
  if (view === "today") return !!t.due && t.due <= today;
  if (view === "tomorrow") return t.due === addDays(today, 1);
  if (view === "week") return !!t.due && t.due >= today && t.due <= addDays(today, 6);
  if (view === "all") return true;
  if (view.startsWith("tag:")) return t.tags.includes(view.slice(4));
  return t.listId === view;
}
export function parseQuickAdd(value, today = localDate()) {
  let title = value.trim(),
    due = "",
    priority = 0;
  const tags = [...title.matchAll(/(?:^|\s)#([\p{L}\p{N}_-]+)/gu)].map((m) => m[1]);
  title = title.replace(/(?:^|\s)#[\p{L}\p{N}_-]+/gu, "").trim();
  if (/\btomorrow\b/i.test(title)) {
    due = addDays(today, 1);
    title = title.replace(/\btomorrow\b/i, "").trim();
  } else if (/\btoday\b/i.test(title)) {
    due = today;
    title = title.replace(/\btoday\b/i, "").trim();
  }
  const p = title.match(/(?:^|\s)!([1-3])\b/);
  if (p) {
    priority = Number(p[1]);
    title = title.replace(p[0], "").trim();
  }
  return { title: title.replace(/\s+/g, " "), due, priority, tags };
}
export function validateState(value) {
  if (
    !value ||
    value.version !== 1 ||
    !Array.isArray(value.tasks) ||
    !Array.isArray(value.lists) ||
    !Array.isArray(value.habits)
  )
    throw Error("Choose a valid Daymark backup (version 1).");
  const ids = new Set();
  for (const l of value.lists) {
    if (!l || typeof l.id !== "string" || typeof l.name !== "string" || ids.has(l.id))
      throw Error("Invalid or duplicate list.");
    ids.add(l.id);
  }
  if (!ids.has("inbox")) throw Error("Backup is missing Inbox.");
  const taskIds = new Set();
  for (const t of value.tasks) {
    if (
      !t ||
      typeof t.id !== "string" ||
      taskIds.has(t.id) ||
      typeof t.title !== "string" ||
      !t.title.trim() ||
      !ids.has(t.listId) ||
      !Number.isInteger(t.priority) ||
      t.priority < 0 ||
      t.priority > 3 ||
      typeof t.notes !== "string" ||
      typeof t.done !== "boolean" ||
      typeof t.deleted !== "boolean" ||
      typeof t.time !== "string" ||
      (t.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(t.time)) ||
      !["", "daily", "weekly", "monthly"].includes(t.repeat) ||
      !Array.isArray(t.tags) ||
      !t.tags.every((x) => typeof x === "string") ||
      !Array.isArray(t.subtasks) ||
      !t.subtasks.every(
        (s) =>
          s &&
          typeof s.id === "string" &&
          typeof s.title === "string" &&
          typeof s.done === "boolean",
      ) ||
      typeof t.due !== "string" ||
      (t.due &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(t.due) ||
          Number.isNaN(Date.parse(t.due + "T12:00:00")) ||
          localDate(new Date(t.due + "T12:00:00")) !== t.due))
    )
      throw Error("Backup contains an invalid task.");
    taskIds.add(t.id);
  }
  for (const h of value.habits)
    if (
      !h ||
      typeof h.id !== "string" ||
      typeof h.name !== "string" ||
      !Array.isArray(h.days) ||
      !h.days.every((d) => typeof d === "string")
    )
      throw Error("Invalid habit data.");
  if (value.theme !== undefined && !["dark", "light"].includes(value.theme))
    throw Error("Invalid theme.");
  if (
    value.sessions !== undefined &&
    (!Array.isArray(value.sessions) ||
      !value.sessions.every(
        (s) =>
          s &&
          typeof s.id === "string" &&
          typeof s.date === "string" &&
          Number.isFinite(s.minutes) &&
          s.minutes > 0 &&
          typeof s.task === "string",
      ))
  )
    throw Error("Invalid focus sessions.");
  return { ...value, sessions: value.sessions || [], theme: value.theme || "dark" };
}
export function seedState() {
  const today = localDate();
  return {
    version: 1,
    theme: "dark",
    lists: [
      { id: "inbox", name: "Inbox", color: "#8d96a8", emoji: "Inbox" },
      { id: "work", name: "Work", color: "#6587ef", emoji: "BriefcaseBusiness" },
      { id: "personal", name: "Personal", color: "#b28bdd", emoji: "Coffee" },
      { id: "ideas", name: "Ideas", color: "#d7ac61", emoji: "Lightbulb" },
    ],
    tasks: [
      createTask("Plan the week ahead", {
        id: "task-plan",
        listId: "personal",
        due: today,
        time: "09:00",
        priority: 1,
        tags: ["planning"],
        notes:
          "Make room for what matters.\n\nReview your priorities, schedule focused time, and leave a little space for the unexpected.",
        subtasks: [
          { id: "s1", title: "Review last week", done: true },
          { id: "s2", title: "Choose three priorities", done: false },
          { id: "s3", title: "Block time on the calendar", done: false },
        ],
      }),
      createTask("Refine the desktop experience", {
        listId: "work",
        due: today,
        time: "10:30",
        priority: 1,
        tags: ["design"],
        notes: "A calmer workspace, one detail at a time.",
      }),
      createTask("Read a chapter", {
        listId: "personal",
        due: today,
        time: "18:00",
        priority: 3,
        tags: ["reading"],
        repeat: "daily",
      }),
      createTask("Share the first draft", {
        listId: "work",
        due: addDays(today, 1),
        time: "14:00",
        priority: 2,
        tags: ["design"],
      }),
      createTask("Explore a new walking route", {
        listId: "personal",
        due: addDays(today, 2),
        priority: 0,
      }),
      createTask("A small idea worth keeping", {
        listId: "ideas",
        notes: "Capture it here. Come back when you have room to explore.",
      }),
      createTask("Collect reference screenshots", {
        listId: "work",
        due: addDays(today, -1),
        done: true,
        completedAt: new Date().toISOString(),
      }),
    ],
    habits: [
      {
        id: "h1",
        name: "Read for 20 minutes",
        emoji: "📚",
        color: "#b28bdd",
        days: [addDays(today, -1), addDays(today, -2), addDays(today, -3)],
      },
      {
        id: "h2",
        name: "Go for a walk",
        emoji: "🌿",
        color: "#77b69a",
        days: [addDays(today, -1), addDays(today, -3)],
      },
      { id: "h3", name: "Drink more water", emoji: "💧", color: "#6a9ee9", days: [] },
    ],
    sessions: [],
  };
}
