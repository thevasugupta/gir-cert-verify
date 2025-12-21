import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // Protect /admin/upload route
    if (request.nextUrl.pathname.startsWith('/admin/upload')) {
        const adminSession = request.cookies.get('admin_session');

        if (!adminSession) {
            return NextResponse.redirect(new URL('/admin/login', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: '/admin/:path*',
};
