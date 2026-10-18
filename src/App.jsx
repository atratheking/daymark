import React, { useState, useEffect, useRef } from "react";
import {
  Check,
  CheckSquare,
  CalendarDays,
  Inbox,
  Search,
  Plus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Flag,
  Trash2,
  Settings,
  Sun,
  Moon,
  LayoutGrid,
  Timer,
  ChartNoAxesCombined,
  Menu,
  X,
  List,
  Columns3,
  ArrowDownWideNarrow,
  Tag,
  CheckCheck,
  CalendarRange,
  BriefcaseBusiness,
  Coffee,
  Lightbulb,
  PanelRightClose,
  Repeat2,
  Download,
  Upload,
  RotateCcw,
  Play,
  Pause,
  Target,
  FileText,
  CheckCircle2,
  Archive,
  Maximize2,
  GripVertical,
} from "lucide-react";
import {
  STORAGE_KEY,
  uid,
  localDate,
  addDays,
  createTask,
  toggleTask,
  matchesView,
  parseQuickAdd,
  validateState,
  seedState,
} from "./model.mjs";
const ICONS = { Inbox, BriefcaseBusiness, Coffee, Lightbulb };
const PRIORITIES = ["None", "High", "Medium", "Low"];
const DATE_FORMAT = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" });
const friendlyDate = (value) =>
  !value
    ? "No date"
    : value === localDate()
      ? "Today"
      : value === addDays(localDate(), 1)
        ? "Tomorrow"
        : DATE_FORMAT.format(new Date(value + "T12:00:00"));
const today = localDate();
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw
      ? { data: validateState(JSON.parse(raw)), error: "" }
      : { data: seedState(), error: "" };
  } catch {
    return {
      data: seedState(),
      error:
        "Your saved data could not be read. A sample workspace is shown; export your existing data before saving changes.",
    };
  }
}
function IconButton({ label, children, onClick, className = "", ...props }) {
  return (
    <button
      type="button"
      className={"icon-button " + className}
      aria-label={label}
      title={label}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
}
export default function App() {
  const [loaded] = useState(loadState);
  const [data, setData] = useState(loaded.data);
  const [storageError, setStorageError] = useState(loaded.error);
  const [savingAllowed, setSavingAllowed] = useState(!loaded.error);
  const [module, setModule] = useState("tasks"),
    [view, setView] = useState("today"),
    [layout, setLayout] = useState("list"),
    [selected, setSelected] = useState("task-plan"),
    [query, setQuery] = useState(""),
    [searchOpen, setSearchOpen] = useState(false),
    [quick, setQuick] = useState(""),
    [sort, setSort] = useState("date"),
    [sidebar, setSidebar] = useState(true),
    [modal, setModal] = useState(null),
    [toast, setToast] = useState(""),
    [showCompleted, setShowCompleted] = useState(false);
  const quickRef = useRef(null),
    searchRef = useRef(null),
    importRef = useRef(null);
  const notify = (message) => setToast(message);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(id);
  }, [toast]);
  useEffect(() => {
    document.documentElement.dataset.theme = data.theme;
    if (!savingAllowed) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setStorageError("");
    } catch {
      setStorageError("Changes could not be saved. Export a backup now to keep your work.");
    }
  }, [data, savingAllowed]);
  const go = (next) => {
    setModule("tasks");
    setView(next);
    setQuery("");
    setSearchOpen(false);
    setSelected(null);
  };
  const focusQuick = () => {
    setModule("tasks");
    if (["completed", "trash"].includes(view)) setView("inbox");
    setTimeout(() => quickRef.current?.focus(), 0);
  };
  useEffect(() => {
    const command = (action) => {
      if (action === "new-task") focusQuick();
      else if (action === "search") {
        setSearchOpen(true);
        setModule("tasks");
        setTimeout(() => searchRef.current?.focus(), 0);
      } else go(action === "next7" ? "week" : action);
    };
    const native = (e) => command(e.detail);
    const key = (e) => {
      if ((e.metaKey || e.ctrlKey) && ["k", "n"].includes(e.key.toLowerCase())) {
        e.preventDefault();
        command(e.key.toLowerCase() === "k" ? "search" : "new-task");
      }
      if (e.key === "Escape") {
        setModal(null);
        setSearchOpen(false);
        setQuery("");
      }
    };
    window.addEventListener("keydown", key);
    window.addEventListener("daymark:command", native);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("daymark:command", native);
    };
  }, [view]);
  const patch = (id, changes) =>
    setData((d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === id ? { ...t, ...changes } : t)) }));
  const complete = (id) => setData((d) => toggleTask(d, id));
  const addTask = (value, overrides = {}) => {
    const parsed = parseQuickAdd(value);
    if (!parsed.title) return null;
    const task = createTask(parsed.title, {
      ...parsed,
      listId: data.lists.some((l) => l.id === view) ? view : "inbox",
      due: view === "today" ? today : view === "tomorrow" ? addDays(today, 1) : "",
      ...parsed,
      ...overrides,
    });
    if (!task.due && ["today", "tomorrow"].includes(view))
      task.due = view === "today" ? today : addDays(today, 1);
    setData((d) => ({ ...d, tasks: [...d.tasks, task] }));
    setSelected(task.id);
    return task.id;
  };
  const active = data.tasks.filter((t) => !t.done && !t.deleted);
  const task = data.tasks.find((t) => t.id === selected);
  const listName = (id) => data.lists.find((l) => l.id === id)?.name || "Inbox";
  const listColor = (id) => data.lists.find((l) => l.id === id)?.color || "#8d96a8";
  const tagNames = [...new Set(data.tasks.filter((t) => !t.deleted).flatMap((t) => t.tags))].sort();
  const title = searchOpen
    ? "Search"
    : {
        today: "Today",
        tomorrow: "Tomorrow",
        week: "Next 7 Days",
        all: "All Tasks",
        completed: "Completed",
        trash: "Trash",
      }[view] || (view.startsWith("tag:") ? "# " + view.slice(4) : listName(view));
  let visible = data.tasks.filter((t) =>
    searchOpen
      ? !t.deleted &&
        `${t.title} ${t.notes} ${t.tags.join(" ")}`.toLowerCase().includes(query.toLowerCase())
      : matchesView(t, view),
  );
  if (!searchOpen && showCompleted && !["completed", "trash"].includes(view))
    visible = [
      ...visible,
      ...data.tasks.filter((t) => t.done && !t.deleted && matchesView({ ...t, done: false }, view)),
    ];
  visible.sort((a, b) =>
    sort === "priority"
      ? (a.priority || 4) - (b.priority || 4)
      : sort === "title"
        ? a.title.localeCompare(b.title)
        : (a.due || "9999").localeCompare(b.due || "9999") || a.time.localeCompare(b.time),
  );
  const groups =
    searchOpen || ["completed", "trash"].includes(view)
      ? [["Tasks", visible]]
      : view === "today"
        ? [
            ["Overdue", visible.filter((t) => t.due < today && !t.done)],
            ["Today", visible.filter((t) => t.due === today || t.done)],
          ]
        : view === "week"
          ? [...new Set(visible.map((t) => t.due))].map((date) => [
              friendlyDate(date),
              visible.filter((t) => t.due === date),
            ])
          : [["Tasks", visible]];
  function exportData() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `daymark-${today}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("Backup exported");
  }
  async function importData(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      if (file.size > 10000000) throw Error("Backup must be smaller than 10 MB.");
      const imported = validateState(JSON.parse(await file.text()));
      setModal({ type: "import", data: imported });
    } catch (err) {
      notify(err.message);
    }
  }
  function taskRow(t, card = false) {
    const color = listColor(t.listId);
    return (
      <div
        key={t.id}
        className={`task-row ${selected === t.id ? "selected" : ""} ${t.done ? "is-done" : ""} ${card ? "task-card" : ""}`}
        draggable={!t.deleted}
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", t.id);
          e.dataTransfer.effectAllowed = "move";
        }}
      >
        <button
          className={`checkbox p${t.priority} ${t.done ? "checked" : ""}`}
          aria-label={`${t.done ? "Reopen" : "Complete"} ${t.title}`}
          onClick={() => complete(t.id)}
          disabled={t.deleted}
        >
          {t.done && <Check size={12} />}
        </button>
        <button className="task-main" onClick={() => setSelected(t.id)}>
          <span className="task-title">{t.title}</span>
          {card && t.notes && <span className="card-notes">{t.notes}</span>}
          {card && (
            <span className="card-tags">
              {t.tags.map((tag) => (
                <span key={tag}>#{tag}</span>
              ))}
            </span>
          )}
        </button>
        <div className="task-meta">
          {t.subtasks.length > 0 && (
            <span className="subtask-count">
              <CheckCheck size={13} />
              {t.subtasks.filter((s) => s.done).length}/{t.subtasks.length}
            </span>
          )}
          {t.notes && <FileText size={13} />}
          <span
            className={
              t.due && t.due < today && !t.done ? "overdue" : t.due === today ? "blue" : ""
            }
          >
            {t.time ||
              (!["today", "week"].includes(view) || card
                ? friendlyDate(t.due) === "No date"
                  ? ""
                  : friendlyDate(t.due)
                : "")}
          </span>
          {(view === "today" || view === "all" || searchOpen || card) && (
            <span className="task-list-label">
              <i style={{ background: color }} />
              {listName(t.listId)}
            </span>
          )}
        </div>
      </div>
    );
  }
  const navItem = (id, label, Icon) => (
    <button
      key={id}
      className={`nav-item ${module === "tasks" && view === id && !searchOpen ? "active" : ""}`}
      onClick={() => go(id)}
    >
      <Icon size={18} />
      <span>{label}</span>
      <small>{data.tasks.filter((t) => matchesView(t, id)).length || ""}</small>
    </button>
  );
  return (
    <div className="app-shell">
      <div className="window-drag" aria-hidden="true" />
      <aside className="rail">
        <div className="rail-top">
          <div className="profile" title="My workspace">
            D
          </div>
          {[
            ["tasks", "Tasks", CheckSquare],
            ["calendar", "Calendar", CalendarDays],
            ["matrix", "Eisenhower Matrix", LayoutGrid],
            ["focus", "Focus", Timer],
            ["habits", "Habits", ChartNoAxesCombined],
          ].map(([id, label, Icon]) => (
            <IconButton
              key={id}
              label={label}
              className={module === id ? "rail-active" : ""}
              onClick={() => {
                setModule(id);
                setSearchOpen(false);
              }}
            >
              <Icon size={23} />
            </IconButton>
          ))}
          <IconButton
            label="Search tasks"
            onClick={() => {
              setModule("tasks");
              setSearchOpen(true);
              setTimeout(() => searchRef.current?.focus(), 0);
            }}
          >
            <Search size={22} />
          </IconButton>
        </div>
        <div className="rail-bottom">
          <IconButton
            label="Switch theme"
            onClick={() => setData((d) => ({ ...d, theme: d.theme === "dark" ? "light" : "dark" }))}
          >
            {data.theme === "dark" ? <Sun size={21} /> : <Moon size={21} />}
          </IconButton>
          <IconButton label="Settings and backup" onClick={() => setModal({ type: "settings" })}>
            <Settings size={21} />
          </IconButton>
        </div>
      </aside>
      {sidebar && (
        <aside className="sidebar">
          <nav className="smart-lists">
            {navItem("today", "Today", CalendarDays)}
            {!/Mac/.test(navigator.platform) && navItem("tomorrow", "Tomorrow", CalendarRange)}
            {navItem("week", "Next 7 Days", CalendarRange)}
            {navItem("inbox", "Inbox", Inbox)}
          </nav>
          <div className="sidebar-section">
            <div className="section-label">
              <span>
                <ChevronDown size={13} />
                Lists
              </span>
              <IconButton label="Create list" onClick={() => setModal({ type: "list" })}>
                <Plus size={15} />
              </IconButton>
            </div>
            {data.lists
              .filter((l) => l.id !== "inbox")
              .map((l) => {
                const Icon = ICONS[l.emoji] || List;
                return (
                  <button
                    className={`nav-item custom-list ${module === "tasks" && view === l.id ? "active" : ""}`}
                    key={l.id}
                    onClick={() => go(l.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      const id = e.dataTransfer.getData("text/plain");
                      if (data.tasks.some((t) => t.id === id)) {
                        patch(id, { listId: l.id });
                        notify(`Moved to ${l.name}`);
                      }
                    }}
                  >
                    <Icon size={18} style={{ color: l.color }} />
                    <span>{l.name}</span>
                    <small>{active.filter((t) => t.listId === l.id).length || ""}</small>
                  </button>
                );
              })}
          </div>
          <div className="sidebar-section">
            <div className="section-label">
              <span>
                <ChevronDown size={13} />
                Tags
              </span>
              <Tag size={13} />
            </div>
            {tagNames.map((tag) => (
              <button
                key={tag}
                className={`nav-item tag-item ${view === "tag:" + tag && module === "tasks" ? "active" : ""}`}
                onClick={() => go("tag:" + tag)}
              >
                <span className="hash">#</span>
                <span>{tag}</span>
                <small>{active.filter((t) => t.tags.includes(tag)).length || ""}</small>
              </button>
            ))}
          </div>
          <div className="sidebar-footer">
            {navItem("completed", "Completed", CheckSquare)}
            {navItem("trash", "Trash", Trash2)}
          </div>
        </aside>
      )}
      <main className="workspace">
        {storageError && (
          <div className="storage-warning">
            {storageError}
            <button onClick={exportData}>Export current workspace</button>
            {!savingAllowed && (
              <button onClick={() => setModal({ type: "storage-replace" })}>
                Use sample workspace
              </button>
            )}
          </div>
        )}
        {module === "tasks" ? (
          <>
            <header className="content-header">
              <div className="header-title">
                <IconButton label="Toggle sidebar" onClick={() => setSidebar((s) => !s)}>
                  <Menu size={19} />
                </IconButton>
                <h1>{title}</h1>
                {!searchOpen && (
                  <span className="count-pill">{visible.filter((t) => !t.done).length}</span>
                )}
              </div>
              <div className="header-actions">
                <div className="segmented">
                  <IconButton
                    label="List view"
                    className={layout === "list" ? "chosen" : ""}
                    onClick={() => setLayout("list")}
                  >
                    <List size={17} />
                  </IconButton>
                  <IconButton
                    label="Kanban view"
                    className={layout === "kanban" ? "chosen" : ""}
                    onClick={() => setLayout("kanban")}
                  >
                    <Columns3 size={17} />
                  </IconButton>
                </div>
                <IconButton label="View options" onClick={() => setModal({ type: "options" })}>
                  <MoreHorizontal size={21} />
                </IconButton>
              </div>
            </header>
            {searchOpen ? (
              <div className="search-box">
                <Search size={18} />
                <input
                  aria-label="Search all tasks"
                  placeholder="Search tasks, notes, and tags"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  ref={searchRef}
                  autoFocus
                />
                <IconButton
                  label="Close search"
                  onClick={() => {
                    setSearchOpen(false);
                    setQuery("");
                  }}
                >
                  <X size={17} />
                </IconButton>
              </div>
            ) : (
              !["completed", "trash"].includes(view) && (
                <div className="quick-wrap">
                  <form
                    className="quick-add"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (addTask(quick)) setQuick("");
                    }}
                  >
                    <Plus size={19} />
                    <input
                      ref={quickRef}
                      aria-label="Add task"
                      placeholder={`Add task to ${title} · Enter to save`}
                      value={quick}
                      onChange={(e) => setQuick(e.target.value)}
                    />
                    {quick ? (
                      <button type="submit" className="quick-submit">
                        Add
                      </button>
                    ) : (
                      <span className="shortcut">⌘ N</span>
                    )}
                  </form>
                  <span className="quick-hint">Try “Read today #personal !3”</span>
                </div>
              )
            )}
            <div className="task-content">
              {layout === "kanban" ? (
                <div className="kanban">
                  {[1, 2, 3, 0].map((priority) => (
                    <section
                      key={priority}
                      className="kanban-column"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => patch(e.dataTransfer.getData("text/plain"), { priority })}
                    >
                      <h3>
                        <Flag size={14} className={"p" + priority} />
                        {PRIORITIES[priority]} priority{" "}
                        <span>{visible.filter((t) => t.priority === priority).length}</span>
                      </h3>
                      {visible.filter((t) => t.priority === priority).map((t) => taskRow(t, true))}
                      <button
                        className="column-add"
                        onClick={() => setModal({ type: "task", priority })}
                      >
                        <Plus size={14} />
                        Add task
                      </button>
                    </section>
                  ))}
                </div>
              ) : (
                <>
                  {groups
                    .filter(([, ts]) => ts.length)
                    .map(([name, ts]) => (
                      <section className="task-group" key={name}>
                        <h3>
                          <ChevronDown size={14} />
                          <span className={name === "Overdue" ? "overdue" : ""}>{name}</span>
                          <small>{ts.length}</small>
                        </h3>
                        {ts.map((t) => taskRow(t))}
                      </section>
                    ))}
                  {!visible.length && (
                    <div className="empty-state">
                      <div className="empty-illustration">
                        <CheckCheck size={40} strokeWidth={1.1} />
                        <span>✧</span>
                      </div>
                      <h2>
                        {view === "trash"
                          ? "Nothing in the trash"
                          : view === "completed"
                            ? "A fresh start"
                            : searchOpen
                              ? "No matching tasks"
                              : "A little room to breathe"}
                      </h2>
                      <p>
                        {searchOpen
                          ? "Try a different word or tag."
                          : view === "today"
                            ? "Your day is clear. Add something you want to make time for."
                            : "Tasks will appear here when you add them."}
                      </p>
                      {!["trash", "completed"].includes(view) && (
                        <button className="text-button" onClick={focusQuick}>
                          <Plus size={15} />
                          Add a task
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
            <footer className="content-footer">
              <span>
                {visible.filter((t) => !t.done).length} tasks ·{" "}
                {visible.filter((t) => t.done).length} completed
              </span>
            </footer>
          </>
        ) : module === "calendar" ? (
          <CalendarView
            tasks={active}
            lists={data.lists}
            onSelect={setSelected}
            patch={patch}
            onAdd={(date) => setModal({ type: "task", due: date })}
            toggleSidebar={() => setSidebar((s) => !s)}
          />
        ) : module === "matrix" ? (
          <>
            <header className="content-header">
              <div className="header-title">
                <IconButton label="Toggle sidebar" onClick={() => setSidebar((s) => !s)}>
                  <Menu size={19} />
                </IconButton>
                <h1>Eisenhower Matrix</h1>
              </div>
              <span className="subtle">Make time for what matters</span>
            </header>
            <div className="matrix">
              {[
                [1, "Do first", "Urgent & important", "red"],
                [2, "Schedule", "Important, less urgent", "amber"],
                [3, "Delegate", "Urgent, less important", "blue"],
                [0, "Consider later", "Neither urgent nor important", "muted"],
              ].map(([p, name, caption, color]) => (
                <section
                  className={"quadrant " + color}
                  key={p}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => patch(e.dataTransfer.getData("text/plain"), { priority: p })}
                >
                  <header>
                    <div>
                      <h2>
                        <Flag size={17} />
                        {name}
                      </h2>
                      <p>{caption}</p>
                    </div>
                    <span>{active.filter((t) => t.priority === p).length}</span>
                  </header>
                  {active.filter((t) => t.priority === p).map((t) => taskRow(t))}
                  <button
                    className="column-add"
                    onClick={() => setModal({ type: "task", priority: p })}
                  >
                    <Plus size={15} />
                    Add task
                  </button>
                </section>
              ))}
            </div>
            <p className="matrix-note">
              Drag tasks between quadrants to change priority. Quadrants use a simple priority
              mapping.
            </p>
          </>
        ) : module === "focus" ? null : (
          <HabitsView
            habits={data.habits}
            onToggle={(id, date) =>
              setData((d) => ({
                ...d,
                habits: d.habits.map((h) =>
                  h.id === id
                    ? {
                        ...h,
                        days: h.days.includes(date)
                          ? h.days.filter((day) => day !== date)
                          : [...h.days, date],
                      }
                    : h,
                ),
              }))
            }
            onAdd={() => setModal({ type: "habit" })}
          />
        )}
        <div className="module-view" hidden={module !== "focus"}>
          <FocusView
            tasks={active}
            sessions={data.sessions}
            onSession={(session) => {
              setData((d) => ({ ...d, sessions: [...d.sessions, session] }));
              notify("Focus session completed. Well done.");
            }}
          />
        </div>
      </main>
      {task && ["tasks", "calendar", "matrix"].includes(module) && (
        <TaskDetail
          key={task.id}
          task={task}
          lists={data.lists}
          onPatch={(changes) => patch(task.id, changes)}
          onToggle={() => complete(task.id)}
          onClose={() => setSelected(null)}
          onDelete={() => {
            patch(task.id, { deleted: true });
            setSelected(null);
            notify("Task moved to Trash");
          }}
          onRestore={() => {
            patch(task.id, { deleted: false });
            notify("Task restored");
          }}
        />
      )}
      {toast && (
        <div role="status" className="toast">
          <CheckCircle2 size={17} />
          {toast}
        </div>
      )}
      <input
        type="file"
        accept="application/json,.json"
        hidden
        ref={importRef}
        onChange={importData}
      />
      {modal && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModal(null);
          }}
        >
          <section role="dialog" aria-modal="true" aria-labelledby="modal-title" className="modal">
            <header>
              <h2 id="modal-title">
                {
                  {
                    settings: "Settings",
                    list: "New list",
                    habit: "New habit",
                    task: "Add task",
                    options: "View options",
                    import: "Restore backup",
                    "storage-replace": "Replace unreadable workspace",
                  }[modal.type]
                }
              </h2>
              <IconButton label="Close dialog" onClick={() => setModal(null)}>
                <X size={19} />
              </IconButton>
            </header>
            {modal.type === "settings" ? (
              <>
                <div className="setting-row">
                  <div>
                    <b>Appearance</b>
                    <p>Choose a calmer workspace.</p>
                  </div>
                  <button
                    className="secondary"
                    onClick={() =>
                      setData((d) => ({ ...d, theme: d.theme === "dark" ? "light" : "dark" }))
                    }
                  >
                    {data.theme === "dark" ? <Moon size={15} /> : <Sun size={15} />}{" "}
                    {data.theme === "dark" ? "Dark" : "Light"}
                  </button>
                </div>
                <div className="setting-row">
                  <div>
                    <b>Keep a copy</b>
                    <p>Export tasks, lists, habits, and focus history.</p>
                  </div>
                  <button className="secondary" onClick={exportData}>
                    <Download size={15} />
                    Export
                  </button>
                </div>
                <div className="setting-row">
                  <div>
                    <b>Restore a backup</b>
                    <p>Review before replacing this workspace.</p>
                  </div>
                  <button className="secondary" onClick={() => importRef.current.click()}>
                    <Upload size={15} />
                    Import
                  </button>
                </div>
                <div className="about-box">
                  <CheckSquare size={23} />
                  <div>
                    <b>
                      Daymark <small>0.1.0</small>
                    </b>
                    <p>Make room for what matters.</p>
                  </div>
                </div>
                <p className="subtle small">
                  Keyboard: ⌘/Ctrl N · New task &nbsp; ⌘/Ctrl K · Search
                  <br />
                </p>
              </>
            ) : modal.type === "options" ? (
              <>
                <div className="modal-actions smart-view-links">
                  <button
                    className="secondary"
                    onClick={() => {
                      go("all");
                      setModal(null);
                    }}
                  >
                    All tasks
                  </button>
                  <button
                    className="secondary"
                    onClick={() => {
                      go("tomorrow");
                      setModal(null);
                    }}
                  >
                    Tomorrow
                  </button>
                </div>
                <label className="form-label">
                  Sort by
                  <select value={sort} onChange={(e) => setSort(e.target.value)}>
                    <option value="date">Due date</option>
                    <option value="priority">Priority</option>
                    <option value="title">Title</option>
                  </select>
                </label>
                <label className="toggle-row">
                  <input
                    type="checkbox"
                    checked={showCompleted}
                    onChange={(e) => setShowCompleted(e.target.checked)}
                  />
                  Show completed tasks in lists
                </label>
                <button className="primary full" onClick={() => setModal(null)}>
                  Done
                </button>
              </>
            ) : modal.type === "storage-replace" ? (
              <>
                <p>
                  This will replace unreadable saved data with the displayed workspace. Use your
                  system backup to preserve the original app profile first.
                </p>
                <button
                  className="primary"
                  onClick={() => {
                    setSavingAllowed(true);
                    setModal(null);
                  }}
                >
                  Replace with displayed workspace
                </button>
              </>
            ) : modal.type === "import" ? (
              <>
                <p>
                  This backup has <b>{modal.data.tasks.length} tasks</b>, {modal.data.lists.length}{" "}
                  lists and {modal.data.habits.length} habits. Restoring replaces the current
                  workspace.
                </p>
                <div className="modal-actions">
                  <button className="secondary" onClick={exportData}>
                    Export current first
                  </button>
                  <button
                    className="primary"
                    onClick={() => {
                      setData(modal.data);
                      setSavingAllowed(true);
                      setSelected(null);
                      go("today");
                      setModal(null);
                      notify("Backup restored");
                    }}
                  >
                    Restore backup
                  </button>
                </div>
              </>
            ) : (
              <CreateForm
                type={modal.type}
                onSubmit={(name) => {
                  if (modal.type === "list") {
                    const id = uid();
                    setData((d) => ({
                      ...d,
                      lists: [
                        ...d.lists,
                        { id, name, color: "#8a9ee9", emoji: "BriefcaseBusiness" },
                      ],
                    }));
                    go(id);
                  } else if (modal.type === "habit")
                    setData((d) => ({
                      ...d,
                      habits: [
                        ...d.habits,
                        { id: uid(), name, emoji: "✨", color: "#8a9ee9", days: [] },
                      ],
                    }));
                  else
                    addTask(name, {
                      ...(modal.priority !== undefined ? { priority: modal.priority } : {}),
                      ...(modal.due ? { due: modal.due } : {}),
                    });
                  setModal(null);
                }}
              />
            )}
          </section>
        </div>
      )}
    </div>
  );
}
function CreateForm({ type, onSubmit }) {
  const [name, setName] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim()) onSubmit(name.trim());
      }}
    >
      <label className="form-label">
        {type === "task" ? "Task title" : "Name"}
        <input
          autoFocus
          aria-label={type === "task" ? "Task title" : "Name"}
          placeholder={
            type === "list"
              ? "e.g. Weekend projects"
              : type === "habit"
                ? "e.g. Write a little every day"
                : "What would you like to do?"
          }
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={300}
        />
      </label>
      <button className="primary full" disabled={!name.trim()}>
        Create {type}
      </button>
    </form>
  );
}
function TaskDetail({ task, lists, onPatch, onToggle, onClose, onDelete, onRestore }) {
  const [subtask, setSubtask] = useState(""),
    [tags, setTags] = useState(task.tags.join(", "));
  const titleRef = useRef(null);
  useEffect(() => {
    const node = titleRef.current;
    if (!node) return;
    const resize = () => {
      node.style.height = "0px";
      node.style.height = `${node.scrollHeight}px`;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(node.parentElement);
    return () => observer.disconnect();
  }, [task.title]);
  return (
    <aside className="detail">
      <header className="detail-toolbar">
        <button
          aria-label="Toggle task completion"
          className={`checkbox p${task.priority} ${task.done ? "checked" : ""}`}
          onClick={onToggle}
          disabled={task.deleted}
        >
          {task.done && <Check size={12} />}
        </button>
        <div className="due-control">
          <CalendarDays size={16} />
          <input
            type="date"
            aria-label="Due date"
            value={task.due}
            onChange={(e) => onPatch({ due: e.target.value })}
          />
        </div>
        <IconButton label="Close task details" onClick={onClose}>
          <PanelRightClose size={18} />
        </IconButton>
      </header>
      <div className="detail-body">
        <textarea
          className={`detail-title ${task.done ? "done-title" : ""}`}
          aria-label="Task title"
          value={task.title}
          rows={1}
          ref={titleRef}
          onChange={(e) => {
            if (e.target.value.trim()) onPatch({ title: e.target.value });
          }}
        />
        <textarea
          className="detail-notes"
          aria-label="Task notes"
          placeholder="Description"
          value={task.notes}
          onChange={(e) => onPatch({ notes: e.target.value })}
        />
        <div className="subtasks">
          {task.subtasks.map((s) => (
            <div className="subtask" key={s.id}>
              <button
                className={`checkbox ${s.done ? "checked" : ""}`}
                aria-label={`Toggle subtask ${s.title}`}
                onClick={() =>
                  onPatch({
                    subtasks: task.subtasks.map((x) =>
                      x.id === s.id ? { ...x, done: !x.done } : x,
                    ),
                  })
                }
              >
                {s.done && <Check size={11} />}
              </button>
              <input
                aria-label="Subtask title"
                className={s.done ? "done-title" : ""}
                value={s.title}
                onChange={(e) =>
                  onPatch({
                    subtasks: task.subtasks.map((x) =>
                      x.id === s.id ? { ...x, title: e.target.value } : x,
                    ),
                  })
                }
              />
              <IconButton
                label={`Remove subtask ${s.title}`}
                onClick={() => onPatch({ subtasks: task.subtasks.filter((x) => x.id !== s.id) })}
              >
                <X size={13} />
              </IconButton>
            </div>
          ))}
          <form
            className="add-subtask"
            onSubmit={(e) => {
              e.preventDefault();
              if (!subtask.trim()) return;
              onPatch({
                subtasks: [...task.subtasks, { id: uid(), title: subtask.trim(), done: false }],
              });
              setSubtask("");
            }}
          >
            <Plus size={16} />
            <input
              aria-label="Add subtask"
              placeholder="Add subtask"
              value={subtask}
              onChange={(e) => setSubtask(e.target.value)}
            />
          </form>
        </div>
        <div className="detail-fields">
          <label>
            <Flag size={15} />
            Priority
            <select
              aria-label="Task priority"
              value={task.priority}
              onChange={(e) => onPatch({ priority: Number(e.target.value) })}
            >
              {PRIORITIES.map((p, i) => (
                <option key={p} value={i}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label>
            <CalendarDays size={15} />
            Time
            <input
              type="time"
              aria-label="Task time"
              value={task.time}
              onChange={(e) => onPatch({ time: e.target.value })}
            />
          </label>
          <label>
            <Repeat2 size={15} />
            Repeat
            <select
              aria-label="Task recurrence"
              value={task.repeat}
              onChange={(e) => onPatch({ repeat: e.target.value })}
            >
              <option value="">Never</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </label>
          <label>
            <Tag size={15} />
            Tags
            <input
              aria-label="Task tags"
              placeholder="Add tags, separated by commas"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              onBlur={() => {
                const values = [
                  ...new Set(
                    tags
                      .split(",")
                      .map((t) => t.trim().replace(/^#/, ""))
                      .filter(Boolean),
                  ),
                ];
                setTags(values.join(", "));
                onPatch({ tags: values });
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.target.blur();
              }}
            />
          </label>
        </div>
      </div>
      <footer className="detail-footer">
        <select
          aria-label="Task list"
          value={task.listId}
          onChange={(e) => onPatch({ listId: e.target.value })}
        >
          {lists.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
        {task.deleted ? (
          <button className="text-button" onClick={onRestore}>
            <RotateCcw size={15} />
            Restore
          </button>
        ) : (
          <IconButton label="Move task to trash" onClick={onDelete}>
            <Trash2 size={17} />
          </IconButton>
        )}
      </footer>
    </aside>
  );
}
function CalendarView({ tasks, lists, onSelect, patch, onAdd, toggleSidebar }) {
  const [anchor, setAnchor] = useState(new Date()),
    [mode, setMode] = useState("month");
  const year = anchor.getFullYear(),
    month = anchor.getMonth();
  const monthStart = new Date(year, month, 1);
  const start = addDays(localDate(monthStart), -((monthStart.getDay() + 6) % 7));
  const weekStart = addDays(localDate(anchor), -((anchor.getDay() + 6) % 7));
  const days = Array.from({ length: mode === "month" ? 42 : 7 }, (_, i) =>
    addDays(mode === "month" ? start : weekStart, i),
  );
  const navigate = (direction) =>
    setAnchor((d) =>
      mode === "month"
        ? new Date(d.getFullYear(), d.getMonth() + direction, 1)
        : new Date(addDays(localDate(d), direction * 7) + "T12:00:00"),
    );
  return (
    <>
      <header className="content-header">
        <div className="header-title">
          <IconButton label="Toggle sidebar" onClick={toggleSidebar}>
            <Menu size={19} />
          </IconButton>
          <h1>{anchor.toLocaleDateString("en", { month: "long", year: "numeric" })}</h1>
        </div>
        <div className="calendar-controls">
          <button className="secondary" onClick={() => setAnchor(new Date())}>
            Today
          </button>
          <IconButton label="Previous calendar period" onClick={() => navigate(-1)}>
            <ChevronLeft size={18} />
          </IconButton>
          <IconButton label="Next calendar period" onClick={() => navigate(1)}>
            <ChevronRight size={18} />
          </IconButton>
          <select aria-label="Calendar view" value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="month">Month</option>
            <option value="week">Week</option>
          </select>
        </div>
      </header>
      <div className="calendar-daynames">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className={`calendar-grid ${mode}`}>
        {days.map((date) => (
          <div
            key={date}
            className={`calendar-cell ${new Date(date + "T12:00:00").getMonth() !== month ? "outside" : ""}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => patch(e.dataTransfer.getData("text/plain"), { due: date })}
          >
            <header>
              <button
                className={date === today ? "date-circle is-today" : "date-circle"}
                onClick={() => onAdd(date)}
                aria-label={`Add task on ${date}`}
              >
                {Number(date.slice(-2))}
              </button>
              <IconButton
                label={`Add task for ${date}`}
                className="calendar-add"
                onClick={() => onAdd(date)}
              >
                <Plus size={13} />
              </IconButton>
            </header>
            {tasks
              .filter((t) => t.due === date)
              .sort((a, b) => a.time.localeCompare(b.time))
              .map((t) => (
                <button
                  className="calendar-event"
                  key={t.id}
                  style={{
                    "--event-color": lists.find((l) => l.id === t.listId)?.color || "#8a9ee9",
                  }}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", t.id)}
                  onClick={() => onSelect(t.id)}
                >
                  {t.time && <small>{t.time}</small>}
                  {t.title}
                </button>
              ))}
          </div>
        ))}
      </div>
      <footer className="content-footer">
        <span>Drag a task to reschedule</span>
        <span>{tasks.filter((t) => t.due).length} scheduled tasks</span>
      </footer>
    </>
  );
}
function FocusView({ tasks, sessions, onSession }) {
  const [duration, setDuration] = useState(25),
    [remaining, setRemaining] = useState(25 * 60),
    [running, setRunning] = useState(false),
    [end, setEnd] = useState(null),
    [chosenTask, setChosenTask] = useState(""),
    [breakMode, setBreakMode] = useState(false);
  const onSessionRef = useRef(onSession);
  onSessionRef.current = onSession;
  const runningRef = useRef(false);
  useEffect(() => {
    if (!running || !end) return;
    runningRef.current = true;
    const tick = () => {
      const seconds = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setRemaining(seconds);
      if (seconds === 0 && runningRef.current) {
        runningRef.current = false;
        setRunning(false);
        setEnd(null);
        if (!breakMode)
          onSessionRef.current({
            id: uid(),
            date: localDate(),
            minutes: duration,
            task: tasks.find((t) => t.id === chosenTask)?.title || "Unassigned focus",
          });
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [running, end, breakMode, duration, chosenTask, tasks]);
  const reset = () => {
    setRunning(false);
    setEnd(null);
    setRemaining(duration * 60);
  };
  const totalMinutes = sessions.filter((s) => s.date === today).reduce((a, s) => a + s.minutes, 0);
  return (
    <>
      <header className="content-header">
        <div className="header-title">
          <h1>Focus</h1>
        </div>
        <span className="subtle">One thing at a time.</span>
      </header>
      <div className="focus-content">
        <div className="focus-tabs">
          <button
            className={!breakMode ? "active" : ""}
            onClick={() => {
              setBreakMode(false);
              setDuration(25);
              setRemaining(1500);
              setRunning(false);
              setEnd(null);
            }}
          >
            Pomodoro
          </button>
          <button
            className={breakMode ? "active" : ""}
            onClick={() => {
              setBreakMode(true);
              setDuration(5);
              setRemaining(300);
              setRunning(false);
              setEnd(null);
            }}
          >
            Short break
          </button>
        </div>
        <div
          className="timer-ring"
          style={{ "--progress": `${(1 - remaining / (duration * 60)) * 360}deg` }}
        >
          <div>
            <span className="timer-eyebrow">{breakMode ? "TAKE A BREATH" : "TIME TO FOCUS"}</span>
            <div className="timer-digits">
              {String(Math.floor(remaining / 60)).padStart(2, "0")}
              <span>:</span>
              {String(remaining % 60).padStart(2, "0")}
            </div>
            <span className="subtle">
              {breakMode ? "Rest. Reset. Begin again." : "Small steps. Meaningful progress."}
            </span>
          </div>
        </div>
        <select
          className="focus-task"
          aria-label="Focus on task"
          value={chosenTask}
          onChange={(e) => setChosenTask(e.target.value)}
          disabled={running}
        >
          <option value="">Choose a task to focus on</option>
          {tasks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
        <div className="timer-actions">
          <IconButton label="Reset timer" onClick={reset}>
            <RotateCcw size={20} />
          </IconButton>
          <button
            className="primary timer-start"
            onClick={() => {
              if (running) {
                setRunning(false);
                setEnd(null);
              } else {
                const seconds = remaining || duration * 60;
                setRemaining(seconds);
                setEnd(Date.now() + seconds * 1000);
                setRunning(true);
              }
            }}
          >
            {running ? <Pause size={17} /> : <Play size={17} />}{" "}
            {running ? "Pause" : remaining === duration * 60 ? "Start focusing" : "Continue"}
          </button>
          <label className="duration-picker">
            <input
              type="number"
              min="1"
              max="180"
              aria-label="Focus duration in minutes"
              disabled={running}
              value={duration}
              onChange={(e) => {
                const n = Math.min(180, Math.max(1, Number(e.target.value) || 1));
                setDuration(n);
                setRemaining(n * 60);
              }}
            />
            min
          </label>
        </div>
        <div className="focus-stats">
          <div>
            <strong>{sessions.filter((s) => s.date === today).length}</strong>
            <span>Pomodoros today</span>
          </div>
          <div>
            <strong>
              {totalMinutes}
              <small> min</small>
            </strong>
            <span>Time well spent</span>
          </div>
          <div>
            <strong>{sessions.length}</strong>
            <span>Total sessions</span>
          </div>
        </div>
      </div>
    </>
  );
}
function HabitsView({ habits, onToggle, onAdd }) {
  const [offset, setOffset] = useState(0);
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, -6 + i + offset * 7));
  return (
    <>
      <header className="content-header">
        <div className="header-title">
          <h1>Habits</h1>
          <span className="count-pill">{habits.length}</span>
        </div>
        <button className="primary" onClick={onAdd}>
          <Plus size={16} />
          New habit
        </button>
      </header>
      <div className="habit-intro">
        <span className="eyebrow">A LITTLE, EVERY DAY</span>
        <h2>Build a rhythm that feels like you.</h2>
        <p>Progress is the practice of showing up.</p>
      </div>
      <div className="habit-table">
        <div className="habit-table-head">
          <div className="habit-week-controls">
            <IconButton label="Previous habit week" onClick={() => setOffset((o) => o - 1)}>
              <ChevronLeft size={16} />
            </IconButton>
            <button onClick={() => setOffset(0)}>This week</button>
            <IconButton
              label="Next habit week"
              onClick={() => setOffset((o) => Math.min(0, o + 1))}
              disabled={offset === 0}
            >
              <ChevronRight size={16} />
            </IconButton>
          </div>
          {days.map((d) => (
            <div key={d} className={d === today ? "blue" : ""}>
              <small>
                {new Date(d + "T12:00:00").toLocaleDateString("en", { weekday: "short" })}
              </small>
              <b>{Number(d.slice(-2))}</b>
            </div>
          ))}
        </div>
        {habits.map((h) => (
          <div className="habit-row" key={h.id}>
            <div className="habit-name">
              <span style={{ background: h.color + "20" }}>{h.emoji}</span>
              <div>
                <b>{h.name}</b>
                <small>{h.days.length} check-ins · Daily</small>
              </div>
            </div>
            {days.map((date) => (
              <button
                key={date}
                aria-label={`${h.days.includes(date) ? "Uncheck" : "Check in"} ${h.name} on ${date}`}
                className={`habit-check ${h.days.includes(date) ? "complete" : ""}`}
                style={{ "--habit-color": h.color }}
                onClick={() => onToggle(h.id, date)}
                disabled={date > today}
              >
                {h.days.includes(date) ? <Check size={19} /> : <span />}
              </button>
            ))}
          </div>
        ))}
        <button className="habit-add" onClick={onAdd}>
          <Plus size={17} />
          Create a new habit
        </button>
      </div>
      <div className="habit-summary">
        <Target size={20} />
        <span>
          <b>
            {habits.filter((h) => h.days.includes(today)).length} of {habits.length}
          </b>{" "}
          habits completed today
        </span>
        <div className="habit-progress">
          <span
            style={{
              width: `${habits.length ? (habits.filter((h) => h.days.includes(today)).length / habits.length) * 100 : 0}%`,
            }}
          />
        </div>
      </div>
    </>
  );
}
