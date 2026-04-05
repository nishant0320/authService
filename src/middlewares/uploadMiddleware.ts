import multer from "multer";
import { ValidationError } from "../utils/errors/error";
import { UPLOAD_LIMITS } from "../utils/common/constants";

const storage = multer.memoryStorage();

function fileFilter(allowedTypes: string[]) {
  return (
    _req: Express.Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback,
  ) => {
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new ValidationError(
          `Invalid file type: ${file.mimetype}. Allowed: ${allowedTypes.join(", ")}`,
        ),
      );
    }
  };
}

export const uploadAvatar = multer({
  storage,
  limits: { fileSize: UPLOAD_LIMITS.IMAGE_MAX_SIZE },
  fileFilter: fileFilter(UPLOAD_LIMITS.ALLOWED_IMAGE_TYPES),
}).single("avatar");
