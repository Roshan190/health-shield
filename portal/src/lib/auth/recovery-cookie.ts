export const RECOVERY_COOKIE = 'hs_pw_recovery';

export const recoveryCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 60 * 60,
};

export const GENERIC_RESET_SENT =
  'If an account exists for this email, we sent a reset link. It expires in about an hour — check spam. This email is used for the HealthShield app and the doctor portal; resetting it changes the password on both.';
