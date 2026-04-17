export type UserRole = 'customer' | 'admin';

export interface TokenPayload {
  sub: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface RequestUser {
  userId: string;
  role: UserRole;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  role?: UserRole;
}
