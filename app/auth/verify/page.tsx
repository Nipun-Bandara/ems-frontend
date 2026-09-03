import VerifyEmail from './_components/VerifyEmail';

/**
 * Where the link in the verification email lands.
 *
 * The token is read here, from the server component's `searchParams` promise, and handed
 * down as a plain string. That keeps the client component free of `useSearchParams`, which
 * would otherwise need its own Suspense boundary to survive a production build.
 */
export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const token = (await searchParams).token;

  // A repeated ?token= is not something we ever produce, so treat it the same as none:
  // VerifyEmail shows the invalid-link state rather than guessing which one was meant.
  return <VerifyEmail token={typeof token === 'string' ? token : null} />;
}
