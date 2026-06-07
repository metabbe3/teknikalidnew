import { generateIdenticonDataUri } from "@/lib/generate-avatar";

export function getAvatarUrl(image: string | null | undefined, email: string, size = 80): string {
  if (image) return image;
  return generateIdenticonDataUri(email, size);
}
