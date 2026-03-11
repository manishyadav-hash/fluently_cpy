interface MultipartFileInput {
  content: Buffer;
  contentType: string;
  fieldName: string;
  filename: string;
}

export function buildMultipartFormData(file: MultipartFileInput, fields?: Record<string, string | number>) {
  const boundary = `----codex-boundary-${Math.random().toString(16).slice(2)}`;
  const parts: Buffer[] = [];

  for (const [fieldName, value] of Object.entries(fields ?? {})) {
    parts.push(Buffer.from(
      `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="${fieldName}"\r\n\r\n` +
        `${value}\r\n`,
    ));
  }

  parts.push(Buffer.from(
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="${file.fieldName}"; filename="${file.filename}"\r\n` +
      `Content-Type: ${file.contentType}\r\n\r\n`,
  ));
  const footer = Buffer.from(`\r\n--${boundary}--\r\n`);

  return {
    boundary,
    payload: Buffer.concat([...parts, file.content, footer]),
  };
}
