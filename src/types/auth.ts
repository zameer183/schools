export type AppRole = 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT';

export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  role: AppRole;
};

export type SessionPayload = SessionUser & {
  exp: number;
  iat: number;
};
