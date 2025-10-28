"use client";

import { useState } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  UseMutationResult,
} from "@tanstack/react-query";
import axios from "axios";

interface FileItem {
  id: string;
  filename: string;
  url: string;
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [renameMap, setRenameMap] = useState<Record<string, string>>({});

  const queryClient = useQueryClient();

  const { data: files = [], isLoading: isFilesLoading } = useQuery<
    FileItem[],
    Error
  >({
    queryKey: ["files"],
    queryFn: async () => {
      const res = await axios.get<FileItem[]>("/api/files");
      return res.data;
    },
  });

  const uploadMutation: UseMutationResult<void, unknown, File> = useMutation({
    mutationFn: async (file: File) => {
      const { data } = await axios.post<{ url: string; method: string }>(
        "/api/sign-upload",
        { filename: file.name }
      );
      await axios({ url: data.url, method: data.method, data: file });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["files"] }),
  });

  const deleteMutation: UseMutationResult<void, unknown, string> = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`/api/files/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["files"] }),
  });

  const renameMutation: UseMutationResult<
    void,
    unknown,
    { id: string; filename: string }
  > = useMutation({
    mutationFn: async ({ id, filename }: { id: string; filename: string }) => {
      await axios.patch(`/api/files/${id}`, { filename });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["files"] }),
  });

  const handleUpload = () => {
    if (!file) return;
    uploadMutation.mutate(file);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleRename = (id: string) => {
    const filename = renameMap[id];
    if (!filename) return;
    renameMutation.mutate({ id, filename });
    setRenameMap((prev) => ({ ...prev, [id]: "" }));
  };

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
                    onChange={(e) =>
                      setRenameMap((prev) => ({
                        ...prev,
                        [f.id]: e.target.value,
                      }))
                    }
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
