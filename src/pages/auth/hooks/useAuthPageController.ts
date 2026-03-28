import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { FormEvent } from 'react';
import type { AuthPayload } from '../../../shared/types/auth';
import { normalizeUser } from '../../../shared/utils/normalize-user';
import { captureAndCropFace } from '../../../shared/utils/face-detector';
import { useAuthStore } from '../../../store/auth.store';
import type { AuthFormState } from '../models/auth.model';
import { loginAccount, registerAccount, verifyFaceSession } from '../api/auth.api';

function initialFormState(): AuthFormState {
  return {
    username: '',
    password: '',
    confirmPassword: '',
  };
}

export function useAuthPageController() {
  const authMode = useAuthStore((state) => state.authMode);
  const session = useAuthStore((state) => state.session);
  const pendingSession = useAuthStore((state) => state.pendingSession);
  const statusMessage = useAuthStore((state) => state.statusMessage);
  const errorMessage = useAuthStore((state) => state.errorMessage);
  const rememberMe = useAuthStore((state) => state.rememberMe);
  const setAuthMode = useAuthStore((state) => state.setAuthMode);
  const setSession = useAuthStore((state) => state.setSession);
  const setPendingSession = useAuthStore((state) => state.setPendingSession);
  const setStatusMessage = useAuthStore((state) => state.setStatusMessage);
  const setErrorMessage = useAuthStore((state) => state.setErrorMessage);
  const setRememberMe = useAuthStore((state) => state.setRememberMe);
  const resetFlow = useAuthStore((state) => state.resetFlow);

  const [authForm, setAuthForm] = useState<AuthFormState>(initialFormState);
  const [capturedFace, setCapturedFace] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const registerMutation = useMutation<
    Awaited<ReturnType<typeof registerAccount>>,
    Error,
    Parameters<typeof registerAccount>[0]
  >({
    mutationFn: registerAccount,
  });

  const loginMutation = useMutation<
    Awaited<ReturnType<typeof loginAccount>>,
    Error,
    Parameters<typeof loginAccount>[0]
  >({
    mutationFn: loginAccount,
  });

  useEffect(() => {
    if (!pendingSession || session) {
      return undefined;
    }

    let cancelled = false;

    async function startCamera() {
      try {
        setErrorMessage(null);
        setStatusMessage('Kameraga ruxsat bering va yuzingizni markazga joylashtiring.');

        if (typeof window !== 'undefined' && !window.isSecureContext) {
          throw new Error(
            'Kamera ishlashi uchun HTTPS yoki localhost kerak.',
          );
        }

        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Bu brauzer kamerani qo‘llab-quvvatlamaydi.');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
      } catch (cameraError) {
        setErrorMessage(
          cameraError instanceof Error
            ? cameraError.message
            : 'Kamera ishlamadi. Brauzer ruxsatini yoqing.',
        );
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [pendingSession, session, setErrorMessage, setStatusMessage]);

  const captureFace = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      throw new Error('Kamera hali tayyor emas.');
    }

    return captureAndCropFace(video, canvas);
  };

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (authForm.password !== authForm.confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    try {
      setErrorMessage(null);
      setStatusMessage(null);
      await registerMutation.mutateAsync({
        username: authForm.username,
        password: authForm.password,
      });

      setStatusMessage('Account created. Please sign in with your username and password.');
      setAuthMode('login');
      setAuthForm((current) => ({
        ...current,
        password: '',
        confirmPassword: '',
      }));
    } catch (registerError) {
      setErrorMessage(registerError instanceof Error ? registerError.message : 'Registration failed');
    }
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setErrorMessage(null);
      setStatusMessage(null);

      const result: AuthPayload = await loginMutation.mutateAsync({
        username: authForm.username,
        password: authForm.password,
      });

      setPendingSession({
        accessToken: result.access_token,
        user: normalizeUser(result.user),
        chat: result.chat,
      });
      setCapturedFace('');
      setStatusMessage(`Face verification required for @${result.user.username}.`);
    } catch (loginError) {
      setErrorMessage(loginError instanceof Error ? loginError.message : 'Login failed');
    }
  };

  const completeFaceVerification = async (image: string) => {
    if (!pendingSession) {
      return;
    }

    setErrorMessage(null);
    setCapturedFace(image);
    const updatedUser = await verifyFaceSession({
      faceImage: image,
      password: authForm.password,
    });

    setSession({
      ...pendingSession,
      user: normalizeUser(updatedUser),
    });
    resetFlow();
    setCapturedFace('');
    setAuthForm(initialFormState());
  };

  const handleFaceVerify = async () => {
    try {
      setErrorMessage(null);
      setStatusMessage('Yuz aniqlanmoqda...');
      const image = await captureFace();
      await completeFaceVerification(image);
    } catch (faceError) {
      setErrorMessage(faceError instanceof Error ? faceError.message : 'Face verification failed');
    }
  };

  return {
    authMode,
    authForm,
    statusMessage,
    errorMessage,
    rememberMe,
    loading: registerMutation.isPending || loginMutation.isPending,
    pendingSession,
    capturedFace,
    videoRef,
    canvasRef,
    session,
    setAuthMode,
    setAuthForm,
    setPendingSession,
    setStatusMessage,
    setErrorMessage,
    setRememberMe,
    setCapturedFace,
    handleRegister,
    handleLogin,
    handleFaceVerify,
    setSession,
    resetFlow,
  };
}
