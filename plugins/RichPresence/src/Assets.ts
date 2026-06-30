import { findByProps } from "@vendetta/metro";
import { logger } from "@vendetta";

const assetManager = findByProps("getAssetIds", "fetchAssetIds");

export async function resolveAssets(
    applicationId: string,
    largeImage?: string,
    smallImage?: string,
    debug = false
): Promise<{ large_image?: string; small_image?: string }> {
    const images = [largeImage, smallImage].filter(Boolean) as string[];
    if (!images.length) return {};

    try {
        const args: [string, string[]] = [applicationId, images];
        let ids: string[] = assetManager?.getAssetIds?.(...args) ?? [];
        if (!ids.length && assetManager?.fetchAssetIds) {
            ids = await assetManager.fetchAssetIds(...args);
        }
        if (debug) logger.log("[RichPresence:Assets]", { input: images, resolved: ids });

        // Discord returns IDs in the same order as the input array
        const result: { large_image?: string; small_image?: string } = {};
        if (largeImage) result.large_image = ids[0] ?? largeImage;
        if (smallImage) result.small_image = ids[largeImage ? 1 : 0] ?? smallImage;
        return result;
    } catch (e) {
        logger.error("[RichPresence:Assets] Resolution failed, using raw values:", e);
        return {
            ...(largeImage ? { large_image: largeImage } : {}),
            ...(smallImage ? { small_image: smallImage } : {}),
        };
    }
}
