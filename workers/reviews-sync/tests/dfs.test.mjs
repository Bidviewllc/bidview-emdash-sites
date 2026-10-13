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

test("alert posts to Slack when a webhook is set and is silent otherwise", async () => {
  let called = 0;
  const fetchFn = async () => { called++; return {}; };
  await alert({}, "no webhook", fetchFn);
  assert.equal(called, 0);
  await alert({ SLACK_ALERTS_WEBHOOK: "https://example.invalid/h" }, "hello", fetchFn);
  assert.equal(called, 1);
  await alert({ SLACK_ALERTS_WEBHOOK: "https://example.invalid/h" }, "x", async () => { throw new Error("net"); });
});
