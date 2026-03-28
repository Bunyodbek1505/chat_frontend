import { io, type Socket } from 'socket.io-client';
import type { AdminLoginActivity, ChatSendPayload, ChatSendResult, ChatSocketDeletePayload, ChatSocketEventPayload } from '../types/chat';

const RAW_API_BASE =
  import.meta.env.VITE_API_BASE_URL ??
  (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:4001` : 'http://localhost:4001');
const SOCKET_BASE = RAW_API_BASE.replace(/\/$/, '');
const SOCKET_ACK_TIMEOUT_MS = 5000;

type SocketAck<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

export class SocketAckError extends Error {
  code?: string;
  canFallback: boolean;

  constructor(message: string, options: { code?: string; canFallback: boolean }) {
    super(message);
    this.name = 'SocketAckError';
    this.code = options.code;
    this.canFallback = options.canFallback;
    Object.setPrototypeOf(this, SocketAckError.prototype);
  }
}

export type ChatSocket = Socket<{
  'chat:message': (payload: ChatSocketEventPayload) => void;
  'chat:thread-updated': (payload: ChatSocketEventPayload) => void;
  'chat:message-deleted': (payload: ChatSocketDeletePayload) => void;
  'admin:login-activity': (payload: AdminLoginActivity) => void;
  'admin:login-activity-snapshot': (payload: AdminLoginActivity[]) => void;
}>;

export function createChatSocket(token: string) {
  return io(SOCKET_BASE, {
    autoConnect: true,
    withCredentials: true,
    auth: {
      token,
    },
  });
}

export async function emitSocketAck<T>(socket: Socket, event: string, payload: unknown) {
  let response: unknown;

  try {
    response = await socket.timeout(SOCKET_ACK_TIMEOUT_MS).emitWithAck(event, payload);
  } catch (error) {
    throw new SocketAckError(
      error instanceof Error ? error.message : 'Realtime request timed out',
      { canFallback: true },
    );
  }

  const ack = response as SocketAck<T>;
  if (!ack.ok) {
    throw new SocketAckError(ack.error.message, {
      code: ack.error.code,
      canFallback: false,
    });
  }

  return ack.data;
}

export async function sendSocketMessage(socket: Socket, payload: ChatSendPayload) {
  return emitSocketAck<ChatSendResult>(socket, 'chat:send', payload);
}

export async function joinChatRoom(socket: Socket, chatId: string) {
  return emitSocketAck<{ chatId: string }>(socket, 'chat:join', { chatId });
}

export async function leaveChatRoom(socket: Socket, chatId: string) {
  return emitSocketAck<{ chatId: string }>(socket, 'chat:leave', { chatId });
}

export async function deleteAdminLoginActivity(socket: Socket, activityId: string) {
  return emitSocketAck<{ items: AdminLoginActivity[] }>(socket, 'admin:login-activity:delete', { activityId });
}

export async function clearAdminLoginActivities(socket: Socket) {
  return emitSocketAck<{ items: AdminLoginActivity[] }>(socket, 'admin:login-activity:clear', {});
}
