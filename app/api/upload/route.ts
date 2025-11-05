// app/api/upload/route.ts
async function createFileFromUrl(url: string, folder?: string, filename?: string) {
  const res = await fetch("https://api.ittybit.com/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.ITTYBIT_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url, folder, filename }),
  });

  const text = await res.text();
  if (!res.ok) {
    return { ok: false, status: res.status, body: text };
  }

  const json = text ? JSON.parse(text) : null;
  const file = json?.data ?? json;
  if (file?.id && String(file.id).startsWith("file_") && file?.url) {
    return { ok: true, file };
  }
  return { ok: false, status: 502, body: JSON.stringify({ message: "Not a File payload", payload: json }) };
}

async function createIngestTask(url: string, folder?: string, filename?: string) {
  const res = await fetch("https://api.ittybit.com/tasks", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.ITTYBIT_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ kind: "ingest", url, folder, filename }),
  });
  const j = await res.json();
  if (!res.ok) {
    return { ok: false, status: res.status, task: j };
  }
  // unwrap {meta,data} if present
  const task = j?.data ?? j;
  return { ok: true, task };
}

async function getTask(taskId: string) {
  const res = await fetch(`https://api.ittybit.com/tasks/${taskId}`, {
    headers: { Authorization: `Bearer ${process.env.ITTYBIT_API_KEY}` },
  });
  const j = await res.json();
  if (!res.ok) return { ok: false, status: res.status, task: j };
  const task = j?.data ?? j;
  return { ok: true, task };
}

export async function POST(req: Request) {
  try {
    const { url, folder, filename } = await req.json();
    if (!url || typeof url !== "string") {
      return Response.json({ message: "Missing 'url'" }, { status: 400 });
    }
    if (!process.env.ITTYBIT_API_KEY) {
      return Response.json({ message: "Server missing ITTYBIT_API_KEY" }, { status: 500 });
    }

    // 1) Try direct Files API first (fast path)
    const first = await createFileFromUrl(url, folder, filename);
    if (first.ok) {
      return Response.json(first.file); // { id: "file_...", url, status, ... }
    }

    // 2) Fallback: create an ingest Task and do a short poll for output
    const created = await createIngestTask(url, folder, filename);
    if (!created.ok) {
      return Response.json(
        { message: "Failed to create ingest task", payload: created.task },
        { status: created.status || 502 }
      );
    }

    // brief poll (up to ~5s total) — enough for small files
    const taskId = created.task.id;
    const started = Date.now();
    let last: any = created.task;
    while (Date.now() - started < 5000) {
      const step = await getTask(taskId);
      if (!step.ok) break;
      last = step.task;

      const output = last?.output;
      if (output?.id && String(output.id).startsWith("file_") && output?.url) {
        return Response.json(output);
      }

      if (["failed", "error", "cancelled"].includes(String(last.status))) {
        return Response.json(
          { message: "Ingest failed", task: last },
          { status: 502 }
        );
      }
      // small delay between polls
      await new Promise(r => setTimeout(r, 750));
    }

    // Not ready yet — return the task so the client can keep polling if desired
    return Response.json({ message: "Ingest pending", task: last }, { status: 202 });
  } catch (err: any) {
    return Response.json({ message: err?.message || "Server error" }, { status: 500 });
  }
}