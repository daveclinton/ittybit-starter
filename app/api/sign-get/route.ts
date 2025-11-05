// app/api/sign-get/route.ts
export async function POST(req: Request) {
    try {
      const { filename, folder } = await req.json();
  
      if (!process.env.ITTYBIT_API_KEY) {
        return Response.json({ message: "Missing ITTYBIT_API_KEY" }, { status: 500 });
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
          method: "get",
          expiry: Math.floor(Date.now() / 1000) + 60 * 5, // 5 min expiry
        }),
      });
  
      const text = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {}
  
      if (!res.ok) {
        return Response.json({ message: data?.message || text || "Failed to sign URL" }, { status: res.status });
      }
  
      const sig = data?.data ?? data;
      return Response.json(sig, { status: 200 });
    } catch (e: any) {
      return Response.json({ message: e?.message || "Server error" }, { status: 500 });
    }
  }