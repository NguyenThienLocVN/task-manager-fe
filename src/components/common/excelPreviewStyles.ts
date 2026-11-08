import type { Border, Cell, Color } from "exceljs";
import type { CSSProperties } from "react";

type ExcelColor = Partial<Color> & { indexed?: number; tint?: number };

const DEFAULT_THEME = [
  "FFFFFF", "000000", "E7E6E6", "44546A", "4472C4", "ED7D31",
  "A5A5A5", "FFC000", "5B9BD5", "70AD47", "0563C1", "954F72",
];
const INDEXED_COLORS = [
  "000000", "FFFFFF", "FF0000", "00FF00", "0000FF", "FFFF00", "FF00FF", "00FFFF",
  "000000", "FFFFFF", "FF0000", "00FF00", "0000FF", "FFFF00", "FF00FF", "00FFFF",
  "800000", "008000", "000080", "808000", "800080", "008080", "C0C0C0", "808080",
  "9999FF", "993366", "FFFFCC", "CCFFFF", "660066", "FF8080", "0066CC", "CCCCFF",
  "000080", "FF00FF", "FFFF00", "00FFFF", "800080", "800000", "008080", "0000FF",
  "00CCFF", "CCFFFF", "CCFFCC", "FFFF99", "99CCFF", "FF99CC", "CC99FF", "FFCC99",
  "3366FF", "33CCCC", "99CC00", "FFCC00", "FF9900", "FF6600", "666699", "969696",
  "003366", "339966", "003300", "333300", "993300", "993366", "333399", "333333",
];
const THEME_NAMES = [
  "lt1", "dk1", "lt2", "dk2", "accent1", "accent2",
  "accent3", "accent4", "accent5", "accent6", "hlink", "folHlink",
];

export function readExcelTheme(xml?: string): string[] {
  if (!xml) return DEFAULT_THEME;
  const document = new DOMParser().parseFromString(xml, "application/xml");
  if (document.getElementsByTagName("parsererror").length) return DEFAULT_THEME;
  return THEME_NAMES.map((name, index) => {
    const element = document.getElementsByTagNameNS("*", name)[0]?.firstElementChild;
    const value = element?.getAttribute("lastClr") ?? element?.getAttribute("val");
    return value && /^[\da-f]{6}$/i.test(value) ? value : DEFAULT_THEME[index];
  });
}

function tintColor(hex: string, tint: number): string {
  const rgb = [0, 2, 4].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255);
  const max = Math.max(...rgb);
  const min = Math.min(...rgb);
  const delta = max - min;
  let hue = 0;
  let lightness = (max + min) / 2;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
  if (delta) {
    if (max === rgb[0]) hue = ((rgb[1] - rgb[2]) / delta) % 6;
    else if (max === rgb[1]) hue = (rgb[2] - rgb[0]) / delta + 2;
    else hue = (rgb[0] - rgb[1]) / delta + 4;
  }
  lightness = tint < 0 ? lightness * (1 + tint) : lightness * (1 - tint) + tint;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = chroma * (1 - Math.abs(((hue + 6) % 6) % 2 - 1));
  const h = (hue + 6) % 6;
  const channels = h < 1 ? [chroma, x, 0] : h < 2 ? [x, chroma, 0] :
    h < 3 ? [0, chroma, x] : h < 4 ? [0, x, chroma] :
      h < 5 ? [x, 0, chroma] : [chroma, 0, x];
  const offset = lightness - chroma / 2;
  return channels.map((channel) => Math.round((channel + offset) * 255).toString(16).padStart(2, "0")).join("");
}

export function excelColor(color: ExcelColor | undefined, theme: string[]): string | undefined {
  if (!color) return undefined;
  const rgb = color.argb?.slice(-6) ??
    (color.theme !== undefined ? theme[color.theme] : undefined) ??
    (color.indexed !== undefined ? INDEXED_COLORS[color.indexed] : undefined);
  if (!rgb || !/^[\da-f]{6}$/i.test(rgb)) return undefined;
  const tint = color.tint;
  return `#${tint !== undefined && Number.isFinite(tint) && tint >= -1 && tint <= 1 ? tintColor(rgb, tint) : rgb}`;
}

function excelBorder(border: Partial<Border> | undefined, theme: string[]): string | undefined {
  if (!border?.style) return undefined;
  const width = border.style === "thick" ? "3px" :
    border.style.startsWith("medium") || border.style === "double" ? "2px" : "1px";
  const style = border.style === "double" ? "double" : border.style === "dotted" ? "dotted" :
    border.style.toLowerCase().includes("dash") ? "dashed" : "solid";
  return `${width} ${style} ${excelColor(border.color, theme) ?? "#000000"}`;
}

export function excelCellStyle(cell: Cell, theme: string[]): CSSProperties {
  const fill = cell.fill;
  const background = fill?.type === "pattern" && fill.pattern !== "none"
    ? excelColor(fill.fgColor, theme) ?? excelColor(fill.bgColor, theme)
    : undefined;
  const alignment = cell.alignment;
  const horizontal = alignment?.horizontal;
  return {
    color: excelColor(cell.font?.color, theme) ?? "#000000",
    backgroundColor: background ?? "#ffffff",
    fontWeight: cell.font?.bold ? "bold" : undefined,
    fontStyle: cell.font?.italic ? "italic" : undefined,
    textDecoration: [
      cell.font?.underline && cell.font.underline !== "none" ? "underline" : "",
      cell.font?.strike ? "line-through" : "",
    ].filter(Boolean).join(" ") || undefined,
    textAlign: horizontal === "center" || horizontal === "centerContinuous" ? "center" :
      horizontal === "right" ? "right" : horizontal === "justify" ? "justify" : undefined,
    verticalAlign: alignment?.vertical === "middle" ? "middle" :
      alignment?.vertical === "bottom" ? "bottom" : "top",
    borderTop: excelBorder(cell.border?.top, theme) ?? "1px solid #cbd5e1",
    borderRight: excelBorder(cell.border?.right, theme) ?? "1px solid #cbd5e1",
    borderBottom: excelBorder(cell.border?.bottom, theme) ?? "1px solid #cbd5e1",
    borderLeft: excelBorder(cell.border?.left, theme) ?? "1px solid #cbd5e1",
  };
}
