export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-0 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <span className="text-3xl font-bold tracking-tight text-accent">musicislyfe</span>
          <p className="mt-1 text-sm text-neutral-400">Your personal music catalogue</p>
        </div>
        {children}
      </div>
    </div>
  );
}
