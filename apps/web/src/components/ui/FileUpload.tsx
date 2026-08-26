"use client";

import React, { useCallback, useRef, useState } from "react";
import { Upload, File, X, Image, AlertCircle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiUpload } from "@/lib/api";

interface FileUploadProps {
  endpoint: string;
  accept?: string;
  maxSizeMB?: number;
  label?: string;
  description?: string;
  onUploadComplete?: (data: { url: string }) => void;
}

export default function FileUpload({
  endpoint,
  accept = "application/pdf,image/jpeg,image/png",
  maxSizeMB = 5,
  label = "Upload File",
  description,
  onUploadComplete,
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploaded, setUploaded] = useState<{ url: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  const handleFile = useCallback(async (file: File) => {
    setError(null);

    if (file.size > maxSizeBytes) {
      setError(`File exceeds ${maxSizeMB}MB limit`);
      return;
    }

    const acceptTypes = accept.split(",").map((t) => t.trim());
    if (!acceptTypes.includes(file.type)) {
      setError("Invalid file type");
      return;
    }

    setIsUploading(true);
    setProgress(30);

    try {
      const formData = new FormData();
      formData.append("file", file);
      setProgress(60);
      const res = await apiUpload<{ success: boolean; data: { url: string } }>(endpoint, formData);
      setProgress(100);
      setUploaded({ url: res.data.url, name: file.name });
      onUploadComplete?.(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }, [endpoint, accept, maxSizeBytes, maxSizeMB, onUploadComplete]);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const clearFile = () => {
    setUploaded(null);
    setError(null);
    setProgress(0);
    if (inputRef.current) inputRef.current.value = "";
  };

  const isImage = uploaded?.name.match(/\.(jpg|jpeg|png)$/i);

  if (uploaded) {
    return (
      <div className="border border-emerald-200 bg-emerald-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isImage ? (
              <div className="w-12 h-12 rounded overflow-hidden bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={uploaded.url} alt="" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded bg-emerald-100 flex items-center justify-center">
                <File className="w-5 h-5 text-emerald-600" />
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-emerald-800">{uploaded.name}</p>
              <p className="text-xs text-emerald-600 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Uploaded
              </p>
            </div>
          </div>
          <button onClick={clearFile} className="p-1 hover:bg-emerald-100 rounded">
            <X className="w-4 h-4 text-emerald-600" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          isDragOver ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-gray-400 bg-gray-50",
          isUploading && "pointer-events-none opacity-60"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        {isUploading ? (
          <div className="space-y-3">
            <Upload className="w-8 h-8 text-blue-500 mx-auto animate-pulse" />
            <p className="text-sm text-gray-600">Uploading...</p>
            <div className="w-48 h-2 bg-gray-200 rounded-full mx-auto overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">
              <span className="font-medium text-blue-600">Click to browse</span> or drag & drop
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {description || `Max ${maxSizeMB}MB — ${accept.replace(/image\//g, "").replace(/application\//g, "").toUpperCase()}`}
            </p>
          </>
        )}
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> {error}
        </p>
      )}
    </div>
  );
}
