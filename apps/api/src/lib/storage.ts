import { createClient } from "@supabase/supabase-js";
import { v4 as uuid } from "uuid";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function uploadFile(
  bucket: string,
  fileBuffer: Buffer,
  originalName: string,
  mimeType: string
): Promise<{ url: string; path: string }> {
  const ext = originalName.split(".").pop();
  const path = `${bucket}/${uuid()}.${ext}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, fileBuffer, { contentType: mimeType });

  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

export async function deleteFile(
  bucket: string,
  path: string
): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw error;
}
