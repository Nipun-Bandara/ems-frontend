"use client";

import { useRef, useState } from "react";
import axios from "axios";
import api from "@/app/lib/axios";

interface UploadOptions<T> {
  uploadUrlEndpoint: string;
  callbackEndpoint: string | ((intentId: string) => string);
  receiptIntent?: boolean;
  allowedTypes: readonly string[];
  maxSize: number;
  validationMessage?: string;
  onComplete?: (result: T) => void;
}

interface SignedUpload {
  uploadUrl: string;
  objectKey?: string;
  intentId?: string;
  expiresAt?: string;
  headers: Record<string, string>;
}

/** Only metadata uses the API; file bytes go directly to the signed storage URL. */
export function useFileUpload<T>(options: UploadOptions<T>) {
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const pending = useRef<{ file: File; endpoint: string; signed: SignedUpload; uploaded: boolean } | null>(null);

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
      if (!options.receiptIntent || pending.current?.file !== file || pending.current.endpoint !== options.uploadUrlEndpoint) pending.current = null;
      // A failed PUT can retry with a fresh URL once its intent expires.
      if (pending.current && !pending.current.uploaded && pending.current.signed.expiresAt && Date.parse(pending.current.signed.expiresAt) <= Date.now()) pending.current = null;
      if (!pending.current) {
        const { data: signed } = await api.post<SignedUpload>(options.uploadUrlEndpoint, {
          contentType: file.type, size: file.size,
          ...(options.receiptIntent ? { filename: file.name } : {}),
        });
        pending.current = { file, endpoint: options.uploadUrlEndpoint, signed, uploaded: false };
      }
      const { signed } = pending.current;
      if (!pending.current.uploaded) {
        try {
          // Bare axios avoids API cookies, auth-refresh interceptors and the JSON default.
          await axios.put(signed.uploadUrl, file, {
            headers: signed.headers,
            withCredentials: false,
            onUploadProgress: ({ loaded, total }) => {
              if (total) setProgress(Math.min(99, Math.round(loaded * 100 / total)));
            },
          });
        } catch (cause) {
          // A lost successful PUT response is safe to confirm: writes are create-only,
          // and the server still checks this intent's actual object metadata.
          if (!options.receiptIntent || !axios.isAxiosError(cause) || cause.response?.status !== 412) throw cause;
        }
        pending.current.uploaded = true;
      }
      const endpoint = typeof options.callbackEndpoint === "function"
        ? options.callbackEndpoint(signed.intentId!) : options.callbackEndpoint;
      const { data } = await api.put<T>(endpoint, options.receiptIntent ? {} : { objectKey: signed.objectKey });
      pending.current = null;
      setProgress(100);
      options.onComplete?.(data);
      return data;
    } catch (cause) {
      if (!options.receiptIntent || (cause && typeof cause === "object" && "status" in cause && cause.status === 410)) pending.current = null;
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
