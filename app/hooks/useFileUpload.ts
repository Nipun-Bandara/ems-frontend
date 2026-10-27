"use client";

import { useRef, useState } from "react";
import axios from "axios";
import api from "@/app/lib/axios";

interface UploadOptions<T> {
  uploadUrlEndpoint: string;
  callbackEndpoint: string;
  allowedTypes: readonly string[];
  maxSize: number;
  validationMessage?: string;
  onComplete?: (result: T) => void;
}

/** Only metadata uses the API; file bytes go directly to the signed storage URL. */
export function useFileUpload<T>(options: UploadOptions<T>) {
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  async function upload(file: File): Promise<T | undefined> {
    if (busy.current) return;
    busy.current = true;
    setIsUploading(true);
    setError(null);
    setProgress(0);
    try {
      if (!options.allowedTypes.includes(file.type) || file.size <= 0 || file.size > options.maxSize) {
        throw new Error(options.validationMessage ?? "Choose a JPEG, PNG or WebP image up to 5MB.");
      }
      const { data: signed } = await api.post<{
        uploadUrl: string; objectKey: string; headers: Record<string, string>;
      }>(options.uploadUrlEndpoint, { contentType: file.type, size: file.size });
      // Bare axios avoids API cookies, auth-refresh interceptors and the JSON default.
      await axios.put(signed.uploadUrl, file, {
        headers: signed.headers,
        withCredentials: false,
        onUploadProgress: ({ loaded, total }) => {
          if (total) setProgress(Math.min(99, Math.round(loaded * 100 / total)));
        },
      });
      const { data } = await api.put<T>(options.callbackEndpoint, { objectKey: signed.objectKey });
      setProgress(100);
      options.onComplete?.(data);
      return data;
    } catch (cause) {
      const message = cause && typeof cause === "object" && "message" in cause
        ? String(cause.message) : "File upload failed. Please try again.";
      setError(message);
      return undefined;
    } finally {
      busy.current = false;
      setIsUploading(false);
    }
  }

  return { upload, progress, isUploading, error };
}
