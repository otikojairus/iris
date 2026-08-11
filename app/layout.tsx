import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { ToastProvider } from "@/components/toast";
import { AuthProvider, type AuthUser } from "@/lib/auth-context";
import { getSessionUserId } from "@/lib/server/session";
import { getUserById, toPublicUser } from "@/lib/server/users";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Iris — pSEO Project Builder",
  description:
    "Prompt, upload a pSEO plan, and generate a unique, dockerized SEO site. Iris turns your keyword plan into a live project.",
};

async function resolveInitialUser(): Promise<AuthUser | null> {
  const uid = await getSessionUserId();
  if (!uid) return null;
  const user = await getUserById(uid);
  return user ? toPublicUser(user) : null;
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const initialUser = await resolveInitialUser();
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <AuthProvider initialUser={initialUser}>
          <StoreProvider>
            <ToastProvider>{children}</ToastProvider>
          </StoreProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
