import { NextRequest, NextResponse } from 'next/server';

// Admin routes already enforce auth at the route level via `ensureApiRole()`.
// Keeping middleware here caused duplicate auth checks and false 401s on valid sessions.
export async function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/admin/:path*']
};

