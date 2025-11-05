// app/api/files/route.ts
const BASE_URL = "https://api.ittybit.com/files";

export async function GET() {
  const apiKey = process.env.ITTYBIT_API_KEY;
  if (!apiKey) {
    return Response.json({ message: "Missing ITTYBIT_API_KEY on server" }, { status: 500 });
  }

  const res = await fetch(`${BASE_URL}?limit=12`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // leave data as null if non-JSON
  }

  if (!res.ok) {
    return Response.json(
      { message: data?.message || text || "Failed to list files" },
      { status: res.status },
    );
  }

  const payload = data?.data ?? data;
  const files = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];

  return Response.json(files, { status: 200 });
}
