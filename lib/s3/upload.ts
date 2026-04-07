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

export function generateFileKey(
  userId: string,
  filename: string,
  folder: string = "uploads"
): string {
  const timestamp = Date.now();
  const ext = filename.split(".").pop()?.toLowerCase() || "bin";
  const uniqueId = crypto.randomUUID().split("-")[0];
  return `${folder}/${userId}/${timestamp}-${uniqueId}.${ext}`;
}
