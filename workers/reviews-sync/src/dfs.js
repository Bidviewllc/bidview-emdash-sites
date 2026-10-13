const BASE = "https://api.dataforseo.com/v3/business_data/google/reviews";

const headers = (env) => ({
  Authorization: "Basic " + btoa(`${env.DATAFORSEO_LOGIN}:${env.DATAFORSEO_PASSWORD}`),
  "Content-Type": "application/json",
});

export async function postTask(env, loc, fetchFn = fetch) {
  const res = await fetchFn(`${BASE}/task_post`, {
    method: "POST",
    headers: headers(env),
    body: JSON.stringify([{
      place_id: loc.placeId,
      language_name: "English",
      location_name: "United States",
      depth: loc.depth ?? 50,
      sort_by: "newest",
      tag: loc.key,
    }]),
    signal: AbortSignal.timeout(30000),
  });
  const task = (await res.json())?.tasks?.[0];
  if (!task?.id || (task.status_code && task.status_code >= 40000)) {
    throw new Error(`task_post failed: ${task?.status_code} ${task?.status_message}`);
  }
  return task.id;
}

// 20000 with a result is ready. 40601 (handed) and 40602 (in queue) mean still working.
// Any other 4xxxx or 5xxxx is an error.
export async function getTask(env, taskId, fetchFn = fetch) {
  const res = await fetchFn(`${BASE}/task_get/${encodeURIComponent(taskId)}`, {
    headers: headers(env),
    signal: AbortSignal.timeout(30000),
  });
  const task = (await res.json())?.tasks?.[0];
  if (task?.status_code === 20000 && task.result?.[0]) return { state: "ready", result: task.result[0] };
  const code = task?.status_code;
  if (code >= 40000 && code !== 40601 && code !== 40602) {
    return { state: "error", message: `${code} ${task?.status_message}` };
  }
  return { state: "pending" };
}
