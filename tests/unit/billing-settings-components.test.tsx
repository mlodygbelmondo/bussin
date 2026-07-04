import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BillingSettingsForm } from "@/modules/billing/billing-settings-form";
import { BillingSettingsScreen } from "@/modules/billing/billing-settings-screen";
import type { BillingPageData } from "@/modules/billing/billing.types";

const router = vi.hoisted(() => ({
  prefetch: vi.fn(),
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/billing",
  useRouter: () => router,
}));

vi.mock("@/modules/billing/billing.actions", () => ({
  openCustomerPortalAction: vi.fn(),
  startCheckoutAction: vi.fn(),
  updateWorkspaceSettingsAction: vi.fn(),
}));

describe("BillingSettingsScreen", () => {
  it("renders the plan card, usage bar, and billing portal", () => {
    render(<BillingSettingsScreen activeRoute="billing" data={makeData()} />);

    expect(screen.getByTestId("screen-dashboard-billing")).toBeInTheDocument();
    expect(screen.getByText("Pro Plan")).toBeInTheDocument();
    expect(screen.getByTestId("usage-bar")).toHaveStyle({ width: "62%" });
    expect(screen.getByText("Open billing portal")).toBeInTheDocument();
    expect(screen.getByText("Upgrade to Studio")).toBeInTheDocument();
    expect(screen.queryByText(/Visa/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Recent invoices/)).not.toBeInTheDocument();
  });

  it("does not render a lower-tier upgrade for studio plans", () => {
    render(
      <BillingSettingsScreen
        activeRoute="billing"
        data={{
          ...makeData(),
          limits: {
            monthlyGenerationRequests: 2000,
            monthlyUploads: 2000,
            scheduledUploads: 2000,
            youtubeChannels: 15,
          },
          monthlyPriceUsd: 99,
          plan: "studio",
          planDisplayName: "Studio",
        }}
      />,
    );

    expect(screen.queryByText(/Upgrade to/)).not.toBeInTheDocument();
  });
});

describe("BillingSettingsForm", () => {
  it("renders workspace defaults from typed data", () => {
    render(<BillingSettingsForm data={makeData()} />);

    expect(screen.getByTestId("settings-default-channel")).toHaveValue(
      "33333333-3333-4333-8333-333333333333",
    );
    expect(screen.getByTestId("settings-default-privacy")).toHaveValue(
      "private",
    );
    expect(screen.getByTestId("settings-default-image")).toHaveValue(
      "44444444-4444-4444-8444-444444444444",
    );
    expect(screen.getByText("Analytics")).toBeInTheDocument();
    expect(screen.getByText("Standard")).toBeInTheDocument();
  });
});

function makeData(): BillingPageData {
  return {
    cancelAtPeriodEnd: false,
    channels: [
      {
        handle: "@bussin",
        id: "33333333-3333-4333-8333-333333333333",
        isDefault: true,
        title: "Bussin Radio",
      },
    ],
    currentPeriodEnd: "2026-06-12T00:00:00.000Z",
    currentPeriodStart: "2026-05-12T00:00:00.000Z",
    imageAssets: [
      {
        fileName: "night-drive.png",
        id: "44444444-4444-4444-8444-444444444444",
        publicUrl: null,
        storagePath: "workspace/night-drive.png",
      },
    ],
    limits: {
      monthlyGenerationRequests: 500,
      monthlyUploads: 500,
      scheduledUploads: 500,
      youtubeChannels: 5,
    },
    monthlyPriceUsd: 49,
    plan: "pro",
    planDisplayName: "Pro",
    settings: {
      autoNormalizeAudio: true,
      defaultBpm: 120,
      defaultFormat: "MP3 320kbps",
      defaultGenre: "Synthwave",
      defaultImageAssetId: "44444444-4444-4444-8444-444444444444",
      defaultKey: "auto",
      defaultLicense: "Standard License",
      defaultMood: "Night Drive",
      defaultPrivacyStatus: "private",
      defaultStorageLocation: "library",
      defaultYoutubeChannelId: "33333333-3333-4333-8333-333333333333",
      extractStemsOnUpload: false,
      notifyBillingPayments: true,
      notifyGenerationCompletions: true,
      notifyMarketingEmails: false,
      notifyProductUpdates: true,
      youtubeDescriptionTemplate: null,
      youtubeTitleTemplate: null,
      timezone: "America/Los_Angeles",
    },
    status: "active",
    upgradeOptions: [
      {
        displayName: "Studio",
        features: ["15 YouTube channels"],
        monthlyPriceUsd: 99,
        plan: "studio",
      },
    ],
    usage: {
      connectedChannels: 1,
      generatedTracks: 62,
      scheduledUploads: 9,
      uploadedVideos: 14,
    },
    usageMetrics: [
      {
        key: "generatedTracks",
        label: "Generations",
        limit: 100,
        used: 62,
      },
      {
        key: "uploadedVideos",
        label: "Uploads",
        limit: 500,
        used: 14,
      },
      {
        key: "connectedChannels",
        label: "Channels",
        limit: 5,
        used: 1,
      },
      {
        key: "scheduledUploads",
        label: "Scheduled",
        limit: 500,
        used: 9,
      },
    ],
    workspaceId: "11111111-1111-4111-8111-111111111111",
  };
}
