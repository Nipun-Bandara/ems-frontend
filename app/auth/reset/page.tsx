import ResetPassword from './_components/ResetPassword';

/**
 * Where the link in the password reset email lands.
 *
 * The token is read here, from the server component's `searchParams` promise, and handed down
 * as a plain string — the same arrangement as `/auth/verify`, which keeps the client component
 * free of `useSearchParams` and the Suspense boundary that would otherwise need.
 */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const token = (await searchParams).token;

  // A repeated ?token= is not something we ever produce, so treat it the same as none:
  // ResetPassword shows the invalid-link state rather than guessing which one was meant.
  return <ResetPassword token={typeof token === 'string' ? token : null} />;
}
