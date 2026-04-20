import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { s3Client, S3_BUCKET, CLOUDFRONT_DOMAIN } from "./client";

export async function uploadFile(
  body: Buffer | ReadableStream,
  key: string,
  contentType: string
): Promise<string> {
  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    },
    queueSize: 4,
    partSize: 5 * 1024 * 1024, // 5MB minimum part size
    leavePartsOnError: false,
  });

  await upload.done();
  return key;
}

export async function deleteFile(key: string): Promise<void> {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
    })
  );
}

export function getCloudFrontUrl(key: string): string {
  return `https://${CLOUDFRONT_DOMAIN}/${key}`;
}

// Whitelist of extensions we accept — anything else is rejected at the
// route level. Keeps S3 keys predictable and blocks `.exe`, `.svg` (XSS),
// etc. Keep lowercase; route normalizes before calling.
const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "mp4", "webm"]);

export function isAllowedExtension(ext: string): boolean {
  return ALLOWED_EXTENSIONS.has(ext.toLowerCase());
}

export function generateFileKey(
  userId: string,
  filename: string,
  folder: string = "uploads"
): string {
  const rawExt = (filename.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const ext = ALLOWED_EXTENSIONS.has(rawExt) ? rawExt : "bin";
  // Filename is NEVER interpolated into the key — we only take the
  // whitelisted extension. Prevents path traversal and keeps keys tidy.
  const uuid = crypto.randomUUID();
  return `${folder}/${userId}/${uuid}.${ext}`;
}
