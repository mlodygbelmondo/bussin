import type { Tables, TablesInsert } from "@/lib/database.types";
import {
  createImageAssetSchema,
  type CreateImageAssetInput,
} from "@/server/validators/image-asset.validator";
import { ServiceError } from "@/server/services/service-error";

export type ImageAsset = Tables<"image_assets">;

export type ImageAssetRepository = {
  createImageAsset(input: TablesInsert<"image_assets">): Promise<ImageAsset>;
  listImageAssets(workspaceId: string): Promise<ImageAsset[]>;
};

export function createImageAssetService(repository: ImageAssetRepository) {
  return {
    create(input: CreateImageAssetInput) {
      const parsed = createImageAssetSchema.parse(input);

      if (!parsed.storage_path.startsWith(`${parsed.workspace_id}/`)) {
        throw new ServiceError(
          "VALIDATION_ERROR",
          "Image asset storage_path must start with workspace_id.",
        );
      }

      return repository.createImageAsset(parsed);
    },
    list(workspaceId: string) {
      return repository.listImageAssets(workspaceId);
    },
  };
}
