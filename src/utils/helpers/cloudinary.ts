import cloudinary from "../../config/cloudinaryConfig";
import logger from "../../config/loggerConfig";
import { CloudinaryUploadResult } from "../../types";
import { InternalServerError } from "../errors/error";

export async function uploadToCloudinary(
  buffer: Buffer,
  folder: string,
  publicId?: string,
): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `hospital/${folder}`,
        public_id: publicId,
        resource_type: "auto",
        overwrite: true,
      },
      (error, result) => {
        if (error || !result) {
          logger.error("Cloudinary upload failed", { error });
          return reject(
            new InternalServerError("File upload failed. Please try again."),
          );
        }
        resolve({
          public_id: result.public_id,
          secure_url: result.secure_url,
          url: result.url,
          format: result.format,
          bytes: result.bytes,
          width: result.width,
          height: result.height,
        });
      },
    );
    uploadStream.end(buffer);
  });
}

export async function deleteFromCloudinary(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
    logger.info(`Cloudinary: deleted ${publicId}`);
  } catch (error: any) {
    logger.error("Cloudinary deletion failed", {
      publicId,
      error: error.message,
    });
  }
}
