import { MagicLinkForm } from "@/components/auth/magic-link-form";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-6">Resume Tailor</h1>
        <p className="text-center text-gray-600 mb-8">
          Sign in with your email — no password needed.
        </p>
        <div className="flex justify-center">
          <MagicLinkForm />
        </div>
      </div>
    </div>
  );
}
