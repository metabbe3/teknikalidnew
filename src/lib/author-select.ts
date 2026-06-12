import { getAvatarUrl } from "@/lib/avatar";

export const AUTHOR_SELECT = {
  id: true,
  username: true,
  name: true,
  email: true,
  image: true,
  customTitle: true,
} as const;

export type AuthorRow = {
  id: string;
  username: string;
  name: string | null;
  email: string;
  image: string | null;
  customTitle: string | null;
};

export function serializeAuthor(author: AuthorRow) {
  const { email, image, ...rest } = author;
  return { ...rest, image: getAvatarUrl(image, email) };
}
