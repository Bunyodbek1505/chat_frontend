import { useHomePageController } from './hooks/useHomePageController';
import { ChatShell } from './components/ChatShell';

export function HomePage() {
  const controller = useHomePageController();

  if (!controller.session) {
    return null;
  }

  return (
    <main className="grid min-h-screen place-items-center p-4 sm:p-6">
      <ChatShell
        session={controller.session}
        overview={controller.overview}
        threads={controller.threads}
        activeThread={controller.activeThread}
        messages={controller.messages}
        recentLoginActivities={controller.recentLoginActivities}
        draft={controller.draft}
        editDraft={controller.editDraft}
        editingMessageId={controller.editingMessageId}
        attachment={controller.attachment}
        unreadChatIds={controller.unreadChatIds}
        composerError={controller.composerError}
        sending={controller.sending}
        composerBusy={controller.composerBusy}
        onDraftChange={controller.setDraft}
        onEditDraftChange={controller.setEditDraft}
        onAttachmentPick={controller.setAttachment}
        onSend={controller.handleSend}
        onSelectChat={controller.setSelectedChatId}
        onStartEdit={controller.handleStartEdit}
        onCancelEdit={controller.handleCancelEdit}
        onDeleteMessage={controller.handleDeleteMessage}
        onDeleteLoginActivity={controller.handleDeleteLoginActivity}
        onClearLoginActivities={controller.handleClearLoginActivities}
        onLogout={controller.handleLogout}
      />
    </main>
  );
}
