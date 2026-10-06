/** The slice of culori 4 the theme lab uses (culori ships no type declarations). */
declare module "culori" {
  export interface Color {
    mode: string;
    alpha?: number;
    [channel: string]: number | string | undefined;
  }
  export function parse(color: string): Color | undefined;
  export function wcagContrast(a: Color | string, b: Color | string): number;
  export function wcagLuminance(color: Color | string): number;
  export function formatHex(color: Color | string | undefined): string | undefined;
  export function formatHex8(color: Color | string | undefined): string | undefined;
  export function formatRgb(color: Color | string | undefined): string | undefined;
  export function converter(mode: string): (color: Color | string) => Color | undefined;
  export function clampChroma(color: Color | string, mode?: string): Color;
}
