"use client";

import { ImagePlus, Music2, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { uploadTrackCoverAction } from "@/modules/feed/feed.actions";
import { publishTrackOptimism } from "@/modules/feed/feed-optimism";
import type { FeedPublishDefaults, FeedTrack } from "@/modules/feed/feed.types";
import { publishTrackNowAction } from "@/modules/feed/publish.actions";
import { useFeedAction } from "@/modules/feed/use-feed-action";

/** Expands the workspace template; {title} is the only placeholder. */
export function applyPublishTemplate(
  template: string | null,
  trackTitle: string,
  fallback: string,
): string {
  if (!template?.trim()) {
    return fallback;
  }

  return template.replaceAll("{title}", trackTitle);
}

/**
 * Everything YouTube needs, set before the video leaves the studio: title,
 * description, privacy, the made-for-kids declaration, and the cover that
 * becomes the video background. Prefilled from the workspace templates.
 */
export function PublishDialog({
  defaults,
  onOpenChange,
  open,
  track,
}: {
  defaults: FeedPublishDefaults;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  track: FeedTrack;
}) {
  const { pending, run } = useFeedAction();
  const [title, setTitle] = useState(() =>
    applyPublishTemplate(defaults.titleTemplate, track.title, track.title),
  );
  const [description, setDescription] = useState(() =>
    applyPublishTemplate(
      defaults.descriptionTemplate,
      track.title,
      track.description ?? "",
    ),
  );
  const [privacy, setPrivacy] = useState<string>(defaults.privacyStatus);
  const [madeForKids, setMadeForKids] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function uploadCover(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file.");

      return;
    }

    run(uploadTrackCoverAction, { cover: file, trackId: track.id });
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-lg" data-testid="publish-dialog">
        <DialogHeader>
          <DialogTitle>Publish to YouTube</DialogTitle>
          <DialogDescription>
            Set everything here — no need to touch YouTube Studio after.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-4">
          <div className="shrink-0 space-y-2">
            {track.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- signed URLs are short-lived; next/image optimization would break them
              <img
                alt={`Cover for ${track.title}`}
                className="size-24 rounded-md border border-border object-cover"
                src={track.coverUrl}
              />
            ) : (
              <span className="grid size-24 place-items-center rounded-md border border-border bg-accent text-muted-foreground">
                <Music2 className="size-6" />
              </span>
            )}
            <Button
              className="w-24"
              data-testid="upload-cover"
              disabled={pending}
              onClick={() => fileInputRef.current?.click()}
              size="sm"
              type="button"
              variant="outline"
            >
              <ImagePlus className="size-4" />
              Cover
            </Button>
            <input
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];

                if (file) {
                  uploadCover(file);
                }

                event.target.value = "";
              }}
              ref={fileInputRef}
              type="file"
            />
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            <label className="block space-y-1.5 text-sm font-medium">
              Title
              <Input
                data-testid="publish-title"
                maxLength={100}
                onChange={(event) => setTitle(event.target.value)}
                value={title}
              />
            </label>
            <label className="block space-y-1.5 text-sm font-medium">
              Description
              <Textarea
                className="min-h-20"
                data-testid="publish-description"
                maxLength={5000}
                onChange={(event) => setDescription(event.target.value)}
                value={description}
              />
            </label>
            <div className="flex items-end gap-3">
              <label className="block flex-1 space-y-1.5 text-sm font-medium">
                Privacy
                <select
                  className="h-9 w-full rounded-md border border-border bg-input px-2 text-sm text-foreground outline-none focus-visible:border-ring"
                  data-testid="publish-privacy"
                  onChange={(event) => setPrivacy(event.target.value)}
                  value={privacy}
                >
                  <option value="public">Public</option>
                  <option value="unlisted">Unlisted</option>
                  <option value="private">Private</option>
                </select>
              </label>
              <label className="flex h-9 items-center gap-2 text-sm">
                <input
                  checked={madeForKids}
                  className="size-4 accent-primary"
                  data-testid="publish-made-for-kids"
                  onChange={(event) => setMadeForKids(event.target.checked)}
                  type="checkbox"
                />
                Made for kids
              </label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            data-testid="publish-confirm"
            disabled={pending || title.trim().length === 0}
            onClick={() => {
              run(
                publishTrackNowAction,
                {
                  description,
                  made_for_kids: String(madeForKids),
                  privacy_status: privacy,
                  title,
                  trackId: track.id,
                },
                { optimistic: publishTrackOptimism(track.id) },
              );
              // Optimistic-first: the card flips to rendering immediately.
              onOpenChange(false);
            }}
          >
            <UploadCloud className="size-4" />
            Publish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
