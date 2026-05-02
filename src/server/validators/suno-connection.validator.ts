import { z } from "zod";

const DEFAULT_ALLOWED_SUNO_API_HOSTS = ["api.sunoapi.org"];

export const createSunoConnectionSchema = z.object({
  label: z.string().trim().min(1).max(120).optional(),
  cookie: z.string().min(1),
  api_url: z
    .string()
    .url()
    .superRefine((value, context) => {
      let url: URL;

      try {
        url = new URL(value);
      } catch {
        context.addIssue({
          code: "custom",
          message: "Suno API URL must be a valid URL.",
        });
        return;
      }

      if (url.protocol !== "https:") {
        context.addIssue({
          code: "custom",
          message: "Suno API URL must use HTTPS.",
        });
      }

      if (url.username || url.password) {
        context.addIssue({
          code: "custom",
          message: "Suno API URL cannot include credentials.",
        });
      }

      if (!getAllowedSunoApiHosts().includes(url.hostname.toLowerCase())) {
        context.addIssue({
          code: "custom",
          message: "Suno API host is not allowed.",
        });
      }
    }),
});

export type CreateSunoConnectionInput = z.input<
  typeof createSunoConnectionSchema
>;

function getAllowedSunoApiHosts() {
  return (process.env.SUNO_ALLOWED_API_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean)
    .concat(DEFAULT_ALLOWED_SUNO_API_HOSTS)
    .filter((host, index, hosts) => hosts.indexOf(host) === index);
}
