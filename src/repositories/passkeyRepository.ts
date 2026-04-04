import { PasskeyCredential } from "../generated/prisma/client";
import BaseRepository from "./baseRepository";

export default class PasskeyRepository extends BaseRepository<PasskeyCredential> {
  constructor() {
    super("passkeyCredential");
  }

  async findByUserId(userId: string): Promise<PasskeyCredential[]> {
    return this.findAll({ where: { userId } });
  }

  async findByCredentialId(credentialId: string): Promise<PasskeyCredential | null> {
    return this.findOne({ credentialId });
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.model.deleteMany({ where: { userId } });
  }
}
