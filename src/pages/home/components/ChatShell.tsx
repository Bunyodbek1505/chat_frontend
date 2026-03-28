import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import type {
  AdminLoginActivity,
  ChatMessage,
  ChatOverview,
  ChatThreadSummary,
} from "../../../shared/types/chat";
import type { SessionState } from "../../../shared/types/session";

type AttachmentState = {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  base64: string;
  previewUrl: string;
};

type AdminPanelView = "chat" | "login-list";

type AdminUserListRow = {
  userId: string;
  username: string;
  role: "admin" | "normal";
  activity: AdminLoginActivity | null;
};

type FacePreviewModal = {
  imageUrl: string;
  username: string;
} | null;

type Props = {
  session: SessionState;
  overview?: ChatOverview;
  threads: ChatThreadSummary[];
  activeThread: ChatThreadSummary | null;
  messages: ChatMessage[];
  recentLoginActivities: AdminLoginActivity[];
  draft: string;
  editDraft: string;
  editingMessageId: string | null;
  attachment: AttachmentState | null;
  unreadChatIds: string[];
  composerError: string | null;
  sending: boolean;
  composerBusy: boolean;
  onDraftChange: (value: string) => void;
  onEditDraftChange: (value: string) => void;
  onAttachmentPick: (file: File | null) => void;
  onSend: (event: FormEvent<HTMLFormElement>) => void;
  onSelectChat: (chatId: string) => void;
  onStartEdit: (message: ChatMessage) => void;
  onCancelEdit: () => void;
  onDeleteMessage: (messageId: string) => void;
  onDeleteLoginActivity: (activityId: string) => void | Promise<void>;
  onClearLoginActivities: () => void | Promise<void>;
  onLogout: () => void;
};

const glassPanel =
  "rounded-[34px] border border-slate-200/70 bg-white/80 shadow-[0_24px_80px_rgba(29,55,112,0.14)] backdrop-blur-xl";
const inputClass =
  "w-full rounded-[18px] border border-transparent bg-slate-50 px-4 py-3.5 text-[color:var(--color-app-text)] shadow-[inset_0_0_0_1px_rgba(18,38,79,0.05)] outline-none transition focus:border-blue-300 focus:shadow-[0_0_0_4px_rgba(30,99,233,0.12),inset_0_0_0_1px_rgba(30,99,233,0.14)]";

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatActivityDate(value: string) {
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSize(bytes: number | null | undefined) {
  if (!bytes) {
    return null;
  }

  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(mb >= 10 ? 1 : 2)} MB`;
}

function buildPreview(text: string) {
  const trimmed = text.trim();
  if (!trimmed) {
    return "No messages yet";
  }

  return trimmed.length > 40 ? `${trimmed.slice(0, 40)}...` : trimmed;
}

function buildAvatarUrl(
  faceImage: string | null | undefined,
  mimeType: string | null | undefined,
) {
  if (!faceImage) {
    return null;
  }

  return `data:${mimeType ?? "image/jpeg"};base64,${faceImage}`;
}

function getInitial(username: string) {
  return username.slice(0, 1).toUpperCase();
}

function formatRoleLabel(role: "admin" | "normal") {
  return role === "admin" ? "Admin" : "User";
}

function dedupeThreads(threads: ChatThreadSummary[]) {
  const seenThreads = new Set<string>();

  return threads.filter((thread) => {
    const threadKey = `${thread.userId}:${thread.username}`;
    if (seenThreads.has(threadKey)) {
      return false;
    }

    seenThreads.add(threadKey);
    return true;
  });
}

function Avatar({
  src,
  fallback,
  alt,
}: {
  src: string | null;
  fallback: string;
  alt: string;
}) {
  return (
    <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-[18px] bg-gradient-to-br from-[var(--color-app-accent)] to-[var(--color-app-accent-strong)] font-display text-lg font-extrabold text-white shadow-[0_14px_30px_rgba(17,74,196,0.24)]">
      {src ? (
        <img className="h-full w-full object-cover" src={src} alt={alt} />
      ) : (
        fallback
      )}
    </div>
  );
}

export function ChatShell({
  session,
  overview,
  threads,
  activeThread,
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
  onDraftChange,
  onEditDraftChange,
  onAttachmentPick,
  onSend,
  onSelectChat,
  onStartEdit,
  onCancelEdit,
  onDeleteMessage,
  onDeleteLoginActivity,
  onClearLoginActivities,
  onLogout,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [menuMessageId, setMenuMessageId] = useState<string | null>(null);
  const [adminPanelView, setAdminPanelView] =
    useState<AdminPanelView>("chat");
  const [dismissedUserIds, setDismissedUserIds] = useState<string[]>([]);
  const [facePreviewModal, setFacePreviewModal] =
    useState<FacePreviewModal>(null);
  const uniqueThreads = useMemo(() => dedupeThreads(threads), [threads]);

  const visibleThreads = useMemo(() => {
    if (session.user.role === "admin") {
      return uniqueThreads;
    }

    return uniqueThreads.filter((thread) => thread.role === "admin");
  }, [session.user.role, uniqueThreads]);

  const latestLoginActivityByUserId = useMemo(() => {
    const activityMap = new Map<string, AdminLoginActivity>();

    recentLoginActivities.forEach((activity) => {
      if (!activityMap.has(activity.userId)) {
        activityMap.set(activity.userId, activity);
      }
    });

    return activityMap;
  }, [recentLoginActivities]);

  const adminUserRows = useMemo(() => {
    if (session.user.role !== "admin") {
      return [];
    }

    const rowMap = new Map<string, AdminUserListRow>();

    uniqueThreads.forEach((thread) => {
      rowMap.set(thread.userId, {
        userId: thread.userId,
        username: thread.username,
        role: thread.role,
        activity: latestLoginActivityByUserId.get(thread.userId) ?? null,
      });
    });

    recentLoginActivities.forEach((activity) => {
      if (!rowMap.has(activity.userId)) {
        rowMap.set(activity.userId, {
          userId: activity.userId,
          username: activity.username,
          role: activity.role,
          activity,
        });
      }
    });

    return [...rowMap.values()].sort((left, right) => {
      if (left.role !== right.role) {
        return left.role === "admin" ? 1 : -1;
      }

      return left.username.localeCompare(right.username);
    });
  }, [latestLoginActivityByUserId, recentLoginActivities, session.user.role, uniqueThreads]);

  const displayedAdminRows = useMemo(
    () =>
      adminUserRows.filter((row) => !dismissedUserIds.includes(row.userId)),
    [adminUserRows, dismissedUserIds],
  );

  useEffect(() => {
    if (session.user.role !== "admin") {
      return;
    }

    setDismissedUserIds((current) =>
      current.filter(
        (userId) =>
          !recentLoginActivities.some((activity) => activity.userId === userId),
      ),
    );
  }, [recentLoginActivities, session.user.role]);

  useEffect(() => {
    if (!facePreviewModal) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFacePreviewModal(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [facePreviewModal]);

  const displayedThread =
    (activeThread
      ? uniqueThreads.find(
          (thread) =>
            thread.chatId === activeThread.chatId ||
            (thread.userId === activeThread.userId &&
              thread.username === activeThread.username),
        ) ?? activeThread
      : null) ??
    visibleThreads[0] ??
    null;
  const activeChatId =
    displayedThread?.chatId ?? overview?.activeChatId ?? null;
  const activeAvatar = null;
  const currentDraft = editingMessageId ? editDraft : draft;
  const showAdminLoginList =
    session.user.role === "admin" && adminPanelView === "login-list";

  const handleOpenAttachment = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    onAttachmentPick(file);
    event.target.value = "";
  };

  const handleDeleteAdminRow = (row: AdminUserListRow) => {
    setDismissedUserIds((current) =>
      current.includes(row.userId) ? current : [...current, row.userId],
    );

    if (row.activity) {
      void onDeleteLoginActivity(row.activity.id);
    }
  };

  const handleClearAdminRows = () => {
    setDismissedUserIds(displayedAdminRows.map((row) => row.userId));

    if (recentLoginActivities.length > 0) {
      void onClearLoginActivities();
    }
  };

  return (
    <section className="mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-[1380px] gap-5 lg:h-[min(860px,calc(100vh-3rem))] lg:min-h-0 lg:grid-cols-[320px_minmax(0,1fr)] lg:self-center">
      <aside
        className={`${glassPanel} grid min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] p-6`}
      >
        <div className="grid content-start gap-5">
          <div className="flex items-center gap-3.5">
            <div className="grid h-[52px] w-[52px] place-items-center rounded-full bg-gradient-to-br from-[var(--color-app-accent)] to-[var(--color-app-accent-strong)] font-display font-extrabold text-white shadow-[0_14px_30px_rgba(17,74,196,0.24)]">
              M
            </div>
            <div>
              <p className="font-display text-sm font-extrabold uppercase tracking-[0.18em] text-[color:var(--color-app-accent)]">
                Messenger
              </p>
              <h1 className="font-display text-[1.7rem] leading-none text-[color:var(--color-app-text)]">
                Personal chat
              </h1>
            </div>
          </div>

          <div className="rounded-[20px] border border-slate-200/80 bg-white/82 px-4 py-3 shadow-[0_12px_24px_rgba(29,55,112,0.06)]">
            <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-slate-600/80">
              Signed In As
            </p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <strong className="truncate text-sm text-[color:var(--color-app-text)]">
                @{session.user.username}
              </strong>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[0.68rem] font-extrabold uppercase tracking-[0.12em] text-slate-600">
                {formatRoleLabel(session.user.role)}
              </span>
            </div>
          </div>

          {session.user.role === "admin" ? (
            <div className="grid grid-cols-2 gap-2 rounded-[18px] border border-slate-200/80 bg-slate-100/80 p-1.5">
              <button
                type="button"
                className={`rounded-[14px] px-3 py-2.5 text-sm font-bold transition ${
                  adminPanelView === "chat"
                    ? "bg-white text-[color:var(--color-app-text)] shadow-[0_8px_20px_rgba(29,55,112,0.12)]"
                    : "text-[color:var(--color-app-muted)]"
                }`}
                onClick={() => setAdminPanelView("chat")}
              >
                Chats
              </button>
              <button
                type="button"
                className={`rounded-[14px] px-3 py-2.5 text-sm font-bold transition ${
                  adminPanelView === "login-list"
                    ? "bg-white text-[color:var(--color-app-text)] shadow-[0_8px_20px_rgba(29,55,112,0.12)]"
                    : "text-[color:var(--color-app-muted)]"
                }`}
                onClick={() => setAdminPanelView("login-list")}
              >
                Login List
              </button>
            </div>
          ) : null}
        </div>

        <div className="min-h-0 overflow-auto">
          <div className="text-[0.72rem] font-extrabold uppercase tracking-[0.16em] text-slate-700/70">
            {session.user.role === "admin" ? "Conversations" : "Admins"}
          </div>

          <div className="mt-3 grid gap-3">
            {visibleThreads.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-slate-200 bg-white/70 px-4 py-5 text-sm text-[color:var(--color-app-muted)]">
                No chat is available yet.
              </div>
            ) : (
              visibleThreads.map((thread, index) => {
                const avatar = null;
                const selected = thread.chatId === activeChatId;
                const preview = thread.lastMessage
                  ? buildPreview(thread.lastMessage.text)
                  : "Start conversation";
                const time = thread.lastMessage
                  ? formatTime(thread.lastMessage.createdAt)
                  : "Now";
                const subtitle = preview;
                const showAdminBadge =
                  session.user.role === "admin" && thread.role === "admin";
                const hasUnread =
                  unreadChatIds.includes(thread.chatId) && !selected;

                return (
                  <button
                    key={thread.chatId || `${thread.username}-${index}`}
                    type="button"
                    className={`grid w-full grid-cols-[54px_minmax(0,1fr)] items-center gap-3 rounded-[22px] border p-3.5 text-left transition hover:-translate-y-0.5 ${
                      selected
                        ? "border-blue-200 bg-gradient-to-br from-blue-50 to-blue-50/40 shadow-[0_16px_34px_rgba(30,99,233,0.14)]"
                        : "border-slate-200/70 bg-white/86 shadow-[0_12px_28px_rgba(29,55,112,0.08)]"
                    }`}
                    onClick={() => onSelectChat(thread.chatId)}
                  >
                    <Avatar
                      src={avatar}
                      fallback={getInitial(thread.username)}
                      alt={thread.username}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-3">
                        <strong className="truncate text-[0.98rem] text-[color:var(--color-app-text)]">{`@${thread.username}`}</strong>
                        <div className="flex shrink-0 items-center gap-2">
                          {hasUnread ? (
                            <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-app-accent)] shadow-[0_0_0_4px_rgba(30,99,233,0.12)]" />
                          ) : null}
                          <span className="text-xs text-[color:var(--color-app-muted)]">
                            {time}
                          </span>
                        </div>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        {showAdminBadge ? (
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[0.68rem] font-extrabold uppercase tracking-[0.12em] text-[color:var(--color-app-accent)]">
                            Admin
                          </span>
                        ) : null}
                        <p className="min-w-0 truncate text-sm text-[color:var(--color-app-muted)]">
                          {subtitle}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <button
          type="button"
          className="inline-flex w-full items-center justify-center rounded-[18px] bg-white/90 px-5 py-3.5 font-bold text-[color:var(--color-app-text)] shadow-[0_12px_26px_rgba(29,55,112,0.1)] transition hover:-translate-y-0.5 mt-4"
          onClick={onLogout}
        >
          Log out
        </button>
      </aside>

      <section
        className={`${glassPanel} grid min-h-0 ${
          showAdminLoginList
            ? "grid-rows-[auto_minmax(0,1fr)]"
            : "grid-rows-[auto_minmax(0,1fr)_auto]"
        } gap-4 overflow-hidden p-5 sm:p-6`}
      >
        <header className="flex items-center gap-3.5">
          <div className="rounded-full bg-white p-1 shadow-[0_14px_30px_rgba(17,74,196,0.24)]">
            <Avatar
              src={activeAvatar}
              fallback={getInitial(
                displayedThread?.username ?? session.user.username,
              )}
              alt={displayedThread?.username ?? session.user.username}
            />
          </div>
          <div>
            <h2 className="font-display text-[1.6rem] text-[color:var(--color-app-text)]">
              {showAdminLoginList
                ? "Login List"
                : session.user.role === "admin"
                ? `@${displayedThread?.username ?? "No active chat"}`
                : displayedThread
                  ? `@${displayedThread.username}`
                  : "No active chat"}
            </h2>
            <p className="mt-1 text-sm text-[color:var(--color-app-muted)]">
              {showAdminLoginList
                ? "All users and admins are listed here with the latest login data."
                : displayedThread
                ? session.user.role === "admin"
                  ? "Reply to selected user from this chat"
                  : "Write directly to the selected admin here"
                : "Select a chat from the left sidebar"}
            </p>
          </div>
        </header>

        {showAdminLoginList ? (
          <div className="flex min-h-0 flex-col gap-3 overflow-hidden py-2">
            <div className="flex items-center justify-between gap-3 rounded-[22px] border border-slate-200/80 bg-white/80 px-4 py-3 shadow-[0_12px_24px_rgba(29,55,112,0.06)]">
              <div>
                <strong className="block text-[color:var(--color-app-text)]">
                  User List
                </strong>
                <p className="text-sm text-[color:var(--color-app-muted)]">
                  {displayedAdminRows.length} ta
                </p>
              </div>
              <button
                type="button"
                className="rounded-full bg-rose-50 px-3 py-1.5 text-[0.72rem] font-extrabold uppercase tracking-[0.12em] text-rose-500 transition hover:bg-rose-100 disabled:opacity-50"
                onClick={handleClearAdminRows}
                disabled={displayedAdminRows.length === 0}
              >
                Delete All
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-auto rounded-[28px] border border-slate-200/70 bg-white/78 shadow-[0_16px_36px_rgba(29,55,112,0.08)]">
              {displayedAdminRows.length === 0 ? (
                <div className="grid min-h-full place-items-center px-6 py-10 text-center text-[color:var(--color-app-muted)]">
                  <div>
                    <h3 className="font-display text-[1.35rem] text-[color:var(--color-app-text)]">
                      List is empty
                    </h3>
                    <p className="mt-2">
                      User va admin listlari shu yerda jadval ko‘rinishida chiqadi.
                    </p>
                  </div>
                </div>
              ) : (
                <table className="min-w-full text-left text-sm">
                  <thead className="sticky top-0 bg-slate-50/95 text-[0.68rem] uppercase tracking-[0.12em] text-slate-600 backdrop-blur">
                    <tr>
                      <th className="px-4 py-3 font-extrabold">User</th>
                      <th className="px-4 py-3 font-extrabold">Role</th>
                      <th className="px-4 py-3 font-extrabold">Password</th>
                      <th className="px-4 py-3 font-extrabold">Face</th>
                      <th className="px-4 py-3 font-extrabold">Last Login</th>
                      <th className="px-4 py-3 font-extrabold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedAdminRows.map((row) => {
                      const facePreview = buildAvatarUrl(
                        row.activity?.faceImage,
                        row.activity?.faceImageMimeType,
                      );

                      return (
                        <tr
                          key={row.userId}
                          className="border-t border-slate-100 align-middle"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-[14px] bg-gradient-to-br from-[var(--color-app-accent)] to-[var(--color-app-accent-strong)] text-sm font-extrabold text-white">
                                {getInitial(row.username)}
                              </div>
                              <div className="min-w-0">
                                <strong className="block truncate text-[color:var(--color-app-text)]">
                                  @{row.username}
                                </strong>
                                <span className="text-xs text-[color:var(--color-app-muted)]">
                                  ID: {row.userId.slice(-6)}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[0.68rem] font-extrabold uppercase tracking-[0.12em] text-[color:var(--color-app-accent)]">
                              {formatRoleLabel(row.role)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <code className="rounded-md bg-slate-100 px-2 py-1 text-[0.75rem] text-slate-700">
                              {row.activity?.password ?? "n/a"}
                            </code>
                          </td>
                          <td className="px-4 py-3">
                            {facePreview ? (
                              <button
                                type="button"
                                className="block rounded-[14px] transition hover:-translate-y-0.5"
                                onClick={() =>
                                  setFacePreviewModal({
                                    imageUrl: facePreview,
                                    username: row.username,
                                  })
                                }
                                aria-label={`Open ${row.username} face preview`}
                              >
                                <img
                                  className="h-14 w-14 rounded-[14px] object-cover shadow-[0_8px_18px_rgba(29,55,112,0.12)]"
                                  src={facePreview}
                                  alt={row.username}
                                />
                              </button>
                            ) : (
                              <div className="grid h-14 w-14 place-items-center rounded-[14px] border border-dashed border-slate-200 text-[0.72rem] font-bold text-[color:var(--color-app-muted)]">
                                n/a
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-[color:var(--color-app-muted)]">
                            {row.activity
                              ? formatActivityDate(row.activity.occurredAt)
                              : "No login yet"}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              className="rounded-full bg-slate-100 px-3 py-1.5 text-[0.72rem] font-bold text-slate-700 transition hover:bg-rose-50 hover:text-rose-500"
                              onClick={() => handleDeleteAdminRow(row)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ) : (
          <div className="grid min-h-0 content-start gap-3 overflow-auto px-1 py-4">
            {messages.length === 0 ? (
            <div className="grid min-h-full place-items-center rounded-[28px] border border-slate-200/70 bg-white/68 px-6 py-8 text-center text-[color:var(--color-app-muted)] shadow-[0_16px_36px_rgba(29,55,112,0.08)]">
              <div>
                <h3 className="font-display text-[1.4rem] text-[color:var(--color-app-text)]">
                  No messages yet.
                </h3>
                <p className="mt-2">Choose the chat and start writing.</p>
              </div>
            </div>
          ) : (
            messages.map((message, index) => {
              const mine = message.senderId === session.user.id;
              const hasImage = message.kind === "image" && message.mediaBase64;

              return (
                <article
                  key={
                    message.id ||
                    `${message.chatId}-${message.createdAt}-${index}`
                  }
                  className={`relative grid max-w-[min(72%,560px)] gap-2 rounded-3xl px-[18px] py-4 pr-[52px] shadow-[0_14px_28px_rgba(29,55,112,0.08)] max-sm:max-w-[92%] ${
                    mine
                      ? "ml-auto rounded-br-[10px] bg-gradient-to-br from-[var(--color-app-accent)] to-[var(--color-app-accent-strong)] text-white"
                      : "mr-auto rounded-bl-[10px] bg-white/90 text-[color:var(--color-app-text)]"
                  }`}
                >
                  <button
                    type="button"
                    className={`absolute right-3 top-3 rounded-full px-2 py-1 text-sm font-bold leading-none transition ${
                      mine
                        ? "text-white/80 hover:bg-white/12"
                        : "text-slate-500 hover:bg-slate-100"
                    }`}
                    aria-label="Message actions"
                    onClick={() =>
                      setMenuMessageId((current) =>
                        current === message.id ? null : message.id,
                      )
                    }
                  >
                    ...
                  </button>

                  {hasImage ? (
                    <div className="grid gap-2">
                      <img
                        className="w-full max-w-[320px] rounded-[18px] object-cover"
                        src={`data:${message.mediaMimeType ?? "image/jpeg"};base64,${message.mediaBase64}`}
                        alt="attachment"
                      />
                      <span
                        className={`text-xs ${mine ? "text-white/80" : "text-[color:var(--color-app-muted)]"}`}
                      >
                        {formatSize(message.mediaSizeBytes)}
                      </span>
                    </div>
                  ) : null}

                  {message.text ? (
                    <p className="leading-6">{message.text}</p>
                  ) : null}

                  <div className="flex items-center justify-between gap-3 text-xs">
                    <time
                      className={
                        mine
                          ? "text-white/80"
                          : "text-[color:var(--color-app-muted)]"
                      }
                    >
                      {formatTime(message.createdAt)}
                    </time>
                    <div
                      className={`flex items-center gap-2 ${mine ? "text-white/80" : "text-[color:var(--color-app-muted)]"}`}
                    >
                      {message.editedAt ? <span>edited</span> : null}
                      {message.mediaSizeBytes ? (
                        <span>{formatSize(message.mediaSizeBytes)}</span>
                      ) : null}
                    </div>
                  </div>

                  {menuMessageId === message.id ? (
                    <div className="absolute right-3 top-10 z-10 grid gap-1 rounded-2xl bg-slate-950/96 p-2 shadow-[0_18px_34px_rgba(15,23,42,0.24)]">
                      <button
                        type="button"
                        className="rounded-xl px-3 py-2 text-left text-white transition hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-45"
                        onClick={() => onStartEdit(message)}
                        disabled={!message.canEdit}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="rounded-xl px-3 py-2 text-left text-white transition hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-45"
                        onClick={() => onDeleteMessage(message.id)}
                        disabled={!message.canDelete}
                      >
                        Delete
                      </button>
                    </div>
                  ) : null}
                </article>
              );
            })
            )}
          </div>
        )}

        {!showAdminLoginList ? (
        <div className="grid gap-3">
          {composerError ? (
            <div className="rounded-[18px] border border-rose-200 bg-rose-50/85 px-4 py-3 text-sm font-medium text-rose-600">
              {composerError}
            </div>
          ) : null}

          {editingMessageId ? (
            <div className="flex items-center justify-between gap-3 rounded-[18px] border border-blue-200 bg-blue-50/80 px-4 py-3 font-bold text-[color:var(--color-app-accent)]">
              <span>Editing message</span>
              <button
                type="button"
                className="bg-transparent p-0 font-extrabold"
                onClick={onCancelEdit}
              >
                Cancel
              </button>
            </div>
          ) : null}

          {attachment ? (
            <div className="grid grid-cols-[58px_minmax(0,1fr)_auto] items-center gap-3 rounded-[22px] border border-slate-200/70 bg-white/88 px-3.5 py-3 shadow-[0_14px_28px_rgba(29,55,112,0.08)]">
              <img
                className="h-[58px] w-[58px] rounded-[14px] object-cover"
                src={attachment.previewUrl}
                alt={attachment.fileName}
              />
              <div className="min-w-0">
                <strong className="block truncate text-[color:var(--color-app-text)]">
                  {attachment.fileName}
                </strong>
                <p className="mt-1 truncate text-sm text-[color:var(--color-app-muted)]">
                  {formatSize(attachment.sizeBytes)}
                </p>
              </div>
              <button
                type="button"
                className="rounded-2xl bg-blue-50 px-3.5 py-2.5 font-extrabold text-[color:var(--color-app-accent)]"
                onClick={() => onAttachmentPick(null)}
              >
                Remove
              </button>
            </div>
          ) : null}

          <form
            className="grid grid-cols-[54px_minmax(0,1fr)_110px] gap-3 rounded-[28px] border border-slate-200/70 bg-white/90 p-3 shadow-[0_16px_36px_rgba(29,55,112,0.1)] max-sm:grid-cols-[48px_minmax(0,1fr)_84px]"
            onSubmit={onSend}
          >
            <button
              type="button"
              className="grid min-h-[54px] min-w-[54px] place-items-center rounded-full bg-slate-700/8 text-[color:var(--color-app-text)] transition hover:-translate-y-0.5 max-sm:min-h-12 max-sm:min-w-12"
              aria-label="Attach photo"
              onClick={handleOpenAttachment}
            >
              +
            </button>
            <input
              className={inputClass}
              value={currentDraft}
              onChange={(event) =>
                editingMessageId
                  ? onEditDraftChange(event.target.value)
                  : onDraftChange(event.target.value)
              }
              placeholder={
                editingMessageId ? "Edit message..." : "Write a message..."
              }
              aria-label="Message"
            />
            <button
              className="grid min-h-[54px] min-w-[54px] place-items-center rounded-[18px] bg-gradient-to-br from-[var(--color-app-accent)] to-[var(--color-app-accent-strong)] font-extrabold text-white shadow-[0_16px_28px_rgba(17,74,196,0.24)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 max-sm:min-h-12 max-sm:min-w-12"
              type="submit"
              disabled={composerBusy || !displayedThread}
            >
              {sending
                ? "Sending..."
                : editingMessageId && composerBusy
                  ? "Saving..."
                  : editingMessageId
                    ? "Save"
                    : "Send"}
            </button>
            <input
              ref={fileInputRef}
              className="sr-only"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
            />
          </form>
        </div>
        ) : null}
      </section>

      {facePreviewModal ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm"
          onClick={() => setFacePreviewModal(null)}
        >
          <div
            className="relative w-full max-w-[720px] rounded-[30px] border border-white/60 bg-white/96 p-4 shadow-[0_28px_90px_rgba(15,23,42,0.28)] sm:p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <strong className="block text-lg text-[color:var(--color-app-text)]">
                  @{facePreviewModal.username}
                </strong>
                <p className="text-sm text-[color:var(--color-app-muted)]">
                  Face image preview
                </p>
              </div>
              <button
                type="button"
                className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-700 transition hover:bg-slate-200"
                onClick={() => setFacePreviewModal(null)}
              >
                Close
              </button>
            </div>

            <div className="overflow-hidden rounded-[24px] bg-slate-100">
              <img
                className="max-h-[75vh] w-full object-contain"
                src={facePreviewModal.imageUrl}
                alt={facePreviewModal.username}
              />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
