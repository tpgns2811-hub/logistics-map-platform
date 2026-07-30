import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/adminAuth';
import { dbEnabled } from '@/lib/db';

export async function GET(req: NextRequest) {
  return NextResponse.json({ loggedIn: isAdminRequest(req), dbEnabled });
}
