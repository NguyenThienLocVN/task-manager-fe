"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Download, LoaderCircle, X } from "lucide-react";
import { apiFetch } from "@/lib/auth/api";
import { excelCellStyle, readExcelTheme } from "./excelPreviewStyles";

export type PreviewFile = { path: string; name?: string; filename?: string };

type Sheet = {
  name: string;
  rows: { text: string; style: CSSProperties }[][];
  truncated: boolean;
};

type Preview =
  | { type: "loading" }
  | { type: "file"; url: string }
  | { type: "word"; html: string; warnings: string[] }
  | { type: "excel"; sheets: Sheet[] }
  | { type: "error"; message: string };

const MAX_ROWS = 500;
const MAX_COLUMNS = 100;

function responseFilename(disposition: string | null): string {
  const encoded = disposition?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encoded) {
    try {
      return decodeURIComponent(encoded);
    } catch {
      return encoded;
    }
  }
  return disposition?.match(/filename="?([^";]+)"?/i)?.[1] ?? "";
}

export default function FilePreviewModal({
  file,
  onClose,
}: {
  file: PreviewFile;
  onClose: () => void;
}) {
  const [preview, setPreview] = useState<Preview>({ type: "loading" });
  const [sheetIndex, setSheetIndex] = useState(0);
  const [responseName, setResponseName] = useState("");
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement;
    closeButton.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [onClose]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    let objectUrl = "";

    async function load() {
      try {
        if (!file.path.startsWith("/api/")) {
          throw new Error("Đường dẫn tệp không hợp lệ.");
        }
        const response = await apiFetch(file.path.slice(4), {
          signal: controller.signal,
        });
        const downloadedName = responseFilename(response.headers.get("content-disposition"));
        if (active) setResponseName(downloadedName);
        const blob = await response.blob();
        const mime = (response.headers.get("content-type") ?? "")
          .split(";")[0]
          .trim()
          .toLowerCase();
        const filename = downloadedName || file.filename || file.name || "";
        const extension = filename.split(/[?#]/)[0].split(".").pop()?.toLowerCase();
        const signature = new Uint8Array(await blob.slice(0, 8).arrayBuffer());
        const isPdf = signature.length >= 5 &&
          String.fromCharCode(...signature.slice(0, 5)) === "%PDF-";
        const isPng = signature.length >= 8 &&
          [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => signature[index] === byte);
        const isJpeg = signature.length >= 3 &&
          signature[0] === 0xff && signature[1] === 0xd8 && signature[2] === 0xff;

        if (isPdf || isPng || isJpeg) {
          if (!active) return;
          const previewMime = isPdf ? "application/pdf" : isPng ? "image/png" : "image/jpeg";
          objectUrl = URL.createObjectURL(new Blob([blob], { type: previewMime }));
          setPreview({ type: "file", url: objectUrl });
          return;
        }

        if (
          mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
          extension === "docx"
        ) {
          const [mammoth, { default: DOMPurify }] = await Promise.all([
            import("mammoth"),
            import("dompurify"),
          ]);
          const result = await mammoth.convertToHtml({
            arrayBuffer: await blob.arrayBuffer(),
          });
          const html = DOMPurify.sanitize(result.value, {
            FORBID_ATTR: ["href"],
          });
          if (active) {
            setPreview({
              type: "word",
              html,
              warnings: result.messages.map((message) => message.message),
            });
          }
          return;
        }

        if (
          mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
          extension === "xlsx"
        ) {
          const { Workbook } = await import("exceljs");
          const workbook = new Workbook();
          await workbook.xlsx.load(await blob.arrayBuffer());
          const theme = readExcelTheme(Object.values(workbook.model.themes ?? {})[0]);
          const sheets = workbook.worksheets.map((sheet) => {
            const rowCount = Math.min(sheet.rowCount, MAX_ROWS);
            const columnCount = Math.min(sheet.columnCount, MAX_COLUMNS);
            const rows = Array.from({ length: rowCount }, (_, rowIndex) =>
              Array.from({ length: columnCount }, (_, columnIndex) => {
                const cell = sheet.getRow(rowIndex + 1).getCell(columnIndex + 1);
                return { text: cell.text, style: excelCellStyle(cell, theme) };
              }),
            );
            return {
              name: sheet.name,
              rows,
              truncated: sheet.rowCount > MAX_ROWS || sheet.columnCount > MAX_COLUMNS,
            };
          });
          if (active) setPreview({ type: "excel", sheets });
          return;
        }

        throw new Error(
          "Không hỗ trợ xem định dạng tệp này. Hãy tải xuống hoặc chuyển sang PDF, DOCX hoặc XLSX.",
        );
      } catch (error) {
        if (active) {
          setPreview({
            type: "error",
            message: error instanceof Error ? error.message : "Không thể xem tệp.",
          });
        }
      }
    }

    void load();
    return () => {
      active = false;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  const sheet = preview.type === "excel" ? preview.sheets[sheetIndex] : undefined;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-2 sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section role="dialog" aria-modal="true" aria-labelledby="file-preview-title" className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
          <h2 id="file-preview-title" className="truncate text-base font-bold text-slate-900">
            Xem file{responseName || file.name ? `: ${responseName || file.name}` : ""}
          </h2>
          <div className="flex items-center gap-2">
            <a href={file.path} download className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:underline">
              <Download className="h-4 w-4" />
            </a>
            <button ref={closeButton} type="button" onClick={onClose} aria-label="Đóng xem file" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100">
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-auto">
          {preview.type === "loading" && (
            <p className="p-6 text-center text-sm text-slate-500"><LoaderCircle className="mx-auto mb-2 h-6 w-6 animate-spin" />Đang tải tệp...</p>
          )}
          {preview.type === "error" && (
            <p role="alert" className="p-6 text-sm text-rose-700">{preview.message}</p>
          )}
          {preview.type === "file" && (
            <iframe title="Xem file" src={preview.url} className="h-full min-h-[50vh] w-full border-0" />
          )}
          {preview.type === "word" && (
            <div className="flex h-full flex-col">
              {preview.warnings.length > 0 && (
                <p className="bg-amber-50 px-4 py-2 text-xs text-amber-800">Một số định dạng trong tệp Word có thể không hiển thị chính xác.</p>
              )}
              <iframe
                title="Xem file Word"
                sandbox=""
                className="w-full flex-1 border-0"
                srcDoc={`<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'"><style>body{font-family:Arial,sans-serif;line-height:1.6;margin:2rem}img{max-width:100%}table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:0.4rem}</style></head><body>${preview.html}</body></html>`}
              />
            </div>
          )}
          {preview.type === "excel" && (
            <div className="p-4">
              {preview.sheets.length === 0 ? (
                <p className="text-sm text-slate-500">Tệp Excel không có trang tính.</p>
              ) : (
                <>
                  <label className="text-sm font-semibold text-slate-700">
                    Trang tính
                    <select className="ml-2 rounded-lg border border-slate-200 px-2 py-1" value={sheetIndex} onChange={(event) => setSheetIndex(Number(event.target.value))}>
                      {preview.sheets.map((item, index) => <option key={index} value={index}>{item.name}</option>)}
                    </select>
                  </label>
                  {sheet?.truncated && <p className="mt-2 text-xs text-amber-700">Chỉ hiển thị {MAX_ROWS} dòng và {MAX_COLUMNS} cột đầu tiên; tải xuống để xem toàn bộ.</p>}
                  <div className="mt-3 overflow-auto">
                    <table className="border-collapse bg-white text-sm text-black">
                      <tbody>
                        {sheet?.rows.map((row, rowIndex) => (
                          <tr key={rowIndex}>
                            {row.map((cell, columnIndex) => <td key={columnIndex} style={cell.style} className="min-w-24 whitespace-pre-wrap px-2 py-1">{cell.text}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
