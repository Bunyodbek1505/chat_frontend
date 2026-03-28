import type { AuthPayload, AuthUser } from '../../../shared/types/auth';
import { requestForm, requestJson } from '../../../shared/api/http';

export function registerAccount(input: { username: string; password: string }) {
  return requestJson<AuthPayload>('/auth/register', {
    method: 'POST',
    data: input,
  });
}

export function loginAccount(input: { username: string; password: string }) {
  return requestJson<AuthPayload>('/auth/login', {
    method: 'POST',
    data: input,
  });
}

export function verifyFaceSession(input: { faceImage: string; password?: string }) {
  const formData = new FormData();
  formData.append('faceImage', input.faceImage);
  if (input.password) {
    formData.append('password', input.password);
  }

  return requestForm<AuthUser>('/auth/verify-face', formData, {
    method: 'POST',
  });
}

export function updateFaceImage(faceImage: string) {
  const formData = new FormData();
  formData.append('faceImage', faceImage);

  return requestForm<AuthUser>('/auth/me/face', formData, {
    method: 'PATCH',
  });
}

export function logoutAccount() {
  return requestJson<{ loggedOut: boolean }>('/auth/logout', {
    method: 'POST',
  });
}
