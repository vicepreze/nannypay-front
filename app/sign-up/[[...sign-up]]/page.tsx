import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[var(--paper)]">
      <SignUp fallbackRedirectUrl="/dashboard" />
      <p className="text-xs text-[var(--dust)] text-center max-w-sm">
        En créant un compte, vous acceptez les{' '}
        <a href="/cgu" target="_blank" rel="noopener noreferrer" className="underline hover:text-[var(--ink)]">CGU</a>{' '}
        et la{' '}
        <a href="/politique-confidentialite" target="_blank" rel="noopener noreferrer" className="underline hover:text-[var(--ink)]">
          politique de confidentialité
        </a>
      </p>
    </div>
  );
}
