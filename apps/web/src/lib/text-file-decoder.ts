const ENCODING_ALIASES: Record<string, string> = {
  ansi: 'windows-1252',
  cp1252: 'windows-1252',
  latin1: 'iso-8859-1',
  'latin-1': 'iso-8859-1',
  'utf8': 'utf-8',
  'utf_8': 'utf-8',
  'windows1252': 'windows-1252',
  'win1252': 'windows-1252',
};

function normalizeEncodingLabel(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) {
    return 'utf-8';
  }

  return ENCODING_ALIASES[normalized] ?? normalized;
}

function decodeWithEncoding(buffer: ArrayBuffer, encoding: string) {
  return new TextDecoder(encoding, { fatal: false }).decode(buffer);
}

function normalizeDecodedText(text: string) {
  return text.replace(/\b([Nn])º/g, '$1°');
}

function scoreDecodedText(text: string) {
  const replacementCount = (text.match(/\uFFFD/g) ?? []).length;
  const mojibakeCount = (text.match(/Ã.|Â.|â.|œ|ž|š/g) ?? []).length;
  const controlCount = (text.match(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g) ?? []).length;

  return replacementCount * 1000 + mojibakeCount * 100 + controlCount;
}

export async function decodeTextFile(file: File, preferredEncoding?: string | null) {
  const buffer = await file.arrayBuffer();
  const candidates = Array.from(
    new Set([
      normalizeEncodingLabel(preferredEncoding),
      'utf-8',
      'windows-1252',
      'iso-8859-1',
    ]),
  );

  let bestText = '';
  let bestScore = Number.POSITIVE_INFINITY;

  for (const encoding of candidates) {
    try {
      const decoded = normalizeDecodedText(decodeWithEncoding(buffer, encoding));
      const score = scoreDecodedText(decoded);

      if (score < bestScore) {
        bestText = decoded;
        bestScore = score;
      }

      if (score === 0 && encoding === normalizeEncodingLabel(preferredEncoding)) {
        return decoded;
      }
    } catch {
      // Ignore unsupported labels and keep trying fallbacks.
    }
  }

  return bestText;
}
