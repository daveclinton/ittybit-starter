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

export function useMediaManager() {
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

  const updateRenameValue = (id: string, value: string) => {
    setRenameMap((prev) => ({ ...prev, [id]: value }));
  };

  return {
    file,
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
  };
}
