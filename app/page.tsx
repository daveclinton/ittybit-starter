"use client";

import { useMediaManager } from "@/lib/useMediaManager";

export default function Home() {
  const {
    setFile,
    files,
    isFilesLoading,
    renameMap,
    uploadMutation,
    deleteMutation,
    renameMutation,
    handleUpload,
    handleDelete,
    handleRename,
    updateRenameValue,
  } = useMediaManager();

  return (
    <main className="p-8 max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Ittybit Upload Demo</h1>

      <div className="flex items-center gap-2">
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        <button
          onClick={handleUpload}
          disabled={uploadMutation.isPending}
          className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {uploadMutation.isPending ? "Uploading..." : "Upload"}
        </button>
      </div>

      <div>
        <h2 className="text-xl font-medium">Your Files</h2>
        {isFilesLoading ? (
          <p>Loading files...</p>
        ) : (
          <ul className="space-y-3">
            {files.map((f) => (
              <li key={f.id} className="flex items-center justify-between">
                <a
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  {f.filename}
                </a>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Rename"
                    className="border px-2 py-1 text-sm"
                    value={renameMap[f.id] || ""}
                    onChange={(e) => updateRenameValue(f.id, e.target.value)}
                  />
                  <button
                    onClick={() => handleRename(f.id)}
                    disabled={renameMutation.isPending}
                    className="text-xs bg-gray-200 px-2 py-1 rounded disabled:opacity-50"
                  >
                    {renameMutation.isPending ? "Renaming..." : "Rename"}
                  </button>
                  <button
                    onClick={() => handleDelete(f.id)}
                    disabled={deleteMutation.isPending}
                    className="text-xs bg-red-500 text-white px-2 py-1 rounded disabled:opacity-50"
                  >
                    {deleteMutation.isPending ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
