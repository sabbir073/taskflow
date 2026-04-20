import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { uploadFile, getCloudFrontUrl, generateFileKey, isAllowedExtension } from "@/lib/s3/upload";
import { ALLOWED_IMAGE_TYPES, MAX_FILE_SIZE } from "@/lib/constants";

const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm"];
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: PNG, JPG, GIF, WebP, MP4, WebM" },
        { status: 400 }
      );
    }

    // Extension must also be on the whitelist — defends against a crafted
    // mime-type claim that doesn't match the actual extension.
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (!isAllowedExtension(ext)) {
      return NextResponse.json(
        { error: "Invalid file extension" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const key = generateFileKey(session.user.id, file.name);

    await uploadFile(buffer, key, file.type);
    const url = getCloudFrontUrl(key);

    return NextResponse.json({ success: true, url, key });
  } catch (error) {
    // Log the full error server-side so S3/CloudFront misconfig, timeouts,
    // and permission denials are visible in the deploy logs. User-facing
    // message stays generic — we don't leak internals.
    const err = error as Error & { Code?: string; name?: string };
    console.error("[S3 upload] failed", {
      message: err?.message,
      name: err?.name,
      code: err?.Code,
    });
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
