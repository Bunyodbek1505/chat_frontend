import type { AuthUser } from './auth';
import type { ChatResponse } from './chat';

export type SessionState = {
  accessToken: string;
  user: AuthUser;
  chat: ChatResponse;
};
