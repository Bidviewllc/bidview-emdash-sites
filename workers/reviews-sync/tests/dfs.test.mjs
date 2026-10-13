import test from "node:test";
import assert from "node:assert/strict";
import { postTask, getTask } from "../src/dfs.js";
import { alert } from "../src/alert.js";

const env = { DATAFORSEO_LOGIN: "l", DATAFORSEO_PASSWORD: "p" };
const reply = (body) => async () => ({ json: async () => body });

test("postTask sends depth, sort and place_id and returns the task id", async () => {
  let sent;
  const fetchFn = async (url, init) => { sent = { url, init }; return { json: async () => ({ tasks: [{ id: "T1", status_code: 20100 }] }) }; };
  const id = await postTask(env, { key: "arvada", placeId: "ChIJx", depth: 50 }, fetchFn);
  assert.equal(id, "T1");
  const body = JSON.parse(sent.init.body)[0];
  assert.equal(body.place_id, "ChIJx");
  assert.equal(body.depth, 50);
  assert.equal(body.sort_by, "newest");
  assert.match(sent.init.headers.Authorization, /^Basic /);
});

test("postTask throws on a rejected task", async () => {
  await assert.rejects(postTask(env, { key: "k", placeId: "p" }, reply({ tasks: [{ status_code: 40501, status_message: "bad" }] })), /task_post failed/);
});

test("getTask maps ready, queued and error states", async () => {
  assert.equal((await getTask(env, "T", reply({ tasks: [{ status_code: 20000, result: [{ title: "x" }] }] }))).state, "ready");
  assert.equal((await getTask(env, "T", reply({ tasks: [{ status_code: 40602, status_message: "in queue" }] }))).state, "pending");
  assert.equal((await getTask(env, "T", reply({ tasks: [{ status_code: 40601 }] }))).state, "pending");
  assert.equal((await getTask(env, "T", reply({ tasks: [{ status_code: 20100 }] }))).state, "pending");
  const err = await getTask(env, "T", reply({ tasks: [{ status_code: 50000, status_message: "boom" }] }));
  assert.equal(err.state, "error");
  assert.match(err.message, /boom/);
});

const leakEnv = { DATAFORSEO_LOGIN: "login-x7", DATAFORSEO_PASSWORD: "s3cret-pw-x9" };
const httpFail = (status) => async () => ({ ok: false, status, json: async () => ({}) });
const notJson = async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError("Unexpected token <"); } });
const rejects = async () => { throw new Error("socket hang up"); };

test("postTask throws on a non-2xx response", async () => {
  await assert.rejects(postTask(env, { key: "k", placeId: "p" }, httpFail(502)), /task_post HTTP 502/);
});

test("postTask throws a clear error on a non-JSON body", async () => {
  await assert.rejects(postTask(env, { key: "k", placeId: "p" }, notJson), /task_post returned a non-JSON response/);
});

test("getTask reports a non-2xx response as an error state", async () => {
  const r = await getTask(env, "T", httpFail(429));
  assert.deepEqual(r, { state: "error", message: "task_get HTTP 429" });
});

test("getTask reports a non-JSON body as an error state", async () => {
  const r = await getTask(env, "T", notJson);
  assert.deepEqual(r, { state: "error", message: "task_get returned a non-JSON response" });
});

test("getTask reports an empty tasks array as an error state", async () => {
  assert.deepEqual(await getTask(env, "T", reply({ tasks: [] })), { state: "error", message: "task_get returned no task" });
  assert.deepEqual(await getTask(env, "T", reply({})), { state: "error", message: "task_get returned no task" });
});

test("getTask reports a task with no status code as an error, not pending", async () => {
  const r = await getTask(env, "T", reply({ tasks: [{ id: "T" }] }));
  assert.equal(r.state, "error");
});

test("getTask still throws when fetchFn rejects", async () => {
  await assert.rejects(getTask(env, "T", rejects), /socket hang up/);
});

test("no error or returned message leaks the Basic header or the password", async () => {
  const messages = [];
  const grab = async (p) => { try { const r = await p; if (r?.message) messages.push(r.message); } catch (e) { messages.push(e.message); } };
  await grab(postTask(leakEnv, { key: "k", placeId: "p" }, httpFail(500)));
  await grab(postTask(leakEnv, { key: "k", placeId: "p" }, notJson));
  await grab(postTask(leakEnv, { key: "k", placeId: "p" }, reply({ tasks: [{ status_code: 40501, status_message: "bad" }] })));
  await grab(getTask(leakEnv, "T", httpFail(503)));
  await grab(getTask(leakEnv, "T", notJson));
  await grab(getTask(leakEnv, "T", reply({ tasks: [] })));
  await grab(getTask(leakEnv, "T", reply({ tasks: [{ status_code: 50000, status_message: "boom" }] })));
  assert.equal(messages.length, 7);
  for (const m of messages) {
    assert.ok(!m.includes("Basic"), `message leaks Basic header: ${m}`);
    assert.ok(!m.includes(leakEnv.DATAFORSEO_PASSWORD), `message leaks password: ${m}`);
    assert.ok(!m.includes(leakEnv.DATAFORSEO_LOGIN), `message leaks login: ${m}`);
  }
});

test("alert posts to Slack when a webhook is set and is silent otherwise", async () => {
  let called = 0;
  const fetchFn = async () => { called++; return {}; };
  await alert({}, "no webhook", fetchFn);
  assert.equal(called, 0);
  await alert({ SLACK_ALERTS_WEBHOOK: "https://example.invalid/h" }, "hello", fetchFn);
  assert.equal(called, 1);
  await alert({ SLACK_ALERTS_WEBHOOK: "https://example.invalid/h" }, "x", async () => { throw new Error("net"); });
});
