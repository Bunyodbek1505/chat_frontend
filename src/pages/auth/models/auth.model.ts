import type { AuthMode } from '../../../shared/types/auth';

export type AuthFormState = {
  username: string;
  password: string;
  confirmPassword: string;
};

export type FaceCaptureState = {
  capturedFace: string;
};

export type AuthPhase = 'credentials' | 'face-verify';

export type { AuthMode };
