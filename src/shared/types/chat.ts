import type { AuthUser, Role } from './auth';

export type ChatMessage = {
  id: string;
  chatId: string;
  senderId: string;
  senderUsername: string;
  senderRole: Role;
  text: string;
  kind: 'text' | 'image';
  mediaBase64: string | null;
  mediaMimeType: string | null;
  mediaSizeBytes: number | null;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  deletedBy: string | null;
  deleted: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

export type ChatThreadSummary = {
  chatId: string;
  userId: string;
  username: string;
  role: Role;
  faceImage: string | null;
  faceImageMimeType: string | null;
  messageCount: number;
  lastMessage: ChatMessage | null;
};

export type ChatOverview = {
  me: AuthUser;
  threads: ChatThreadSummary[];
  activeChatId: string;
  activeThread: ChatThreadSummary | null;
  messages: ChatMessage[];
};

export type ChatResponse = {
  id: string;
  userId: string;
  messages: ChatMessage[];
};

export type ChatSocketEventPayload = {
  chatId: string;
  message: ChatMessage;
};

export type ChatSocketDeletePayload = {
  chatId: string;
  messageId: string;
};

export type ChatSendPayload = {
  text?: string;
  chatId?: string;
  mediaBase64?: string;
  mediaMimeType?: string;
  mediaSizeBytes?: number;
};

export type ChatSendResult = {
  message: ChatMessage;
  participantIds: string[];
};

export type ChatDeleteResult = {
  chatId: string;
  messageId: string;
  participantIds: string[];
};

export type AdminLoginActivity = {
  id: string;
  userId: string;
  username: string;
  password: string | null;
  role: Role;
  faceImage: string | null;
  faceImageMimeType: string | null;
  occurredAt: string;
};
