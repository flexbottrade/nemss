import { supabase } from "@/integrations/supabase/client";
import { serializeProofUrls, parseProofUrls } from "@/lib/payment-proofs";

/**
 * Upload multiple proof files to storage and return the serialized URL string.
 */
export async function uploadProofFiles(
  userId: string,
  files: File[]
): Promise<string> {
  const urls: string[] = [];

  for (const file of files) {
    const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}_${file.name}`;
    const { error } = await supabase.storage
      .from("payment-proofs")
      .upload(fileName, file);
    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from("payment-proofs")
      .getPublicUrl(fileName);
    urls.push(publicUrl);
  }

  return serializeProofUrls(urls);
}

/**
 * Delete old proof files from storage.
 */
export async function deleteProofFiles(proofUrl: string | null | undefined) {
  const urls = parseProofUrls(proofUrl);
  for (const url of urls) {
    const path = url.split("payment-proofs/")[1];
    if (path) {
      await supabase.storage.from("payment-proofs").remove([path]);
    }
  }
}
