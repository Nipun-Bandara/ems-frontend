import ForgotPassword from './_components/ForgotPassword';

/**
 * Where the "Forgot password?" link on the sign-in form lands.
 *
 * Nothing to read off the URL here — the address is typed on the page — so this is a plain
 * shell around the client component, kept as a page of its own rather than a mode of
 * `/auth` because the reset mail sends people back to a sibling of it.
 */
export default function ForgotPasswordPage() {
  return <ForgotPassword />;
}
