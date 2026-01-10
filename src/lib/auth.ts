import { NextAuthOptions } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "./prisma"
import bcrypt from "bcryptjs"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    signOut: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            console.log("Missing credentials")
            return null
          }

          console.log("Authorize called for:", credentials.email)

          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
            include: { organization: true },
          })

          if (!user) {
            console.log("User not found in DB:", credentials.email)
            return null
          }

          if (!user.hashedPassword) {
            console.log("User has no password set:", user.email)
            return null
          }

          console.log("User found, comparing password...")

          const isCorrectPassword = await bcrypt.compare(
            credentials.password,
            user.hashedPassword
          )

          console.log("Password match result:", isCorrectPassword)

          if (!isCorrectPassword) {
            console.log("Password invalid for user:", user.email)
            return null
          }

          if (!user.organization) {
            console.log("User has no organization:", user.email)
            return null
          }

          console.log("Login successful for user:", user.email)

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            organizationId: user.organizationId,
            organizationSlug: user.organization.slug,
            customerType: user.customerType,
          }
        } catch (error: any) {
          console.error("Authorization error:", error)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.organizationId = user.organizationId
        token.organizationSlug = user.organizationSlug
        token.customerType = user.customerType
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.organizationId = token.organizationId as string
        session.user.organizationSlug = token.organizationSlug as string
        session.user.customerType = token.customerType
      }
      return session
    },
  },
}
