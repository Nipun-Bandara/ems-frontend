"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/app/lib/axios";
import { useAuth } from "@/app/context/AuthContext";
import { useFileUpload } from "@/app/hooks/useFileUpload";
import { Button } from "@/app/components/ui/Button";
import type { components } from "./contract";

type Receipt = components["schemas"]["Receipt"];
type Download = components["schemas"]["ReceiptDownload"];
export function useReceipts(id: string) {
 const { user } = useAuth();
 return useQuery({ queryKey: ["claims", user?.id, id, "receipts"], queryFn: async () => (await api.get<Receipt[]>(`/claims/${id}/receipts`)).data });
}
export function Receipts({ id, draft = false }: { id: string; draft?: boolean }) {
 const client = useQueryClient(); const { user } = useAuth();
 const query = useReceipts(id);
 const [file, setFile] = useState<File | null>(null);
 const [preview, setPreview] = useState<(Download & { contentType: string }) | null>(null);
 const [notice, setNotice] = useState("");
 const refresh = () => client.invalidateQueries({ queryKey: ["claims", user?.id, id, "receipts"] });
 const upload = useFileUpload<Receipt>({ uploadUrlEndpoint: `/claims/${id}/receipts/upload-intents`, callbackEndpoint: intent => `/claims/${id}/receipts/${intent}/finalize`, receiptIntent: true,
  allowedTypes: ["application/pdf", "image/jpeg", "image/png", "image/webp"], maxSize: 10 * 1024 * 1024,
  validationMessage: "Choose a PDF, JPEG, PNG or WebP file up to 10 MiB.", onComplete: () => { setFile(null); refresh(); },
 });
 const remove = useMutation({ mutationFn: async (receiptId: string) => { await api.delete(`/claims/${id}/receipts/${receiptId}`); }, onSuccess: () => { setPreview(null); refresh(); }, onError: error => setNotice(error.message) });
 const download = useMutation({ mutationFn: async (receipt: Receipt) => ({ ...(await api.get<Download>(`/claims/${id}/receipts/${receipt.id}/download`)).data, contentType: receipt.contentType }), onSuccess: value => { setPreview(value); setNotice(""); }, onError: error => setNotice(error.message) });
 return <section aria-label="Claim receipts" className="space-y-3 rounded-lg border border-borderPrimary p-3">
  <h3 className="font-semibold">Receipts</h3>
  <p>At least one finalized receipt is required to submit. Submitted claims retain their receipts.</p>
  {query.isPending && <p role="status">Loading receipts…</p>}
  {(query.error || notice) && <p role="alert">{notice || query.error?.message}</p>}
  <ul className="space-y-2">{query.data?.map(receipt => <li key={receipt.id} className="flex flex-wrap items-center gap-2">
   <span>{receipt.filename} · {Math.ceil(receipt.size / 1024)} KiB</span>
   <Button disabled={download.isPending} onClick={() => download.mutate(receipt)}>Preview / download {receipt.filename}</Button>
   {draft && <Button disabled={remove.isPending || upload.isUploading} onClick={() => remove.mutate(receipt.id)}>Remove {receipt.filename}</Button>}
  </li>)}</ul>
  {preview && <div className="space-y-2"><a href={preview.url} target="_blank" rel="noopener noreferrer" className="underline">Open receipt / download</a><p className="text-sm">Link expires at {new Date(preview.expiresAt).toLocaleTimeString()}. Select preview again to renew.</p>{preview.contentType === "application/pdf" ? <object aria-label="PDF receipt preview" data={preview.url} type="application/pdf" className="h-80 w-full"><p>PDF preview is unavailable in this browser. Use Open receipt / download above.</p></object> : <iframe title="Receipt preview" src={preview.url} className="h-80 w-full" sandbox="" />}</div>}
  {draft && <div className="space-y-2">
   <label className="block">Upload receipt (PDF or image, maximum 10 MiB)<input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" disabled={upload.isUploading} onChange={e => setFile(e.target.files?.[0] ?? null)} /></label>
   <Button disabled={!file || upload.isUploading} onClick={() => file && upload.upload(file)}>{upload.isUploading ? "Uploading…" : upload.error ? "Retry receipt upload" : "Upload receipt"}</Button>
   {upload.isUploading && <progress aria-label="Receipt upload progress" max={100} value={upload.progress} />}
   {upload.error && <p role="alert">{upload.error} Retry keeps the same upload intent after the file has uploaded. For an expired intent, retry creates a new upload.</p>}
  </div>}
 </section>;
}
