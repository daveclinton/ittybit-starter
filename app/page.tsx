"use client";

import { useEffect, useState, type ReactNode } from "react";

/* ------------------------------------------------------------------
 * Tiny UI helpers
 * ------------------------------------------------------------------*/
function Callout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded border p-3 bg-gray-50">
      <p className="font-medium">{title}</p>
      <div className="mt-1 text-sm text-gray-700">{children}</div>
    </div>
  );
}

function Hint({ children }: { children: ReactNode }) {
  return <p className="text-xs text-gray-500">{children}</p>;
}

/* ==================================================================
 * SECTION 1 — URL Upload → Playback
 * What: Send a public .mp4 URL to /api/upload (server proxies to POST https://api.ittybit.com/files)
 * Why: Easiest “hello world” to get a playable URL back.
 * ==================================================================*/
function SectionUrlUpload() {
  const [inputUrl, setInputUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [statusText, setStatusText] = useState<string | null>(null);

  async function handleUpload() {
    setLoading(true);
    setError(null);
    setFile(null);
    setTaskId(null);
    setStatusText(null);
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: inputUrl }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.id?.startsWith?.("file_") && data?.url) {
        setFile(data);
        return;
      }

      if (res.ok && data?.done && data?.file?.id?.startsWith?.("file_") && data?.file?.url) {
        setFile(data.file);
        return;
      }

      const pendingTask = data?.task ?? data;
      if ((res.status === 202 || res.ok) && pendingTask?.id) {
        const id = String(pendingTask.id);
        setTaskId(id);
        setStatusText("Ingesting…");

        let tries = 0;
        const maxTries = 20;
        while (tries < maxTries) {
          const statusRes = await fetch(`/api/task?id=${encodeURIComponent(id)}`);
          const body = await statusRes.json().catch(() => null);

          if (statusRes.ok && body?.done && body?.file?.id?.startsWith?.("file_") && body?.file?.url) {
            setFile(body.file);
            setStatusText(null);
            return;
          }

          if (!statusRes.ok) {
            throw new Error(body?.message || "Polling failed");
          }

          tries += 1;
          setStatusText(`Ingesting… (${tries})`);
          await new Promise((resolve) => setTimeout(resolve, 750));
        }

        setError("Still processing. Try again shortly.");
        setStatusText(null);
        return;
      }

      throw new Error(data?.message || "Upload failed");
    } catch (e: any) {
      setError(e.message || "Something went wrong");
      setStatusText(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="url-upload" className="space-y-3">
      <h2 className="text-xl font-semibold">1) URL Upload → Playback</h2>

      <Callout title="What this does">
        <ol className="list-decimal ml-5 space-y-1">
          <li>Paste a public <code>.mp4</code> /<code>.mp3</code> /<code>.png</code> /<code>.jpg</code> URL.</li>
          <li>Click <strong>Upload</strong> → our server calls <code>POST /files</code> with that URL.</li>
          <li>Ittybit ingests the video and returns a <strong>delivery URL</strong>.</li>
          <li>We render that URL in a <code>&lt;video&gt;</code> player.</li>
        </ol>
        <Hint>
          Expected response:&nbsp;
          <code>{'{ id, status: "ready", url }'}</code>. For very large files, processing can take a
          moment—reload the gallery below if you don’t see it immediately.
        </Hint>
      </Callout>

      <div className="flex gap-2">
        <input
          className="flex-1 border p-2 rounded"
          placeholder="https://example.com/video.mp4"
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
        />
        <button
          onClick={handleUpload}
          disabled={!inputUrl || loading}
          className="bg-black text-white px-4 py-2 rounded"
          title="Calls /api/upload → Ittybit POST /files with { url }"
        >
          {loading ? "Uploading…" : "Upload"}
        </button>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}
      {statusText && (
        <p className="text-xs text-gray-600">
          {statusText}
          {taskId ? ` (task ${taskId})` : ""}
        </p>
      )}

      {file && (
        <div className="space-y-1">
          <p className="text-xs text-gray-600 break-all">
            ✅ Created file <code>{file.id}</code> — playing delivery URL below:
          </p>
          <video controls className="w-full rounded" src={file.url} />
        </div>
      )}
    </section>
  );
}

/* ==================================================================
 * SECTION 2 — Signed Uploads (Client-safe PUT)
 * What: Browser asks our server for a short-lived PUT URL, then uploads directly to Ittybit.
 * Why: No API key in the client; faster path for local files.
 * ==================================================================*/
function SectionSignedPut() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const targetHash = "#signed-put";
    const openIfHashMatches = () => {
      if (window.location.hash === targetHash) setShowDetails(true);
    };

    openIfHashMatches();
    window.addEventListener("hashchange", openIfHashMatches);
    return () => window.removeEventListener("hashchange", openIfHashMatches);
  }, []);

  async function startUpload() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setUploadUrl(null);
    setResultUrl(null);

    try {
      // 1) Ask our server to mint a signed PUT URL.
      const sigRes = await fetch("/api/sign-put", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name }),
      });
      const sig = await sigRes.json();
      if (!sigRes.ok) throw new Error(sig?.message || "Could not sign upload");
      if (!sig?.url) throw new Error("No signed URL returned");
      setUploadUrl(sig.url);

      // 2) Upload the file directly to Ittybit via PUT.
      const put = await fetch(sig.url, { method: "PUT", body: file });

      // Final response: 201 Created, often with no JSON body
      if (put.status === 201) {
        let created = null;
        try {
          created = await put.json();
        } catch {
          // ignore — some responses aren't JSON
        }

        const cleanUrl = sig.url.split("?")[0];
        setResultUrl(created?.url ?? cleanUrl);
      } else {
        const text = await put.text().catch(() => "");
        throw new Error(`Upload failed: ${put.status} ${text}`);
      }
    } catch (e: any) {
      setError(e?.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  const contentId = "signed-put-content";

  return (
    <section id="signed-put" className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">2) Signed Uploads (Client-safe PUT)</h2>
        <button
          type="button"
          className="text-sm underline"
          onClick={() => setShowDetails((prev) => !prev)}
          aria-expanded={showDetails}
          aria-controls={contentId}
        >
          {showDetails ? "Hide details" : "Show details"}
        </button>
      </div>

      <div
        id={contentId}
        className={showDetails ? "mt-3 space-y-3" : "hidden"}
        aria-hidden={!showDetails}
      >
        <Callout title="What this does">
          <ol className="list-decimal ml-5 space-y-1">
            <li>Select a local media file.</li>
            <li>Click the button → our server requests a signed URL from Ittybit.</li>
            <li>The browser uploads <em>directly</em> to Ittybit via that URL.</li>
            <li>On success you get a playable/viewable URL back.</li>
          </ol>
          <Hint>Expected: 200 (signature), then 201 (final PUT).</Hint>
        </Callout>

        <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />

        <div className="flex gap-2">
          <button
            onClick={startUpload}
            disabled={!file || busy}
            className="bg-black text-white px-4 py-2 rounded"
            title="Requests a signed PUT URL, then uploads the file to it"
          >
            {busy ? "Uploading…" : "Upload with Signed PUT"}
          </button>

          {uploadUrl && (
            <button
              type="button"
              className="px-3 py-2 border rounded text-xs"
              onClick={() => navigator.clipboard.writeText(uploadUrl)}
              title="Copy the one-time signed upload URL"
            >
              Copy signed URL
            </button>
          )}
        </div>

        {/* 🧠 Helpful output and error messages */}
        {uploadUrl && <p className="text-xs break-all">PUT → {uploadUrl}</p>}
        {resultUrl && (
          <p className="text-xs break-all text-green-700">
            ✅ Uploaded successfully → {resultUrl}
          </p>
        )}
        {error && (
          <p className="text-red-600 text-sm mt-1">
            ⚠️ {error}
          </p>
        )}

        {/* Optional playback for supported files */}
        {resultUrl && (
  <div className="space-y-1 mt-2">
    <p className="text-xs">Playing uploaded file:</p>

    {/* Detect file type and render appropriately */}
    {/\.(mp4|webm|mov)$/i.test(file?.name || resultUrl) ? (
      <video controls className="w-full rounded" src={resultUrl} />
    ) : /\.(mp3|wav|ogg)$/i.test(file?.name || resultUrl) ? (
      <audio controls className="w-full rounded" src={resultUrl} />
    ) : /\.(png|jpg|jpeg|gif|webp)$/i.test(file?.name || resultUrl) ? (
      <img alt={file?.name || "Uploaded image"} className="w-full rounded" src={resultUrl} />
    ) : (
      <a
        href={resultUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="underline text-sm text-blue-600"
      >
        View uploaded file
      </a>
    )}
  </div>
)}
      </div>
    </section>
  );
}
/* ==================================================================
 * SECTION 3 — Resumable / Chunked Uploads + Progress
 * What: Request a resumable session, then send the file in 16MB chunks with Content-Range.
 * Why: Reliable for large files; shows progress; survives flaky networks.
 * ==================================================================*/
function SectionResumable() {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const CHUNK_SIZE = 16 * 1024 * 1024; // 16MB

  useEffect(() => {
    const targetHash = "#resumable";
    const openIfHashMatches = () => {
      if (window.location.hash === targetHash) setShowDetails(true);
    };

    openIfHashMatches();
    window.addEventListener("hashchange", openIfHashMatches);
    return () => window.removeEventListener("hashchange", openIfHashMatches);
  }, []);

  async function uploadChunks() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setResultUrl(null);
    setProgress(0);

    try {
      // 1) Create a resumable session that accepts chunked PUTs.
      const sessionRes = await fetch("/api/resumable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name }),
      });
      const session = await sessionRes.json();
      if (!sessionRes.ok) throw new Error(session?.message || "Could not start resumable upload");
      if (!session?.url) throw new Error("No resumable URL returned");

      const baseUrl = session.url as string;

      // 2) Send chunks with Content-Range.
      let offset = 0;
      while (offset < file.size) {
        const end = Math.min(offset + CHUNK_SIZE, file.size);
        const chunk = file.slice(offset, end);
        const contentRange = `bytes=${offset}-${end - 1}/${file.size}`;
        const isLastChunk = end === file.size;

        const put = await fetch(baseUrl, {
          method: "PUT",
          headers: { "Content-Range": contentRange },
          body: chunk,
        });

        // 202 for partial chunks, 200/201/204 when the final chunk completes.
        if (![200, 201, 202, 204].includes(put.status)) {
          const text = await put.text().catch(() => "");
          throw new Error(`Chunk failed (${put.status}): ${text}`);
        }

        offset = end;
        setProgress(Math.round((offset / file.size) * 100));

        if (isLastChunk && put.status !== 202) {
          const created = await put.json().catch(() => null);
          setResultUrl(created?.url ?? session?.file?.url ?? baseUrl.split("?")[0]);
        }
      }
    } catch (e: any) {
      const message = e?.message || "Upload failed";
      if (message.includes("Upload not found")) {
        setError(`${message}. Re-run “Create resumable session” then retry chunks.`);
      } else if (message.includes("Content-Range")) {
        setError(`${message}. Double-check chunk byte math and file size.`);
      } else {
        setError(message);
      }
    } finally {
      setBusy(false);
    }
  }
  const contentId = "resumable-content";

  return (
    <section id="resumable" className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">3) Resumable Uploads + Progress</h2>
        <button
          type="button"
          className="text-sm underline"
          onClick={() => setShowDetails((prev) => !prev)}
          aria-expanded={showDetails}
          aria-controls={contentId}
        >
          {showDetails ? "Hide details" : "Show details"}
        </button>
      </div>

      <div
        id={contentId}
        className={showDetails ? "mt-3 space-y-3" : "hidden"}
        aria-hidden={!showDetails}
      >
        <Callout title="What this does">
          <ol className="list-decimal ml-5 space-y-1">
            <li>Pick a large file (e.g., &gt;100MB).</li>
            <li>We mint a resumable session URL, then send the file in 16MB chunks.</li>
            <li>Server replies <code>202</code> for partial chunks; the final chunk returns <code>201</code>.</li>
            <li>You see a live progress percentage as chunks finish.</li>
          </ol>
          <Hint>If your connection drops, retrying will re-send only the remaining chunks (this demo keeps it simple).</Hint>
        </Callout>

        <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <button
          onClick={uploadChunks}
          disabled={!file || busy}
          className="bg-black text-white px-4 py-2 rounded"
          title="Creates a resumable session, then uploads in chunks with Content-Range"
        >
          {busy ? `Uploading… ${progress}%` : "Upload (Resumable)"}
        </button>

        <div className="text-sm">Progress: {progress}%</div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {resultUrl && (
          <div className="space-y-1">
            <p className="text-xs">✅ Completed upload. Playing result:</p>
            <video controls className="w-full rounded" src={resultUrl} />
          </div>
        )}
      </div>
    </section>
  );
}

/* ==================================================================
 * SECTION 4 — Delivery: Signed GET (Private Playback)
 * What: Provide folder/filename, server mints an expiring GET URL, we play it.
 * Why: Protect private content; control who can watch and for how long.
 * ==================================================================*/
function SectionSignedGet() {
  const [path, setPath] = useState(""); // ex: "uploads/my-video.mp4"
  const [playUrl, setPlayUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const targetHash = "#signed-get";
    const openIfHashMatches = () => {
      if (window.location.hash === targetHash) setShowDetails(true);
    };

    openIfHashMatches();
    window.addEventListener("hashchange", openIfHashMatches);
    return () => window.removeEventListener("hashchange", openIfHashMatches);
  }, []);

  async function signPlayback() {
    setError(null);
    setPlayUrl(null);
    setBusy(true);

    try {
      const parts = (path || "").split("/").filter(Boolean);
      const filename = parts.pop() || "";
      const folder = parts.join("/");

      const res = await fetch("/api/sign-get", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, folder }),
      });
      const sig = await res.json();
      if (!res.ok) throw new Error(sig?.message || "Failed to sign URL");
      if (!sig?.url) throw new Error("No playback URL returned");
      setPlayUrl(sig.url);
    } catch (e: any) {
      setError(e.message || "Signing failed");
    } finally {
      setBusy(false);
    }
  }
  const contentId = "signed-get-content";

  return (
    <section id="signed-get" className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">4) Delivery: Signed GET (Private Playback)</h2>
        <button
          type="button"
          className="text-sm underline"
          onClick={() => setShowDetails((prev) => !prev)}
          aria-expanded={showDetails}
          aria-controls={contentId}
        >
          {showDetails ? "Hide details" : "Show details"}
        </button>
      </div>

      <div
        id={contentId}
        className={showDetails ? "mt-3 space-y-3" : "hidden"}
        aria-hidden={!showDetails}
      >
        <Callout title="What this does">
          <ol className="list-decimal ml-5 space-y-1">
            <li>Enter a stored path (e.g., <code>uploads/my-video.mp4</code>).</li>
            <li>Click the button → server requests a temporary GET URL.</li>
            <li>We play that expiring link below.</li>
          </ol>
          <Hint>Great for members-only videos, course content, or internal footage.</Hint>
        </Callout>

        <div className="flex gap-2">
          <input
            className="w-full border p-2 rounded"
            placeholder="uploads/my-video.mp4"
            value={path}
            onChange={(e) => setPath(e.target.value)}
          />
          <button
            onClick={signPlayback}
            className="bg-black text-white px-4 py-2 rounded"
            title="Calls /api/sign-get to mint a temporary playback URL"
            disabled={busy || !path}
          >
            {busy ? "Signing…" : "Get signed playback link"}
          </button>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}
        {playUrl && (
          <div className="space-y-1">
            <p className="text-xs break-all">🔒 Signed (expiring) URL: {playUrl}</p>
            <video controls className="w-full rounded" src={playUrl} />
          </div>
        )}
      </div>
    </section>
  );
}

/* ==================================================================
 * MAIN PAGE — TOC + optional gallery
 * ==================================================================*/
export default function TutorialPage() {
  // Optional gallery (helps you find paths to test Signed GET)
  const [files, setFiles] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/files");
        const data = await res.json();
        if (Array.isArray(data)) setFiles(data);
      } catch {
        // ignore
      }
    })();
  }, []);

  return (
    <main className="p-8 mx-auto max-w-4xl space-y-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Ultimate Uploads &amp; Delivery</h1>
        <p className="text-sm text-gray-600">
          One page, four flows. Each button states which API it calls and what response to expect.
        </p>
        <nav className="text-sm flex flex-wrap gap-4">
          <a className="underline" href="#url-upload">1) URL Upload</a>
          <a className="underline" href="#signed-put">2) Signed PUT</a>
          <a className="underline" href="#resumable">3) Resumable</a>
          <a className="underline" href="#signed-get">4) Signed GET</a>
        </nav>
      </header>

      <SectionUrlUpload />
      <hr className="my-6" />

      <SectionSignedPut />
      <hr className="my-6" />

      <SectionResumable />
      <hr className="my-6" />

      <SectionSignedGet />

      {!!files.length && (
        <>
          <hr className="my-6" />
          <section id="gallery" className="space-y-3">
            <h2 className="text-lg font-semibold">Recent files (from /api/files)</h2>
            <Hint>Use these <em>paths</em> with the “Signed GET” section.</Hint>
            <ul className="grid sm:grid-cols-2 gap-4">
              {files.filter(Boolean).map((f, idx) => {
                const file = (typeof f === "object" && f !== null) ? f : {};
                const id = typeof file.id === "string" ? file.id : `file-${idx}`;
                return (
                  <li key={id} className="border p-2 rounded">
                  <div className="text-xs text-gray-600 break-all">
                    path: {file.path || file.filename || file.id || "unknown"}
                  </div>
                  {file.kind === "video" ? (
                    <video controls className="w-full rounded mt-2" src={file.url} />
                  ) : file.kind === "image" ? (
                    <img alt={file.filename || file.id || `file-${idx}`} className="w-full rounded mt-2" src={file.url} />
                  ) : (
                    <a className="underline mt-2 inline-block" href={file.url}>
                      {file.filename || file.url || file.id || "View file"}
                    </a>
                  )}
                </li>
              )})}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}
