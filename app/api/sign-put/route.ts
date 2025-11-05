// app/api/sign-put/route.ts
function inferFilename(input: string): string {
  try {
    const url = new URL(input);
    const path = url.pathname.split("/").pop() || "untitled";
    return decodeURIComponent(path.split("?")[0]) || "untitled";
  } catch {
    return input || "untitled";
  }
}

export async function POST(req: Request) {
  try {
    const { filename: inputFilename, folder } = await req.json();
    const filename = inferFilename(inputFilename);

    if (!process.env.ITTYBIT_API_KEY) {
      return Response.json({ message: "Missing ITTYBIT_API_KEY on server" }, { status: 500 });
    }

    const res = await fetch("https://api.ittybit.com/signatures", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.ITTYBIT_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filename,
        folder,
        method: "put",
        expiry: Math.floor(Date.now() / 1000) + 60 * 10,
        metadata: { title: filename },
      }),
    });

    const text = await res.text();
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      // ignore non-JSON responses
    }

    if (!res.ok) {
      return Response.json(
        { message: data?.message || text || "Failed to sign upload" },
        { status: res.status },
      );
    }

    const sig = data?.data ?? data;
    return Response.json(sig, { status: 200 });
  } catch (e: any) {
    return Response.json({ message: e?.message || "Server error" }, { status: 500 });
  }
}