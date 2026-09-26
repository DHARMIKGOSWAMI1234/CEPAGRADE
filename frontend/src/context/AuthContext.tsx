import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../lib/firebase';
import { authApi } from '../api/auth';
import type { UserRole } from '../api/auth';

export type { UserRole };

export type AuthErrorCode =
  | 'RATE_LIMIT'
  | 'INVALID_EMAIL'
  | 'WEAK_PASSWORD'
  | 'PASSWORD_MISMATCH'
  | 'USER_ALREADY_EXISTS'
  | 'EMAIL_NOT_CONFIRMED'
  | 'NETWORK_ERROR'
  | 'INVALID_CREDENTIALS'
  | 'GENERIC_AUTH_ERROR';

export class AuthError extends Error {
  code: AuthErrorCode;
  constructor(code: AuthErrorCode, message: string) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    Object.setPrototypeOf(this, AuthError.prototype);
  }
}

/**
 * Maps Firebase Auth error codes to user-friendly CEPA GRADE messages.
 * Never exposes raw error objects, internal API codes, or stack traces.
 */
export const mapFirebaseAuthError = (err: any): { code: AuthErrorCode; message: string } => {
  if (!err) {
    return {
      code: 'GENERIC_AUTH_ERROR',
      message: 'Authentication service temporarily unavailable. Please try again later.',
    };
  }

  const code = (err.code || '').toLowerCase();
  const msg = (err.message || '').toLowerCase();

  // 1. Invalid Credentials / Wrong Password / User Not Found
  if (
    code === 'auth/invalid-credential' ||
    code === 'auth/wrong-password' ||
    code === 'auth/user-not-found' ||
    msg.includes('invalid-credential') ||
    msg.includes('wrong-password') ||
    msg.includes('user-not-found')
  ) {
    return {
      code: 'INVALID_CREDENTIALS',
      message: 'Incorrect email or password.',
    };
  }

  // 2. Email Already Registered
  if (
    code === 'auth/email-already-in-use' ||
    msg.includes('email-already-in-use') ||
    msg.includes('already registered') ||
    msg.includes('already exists')
  ) {
    return {
      code: 'USER_ALREADY_EXISTS',
      message: 'An account with this email address already exists. Please sign in instead.',
    };
  }

  // 3. Email Not Verified
  if (
    code === 'auth/email-not-verified' ||
    msg.includes('verify your email') ||
    msg.includes('not verified')
  ) {
    return {
      code: 'EMAIL_NOT_CONFIRMED',
      message: 'Please verify your email before accessing CEPA GRADE.',
    };
  }

  // 4. Invalid Email Format
  if (
    code === 'auth/invalid-email' ||
    msg.includes('invalid-email') ||
    (msg.includes('invalid') && msg.includes('email'))
  ) {
    return {
      code: 'INVALID_EMAIL',
      message: 'Please enter a valid email address.',
    };
  }

  // 5. Weak Password (< 6 chars)
  if (
    code === 'auth/weak-password' ||
    msg.includes('weak-password') ||
    msg.includes('least 6')
  ) {
    return {
      code: 'WEAK_PASSWORD',
      message: 'Password must be at least 6 characters long and include a mix of characters.',
    };
  }

  // 6. Rate Limiting / Too Many Requests
  if (
    code === 'auth/too-many-requests' ||
    msg.includes('too-many-requests') ||
    msg.includes('rate limit') ||
    msg.includes('too many')
  ) {
    return {
      code: 'RATE_LIMIT',
      message: 'Too many authentication attempts. Please wait and try again.',
    };
  }

  // 7. Network / Connection Errors
  if (
    code === 'auth/network-request-failed' ||
    msg.includes('network') ||
    msg.includes('failed to fetch') ||
    msg.includes('load failed')
  ) {
    return {
      code: 'NETWORK_ERROR',
      message: 'Network connection issue. Please check your connection and try again.',
    };
  }

  // 8. Google Sign-In & Popup Specific Errors
  if (
    code === 'auth/popup-closed-by-user' ||
    code === 'auth/cancelled-popup-request' ||
    msg.includes('popup-closed') ||
    msg.includes('cancelled-popup')
  ) {
    return {
      code: 'GENERIC_AUTH_ERROR',
      message: 'Google sign-in was cancelled.',
    };
  }

  if (code === 'auth/popup-blocked' || msg.includes('popup-blocked')) {
    return {
      code: 'GENERIC_AUTH_ERROR',
      message: 'Your browser blocked the Google sign-in window. Please allow popups and try again.',
    };
  }

  if (code === 'auth/unauthorized-domain' || msg.includes('unauthorized-domain')) {
    return {
      code: 'GENERIC_AUTH_ERROR',
      message: 'Google sign-in is not available for this website domain yet.',
    };
  }

  if (code === 'auth/operation-not-allowed' || msg.includes('operation-not-allowed')) {
    return {
      code: 'GENERIC_AUTH_ERROR',
      message: 'Google sign-in provider is not enabled in Firebase Console.',
    };
  }

  if (
    code === 'auth/configuration-not-found' ||
    code === 'auth/invalid-api-key' ||
    code === 'auth/invalid-oauth-client-id' ||
    msg.includes('configuration-not-found')
  ) {
    return {
      code: 'GENERIC_AUTH_ERROR',
      message: 'Google sign-in is temporarily unavailable. Please use email and password.',
    };
  }

  // 9. Generic Auth Failure
  return {
    code: 'GENERIC_AUTH_ERROR',
    message: 'Authentication service temporarily unavailable. Please try again later.',
  };
};

export interface User {
  id: string; // Firebase UID
  name: string;
  email: string;
  role: UserRole;
  emailVerified: boolean;
  is_active?: boolean;
  created_at?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loading: boolean;
  isFirebaseConfigured: boolean;
  // Deprecated alias for backwards-compatibility with older components during migration
  isSupabaseConfigured?: boolean;
  login: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginDemo: () => Promise<void>;
  isDemoUser: boolean;
  demoAttempts: number;
  maxDemoAttempts: number;
  signup: (
    name: string,
    email: string,
    password: string,
    confirmPassword?: string
  ) => Promise<{ emailConfirmationRequired: boolean }>;
  signUp: (
    name: string,
    email: string,
    password: string,
    confirmPassword?: string
  ) => Promise<{ emailConfirmationRequired: boolean }>;
  resendVerificationEmail: (email?: string) => Promise<{ success: boolean; message: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
  errorCode: AuthErrorCode | null;
  clearError: () => void;
  infoMessage: string | null;
  clearInfoMessage: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser =
        localStorage.getItem('cepagrade_user') || localStorage.getItem('onionvision_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    return (
      localStorage.getItem('cepagrade_token') || localStorage.getItem('onionvision_token')
    );
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<AuthErrorCode | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
    setErrorCode(null);
  }, []);
  const clearInfoMessage = useCallback(() => setInfoMessage(null), []);

  const saveSession = useCallback((authToken: string, authUser: User, isDemo = false) => {
    setToken(authToken);
    setUser(authUser);
    localStorage.setItem('cepagrade_token', authToken);
    localStorage.setItem('cepagrade_user', JSON.stringify(authUser));
    // Backwards-compatibility for existing backend API client interceptors
    localStorage.setItem('onionvision_token', authToken);
    localStorage.setItem('onionvision_user', JSON.stringify(authUser));
    if (isDemo) {
      localStorage.setItem('cepagrade_is_demo', 'true');
      setIsDemoUser(true);
    } else {
      localStorage.removeItem('cepagrade_is_demo');
      setIsDemoUser(false);
    }
  }, []);

  const [isDemoUser, setIsDemoUser] = useState<boolean>(() => {
    return localStorage.getItem('cepagrade_is_demo') === 'true';
  });

  const [demoAttempts, setDemoAttempts] = useState<number>(() => {
    return Number(localStorage.getItem('cepagrade_demo_attempts') || '0');
  });

  const maxDemoAttempts = 2;

  const clearSession = useCallback(() => {
    setToken(null);
    setUser(null);
    setIsDemoUser(false);
    localStorage.removeItem('cepagrade_token');
    localStorage.removeItem('cepagrade_user');
    localStorage.removeItem('cepagrade_is_demo');
    localStorage.removeItem('onionvision_token');
    localStorage.removeItem('onionvision_user');
  }, []);

  // Initialize session and subscribe to Firebase Auth state changes
  useEffect(() => {
    let isMounted = true;

    if (isFirebaseConfigured && auth) {
      // Firebase Modular Auth State Listener
      const unsubscribe = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
        if (!isMounted) return;

        if (fbUser) {
          try {
            // Only establish authenticated session if email is verified
            if (fbUser.emailVerified) {
              const idToken = await fbUser.getIdToken();
              const authUser: User = {
                id: fbUser.uid,
                name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Operator',
                email: fbUser.email || '',
                role: 'operator',
                emailVerified: true,
                is_active: true,
                created_at: fbUser.metadata.creationTime,
              };
              saveSession(idToken, authUser);
            } else {
              // User exists but has unverified email -> do not grant authenticated access
              clearSession();
            }
          } catch (tokenErr) {
            console.warn('Firebase token retrieval error:', tokenErr);
            clearSession();
          }
        } else {
          clearSession();
        }
        setIsLoading(false);
      });

      return () => {
        isMounted = false;
        unsubscribe();
      };
    } else {
      // Offline / Local Development Fallback
      const storedToken =
        localStorage.getItem('cepagrade_token') || localStorage.getItem('onionvision_token');
      if (storedToken) {
        authApi
          .getMe()
          .then((currentUser) => {
            if (isMounted) {
              const mapped: User = {
                id: String(currentUser.id),
                name: currentUser.name,
                email: currentUser.email,
                role: currentUser.role,
                emailVerified: true,
                is_active: currentUser.is_active,
                created_at: currentUser.created_at,
              };
              saveSession(storedToken, mapped);
            }
          })
          .catch(() => {
            if (isMounted) clearSession();
          })
          .finally(() => {
            if (isMounted) setIsLoading(false);
          });
      } else {
        setIsLoading(false);
      }
    }
  }, [saveSession, clearSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);
      setError(null);
      setErrorCode(null);
      setInfoMessage(null);
      try {
        if (!email.trim() || !password.trim()) {
          throw new AuthError('INVALID_CREDENTIALS', 'Please enter both email and password.');
        }

        if (isFirebaseConfigured && auth) {
          try {
            // Real Firebase Auth login
            const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
            const fbUser = userCredential.user;

            // Reload user to ensure latest emailVerified status
            await fbUser.reload();

            if (!fbUser.emailVerified) {
              // Sign out of client session immediately to prevent unverified access
              await firebaseSignOut(auth).catch(() => {});
              clearSession();
              throw new AuthError(
                'EMAIL_NOT_CONFIRMED',
                'Please verify your email before accessing CEPA GRADE.'
              );
            }

            // Retrieve verified Firebase ID Token
            const idToken = await fbUser.getIdToken(/* forceRefresh */ true);
            const authUser: User = {
              id: fbUser.uid,
              name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Operator',
              email: fbUser.email || email,
              role: 'operator',
              emailVerified: true,
              is_active: true,
              created_at: fbUser.metadata.creationTime,
            };
            saveSession(idToken, authUser);
            return;
          } catch (fbErr: any) {
            if (fbErr instanceof AuthError && fbErr.code === 'EMAIL_NOT_CONFIRMED') {
              throw fbErr;
            }
            // If Firebase login failed (e.g. user-not-found, invalid-credential), check local backend auth
            try {
              const res = await authApi.login({ email: email.trim(), password });
              saveSession(res.access_token, {
                id: String(res.user.id),
                name: res.user.name,
                email: res.user.email,
                role: res.user.role,
                emailVerified: true,
                is_active: res.user.is_active,
                created_at: res.user.created_at,
              });
              return;
            } catch (apiErr: any) {
              const detail = apiErr?.response?.data?.detail;
              if (
                detail?.toLowerCase().includes('credential') ||
                detail?.toLowerCase().includes('password')
              ) {
                throw new AuthError('INVALID_CREDENTIALS', 'Incorrect email or password.');
              }
              const mapped = mapFirebaseAuthError(fbErr);
              throw new AuthError(mapped.code, mapped.message);
            }
          }
        } else {
          // Fallback to local FastAPI development auth (offline mode only)
          try {
            const res = await authApi.login({ email: email.trim(), password });
            saveSession(res.access_token, {
              id: String(res.user.id),
              name: res.user.name,
              email: res.user.email,
              role: res.user.role,
              emailVerified: true,
              is_active: res.user.is_active,
              created_at: res.user.created_at,
            });
          } catch (apiErr: any) {
            const detail = apiErr?.response?.data?.detail;
            if (
              detail?.toLowerCase().includes('credential') ||
              detail?.toLowerCase().includes('password')
            ) {
              throw new AuthError('INVALID_CREDENTIALS', 'Incorrect email or password.');
            }
            throw new AuthError(
              'GENERIC_AUTH_ERROR',
              detail || 'Login failed. Please verify your credentials.'
            );
          }
        }
      } catch (err: any) {
        if (err instanceof AuthError) {
          setError(err.message);
          setErrorCode(err.code);
          throw err;
        }
        const mapped = mapFirebaseAuthError(err);
        setError(mapped.message);
        setErrorCode(mapped.code);
        throw new AuthError(mapped.code, mapped.message);
      } finally {
        setIsLoading(false);
      }
    },
    [saveSession, clearSession]
  );

  const loginWithGoogle = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setErrorCode(null);
    try {
      if (!isFirebaseConfigured || !auth) {
        const msg = 'Google sign-in is currently unavailable. Please use email and password.';
        setError(msg);
        setErrorCode('GENERIC_AUTH_ERROR');
        throw new AuthError('GENERIC_AUTH_ERROR', msg);
      }

      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const userCredential = await signInWithPopup(auth, provider);
      const fbUser = userCredential.user;
      const idToken = await fbUser.getIdToken(true);
      const authUser: User = {
        id: fbUser.uid,
        name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Operator',
        email: fbUser.email || '',
        role: 'operator',
        emailVerified: true,
        is_active: true,
        created_at: fbUser.metadata.creationTime,
      };
      localStorage.removeItem('cepagrade_is_demo');
      setIsDemoUser(false);
      saveSession(idToken, authUser);
    } catch (err: any) {
      if (err instanceof AuthError) {
        setError(err.message);
        setErrorCode(err.code);
        throw err;
      }
      const mapped = mapFirebaseAuthError(err);
      setError(mapped.message);
      setErrorCode(mapped.code);
      throw new AuthError(mapped.code, mapped.message);
    } finally {
      setIsLoading(false);
    }
  }, [saveSession]);

  const loginDemo = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setErrorCode(null);
    try {
      const currentAttempts = Number(localStorage.getItem('cepagrade_demo_attempts') || '0');
      if (currentAttempts >= maxDemoAttempts) {
        const msg = 'Demo access limit reached. Create a free account to continue using CEPA GRADE.';
        setError(msg);
        setErrorCode('RATE_LIMIT');
        throw new AuthError('RATE_LIMIT', msg);
      }

      let devId = localStorage.getItem('cepagrade_device_id');
      if (!devId) {
        devId = 'dev-' + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('cepagrade_device_id', devId);
      }

      const res = await authApi.demo(devId);
      const newAttempts = currentAttempts + 1;
      localStorage.setItem('cepagrade_demo_attempts', String(newAttempts));
      setDemoAttempts(newAttempts);
      localStorage.setItem('cepagrade_is_demo', 'true');
      setIsDemoUser(true);

      saveSession(
        res.access_token,
        {
          id: String(res.user.id),
          name: res.user.name,
          email: res.user.email,
          role: res.user.role,
          emailVerified: true,
          is_active: res.user.is_active,
          created_at: res.user.created_at,
        },
        true
      );
    } catch (err: any) {
      if (err instanceof AuthError) {
        setError(err.message);
        setErrorCode(err.code);
        throw err;
      }
      const detail = err?.response?.data?.detail;
      if (err?.response?.status === 429 || (detail && detail.includes('limit reached'))) {
        const msg = 'Demo access limit reached. Create a free account to continue using CEPA GRADE.';
        setError(msg);
        setErrorCode('RATE_LIMIT');
        throw new AuthError('RATE_LIMIT', msg);
      }
      const genericMsg = detail || 'Unable to start demo session. Please try again.';
      setError(genericMsg);
      setErrorCode('GENERIC_AUTH_ERROR');
      throw new AuthError('GENERIC_AUTH_ERROR', genericMsg);
    } finally {
      setIsLoading(false);
    }
  }, [saveSession, maxDemoAttempts]);

  const signup = useCallback(
    async (
      name: string,
      email: string,
      password: string,
      confirmPassword?: string
    ): Promise<{ emailConfirmationRequired: boolean }> => {
      setIsLoading(true);
      setError(null);
      setErrorCode(null);
      setInfoMessage(null);
      try {
        if (!name.trim() || !email.trim() || !password) {
          throw new AuthError('INVALID_EMAIL', 'All fields are required.');
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
          throw new AuthError('INVALID_EMAIL', 'Please enter a valid email address.');
        }

        if (password.length < 6) {
          throw new AuthError(
            'WEAK_PASSWORD',
            'Password must be at least 6 characters long and include a mix of characters.'
          );
        }

        if (confirmPassword !== undefined && password !== confirmPassword) {
          throw new AuthError('PASSWORD_MISMATCH', 'Passwords do not match. Please re-enter your password.');
        }

        if (isFirebaseConfigured && auth) {
          // Real Firebase Auth signup - Default public role is strictly operator
          const userCredential = await createUserWithEmailAndPassword(
            auth,
            email.trim(),
            password
          );
          const fbUser = userCredential.user;

          // Update display name profile
          await updateProfile(fbUser, {
            displayName: name.trim(),
          });

          // Send official Firebase verification email
          await sendEmailVerification(fbUser);

          // Sign out immediately so unverified account is not authenticated
          await firebaseSignOut(auth).catch(() => {});
          clearSession();

          const msg = 'Account created successfully. Please verify your email before signing in.';
          setInfoMessage(msg);
          return { emailConfirmationRequired: true };
        } else {
          // Fallback to local FastAPI development auth (offline mode only)
          try {
            const res = await authApi.signup({
              name: name.trim(),
              email: email.trim(),
              password,
              role: 'operator',
            });
            saveSession(res.access_token, {
              id: String(res.user.id),
              name: res.user.name,
              email: res.user.email,
              role: res.user.role,
              emailVerified: true,
              is_active: res.user.is_active,
              created_at: res.user.created_at,
            });
            return { emailConfirmationRequired: false };
          } catch (apiErr: any) {
            const detail = apiErr?.response?.data?.detail;
            if (detail?.toLowerCase().includes('exists')) {
              throw new AuthError(
                'USER_ALREADY_EXISTS',
                'An account with this email address already exists. Please sign in instead.'
              );
            }
            throw new AuthError('GENERIC_AUTH_ERROR', detail || 'Registration failed. Please try again.');
          }
        }
      } catch (err: any) {
        if (err instanceof AuthError) {
          setError(err.message);
          setErrorCode(err.code);
          throw err;
        }
        const mapped = mapFirebaseAuthError(err);
        setError(mapped.message);
        setErrorCode(mapped.code);
        throw new AuthError(mapped.code, mapped.message);
      } finally {
        setIsLoading(false);
      }
    },
    [saveSession, clearSession]
  );

  const resendVerificationEmail = useCallback(
    async (_emailToVerify?: string): Promise<{ success: boolean; message: string }> => {
      setIsLoading(true);
      setError(null);
      setErrorCode(null);
      setInfoMessage(null);
      try {
        if (isFirebaseConfigured && auth) {
          if (auth.currentUser) {
            await sendEmailVerification(auth.currentUser);
            const msg = 'A verification email has been sent. Please check your inbox and spam folder.';
            setInfoMessage(msg);
            return { success: true, message: msg };
          } else {
            // If user is not currently in memory, instruct them to log in to trigger resend
            const msg = 'Please sign in with your credentials to trigger a fresh verification email.';
            setInfoMessage(msg);
            return { success: true, message: msg };
          }
        } else {
          // Offline mode simulation
          const msg = 'In offline development mode, email verification is simulated as completed.';
          setInfoMessage(msg);
          return { success: true, message: msg };
        }
      } catch (err: any) {
        if (err instanceof AuthError) {
          setError(err.message);
          setErrorCode(err.code);
          throw err;
        }
        const mapped = mapFirebaseAuthError(err);
        setError(mapped.message);
        setErrorCode(mapped.code);
        throw new AuthError(mapped.code, mapped.message);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const resetPassword = useCallback(
    async (email: string): Promise<{ success: boolean; message: string }> => {
      setIsLoading(true);
      setError(null);
      setErrorCode(null);
      setInfoMessage(null);
      try {
        const cleanEmail = email.trim();
        if (!cleanEmail) {
          throw new AuthError('INVALID_EMAIL', 'Please enter your email address to reset password.');
        }

        if (isFirebaseConfigured && auth) {
          await sendPasswordResetEmail(auth, cleanEmail);
          const msg = 'Password reset instructions sent. Please check your email inbox.';
          setInfoMessage(msg);
          return { success: true, message: msg };
        } else {
          const msg = 'Password reset link simulated in offline development mode.';
          setInfoMessage(msg);
          return { success: true, message: msg };
        }
      } catch (err: any) {
        if (err instanceof AuthError) {
          setError(err.message);
          setErrorCode(err.code);
          throw err;
        }
        const mapped = mapFirebaseAuthError(err);
        setError(mapped.message);
        setErrorCode(mapped.code);
        throw new AuthError(mapped.code, mapped.message);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      if (isFirebaseConfigured && auth) {
        await firebaseSignOut(auth).catch(() => {});
      } else {
        await authApi.logout().catch(() => {});
      }
    } finally {
      clearSession();
      setIsLoading(false);
    }
  }, [clearSession]);

  const refreshUser = useCallback(async () => {
    if (auth?.currentUser) {
      await auth.currentUser.reload();
      const currentUser = auth.currentUser;
      const freshToken = await currentUser.getIdToken(true);
      setToken(freshToken);
      localStorage.setItem('cepagrade_token', freshToken);
      const appUser: User = {
        id: currentUser.uid,
        name: currentUser.displayName || currentUser.email?.split('@')[0] || 'Operator',
        email: currentUser.email || '',
        role: 'operator',
        emailVerified: currentUser.emailVerified,
        is_active: true,
        created_at: currentUser.metadata.creationTime,
      };
      setUser(appUser);
      localStorage.setItem('cepagrade_user', JSON.stringify(appUser));
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user && user.emailVerified,
        isLoading,
        loading: isLoading,
        isFirebaseConfigured,
        isSupabaseConfigured: isFirebaseConfigured,
        login,
        signIn: login,
        loginWithGoogle,
        loginDemo,
        isDemoUser,
        demoAttempts,
        maxDemoAttempts,
        signup,
        signUp: signup,
        resendVerificationEmail,
        resetPassword,
        refreshUser,
        logout,
        signOut: logout,
        error,
        errorCode,
        clearError,
        infoMessage,
        clearInfoMessage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
