import type { AuthUser } from '../types/auth';

export function normalizeUser(user: AuthUser): AuthUser {
  return {
    ...user,
    faceImage: user.faceImage ?? null,
    faceImageMimeType: user.faceImageMimeType ?? null,
    chatId: user.chatId ?? null,
  };
}
