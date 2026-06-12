"use client";

import React, { useCallback } from "react";
import { useDropzone, type DropzoneOptions } from "react-dropzone";
import { UploadCloud, File as FileIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DropzoneProps extends Omit<DropzoneOptions, "onDrop"> {
  onFileSelect: (file: File | null) => void;
  selectedFile?: File | null;
  className?: string;
  label?: string;
}

export function Dropzone({
  onFileSelect,
  selectedFile,
  className,
  label = "Arrastra un archivo aquí o haz clic para subir",
  ...dropzoneProps
}: DropzoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0]);
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    maxFiles: 1,
    ...dropzoneProps,
  });

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFileSelect(null);
  };

  return (
    <div
      {...getRootProps()}
      className={cn(
        "relative flex flex-col items-center justify-center w-full min-h-[140px] rounded-xl border-2 border-dashed p-6 transition-all duration-200 cursor-pointer overflow-hidden",
        isDragActive
          ? "border-[#F25C05] bg-[#F25C05]/10"
          : "border-white/10 bg-white/5 hover:bg-white/[0.08] hover:border-white/20",
        isDragReject && "border-red-500 bg-red-500/10",
        className
      )}
    >
      <input {...getInputProps()} />

      {selectedFile ? (
        <div className="flex flex-col items-center gap-3 w-full animate-in fade-in zoom-in duration-300">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20">
            <FileIcon className="h-6 w-6 text-emerald-500" />
          </div>
          <div className="text-center max-w-[80%]">
            <p className="text-sm font-bold text-white truncate">{selectedFile.name}</p>
            <p className="text-[10px] text-white/40 font-medium mt-1 uppercase tracking-widest">
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
          <button
            onClick={clearFile}
            className="absolute top-3 right-3 p-1.5 rounded-lg text-white/40 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 group-hover:bg-[#F25C05]/20 transition-colors">
            <UploadCloud
              className={cn(
                "h-6 w-6 transition-colors duration-200",
                isDragActive ? "text-[#F25C05]" : "text-white/40"
              )}
            />
          </div>
          <div className="text-center">
            <p className="text-xs font-bold text-white/60 tracking-widest uppercase">
              {isDragActive ? "Suelte el archivo aquí" : label}
            </p>
            <p className="text-[10px] text-white/30 font-medium mt-1 uppercase tracking-widest">
              Formatos soportados: PDF, JPG, PNG
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
