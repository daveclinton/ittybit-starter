/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [rename, setRename] = useState("");

  async function upload() {
    if (!file) return;
    const res = await fetch("/api/sign-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name }),
    });
    const { url, method } = await res.json();
    await fetch(url, { method, body: file });
    refresh();
  }

  async function refresh() {
    const res = await fetch("/api/files");
    setFiles(await res.json());
  }

  async function remove(id: string) {
    await fetch(`/api/files/${id}`, { method: "DELETE" });
    refresh();
  }

  async function renameFile(id: string) {
    if (!rename) return;
    await fetch(`/api/files/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: rename }),
    });
    setRename("");
    refresh();
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <main className="p-8 max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Ittybit Upload Demo</h1>

      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
      <button
        onClick={upload}
        className="bg-black text-white px-4 py-2 rounded"
      >
        Upload
      </button>

      <div>
        <h2 className="text-xl font-medium">Your Files</h2>
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
              <div className="space-x-2">
                <input
                  type="text"
                  placeholder="Rename"
                  className="border px-2 py-1 text-sm"
                  value={rename}
                  onChange={(e) => setRename(e.target.value)}
                />
                <button
                  onClick={() => renameFile(f.id)}
                  className="text-xs bg-gray-200 px-2 py-1 rounded"
                >
                  Rename
                </button>
                <button
                  onClick={() => remove(f.id)}
                  className="text-xs bg-red-500 text-white px-2 py-1 rounded"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
