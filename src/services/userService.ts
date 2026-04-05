import AuditLogRepository from "../repositories/auditLogRepository";
import UserRepository from "../repositories/userRepository";

const userRepo = new UserRepository();
const auditLogRepo = new AuditLogRepository();

export default class UserService {
  async getProfile(userId: string) {
    const user = await userRepo.findById(userId, {
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        avatarUrl: true,
        isActive: true,
        isTotpEnabled: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return user;
  }

  async updateProfile(userId: string, data: { name?: string; phone?: string }) {
    const user = await userRepo.update(userId, data);
    const {
      password: _,
      refreshToken: __,
      totpSecret: ___,
      ...safeUser
    } = user;
    return safeUser;
  }
}
