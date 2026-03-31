"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        router.replace("/dashboard");
      } else if (event === "PASSWORD_RECOVERY") {
        router.replace("/dashboard");
      }
    });

    // Handle the code exchange using the browser client which has
    // access to the PKCE code verifier in localStorage
    const code = new URLSearchParams(window.location.search).get("code");
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          console.error("[auth/callback] exchange error:", error.message);
          router.replace(`/auth/login?error=${encodeURIComponent(error.message)}`);
        }
        // On success, onAuthStateChange fires SIGNED_IN and redirects
      });
    } else {
      router.replace("/auth/login?error=no_code");
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="font-sans text-gray-500 text-sm">Signing you in...</p>
    </div>
  );
}
