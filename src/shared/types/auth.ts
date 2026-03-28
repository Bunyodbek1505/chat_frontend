import type { ChatResponse } from './chat';

export type AuthMode = 'login' | 'register';
export type Role = 'normal' | 'admin';

export type AuthUser = {
  id: string;
  username: string;
  role: Role;
  faceImage?: string | null;
  faceImageMimeType?: string | null;
  chatId?: string | null;
};

export type AuthPayload = {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
  chat: ChatResponse;
};

export type FaceLoginPayload =
  | {
      loggedIn: true;
      access_token: string;
      refresh_token: string;
      user: AuthUser;
      chat: ChatResponse;
    }
  | {
      loggedIn: false;
      message: string;
      user: AuthUser;
    };
