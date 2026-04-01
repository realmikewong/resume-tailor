export function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-white py-6 px-6">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="font-sans text-xs text-gray-400">
          © {new Date().getFullYear()} Taylor Resumé. All rights reserved.
        </p>
        <nav className="flex items-center gap-5">
          <a
            href="/privacy"
            className="font-sans text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Privacy Policy
          </a>
          <a
            href="/terms"
            className="font-sans text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Terms of Use
          </a>
        </nav>
      </div>
    </footer>
  );
}
