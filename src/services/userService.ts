import AuditLogRepository from "../repositories/auditLogRepository";
import UserRepository from "../repositories/userRepository";
import { PaginationParams } from "../types";
import { uploadToCloudinary } from "../utils/helpers/cloudinary";

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
  async uploadAvatar(userId: string, fileBuffer: Buffer) {
    const result = await uploadToCloudinary(
      fileBuffer,
      "avatars",
      `user-${userId}`,
    );
    await userRepo.updateAvatar(userId, result.secure_url);
    return { avatarUrl: result.secure_url };
  }

  async listUsers(
    params: PaginationParams,
    filters: { role?: string; isActive?: boolean } = {},
  ) {
    const where: any = {};
    if (filters.role) where.role = filters.role;
    if (filters.isActive !== undefined) where.isActive = filters.isActive;

    return userRepo.findWithPagination(params, where, {
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        avatarUrl: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
      },
    });
  }
}
