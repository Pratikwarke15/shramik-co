import { createClient } from "@supabase/supabase-js";
import fs from "fs/promises";
import path from "path";
import { v4 as uuid } from "uuid";
import { env } from "../config/env";
import { logger } from "./logger";

let supabase: ReturnType<typeof createClient> | null = null;

const localUploadRoot = path.resolve(process.cwd(), "public", "uploads");

function getSupabase() {
  if (supabase) return supabase;
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return null;
  }
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  return supabase;
}

async function uploadFileLocally(
  bucket: string,
  fileBuffer: Buffer,
  originalName: string
): Promise<{ url: string; path: string }> {
  const ext = originalName.split(".").pop() || "bin";
  const fileName = `${uuid()}.${ext}`;
  const relativePath = `${bucket}/${fileName}`;
  const directory = path.join(localUploadRoot, bucket);
  const absolutePath = path.join(directory, fileName);

  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(absolutePath, fileBuffer);

  const baseUrl = process.env.PUBLIC_API_URL || `http://localhost:${env.API_PORT}`;
  return {
    path: relativePath,
    url: `${baseUrl}/uploads/${relativePath}`,
  };
}

export async function uploadFile(
  bucket: string,
  fileBuffer: Buffer,
  originalName: string,
  mimeType: string
): Promise<{ url: string; path: string }> {
  const ext = originalName.split(".").pop();
  const filePath = `${bucket}/${uuid()}.${ext}`;
  const client = getSupabase();

  if (!client) {
    logger.warn("Supabase storage is not configured; using local upload storage");
    return uploadFileLocally(bucket, fileBuffer, originalName);
  }

  const { error } = await client.storage
    .from(bucket)
    .upload(filePath, fileBuffer, { contentType: mimeType });

  if (error) {
    if (env.NODE_ENV !== "production") {
      logger.warn(`Supabase upload failed (${error.message}); using local upload storage`);
      return uploadFileLocally(bucket, fileBuffer, originalName);
    }
    throw error;
  }

  const { data } = client.storage.from(bucket).getPublicUrl(filePath);
  return { url: data.publicUrl, path: filePath };
}

export async function deleteFile(
  bucket: string,
  filePath: string
): Promise<void> {
  const client = getSupabase();
  if (!client) {
    await fs.rm(path.join(localUploadRoot, filePath), { force: true });
    return;
  }
  const { error } = await client.storage.from(bucket).remove([filePath]);
  if (error) throw error;
}
