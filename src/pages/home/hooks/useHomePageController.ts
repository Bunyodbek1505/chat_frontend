import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FormEvent } from 'react';
import { bulkDeleteChatMessages, deleteChatMessage, editChatMessage, getChatOverview, sendChatMessage } from '../api/chat.api';
import { useAuthStore } from '../../../store/auth.store';
import type { AdminLoginActivity, ChatMessage, ChatOverview, ChatSocketDeletePayload, ChatSocketEventPayload, ChatThreadSummary } from '../../../shared/types/chat';
import { logoutAccount } from '../../auth/api/auth.api';
import {
  clearAdminLoginActivities,
  createChatSocket,
  deleteAdminLoginActivity,
  joinChatRoom,
  leaveChatRoom,
  SocketAckError,
  sendSocketMessage,
} from '../../../shared/api/socket';
import type { Socket } from 'socket.io-client';

type AttachmentState = {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  base64: string;
  previewUrl: string;
};

async function readFileAsDataUrl(file: File): Promise<AttachmentState> {
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Could not read file'));
        return;
      }

      const [, payload = ''] = result.split(',', 2);
      resolve(payload);
    };
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });

  return {
    fileName: file.name,
    mimeType: file.type || 'image/jpeg',
    sizeBytes: file.size,
    base64,
    previewUrl: URL.createObjectURL(file),
  };
}

function sortThreads(threads: ChatThreadSummary[]) {
  return [...threads].sort((left, right) => {
    const leftTime = left.lastMessage ? new Date(left.lastMessage.createdAt).getTime() : 0;
    const rightTime = right.lastMessage ? new Date(right.lastMessage.createdAt).getTime() : 0;
    return rightTime - leftTime;
  });
}

function syncOverviewWithIncomingMessage(current: ChatOverview | undefined, payload: ChatSocketEventPayload) {
  if (!current) {
    return current;
  }

  const currentMessages =
    current.activeChatId === payload.chatId
      ? current.messages.some((message) => message.id === payload.message.id)
        ? current.messages.map((message) => (message.id === payload.message.id ? payload.message : message))
        : [...current.messages, payload.message]
      : current.messages;

  const currentThreadIndex = current.threads.findIndex((thread) => thread.chatId === payload.chatId);
  if (currentThreadIndex === -1) {
    return {
      ...current,
      messages: currentMessages,
    };
  }

  const targetThread = current.threads[currentThreadIndex];
  const messageCount = targetThread.lastMessage?.id === payload.message.id ? targetThread.messageCount : targetThread.messageCount + 1;
  const nextThread = {
    ...targetThread,
    lastMessage: payload.message,
    messageCount,
  };

  const nextThreads = sortThreads([
    nextThread,
    ...current.threads.filter((thread) => thread.chatId !== payload.chatId),
  ]);

  return {
    ...current,
    threads: nextThreads,
    activeThread: current.activeThread?.chatId === payload.chatId ? nextThread : current.activeThread,
    messages: currentMessages,
  };
}

export function useHomePageController() {
  const session = useAuthStore((state) => state.session);
  const logout = useAuthStore((state) => state.logout);
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const joinedChatIdRef = useRef<string | null>(null);
  const desiredChatIdRef = useRef<string | null>(null);

  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [attachment, setAttachment] = useState<AttachmentState | null>(null);
  const [unreadChatIds, setUnreadChatIds] = useState<string[]>([]);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [recentLoginActivities, setRecentLoginActivities] = useState<AdminLoginActivity[]>([]);

  const overviewQuery = useQuery({
    queryKey: ['chat-overview', session?.user.id, selectedChatId],
    queryFn: async () => {
      if (!session) {
        throw new Error('Session is not available');
      }

      return getChatOverview(selectedChatId ?? undefined);
    },
    enabled: Boolean(session),
  });

  const overview = overviewQuery.data;
  const threads = Array.isArray(overview?.threads) ? overview.threads : [];
  const activeThread = overview?.activeThread ?? threads[0] ?? null;
  const messages = Array.isArray(overview?.messages) ? overview.messages : [];
  const selectedThread = useMemo(() => {
    if (!selectedChatId) {
      return activeThread;
    }

    return threads.find((thread) => thread.chatId === selectedChatId) ?? activeThread;
  }, [activeThread, selectedChatId, threads]);
  const resolvedChatId = selectedThread?.chatId ?? activeThread?.chatId ?? overview?.activeChatId ?? selectedChatId ?? undefined;

  useEffect(() => {
    if (!session?.accessToken) {
      return undefined;
    }

    const socket = createChatSocket(session.accessToken);
    socketRef.current = socket;

    const handleSocketMessage = (payload: ChatSocketEventPayload) => {
      queryClient.setQueriesData<ChatOverview>({ queryKey: ['chat-overview', session.user.id] }, (current) =>
        syncOverviewWithIncomingMessage(current, payload),
      );

      const activeChatId = desiredChatIdRef.current;
      const incomingFromAnotherUser = payload.message.senderId !== session.user.id;
      if (incomingFromAnotherUser && payload.chatId !== activeChatId) {
        setUnreadChatIds((current) =>
          current.includes(payload.chatId) ? current : [payload.chatId, ...current],
        );
      }
    };

    const handleSocketDelete = (_payload: ChatSocketDeletePayload) => {
      void queryClient.invalidateQueries({ queryKey: ['chat-overview', session.user.id] });
    };

    const handleAdminLoginActivity = (payload: AdminLoginActivity) => {
      setRecentLoginActivities((current) => [payload, ...current.filter((entry) => entry.id !== payload.id)].slice(0, 12));
    };

    const handleAdminSnapshot = (payload: AdminLoginActivity[]) => {
      setRecentLoginActivities(payload);
    };

    const handleConnect = () => {
      const chatId = desiredChatIdRef.current;
      if (!chatId) {
        return;
      }

      void joinChatRoom(socket, chatId)
        .then(() => {
          joinedChatIdRef.current = chatId;
        })
        .catch(() => undefined);
    };

    socket.on('connect', handleConnect);
    socket.on('chat:message', handleSocketMessage);
    socket.on('chat:thread-updated', handleSocketMessage);
    socket.on('chat:message-deleted', handleSocketDelete);
    socket.on('admin:login-activity', handleAdminLoginActivity);
    socket.on('admin:login-activity-snapshot', handleAdminSnapshot);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('chat:message', handleSocketMessage);
      socket.off('chat:thread-updated', handleSocketMessage);
      socket.off('chat:message-deleted', handleSocketDelete);
      socket.off('admin:login-activity', handleAdminLoginActivity);
      socket.off('admin:login-activity-snapshot', handleAdminSnapshot);
      socket.disconnect();
      socketRef.current = null;
      joinedChatIdRef.current = null;
    };
  }, [queryClient, session?.accessToken, session?.user.id]);

  useEffect(() => {
    if (!overview) {
      return;
    }

    const fallbackChatId = overview.activeChatId || threads[0]?.chatId || null;

    if (!selectedChatId && fallbackChatId) {
      setSelectedChatId(fallbackChatId);
      return;
    }

    const exists = threads.some((thread) => thread.chatId === selectedChatId);
    if (!exists && fallbackChatId) {
      setSelectedChatId(fallbackChatId);
    }
  }, [overview, selectedChatId, threads]);

  useEffect(() => {
    if (!selectedThread?.chatId) {
      return;
    }

    setUnreadChatIds((current) => current.filter((chatId) => chatId !== selectedThread.chatId));
  }, [selectedThread?.chatId]);

  useEffect(() => {
    const socket = socketRef.current;
    const nextChatId = selectedChatId ?? activeThread?.chatId ?? null;
    desiredChatIdRef.current = nextChatId;

    if (!socket?.connected || !nextChatId || joinedChatIdRef.current === nextChatId) {
      return;
    }

    const previousChatId = joinedChatIdRef.current;

    void (async () => {
      if (previousChatId) {
        await leaveChatRoom(socket, previousChatId).catch(() => undefined);
      }

      await joinChatRoom(socket, nextChatId).catch(() => undefined);
      joinedChatIdRef.current = nextChatId;
    })();
  }, [activeThread?.chatId, selectedChatId]);

  useEffect(
    () => () => {
      if (attachment) {
        URL.revokeObjectURL(attachment.previewUrl);
      }
    },
    [attachment],
  );

  const sendMutation = useMutation({
    mutationFn: async (input: { text?: string; media?: AttachmentState | null }) => {
      if (!session) {
        throw new Error('Session is not available');
      }

      if (!resolvedChatId) {
        throw new Error(session.user.role === 'admin' ? 'Select a conversation first.' : 'Select an admin chat first.');
      }

      const payload = {
        text: input.text,
        // Always send to the currently resolved thread to avoid stale sidebar selections.
        chatId: resolvedChatId,
        mediaBase64: input.media?.base64,
        mediaMimeType: input.media?.mimeType,
        mediaSizeBytes: input.media?.sizeBytes,
      };

      const socket = socketRef.current;
      if (socket?.connected) {
        try {
          const result = await sendSocketMessage(socket, payload);
          return { transport: 'socket' as const, result };
        } catch (error) {
          if (!(error instanceof SocketAckError) || !error.canFallback) {
            throw error;
          }
        }
      }

      const result = await sendChatMessage(payload);
      return { transport: 'http' as const, result };
    },
    onSuccess: async ({ transport, result }) => {
      setComposerError(null);
      if (session) {
        queryClient.setQueriesData<ChatOverview>({ queryKey: ['chat-overview', session.user.id] }, (current) =>
          syncOverviewWithIncomingMessage(current, {
            chatId: result.message.chatId,
            message: result.message,
          }),
        );
      }

      setDraft('');
      setEditDraft('');
      setEditingMessageId(null);
      if (attachment) {
        URL.revokeObjectURL(attachment.previewUrl);
      }
      setAttachment(null);
      if (transport === 'http' && session) {
        await queryClient.invalidateQueries({ queryKey: ['chat-overview', session.user.id] });
      }
    },
    onError: (error) => {
      setComposerError(error instanceof Error ? error.message : 'Message was not sent');
    },
  });

  const editMutation = useMutation({
    mutationFn: async (payload: { messageId: string; text: string }) => {
      if (!session) {
        throw new Error('Session is not available');
      }

      return editChatMessage(payload.messageId, payload.text);
    },
    onSuccess: async () => {
      setComposerError(null);
      setEditingMessageId(null);
      setEditDraft('');
      await queryClient.invalidateQueries({ queryKey: ['chat-overview'] });
    },
    onError: (error) => {
      setComposerError(error instanceof Error ? error.message : 'Message could not be updated');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (messageId: string) => {
      if (!session) {
        throw new Error('Session is not available');
      }

      return deleteChatMessage(messageId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['chat-overview'] });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (messageIds: string[]) => {
      if (!session) {
        throw new Error('Session is not available');
      }

      return bulkDeleteChatMessages(messageIds);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['chat-overview'] });
    },
  });

  const deleteLoginActivityMutation = useMutation({
    mutationFn: async (activityId: string) => {
      if (session?.user.role !== 'admin') {
        throw new Error('Only admin can manage login activity');
      }

      const socket = socketRef.current;
      if (!socket?.connected) {
        throw new Error('Realtime connection is unavailable');
      }

      return deleteAdminLoginActivity(socket, activityId);
    },
  });

  const clearLoginActivitiesMutation = useMutation({
    mutationFn: async () => {
      if (session?.user.role !== 'admin') {
        throw new Error('Only admin can manage login activity');
      }

      const socket = socketRef.current;
      if (!socket?.connected) {
        throw new Error('Realtime connection is unavailable');
      }

      return clearAdminLoginActivities(socket);
    },
  });

  const sending = sendMutation.isPending;
  const composerBusy = sendMutation.isPending || editMutation.isPending;

  const handleSend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setComposerError(null);
    const text = draft.trim();

    if (!text && !attachment) {
      return;
    }

    if (editingMessageId) {
      const textToSave = editDraft.trim();
      if (!textToSave) {
        return;
      }

      await editMutation.mutateAsync({ messageId: editingMessageId, text: textToSave });
      return;
    }

    await sendMutation.mutateAsync({ text, media: attachment });
  };

  const handleSelectChat = (chatId: string) => {
    setComposerError(null);
    setUnreadChatIds((current) => current.filter((currentChatId) => currentChatId !== chatId));
    setSelectedChatId(chatId);
  };

  const handleStartEdit = (message: ChatMessage) => {
    setEditingMessageId(message.id);
    setEditDraft(message.text);
    setDraft(message.text);
  };

  const handleCancelEdit = () => {
    setComposerError(null);
    setEditingMessageId(null);
    setEditDraft('');
    setDraft('');
  };

  const handlePickAttachment = async (file: File | null) => {
    if (!file) {
      if (attachment) {
        URL.revokeObjectURL(attachment.previewUrl);
      }
      setAttachment(null);
      return;
    }

    const current = attachment;
    if (current) {
      URL.revokeObjectURL(current.previewUrl);
    }

    const nextAttachment = await readFileAsDataUrl(file);
    setAttachment(nextAttachment);
  };

  const handleDeleteMessage = async (messageId: string) => {
    await deleteMutation.mutateAsync(messageId);
  };

  const handleBulkDelete = async (messageIds: string[]) => {
    if (!messageIds.length) {
      return;
    }

    await bulkDeleteMutation.mutateAsync(messageIds);
  };

  const handleLogout = () => {
    queryClient.removeQueries({ queryKey: ['chat-overview'] });
    void logoutAccount().catch(() => undefined);
    logout();
  };

  const handleDeleteLoginActivity = async (activityId: string) => {
    const result = await deleteLoginActivityMutation.mutateAsync(activityId).catch(() => undefined);
    if (result) {
      setRecentLoginActivities(result.items);
    }
  };

  const handleClearLoginActivities = async () => {
    const result = await clearLoginActivitiesMutation.mutateAsync().catch(() => undefined);
    if (result) {
      setRecentLoginActivities(result.items);
    }
  };

  return {
    session,
    overview,
    threads,
    activeThread: selectedThread,
    messages,
    recentLoginActivities,
    draft,
    editDraft,
    editingMessageId,
    attachment,
    unreadChatIds,
    composerError,
    sending,
    composerBusy,
    setDraft,
    setEditDraft,
    setAttachment: handlePickAttachment,
    setSelectedChatId: handleSelectChat,
    handleSend,
    handleStartEdit,
    handleCancelEdit,
    handleDeleteMessage,
    handleBulkDelete,
    handleDeleteLoginActivity,
    handleClearLoginActivities,
    handleLogout,
  };
}
