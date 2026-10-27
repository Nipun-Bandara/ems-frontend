"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

export default function Modal({ title, onClose, children }: {
  title: string; onClose: () => void; children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog ref={ref} onCancel={(event) => { event.preventDefault(); onClose(); }} aria-labelledby="organization-dialog-title"
      className="m-auto max-h-[90vh] w-[calc(100%_-_2rem)] max-w-2xl overflow-y-auto rounded-2xl border border-borderPrimary bg-backgroundSecondary p-6 text-textPrimary shadow-xl backdrop:bg-black/50">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 id="organization-dialog-title" className="text-xl font-semibold">{title}</h2>
        <button type="button" onClick={onClose} aria-label="Close dialog" className="rounded-lg p-2 hover:bg-hoverPrimary"><X size={20} /></button>
      </div>
      {children}
    </dialog>
  );
}
