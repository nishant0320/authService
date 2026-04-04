import bcrypt from "bcrypt";
import { BCRYPT_SALT_ROUND } from "../../config/envConfig";

export const hash = async (payload: any): Promise<string> => {
  let salt = await bcrypt.genSalt(BCRYPT_SALT_ROUND);
  let hash = await bcrypt.hash(payload, salt);
  return hash;
};
