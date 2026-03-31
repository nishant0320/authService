import AuditLogRepository from "../repositories/auditLogRepository";
import UserRepository from "../repositories/authRepository";
import { JwtPayload, TokenPair } from "../types";
import { ConflictError } from "../utils/errors/error";
import { sendWelcomeEmail } from "../utils/helpers/email";
import { generateTokenPair, storeRefreshToken } from "../utils/helpers/jwt";

const userRepo = new UserRepository();
const auditLogRepo = new AuditLogRepository();

export default class AuthService {
  async register(data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    gender: string;
  }): Promise<{ user: any; tokens: TokenPair }> {
    const existing = await userRepo.findByEmail(data.email);
    if (existing) {
      throw new ConflictError("A user with this email already exists.");
    }

    const user = await userRepo.create({
      name: data.name,
      email: data.email,
      password: data.password,
      phone: data.phone,
      gender: data.gender,
    });

    const payload: JwtPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };
    const tokens = generateTokenPair(payload);

    await storeRefreshToken(user.id, tokens.refreshToken);
    await userRepo.updateRefreshToken(user.id, tokens.refreshToken);

    sendWelcomeEmail(user.email, user.name).catch(() => {});

    await auditLogRepo.logAction({
      action: "REGISTER",
      entity: "User",
      entityId: user.id,
      userId: user.id,
    });

    const {
      password: _,
      refreshToken: __,
      totpSecret: ___,
      ...safeUser
    } = user;

    return { user: safeUser, tokens };
  }
}
