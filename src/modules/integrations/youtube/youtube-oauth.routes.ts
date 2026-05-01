export const YOUTUBE_OAUTH_STATE_COOKIE = "bussin_youtube_oauth_state";

export const youtubeOAuthStateCookieOptions = {
  httpOnly: true,
  maxAge: 10 * 60,
  path: "/",
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
} as const;

export function getSafeOAuthReturnPath(value: string | null | undefined) {
  if (!value?.startsWith("/") || value.startsWith("//")) {
    return "/dashboard/settings";
  }

  return value;
}
