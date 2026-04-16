import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const protectedRoutes: Record<string, string[]> = {
  '/admin': ['ADMIN'],
  '/teacher': ['TEACHER', 'ADMIN'],
  '/student': ['STUDENT', 'ADMIN'],
  '/parent': ['PARENT', 'ADMIN'],
  '/api/admin': ['ADMIN']
};

async function getRoleFromToken(token?: string) {
  if (!token || !process.env.JWT_SECRET) return null;

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET));
    return payload.role as string;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/login') {
    return NextResponse.next();
  }

  const matchedPrefix = Object.keys(protectedRoutes).find((prefix) => pathname.startsWith(prefix));
  if (!matchedPrefix) return NextResponse.next();

  const allowedRoles = protectedRoutes[matchedPrefix];
  const role = await getRoleFromToken(request.cookies.get('hms_session')?.value);

  if (!role) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (!allowedRoles.includes(role)) {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/teacher/:path*', '/student/:path*', '/parent/:path*', '/api/admin/:path*']
};
