import { NextResponse } from 'next/server';
import { initSocket } from '../../../../lib/socket';

export async function GET() {
  try {
    // This endpoint is used to initialize Socket.IO server
    // The actual server setup happens in server.js or when the app starts
    return NextResponse.json({ message: 'Socket.IO server ready' });
  } catch (error) {
    console.error('Socket.IO initialization error:', error);
    return NextResponse.json({ error: 'Failed to initialize Socket.IO' }, { status: 500 });
  }
}
