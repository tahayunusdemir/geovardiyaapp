import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { connectDB } from './db'
import User from './models/User'

const THIRTY_DAYS = 30 * 24 * 60 * 60

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt', maxAge: THIRTY_DAYS },
  jwt: { maxAge: THIRTY_DAYS },
  pages: { signIn: '/' },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'E-posta', type: 'email' },
        password: { label: 'Şifre', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        await connectDB()
        const user = await User.findOne({ email: credentials.email })
        if (!user) return null

        const valid = await user.comparePassword(credentials.password)
        if (!valid) return null

        return {
          id: user._id.toString(),
          email: user.email,
          name: `${user.name} ${user.surname}`,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as unknown as { role: string }).role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id: string; role: string }).id = token.id as string;
        (session.user as { id: string; role: string }).role = token.role as string
      }
      return session
    },
  },
}
