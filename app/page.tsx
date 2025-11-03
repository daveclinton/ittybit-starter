"use client"

import { useState } from "react"
import { Cloud, File, AlertCircle, Loader2 } from "lucide-react"

interface FileItem {
  id: string
  filename: string
  url: string
  uploading?: boolean
  error?: string
}

export default function FileUploadDemo() {
  const [file, setFile] = useState<File | null>(null)
  const [files, setFiles] = useState<FileItem[]>([
    { id: "1", filename: "project-proposal.pdf", url: "#" },
    { id: "2", filename: "design-mockups.figma", url: "#" },
  ])
  const [renameMap, setRenameMap] = useState<Record<string, string>>({})
  const [isFilesLoading, setIsFilesLoading] = useState(false)
  const [uploadMutation, setUploadMutation] = useState({ isPending: false, error: null as string | null })
  const [renameMutation, setRenameMutation] = useState({ isPending: false })
  const [deleteMutation, setDeleteMutation] = useState({ isPending: false })
  const [deleteErrorId, setDeleteErrorId] = useState<string | null>(null)
  const [renameErrorId, setRenameErrorId] = useState<string | null>(null)

  const handleUpload = async () => {
    if (!file) return

    setUploadMutation({ isPending: true, error: null })

    // Simulate upload
    setTimeout(() => {
      if (Math.random() > 0.1) {
        const newFile: FileItem = {
          id: Date.now().toString(),
          filename: file.name,
          url: "#",
        }
        setFiles((prev) => [newFile, ...prev])
        setFile(null)
        setUploadMutation({ isPending: false, error: null })
      } else {
        setUploadMutation({ isPending: false, error: "Failed to upload file. Please try again." })
      }
    }, 1500)
  }

  const handleRename = (fileId: string) => {
    setRenameMutation({ isPending: true })
    setRenameErrorId(null)

    setTimeout(() => {
      if (Math.random() > 0.15) {
        setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, filename: renameMap[fileId] || f.filename } : f)))
        setRenameMap((prev) => {
          const updated = { ...prev }
          delete updated[fileId]
          return updated
        })
        setRenameMutation({ isPending: false })
      } else {
        setRenameErrorId(fileId)
        setRenameMutation({ isPending: false })
      }
    }, 1200)
  }

  const handleDelete = (fileId: string) => {
    setDeleteMutation({ isPending: true })
    setDeleteErrorId(null)

    setTimeout(() => {
      if (Math.random() > 0.15) {
        setFiles((prev) => prev.filter((f) => f.id !== fileId))
        setDeleteMutation({ isPending: false })
      } else {
        setDeleteErrorId(fileId)
        setDeleteMutation({ isPending: false })
      }
    }, 1200)
  }

  const updateRenameValue = (id: string, value: string) => {
    setRenameMap((prev) => ({ ...prev, [id]: value }))
    setRenameErrorId(null)
  }

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Media Management</h1>
          <p className="text-muted-foreground">Upload, manage, and organize your files</p>
        </div>

        {/* Upload Section */}
        <div className="bg-card border border-border rounded-lg p-6 mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 flex items-center gap-3 bg-secondary rounded-lg p-4 border border-border cursor-pointer hover:border-accent/50 transition-colors">
              <Cloud className="w-5 h-5 text-accent" />
              <input
                type="file"
                onChange={(e) => {
                  setFile(e.target.files?.[0] || null)
                  setUploadMutation({ isPending: false, error: null })
                }}
                className="hidden"
                id="file-input"
              />
              <label htmlFor="file-input" className="flex-1 cursor-pointer text-sm">
                <span className="text-muted-foreground">
                  {file ? file.name : "Click to select a file or drag and drop"}
                </span>
              </label>
            </div>
            <button
              onClick={handleUpload}
              disabled={uploadMutation.isPending || !file}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {uploadMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {uploadMutation.isPending ? "Uploading..." : "Upload"}
            </button>
          </div>

          {/* Upload Error */}
          {uploadMutation.error && (
            <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/30 rounded-lg p-4">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
              <div>
                <p className="text-destructive font-medium">Upload failed</p>
                <p className="text-destructive/80 text-sm">{uploadMutation.error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Files Section */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-2xl font-bold text-foreground mb-4">Your Files</h2>

          {isFilesLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-8 h-8 text-accent animate-spin" />
              <p className="text-muted-foreground">Loading files...</p>
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <File className="w-12 h-12 text-muted" />
              <p className="text-muted-foreground text-lg">No files uploaded yet</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {files.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center justify-between bg-secondary border border-border rounded-lg p-4 hover:border-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <File className="w-5 h-5 text-accent flex-shrink-0" />
                    <a href={f.url} className="text-primary hover:text-accent underline truncate">
                      {f.filename}
                    </a>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                    <input
                      type="text"
                      placeholder="New name"
                      className="bg-input border border-border px-3 py-2 rounded text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary w-40"
                      value={renameMap[f.id] || ""}
                      onChange={(e) => updateRenameValue(f.id, e.target.value)}
                    />
                    <button
                      onClick={() => handleRename(f.id)}
                      disabled={renameMutation.isPending}
                      className="bg-primary/20 hover:bg-primary/30 text-primary text-xs px-3 py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      {renameMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                      {renameMutation.isPending ? "Renaming..." : "Rename"}
                    </button>
                    <button
                      onClick={() => handleDelete(f.id)}
                      disabled={deleteMutation.isPending}
                      className="bg-destructive/20 hover:bg-destructive/30 text-destructive text-xs px-3 py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      {deleteMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                      {deleteMutation.isPending ? "Deleting..." : "Delete"}
                    </button>
                  </div>

                  {renameErrorId === f.id && (
                    <div className="absolute right-4 mt-12 bg-destructive/10 border border-destructive/30 rounded px-3 py-2 text-sm text-destructive whitespace-nowrap">
                      Rename failed
                    </div>
                  )}
                  {deleteErrorId === f.id && (
                    <div className="absolute right-4 mt-12 bg-destructive/10 border border-destructive/30 rounded px-3 py-2 text-sm text-destructive whitespace-nowrap">
                      Delete failed
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  )
}
