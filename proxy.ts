import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const role = req.nextauth.token?.role as string | undefined

    if (pathname.startsWith('/dashboard/employer') && role !== 'employer') {
      return NextResponse.redirect(new URL('/', req.url))
    }

    if (pathname.startsWith('/dashboard/employee') && role !== 'employee') {
      return NextResponse.redirect(new URL('/', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        if (pathname.startsWith('/dashboard')) return !!token
        return true
      },
    },
  }
)

export const config = {
  matcher: ['/dashboard/:path*'],
}
