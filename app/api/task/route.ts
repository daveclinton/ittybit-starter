export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return new Response(JSON.stringify({ message: "Missing id" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const res = await fetch(`https://api.ittybit.com/tasks/${id}`, {
    headers: { Authorization: `Bearer ${process.env.ITTYBIT_API_KEY}` },
  });

  const text = await res.text();
  if (!res.ok) {
    return new Response(text || "Upstream error", { status: res.status });
  }

  const json = text ? JSON.parse(text) : null;
  const task = json?.data ?? json;
  const output = task?.output;

  if (output?.id?.startsWith?.("file_") && output?.url) {
    return new Response(JSON.stringify({ done: true, file: output }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ done: false, task }), {
    status: 202,
    headers: { "Content-Type": "application/json" },
  });
}
