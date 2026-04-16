import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

export async function saveUploadedFile(file: File) {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  await mkdir(UPLOAD_DIR, { recursive: true });

  const ext = path.extname(file.name);
  const fileName = `${Date.now()}-${crypto.randomUUID()}${ext}`;
  const absolutePath = path.join(UPLOAD_DIR, fileName);

  await writeFile(absolutePath, buffer);

  return {
    fileName,
    storagePath: `/uploads/${fileName}`,
    mimeType: file.type || 'application/octet-stream',
    sizeInBytes: buffer.length,
    originalName: file.name
  };
}
