import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "./prisma"
import bcrypt from "bcryptjs"
import { UserRole } from "@prisma/client"
import { getClientIp, rateLimiter } from "./rate-limit"
import { isSessionRevoked, normalizeEmail } from "./security-tokens"

/** Code d'erreur renvoyé à `signIn()` quand la limite de tentatives est atteinte. */
export const LOGIN_RATE_LIMITED = "RATE_LIMITED"

// Hash factice comparé quand l'e-mail est inconnu : le temps de réponse ne révèle
// pas l'existence du compte (même coût bcrypt que les vrais hashs, 12 tours).
const DUMMY_PASSWORD_HASH = "$2b$12$u7eywwC3NvDrAq8UfXE.GubOE1VOzKu.TvdiZTk0gnqsDjRTn3OWq"

// Sans secret, les JWT de session ne seraient pas signés de façon sûre.
// (Ignoré pendant `next build`, où les variables d'exécution peuvent manquer.)
if (
  process.env.NODE_ENV === "production" &&
  process.env.NEXT_PHASE !== "phase-production-build" &&
  !process.env.NEXTAUTH_SECRET
) {
  throw new Error("NEXTAUTH_SECRET doit être défini en production")
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials")
        }

        const email = normalizeEmail(credentials.email)
        const ip = getClientIp(req?.headers)
        // Seuls les échecs comptent ; une connexion réussie remet le compteur e-mail à zéro
        const emailKey = `login:${email}:${ip}`
        const ipKey = `login-ip:${ip}`
        const byEmail = rateLimiter("loginEmail")
        const byIp = rateLimiter("loginIp")
        if (!byEmail.check(emailKey).allowed || !byIp.check(ipKey).allowed) {
          throw new Error(LOGIN_RATE_LIMITED)
        }

        const user = await prisma.user.findUnique({
          where: { email }
        })

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user?.password || DUMMY_PASSWORD_HASH
        )

        // Même message pour un e-mail inconnu et un mauvais mot de passe
        if (!user || !user.password || !isPasswordValid) {
          byEmail.hit(emailKey)
          byIp.hit(ipKey)
          throw new Error("Invalid credentials")
        }

        byEmail.reset(emailKey)

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatar: user.avatar
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.avatar = user.avatar
        token.authTime = Date.now()
        return token
      }

      // Jetons émis avant ce contrôle : à défaut d'heure de connexion, on prend
      // la dernière émission (iat), ce qui les révoque s'ils précèdent un changement.
      if (typeof token.authTime !== "number") {
        token.authTime = typeof token.iat === "number" ? token.iat * 1000 : 0
      }

      // Un changement / une réinitialisation du mot de passe révoque les sessions
      // ouvertes avant (une lecture par clé primaire à chaque lecture de session).
      if (token.id) {
        const current = await prisma.user.findUnique({
          where: { id: token.id },
          select: { passwordChangedAt: true },
        })
        if (!current || isSessionRevoked(token.authTime as number, current.passwordChangedAt)) {
          // NextAuth efface alors le cookie et getServerSession renvoie null
          throw new Error("Session révoquée")
        }
      }

      // useSession().update({ name }) après modification du profil : on rafraîchit le JWT
      if (trigger === "update" && session && typeof session.name === "string") {
        token.name = session.name
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as UserRole
        session.user.avatar = token.avatar as string | null
      }
      return session
    }
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/login",
  },
  session: {
    strategy: "jwt",
    // 7 jours (30 par défaut), prolongés au plus une fois par jour d'activité
    maxAge: 7 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
}
