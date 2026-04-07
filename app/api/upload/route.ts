import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { uploadFile, getCloudFrontUrl, generateFileKey } from "@/lib/s3/upload";
import { ALLOWED_IMAGE_TYPES, MAX_FILE_SIZE } from "@/lib/constants";

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

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: PNG, JPG, GIF, WebP" },
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
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
