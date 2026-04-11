import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: { signIn: '/' },
});

export const config = {
  matcher: ['/nouvelle-garde/:path*', '/dashboard/:path*', '/gardes/:path*'],
};
