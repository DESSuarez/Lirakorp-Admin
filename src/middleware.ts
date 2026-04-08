import { withAuth } from 'next-auth/middleware'

export default withAuth({
  pages: { signIn: '/login' },
})

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/properties/:path*',
    '/contracts/:path*',
    '/alerts/:path*',
    '/reports/:path*',
    '/availability/:path*',
    '/import/:path*',
    '/users/:path*',
    '/templates/:path*',
    '/settings/:path*',
    '/api/properties/:path*',
    '/api/contracts/:path*',
    '/api/alerts/:path*',
    '/api/import/:path*',
    '/api/users/:path*',
    '/api/templates/:path*',
    '/api/availability/:path*',
    '/api/zones/:path*',
    '/api/export/:path*',
  ],
}
