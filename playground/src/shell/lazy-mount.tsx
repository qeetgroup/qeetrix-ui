import { type ReactNode, useEffect, useRef, useState } from "react";

/**
 * Mounts `children` once the placeholder comes within `margin` of the viewport, and keeps them
 * mounted. The placeholder reserves `minHeight`, so cards do not jump as previews arrive.
 */
export function LazyMount({
  children,
  minHeight,
  placeholder,
  margin = "600px",
}: {
  children: ReactNode;
  minHeight: number;
  placeholder?: ReactNode;
  margin?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element || visible) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: margin },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [margin, visible]);
  return (
    <div ref={ref} style={visible ? undefined : { minHeight }}>
      {visible ? children : placeholder}
    </div>
  );
}
