import { cn } from "@/lib/utils";

interface AspectRatioProps extends React.ComponentProps<"div"> {
  /**
   * Desired width-to-height ratio, e.g. `16 / 9`, `4 / 3`, `1`.
   * Defaults to `1` (square).
   */
  ratio?: number;
}

/**
 * Constrains its content to a fixed width-to-height ratio using the native
 * CSS `aspect-ratio` property. The immediate child (e.g. an `<img>` or
 * `<video>`) should fill the box with `className="size-full object-cover"`.
 */
function AspectRatio({ ratio = 1, className, style, ...props }: AspectRatioProps) {
  return (
    <div
      data-slot="aspect-ratio"
      style={{ aspectRatio: ratio, ...style }}
      className={cn("relative w-full overflow-hidden", className)}
      {...props}
    />
  );
}

export type { AspectRatioProps };
export { AspectRatio };
