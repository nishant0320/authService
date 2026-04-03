import { User } from "../generated/prisma/client";
import BaseRepository from "./baseRepository";

export default class UserRepository extends BaseRepository<User> {
  constructor() {
    super("user");
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.findOne({ email });
  }

  async updateRefreshToken(userId: string, refreshToken: string | null): Promise<User> {
    return this.update(userId, { refreshToken });
  }

  async updateLastLogin(userId: string): Promise<User> {
    return this.update(userId, { lastLogin: new Date() });
  }

  async updateTotpSecret(
    userId: string,
    totpSecret: string | null,
    isTotpEnabled: boolean,
  ): Promise<User> {
    return this.update(userId, { totpSecret, isTotpEnabled });
  }

  async updateAvatar(userId: string, avatarUrl: string): Promise<User> {
    return this.update(userId, { avatarUrl });
  }

  async deactivateUser(userId: string): Promise<User> {
    return this.update(userId, { isActive: false });
  }

  async activateUser(userId: string): Promise<User> {
    return this.update(userId, { isActive: true });
  }
}
