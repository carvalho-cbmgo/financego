export const MAX_STATEMENT_UPLOAD_BYTES = 5 * 1024 * 1024;
export const MAX_RAW_TEXT_CHARS = 300_000;
export const ALLOWED_STATEMENT_EXTENSIONS = [".pdf", ".csv", ".txt", ".ofx"];

export function assertAllowedFile(file: File) {
  if (file.size > MAX_STATEMENT_UPLOAD_BYTES) {
    throw new Error("Arquivo muito grande. Limite máximo: 5 MB.");
  }
  const lower = file.name.toLowerCase();
  const ok = ALLOWED_STATEMENT_EXTENSIONS.some((ext) => lower.endsWith(ext));
  if (!ok) throw new Error("Extensão de arquivo não permitida.");
}
