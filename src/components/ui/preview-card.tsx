"use client";

import type { ComponentProps } from "react";

import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";

// PreviewCard — link-metadata preview on hover.
//
// Builds on top of HoverCard (Base UI PreviewCard primitive). Use the structured
// props (title / description / imageUrl / url) for the built-in template, or pass
// children for fully custom content. Alternatively compose the presentational
// sub-parts (PreviewCardTitle, PreviewCardDescription, PreviewCardImage,
// PreviewCardUrl) inside your own layout.

type PreviewCardProps = ComponentProps<typeof HoverCard>;

function PreviewCard(props: PreviewCardProps) {
  return <HoverCard {...props} />;
}

// Thin wrapper around HoverCardTrigger that annotates the data-slot.
function PreviewCardTrigger({ ...props }: ComponentProps<typeof HoverCardTrigger>) {
  return <HoverCardTrigger data-slot="preview-card-trigger" {...props} />;
}

type PreviewCardContentProps = ComponentProps<typeof HoverCardContent> & {
  /** Page title shown in the preview template. */
  title?: string;
  /** Short page description shown beneath the title. */
  description?: string;
  /** Hero image URL rendered at the top of the preview. */
  imageUrl?: string;
  /** The URL being previewed, shown as small muted text. */
  url?: string;
};

function PreviewCardContent({
  title,
  description,
  imageUrl,
  url,
  className,
  children,
  ...hoverCardProps
}: PreviewCardContentProps) {
  const hasStructuredContent =
    title !== undefined || description !== undefined || imageUrl !== undefined || url !== undefined;

  return (
    <HoverCardContent
      data-slot="preview-card-content"
      className={cn(hasStructuredContent ? "w-80 overflow-hidden p-0" : undefined, className)}
      {...hoverCardProps}
    >
      {hasStructuredContent ? (
        <>
          {imageUrl && <img src={imageUrl} alt="" className="h-32 w-full object-cover" />}
          <div className="flex flex-col gap-1 p-3">
            {title && <p className="text-sm font-semibold leading-snug">{title}</p>}
            {description && (
              <p className="line-clamp-3 text-xs text-muted-foreground">{description}</p>
            )}
            {url && <p className="mt-1 truncate text-xs text-muted-foreground">{url}</p>}
          </div>
        </>
      ) : (
        children
      )}
    </HoverCardContent>
  );
}

// ---------------------------------------------------------------------------
// Presentational sub-parts — use these when composing custom PreviewCard
// content with the slot-based pattern instead of the template props above.
// ---------------------------------------------------------------------------

function PreviewCardTitle({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      data-slot="preview-card-title"
      className={cn("text-sm font-semibold", className)}
      {...props}
    />
  );
}

function PreviewCardDescription({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      data-slot="preview-card-description"
      className={cn("line-clamp-3 text-xs text-muted-foreground", className)}
      {...props}
    />
  );
}

function PreviewCardImage({ className, alt = "", ...props }: ComponentProps<"img">) {
  return (
    <img
      data-slot="preview-card-image"
      className={cn("h-32 w-full object-cover", className)}
      alt={alt}
      {...props}
    />
  );
}

function PreviewCardUrl({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      data-slot="preview-card-url"
      className={cn("truncate text-xs text-muted-foreground", className)}
      {...props}
    />
  );
}

export type { PreviewCardProps };
export {
  PreviewCard,
  PreviewCardContent,
  PreviewCardDescription,
  PreviewCardImage,
  PreviewCardTitle,
  PreviewCardTrigger,
  PreviewCardUrl,
};
