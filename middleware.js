import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // Admin routes protection
    if (pathname.startsWith('/admin')) {
      if (!token || token.role !== 'admin') {
        return NextResponse.redirect(new URL('/unauthorized', req.url));
      }
    }

    // Protected routes that require authentication
    const protectedRoutes = ['/profile', '/create-post', '/friends'];
    if (protectedRoutes.some(route => pathname.startsWith(route))) {
      if (!token) {
        return NextResponse.redirect(new URL('/auth/signin', req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // Allow access to public routes
        const publicRoutes = ['/', '/auth', '/api/auth', '/api/posts/public', '/search'];
        if (publicRoutes.some(route => pathname.startsWith(route))) {
          return true;
        }

        // For other routes, check if user is authenticated
        return !!token;
      }
    }
  }
);

export const config = {
  matcher: [
    '/admin/:path*',
    '/profile/:path*',
    '/create-post/:path*',
    '/friends/:path*',
    '/api/posts/:path*',
    '/api/comments/:path*',
    '/api/friends/:path*'
  ]
};
