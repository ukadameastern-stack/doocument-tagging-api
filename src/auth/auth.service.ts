import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { getConfig } from '../config';
import { getRedis } from '../redis';
import { ConflictError, UnauthorizedError } from '../utils/errors';
import { TokenPayload, TokenResponse, UserRole, RegisterDto } from './auth.types';
import { UserModel } from './user.model';

const BCRYPT_ROUNDS = 12;
const LOCKOUT_MAX = 5;
const LOCKOUT_TTL = 900; // 15 minutes

export async function register(dto: RegisterDto): Promise<{ userId: string; email: string; role: UserRole }> {
  const existing = await UserModel.findOne({ email: dto.email.toLowerCase() });
  if (existing) throw new ConflictError('Email already registered');

  const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
  const user = await UserModel.create({
    email: dto.email.toLowerCase(),
    passwordHash,
    role: dto.role ?? 'customer',
  });

  return { userId: user.id as string, email: user.email, role: user.role };
}

export async function login(email: string, password: string): Promise<TokenResponse> {
  const config = await getConfig();
  const redis = getRedis();

  const lockKey = `loginAttempts:${email.toLowerCase()}`;
  const attempts = await redis.get(lockKey);
  if (attempts && parseInt(attempts, 10) >= LOCKOUT_MAX) {
    throw new UnauthorizedError('Invalid credentials');
  }

  const user = await UserModel.findOne({ email: email.toLowerCase() });
  const validPassword = user ? await bcrypt.compare(password, user.passwordHash) : false;

  if (!user || !validPassword) {
    await redis.multi().incr(lockKey).expire(lockKey, LOCKOUT_TTL).exec();
    throw new UnauthorizedError('Invalid credentials');
  }

  await redis.del(lockKey);
  return issueTokens(user.id as string, user.role, config);
}

export async function refreshTokens(refreshToken: string): Promise<TokenResponse> {
  const config = await getConfig();
  const redis = getRedis();

  const data = await redis.get(`refreshToken:${refreshToken}`);
  if (!data) throw new UnauthorizedError('Invalid or expired refresh token');

  const { userId, role } = JSON.parse(data) as { userId: string; role: UserRole };
  await redis.del(`refreshToken:${refreshToken}`);
  return issueTokens(userId, role, config);
}

export async function logout(refreshToken: string): Promise<void> {
  await getRedis().del(`refreshToken:${refreshToken}`);
}

export async function verifyAccessToken(token: string): Promise<TokenPayload> {
  const config = await getConfig();
  try {
    return jwt.verify(token, config.jwtSecret, {
      audience: config.jwtAudience,
      issuer: config.jwtIssuer,
    }) as TokenPayload;
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }
}

async function issueTokens(
  userId: string,
  role: UserRole,
  config: Awaited<ReturnType<typeof getConfig>>,
): Promise<TokenResponse> {
  const redis = getRedis();
  const accessToken = jwt.sign({ sub: userId, role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
    audience: config.jwtAudience,
    issuer: config.jwtIssuer,
  } as jwt.SignOptions);

  const refreshToken = uuidv4();
  await redis.set(
    `refreshToken:${refreshToken}`,
    JSON.stringify({ userId, role }),
    'EX',
    7 * 24 * 60 * 60,
  );

  return { accessToken, refreshToken, expiresIn: config.jwtExpiresIn };
}
