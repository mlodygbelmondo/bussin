import { env } from "@/lib/env";

export const APP_NAME = "Bussin";
export const APP_MODE = env.NEXT_PUBLIC_APP_MODE;
export const isMockMode =
  APP_MODE === "mock" && process.env.NODE_ENV !== "production";

export const mockUser = {
  email: "producer@bussin.test",
  id: "00000000-0000-4000-8000-000000000001",
  name: "Alex M.",
};

export const mockWorkspaceId = "00000000-0000-4000-8000-000000000010";
