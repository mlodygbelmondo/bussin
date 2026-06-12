const SUNO_CONNECTION_ERROR_MESSAGES: Record<string, string> = {
  api_unreachable:
    "Could not reach the Suno API. Check the API URL and try again.",
  expired_cookie:
    "The Suno API key looks expired. Generate a new key at sunoapi.org and try again.",
  invalid_response: "The Suno API returned an unexpected response. Try again.",
  quota_exceeded:
    "Your Suno account is out of credits. Top up at sunoapi.org and try again.",
  timeout: "The Suno API timed out. Try again in a moment.",
  unauthorized:
    "Suno rejected the API key. Check the key at sunoapi.org and try again.",
  unsafe_url: "This Suno API URL is not allowed.",
};

export function describeSunoConnectionError(
  code: string | null | undefined,
): string {
  return (
    SUNO_CONNECTION_ERROR_MESSAGES[code ?? ""] ??
    "Suno connection test failed. Check the details and try again."
  );
}
