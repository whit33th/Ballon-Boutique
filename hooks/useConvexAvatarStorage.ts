import { useMutation, useQuery } from "convex/react";
import { useCallback } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

type UploadResponse = {
  storageId?: Id<"_storage">;
};

const STORAGE_ID_PATTERN = /^[a-z0-9]{32}$/;

const isStorageId = (value: unknown): value is Id<"_storage"> =>
  typeof value === "string" && STORAGE_ID_PATTERN.test(value);

export function useConvexAvatarStorage(
  storageId?: Id<"_storage"> | string | null,
): {
  avatarUrl: string | null;
  uploadAvatar: (file: File) => Promise<Id<"_storage">>;
} {
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const normalizedId = isStorageId(storageId) ? storageId : undefined;
  const avatarUrl = useQuery(
    api.storage.getPublicUrl,
    normalizedId ? { storageId: normalizedId } : "skip",
  );

  const uploadAvatar = useCallback(
    async (file: File) => {
      const uploadUrl = await generateUploadUrl({});

      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: file.type ? { "Content-Type": file.type } : undefined,
        body: file,
      });

      if (!response.ok) {
        throw new Error("Failed to upload avatar to Convex storage");
      }

      const result = (await response.json()) as UploadResponse;
      if (!result.storageId) {
        throw new Error("Convex storage did not return a file ID");
      }

      return result.storageId;
    },
    [generateUploadUrl],
  );

  return {
    avatarUrl: normalizedId && avatarUrl ? avatarUrl : null,
    uploadAvatar,
  };
}
