import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  nextDue,
  createTask,
  toggleTask,
  matchesView,
  parseQuickAdd,
  validateState,
  seedState,
} from "../src/model.mjs";
test("local calendar calculations cross month, year and daylight saving boundaries", () => {
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2026-10-04", -1), "2026-10-03");
  assert.equal(addDays("2024-02-28", 1), "2024-02-29");
  assert.equal(nextDue("2026-01-31", "monthly"), "2026-02-28");
  assert.equal(nextDue("2024-01-31", "monthly"), "2024-02-29");
});
test("completion creates exactly one future recurring task with reset subtasks", () => {
  let state = {
    tasks: [
      createTask("Read", {
        id: "a",
        due: "2026-10-18",
        repeat: "daily",
        subtasks: [{ id: "s", title: "Chapter", done: true }],
      }),
    ],
  };
  state = toggleTask(state, "a");
  assert.equal(state.tasks[0].done, true);
  assert.equal(state.tasks.length, 2);
  assert.equal(state.tasks[1].due, "2026-10-19");
  assert.equal(state.tasks[1].subtasks[0].done, false);
  assert.notEqual(state.tasks[1].id, "a");
  state = toggleTask(state, "a");
  assert.equal(state.tasks.length, 2);
  assert.equal(state.tasks[0].done, false);
  state = toggleTask(state, "a");
  assert.equal(state.tasks.length, 2);
});
test("smart lists separate completed, trash, overdue and upcoming tasks", () => {
  const t = createTask("Test", { due: "2026-10-17" });
  assert.ok(matchesView(t, "today", "2026-10-18"));
  assert.ok(!matchesView(t, "week", "2026-10-18"));
  assert.ok(matchesView({ ...t, due: "2026-10-24" }, "week", "2026-10-18"));
  assert.ok(!matchesView({ ...t, due: "2026-10-25" }, "week", "2026-10-18"));
  assert.ok(!matchesView({ ...t, deleted: true }, "today", "2026-10-18"));
  assert.ok(matchesView({ ...t, done: true }, "completed"));
  assert.ok(matchesView({ ...t, deleted: true }, "trash"));
});
test("quick capture recognizes supported dates, tags and priorities without losing text", () => {
  assert.deepEqual(parseQuickAdd("Read tomorrow #books !2", "2026-12-31"), {
    title: "Read",
    due: "2027-01-01",
    tags: ["books"],
    priority: 2,
  });
  assert.equal(parseQuickAdd("Buy milk #groceries").title, "Buy milk");
  assert.equal(parseQuickAdd("Plan !4").priority, 0);
});
test("backup roundtrip keeps data and rejects malformed or unsafe shapes", () => {
  const data = seedState();
  assert.deepEqual(validateState(JSON.parse(JSON.stringify(data))), data);
  assert.throws(() => validateState({ version: 9 }));
  const invalid = structuredClone(data);
  invalid.tasks[0].due = "2026-02-31";
  assert.throws(() => validateState(invalid));
  const duplicate = structuredClone(data);
  duplicate.tasks.push(duplicate.tasks[0]);
  assert.throws(() => validateState(duplicate));
  const missing = structuredClone(data);
  missing.tasks[0].listId = "missing";
  assert.throws(() => validateState(missing));
});
