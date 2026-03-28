import type { ChatDeleteResult, ChatMessage, ChatOverview, ChatSendResult } from '../../../shared/types/chat';
import { requestJson } from '../../../shared/api/http';

export function getChatOverview(chatId?: string) {
  const query = chatId ? `?chatId=${encodeURIComponent(chatId)}` : '';
  return requestJson<ChatOverview>(`/chat${query}`, { method: 'GET' });
}

export function sendChatMessage(
  input: {
    text?: string;
    chatId?: string;
    mediaBase64?: string;
    mediaMimeType?: string;
    mediaSizeBytes?: number;
  },
) {
  return requestJson<ChatSendResult>(
    '/chat/message',
    {
      method: 'POST',
      data: input,
    },
  );
}

export function editChatMessage(messageId: string, text: string) {
  return requestJson<ChatMessage>(
    `/chat/message/${messageId}`,
    {
      method: 'PATCH',
      data: { text },
    },
  );
}

export function deleteChatMessage(messageId: string) {
  return requestJson<ChatDeleteResult>(`/chat/message/${messageId}`, { method: 'DELETE' });
}

export function bulkDeleteChatMessages(ids: string[]) {
  return requestJson<ChatDeleteResult[]>(
    '/chat/message/bulk-delete',
    {
      method: 'POST',
      data: { ids },
    },
  );
}
