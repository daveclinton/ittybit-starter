"use client"

import { useEffect, useState, type ReactNode } from "react"
import { ChevronLeft, ChevronRight, Upload, Lock, Zap, Eye } from "lucide-react"

/* ------------------------------------------------------------------
 * UI Components
 * ------------------------------------------------------------------*/
function Callout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-border/50 p-4 bg-card/50 backdrop-blur-sm">
      <p className="font-semibold text-foreground mb-2">{title}</p>
      <div className="text-sm text-foreground space-y-2">{children}</div>
    </div>
  )
}

function Hint({ children }: { children: ReactNode }) {
  return <p className="text-xs text-foreground italic">{children}</p>
}

/* ==================================================================
 * SECTION 1 — URL Upload → Playback
 * ==================================================================*/
function SectionUrlUpload() {
  const [inputUrl, setInputUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [taskId, setTaskId] = useState<string | null>(null)
  const [statusText, setStatusText] = useState<string | null>(null)

  async function handleUpload() {
    setLoading(true)
    setError(null)
    setFile(null)
    setTaskId(null)
    setStatusText(null)
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: inputUrl }),
      })

      const data = await res.json().catch(() => null)

      if (res.ok && data?.id?.startsWith?.("file_") && data?.url) {
        setFile(data)
        return
      }

      if (res.ok && data?.done && data?.file?.id?.startsWith?.("file_") && data?.file?.url) {
        setFile(data.file)
        return
      }

      const pendingTask = data?.task ?? data
      if ((res.status === 202 || res.ok) && pendingTask?.id) {
        const id = String(pendingTask.id)
        setTaskId(id)
        setStatusText("Ingesting…")

        let tries = 0
        const maxTries = 20
        while (tries < maxTries) {
          const statusRes = await fetch(`/api/task?id=${encodeURIComponent(id)}`)
          const body = await statusRes.json().catch(() => null)

          if (statusRes.ok && body?.done && body?.file?.id?.startsWith?.("file_") && body?.file?.url) {
            setFile(body.file)
            setStatusText(null)
            return
          }

          if (!statusRes.ok) {
            throw new Error(body?.message || "Polling failed")
          }

          tries += 1
          setStatusText(`Ingesting… (${tries})`)
          await new Promise((resolve) => setTimeout(resolve, 750))
        }

        setError("Still processing. Try again shortly.")
        setStatusText(null)
        return
      }

      throw new Error(data?.message || "Upload failed")
    } catch (e: any) {
      setError(e.message || "Something went wrong")
      setStatusText(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 flex flex-col items-center text-center">
      <div className="flex flex-col items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
          <Upload className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-foreground mb-1">URL Upload → Playback</h3>
          <p className="text-xs text-foreground">Send a public URL, get a playable link back</p>
        </div>
      </div>

      <Callout title="How it works">
        <ol className="list-decimal ml-4 space-y-1 text-xs inline-block text-left">
          <li>
            Paste a public <code className="bg-muted px-1.5 py-0.5 rounded text-xs text-foreground">.mp4</code> /{" "}
            <code className="bg-muted px-1.5 py-0.5 rounded text-xs text-foreground">.mp3</code> URL
          </li>
          <li>
            Click <strong>Upload</strong> → our server calls{" "}
            <code className="bg-muted px-1.5 py-0.5 rounded text-xs text-foreground">POST /files</code>
          </li>
          <li>
            Ittybit ingests the file and returns a <strong>delivery URL</strong>
          </li>
          <li>Stream it in the preview below</li>
        </ol>
      </Callout>

      <div className="space-y-2 w-full max-w-xs">
        <div className="flex gap-2">
          <input
            className="flex-1 border border-border/30 bg-background text-foreground placeholder:text-foreground/50 p-2 rounded-lg text-sm"
            placeholder="https://example.com/video.mp4"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
          />
          <button
            onClick={handleUpload}
            disabled={!inputUrl || loading}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all text-sm flex-shrink-0"
          >
            {loading ? "…" : "Upload"}
          </button>
        </div>

        {error && <p className="text-destructive text-xs p-2 bg-destructive/10 rounded-lg">{error}</p>}
        {statusText && (
          <p className="text-xs text-foreground p-2 bg-muted/30 rounded-lg">
            ⏳ {statusText}
            {taskId ? ` (${taskId})` : ""}
          </p>
        )}

        {file && (
          <div className="space-y-1 p-3 bg-muted/20 rounded-lg">
            <p className="text-xs text-foreground">
              ✅ Created file <code className="bg-muted px-1.5 py-0.5 rounded text-xs text-foreground">{file.id}</code>
            </p>
            <video controls className="w-full rounded-lg bg-black max-h-48" src={file.url} />
          </div>
        )}
      </div>
    </div>
  )
}

/* ==================================================================
 * SECTION 2 — Signed Uploads
 * ==================================================================*/
function SectionSignedPut() {
  const [file, setFile] = useState<File | null>(null)
  const [uploadUrl, setUploadUrl] = useState<string | null>(null)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function startUpload() {
    if (!file) return
    setBusy(true)
    setError(null)
    setUploadUrl(null)
    setResultUrl(null)

    try {
      const sigRes = await fetch("/api/sign-put", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name }),
      })
      const sig = await sigRes.json()
      if (!sigRes.ok) throw new Error(sig?.message || "Could not sign upload")
      if (!sig?.url) throw new Error("No signed URL returned")
      setUploadUrl(sig.url)

      const put = await fetch(sig.url, { method: "PUT", body: file })

      if (put.status === 201) {
        let created = null
        try {
          created = await put.json()
        } catch {
          // ignore
        }

        const cleanUrl = sig.url.split("?")[0]
        setResultUrl(created?.url ?? cleanUrl)
      } else {
        const text = await put.text().catch(() => "")
        throw new Error(`Upload failed: ${put.status} ${text}`)
      }
    } catch (e: any) {
      setError(e?.message || "Upload failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4 flex flex-col items-center text-center">
      <div className="flex flex-col items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
          <Lock className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-foreground mb-1">Signed Uploads</h3>
          <p className="text-xs text-foreground">Client-safe PUT with no API key exposure</p>
        </div>
      </div>

      <Callout title="How it works">
        <ol className="list-decimal ml-4 space-y-1 text-xs inline-block text-left">
          <li>Select a local media file</li>
          <li>Click upload → server requests a signed URL from Ittybit</li>
          <li>
            Browser uploads <em>directly</em> to Ittybit via that URL
          </li>
          <li>Get a playable URL on success</li>
        </ol>
      </Callout>

      <div className="space-y-2 w-full max-w-xs">
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-foreground file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
        />

        <div className="flex gap-2">
          <button
            onClick={startUpload}
            disabled={!file || busy}
            className="flex-1 bg-primary text-primary-foreground px-3 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all text-sm"
          >
            {busy ? "…" : "Upload"}
          </button>

          {uploadUrl && (
            <button
              type="button"
              className="px-3 py-2 border border-border/30 rounded-lg text-xs hover:bg-muted/50 transition-all font-medium flex-shrink-0"
              onClick={() => navigator.clipboard.writeText(uploadUrl)}
            >
              Copy
            </button>
          )}
        </div>

        {uploadUrl && (
          <p className="text-xs break-all text-foreground bg-muted/20 p-2 rounded">
            🔗 {uploadUrl.substring(0, 35)}...
          </p>
        )}
        {resultUrl && (
          <div className="space-y-1 p-3 bg-muted/20 rounded-lg">
            <p className="text-xs text-foreground">✅ Uploaded successfully</p>
            {/\.(mp4|webm|mov)$/i.test(file?.name || resultUrl) ? (
              <video controls className="w-full rounded-lg bg-black max-h-48" src={resultUrl} />
            ) : /\.(mp3|wav|ogg)$/i.test(file?.name || resultUrl) ? (
              <audio controls className="w-full text-xs" src={resultUrl} />
            ) : /\.(png|jpg|jpeg|gif|webp)$/i.test(file?.name || resultUrl) ? (
              <img
                alt="Uploaded"
                className="w-full rounded-lg max-h-48 object-cover"
                src={resultUrl || "/placeholder.svg"}
              />
            ) : (
              <a
                href={resultUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline text-xs"
              >
                View file
              </a>
            )}
          </div>
        )}
        {error && <p className="text-destructive text-xs p-2 bg-destructive/10 rounded-lg">{error}</p>}
      </div>
    </div>
  )
}

/* ==================================================================
 * SECTION 3 — Resumable Uploads
 * ==================================================================*/
function SectionResumable() {
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const CHUNK_SIZE = 16 * 1024 * 1024

  async function uploadChunks() {
    if (!file) return
    setBusy(true)
    setError(null)
    setResultUrl(null)
    setProgress(0)

    try {
      const sessionRes = await fetch("/api/resumable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name }),
      })
      const session = await sessionRes.json()
      if (!sessionRes.ok) throw new Error(session?.message || "Could not start resumable upload")
      if (!session?.url) throw new Error("No resumable URL returned")

      const baseUrl = session.url as string

      let offset = 0
      while (offset < file.size) {
        const end = Math.min(offset + CHUNK_SIZE, file.size)
        const chunk = file.slice(offset, end)
        const contentRange = `bytes=${offset}-${end - 1}/${file.size}`
        const isLastChunk = end === file.size

        const put = await fetch(baseUrl, {
          method: "PUT",
          headers: { "Content-Range": contentRange },
          body: chunk,
        })

        if (![200, 201, 202, 204].includes(put.status)) {
          const text = await put.text().catch(() => "")
          throw new Error(`Chunk failed (${put.status}): ${text}`)
        }

        offset = end
        setProgress(Math.round((offset / file.size) * 100))

        if (isLastChunk && put.status !== 202) {
          const created = await put.json().catch(() => null)
          setResultUrl(created?.url ?? session?.file?.url ?? baseUrl.split("?")[0])
        }
      }
    } catch (e: any) {
      const message = e?.message || "Upload failed"
      if (message.includes("Upload not found")) {
        setError(`${message}. Please retry.`)
      } else {
        setError(message)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4 flex flex-col items-center text-center">
      <div className="flex flex-col items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
          <Zap className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-foreground mb-1">Resumable Uploads</h3>
          <p className="text-xs text-foreground">Large files with chunked upload and progress tracking</p>
        </div>
      </div>

      <Callout title="How it works">
        <ol className="list-decimal ml-4 space-y-1 text-xs inline-block text-left">
          <li>Pick a large file (100MB+)</li>
          <li>We create a resumable session, then send in 16MB chunks</li>
          <li>Server replies 202 for partial chunks, 201 when done</li>
          <li>See live progress as chunks complete</li>
        </ol>
      </Callout>

      <div className="space-y-2 w-full max-w-xs">
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-foreground file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
        />

        <button
          onClick={uploadChunks}
          disabled={!file || busy}
          className="w-full bg-primary text-primary-foreground px-3 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all text-sm"
        >
          {busy ? `Uploading… ${progress}%` : "Upload"}
        </button>

        {progress > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-foreground">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-muted/30 rounded-full h-1.5 overflow-hidden">
              <div className="bg-primary h-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {error && <p className="text-destructive text-xs p-2 bg-destructive/10 rounded-lg">{error}</p>}
        {resultUrl && (
          <div className="space-y-1 p-3 bg-muted/20 rounded-lg">
            <p className="text-xs text-foreground">✅ Complete!</p>
            <video controls className="w-full rounded-lg bg-black max-h-48" src={resultUrl} />
          </div>
        )}
      </div>
    </div>
  )
}

/* ==================================================================
 * SECTION 4 — Signed GET (Private Playback)
 * ==================================================================*/
function SectionSignedGet() {
  const [path, setPath] = useState("")
  const [playUrl, setPlayUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function signPlayback() {
    setError(null)
    setPlayUrl(null)
    setBusy(true)

    try {
      const parts = (path || "").split("/").filter(Boolean)
      const filename = parts.pop() || ""
      const folder = parts.join("/")

      const res = await fetch("/api/sign-get", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, folder }),
      })
      const sig = await res.json()
      if (!res.ok) throw new Error(sig?.message || "Failed to sign URL")
      if (!sig?.url) throw new Error("No playback URL returned")
      setPlayUrl(sig.url)
    } catch (e: any) {
      setError(e.message || "Signing failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4 flex flex-col items-center text-center">
      <div className="flex flex-col items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
          <Eye className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-foreground mb-1">Signed Playback</h3>
          <p className="text-xs text-foreground">Private content with expiring access links</p>
        </div>
      </div>

      <Callout title="How it works">
        <ol className="list-decimal ml-4 space-y-1 text-xs inline-block text-left">
          <li>
            Enter a stored path (e.g.,{" "}
            <code className="bg-muted px-1.5 py-0.5 rounded text-xs text-foreground">uploads/my-video.mp4</code>)
          </li>
          <li>Click the button → server requests a temporary GET URL</li>
          <li>Play that expiring link below</li>
          <li>Perfect for members-only or time-limited content</li>
        </ol>
      </Callout>

      <div className="space-y-2 w-full max-w-xs">
        <div className="flex gap-2">
          <input
            className="flex-1 border border-border/30 bg-background text-foreground placeholder:text-foreground/50 p-2 rounded-lg text-sm"
            placeholder="uploads/my-video.mp4"
            value={path}
            onChange={(e) => setPath(e.target.value)}
          />
          <button
            onClick={signPlayback}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all text-sm flex-shrink-0"
            disabled={busy || !path}
          >
            {busy ? "…" : "Get"}
          </button>
        </div>

        {error && <p className="text-destructive text-xs p-2 bg-destructive/10 rounded-lg">{error}</p>}
        {playUrl && (
          <div className="space-y-1 p-3 bg-muted/20 rounded-lg">
            <p className="text-xs break-all text-foreground">🔒 Signed (expiring) URL</p>
            <video controls className="w-full rounded-lg bg-black max-h-48" src={playUrl} />
          </div>
        )}
      </div>
    </div>
  )
}

/* ==================================================================
 * CAROUSEL
 * ==================================================================*/
function TutorialCarousel() {
  const [current, setCurrent] = useState(0)

  const sections = [
    { id: 1, title: "URL Upload", component: SectionUrlUpload },
    { id: 2, title: "Signed Uploads", component: SectionSignedPut },
    { id: 3, title: "Resumable", component: SectionResumable },
    { id: 4, title: "Signed GET", component: SectionSignedGet },
  ]

  const CurrentSection = sections[current].component

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Main Content */}
      <div className="bg-card/50 backdrop-blur-sm border border-border/30 rounded-xl p-6 flex-1 overflow-y-auto">
        <CurrentSection />
      </div>

      <div className="flex flex-col gap-3 flex-shrink-0">
        {/* Navigation Tabs */}
        <div className="flex gap-2 justify-center flex-wrap">
          {sections.map((section, idx) => (
            <button
              key={section.id}
              onClick={() => setCurrent(idx)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                idx === current
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "bg-muted/40 text-foreground hover:bg-muted/60"
              }`}
            >
              {section.title}
            </button>
          ))}
        </div>

        {/* Progress indicator */}
        <div className="flex gap-2 justify-center">
          {sections.map((_, idx) => (
            <div
              key={idx}
              className={`h-2 rounded-full transition-all ${idx === current ? "bg-primary w-8" : "bg-muted/40 w-2"}`}
            />
          ))}
        </div>

        {/* Large, prominent navigation buttons */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => setCurrent((p) => (p - 1 + sections.length) % sections.length)}
            className="flex items-center gap-2 px-6 py-3 bg-muted/50 hover:bg-muted/70 text-foreground rounded-lg transition-all font-semibold border border-border/50 hover:border-border"
            aria-label="Previous section"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Previous</span>
          </button>

          <button
            onClick={() => setCurrent((p) => (p + 1) % sections.length)}
            className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-all font-semibold shadow-lg"
            aria-label="Next section"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ==================================================================
 * MAIN PAGE
 * ==================================================================*/
export default function TutorialPage() {
  const [files, setFiles] = useState<any[]>([])

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch("/api/files")
        const data = await res.json()
        if (Array.isArray(data)) setFiles(data)
      } catch {
        // ignore
      }
    })()
  }, [])

  return (
    <main className="min-h-screen h-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* Header */}
      <section className="border-b border-border/20 px-6 py-4 flex-shrink-0 bg-background/50 backdrop-blur-sm">
        <h1 className="text-3xl font-bold text-balance">Ultimate Uploads &amp; Delivery</h1>
        <p className="text-sm text-foreground/70 text-balance">
          Master four powerful workflows for handling media files
        </p>
      </section>

      {/* Main Content Area - split layout */}
      <section className="flex flex-1 overflow-hidden gap-6 px-6 py-4">
        {/* Left: Carousel - 65% width */}
        <div className="flex-1 min-w-0 flex flex-col">
          <TutorialCarousel />
        </div>

        {/* Right: Recent Files - 35% width */}
        <div className="w-2/5 min-w-0 flex flex-col border-l border-border/20 pl-6">
          {files.length > 0 ? (
            <>
              {/* Header with clear visual separation */}
              <div className="flex-shrink-0 pb-4 border-b border-border/20">
                <h2 className="text-lg font-bold text-foreground">Recent Files</h2>
                <p className="text-sm text-foreground/60 mt-1">Use paths with "Signed GET"</p>
              </div>

              {/* Masonry Grid with improved spacing and visual design */}
              <div className="flex-1 overflow-y-auto mt-4">
                <div className="grid grid-cols-2 gap-3 auto-rows-max pr-2">
                  {files.filter(Boolean).map((f, idx) => {
                    const file = typeof f === "object" && f !== null ? f : {}
                    const id = typeof file.id === "string" ? file.id : `file-${idx}`
                    return (
                      <div
                        key={id}
                        className="border border-border/30 bg-card/60 backdrop-blur-sm p-3 rounded-lg hover:border-primary/50 hover:bg-card/80 transition-all group overflow-hidden"
                      >
                        {/* File name - clearly visible */}
                        <div className="text-xs font-semibold text-foreground break-all mb-2 line-clamp-2">
                          {file.path || file.filename || file.id || "unknown"}
                        </div>

                        {/* Media preview */}
                        <div className="rounded-md overflow-hidden bg-muted/30">
                          {file.kind === "video" ? (
                            <video controls className="w-full bg-black text-xs h-20 object-cover" src={file.url} />
                          ) : file.kind === "image" ? (
                            <img
                              alt={file.filename || file.id || `file-${idx}`}
                              className="w-full h-20 object-cover"
                              src={file.url || "/placeholder.svg"}
                            />
                          ) : (
                            <a
                              className="text-primary hover:underline text-xs inline-block p-2 truncate font-semibold"
                              href={file.url}
                            >
                              View File →
                            </a>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-center">
              <div>
                <p className="text-foreground/60 text-sm">No files uploaded yet</p>
                <p className="text-foreground/40 text-xs mt-1">Upload files using the left panel</p>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
