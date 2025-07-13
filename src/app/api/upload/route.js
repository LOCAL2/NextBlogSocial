import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { writeFile } from 'fs/promises';
import { join } from 'path';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.formData();
    const files = data.getAll('file');

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
    }

    // Validate file count (max 5 files)
    if (files.length > 5) {
      return NextResponse.json({ error: 'Too many files. Maximum 5 files allowed.' }, { status: 400 });
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    const uploadedFiles = [];

    // Create uploads directory if it doesn't exist
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    try {
      await require('fs').promises.mkdir(uploadDir, { recursive: true });
    } catch (error) {
      // Directory already exists
    }

    for (const file of files) {
      // Validate file type
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json({ error: `Invalid file type: ${file.type}` }, { status: 400 });
      }

      // Validate file size
      if (file.size > maxSize) {
        return NextResponse.json({ error: `File too large: ${file.name}` }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Generate unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const extension = file.name.split('.').pop();
      const filename = `${timestamp}-${randomString}.${extension}`;

      const filePath = join(uploadDir, filename);

      try {
        await writeFile(filePath, buffer);
        uploadedFiles.push({
          url: `/uploads/${filename}`,
          filename: filename,
          originalName: file.name
        });
      } catch (error) {
        console.error('Error saving file:', error);
        return NextResponse.json({ error: `Failed to save file: ${file.name}` }, { status: 500 });
      }
    }

    // Return single file format for backward compatibility
    if (uploadedFiles.length === 1) {
      return NextResponse.json({
        success: true,
        url: uploadedFiles[0].url,
        filename: uploadedFiles[0].filename
      });
    }

    // Return multiple files format
    return NextResponse.json({
      success: true,
      files: uploadedFiles
    });
  } catch (error) {
    console.error('Error uploading files:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
