/** Minimal protobuf wire codec for the quote/control messages we use. */

export type ProtoValue = { field: number; wire: 0 | 1 | 2 | 5; bytes: Uint8Array };

export function encodeVarintNumber(n: number | bigint): Uint8Array {
  let v = typeof n === "bigint" ? Number(n) : n;
  if (!Number.isFinite(v) || v < 0) throw new Error("negative varint");
  v = Math.floor(v);
  const out: number[] = [];
  while (v >= 0x80) {
    out.push((v & 0x7f) | 0x80);
    v = Math.floor(v / 128);
  }
  out.push(v);
  return Uint8Array.from(out);
}

export function encodeKey(field: number, wire: number): Uint8Array {
  return encodeVarintNumber((field << 3) | wire);
}

export function concatBytes(...chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}

export function encodeString(field: number, value: string | undefined | null): Uint8Array {
  if (!value) return new Uint8Array();
  const raw = new TextEncoder().encode(value);
  return concatBytes(encodeKey(field, 2), encodeVarintNumber(raw.length), raw);
}

export function encodeInt(field: number, value: number | bigint | undefined | null): Uint8Array {
  if (value == null || value === 0) return new Uint8Array();
  return concatBytes(encodeKey(field, 0), encodeVarintNumber(value));
}

export function encodeBytes(field: number, value: Uint8Array): Uint8Array {
  if (!value.length) return new Uint8Array();
  return concatBytes(encodeKey(field, 2), encodeVarintNumber(value.length), value);
}

export function encodeAuthRequest(token: string): Uint8Array {
  return encodeString(1, token);
}

export function encodeMultiSecurity(symbols: string[]): Uint8Array {
  return concatBytes(...symbols.map((s) => encodeString(1, s)));
}

export function encodeCandlestickRequest(opts: {
  symbol: string;
  period: number;
  count: number;
  adjustType: number;
}): Uint8Array {
  return concatBytes(
    encodeString(1, opts.symbol),
    encodeInt(2, opts.period),
    encodeInt(3, opts.count),
    encodeInt(4, opts.adjustType),
  );
}

export function encodeHistoryCandlestickByDate(opts: {
  symbol: string;
  period: number;
  adjustType: number;
  startDate: string;
  endDate: string;
}): Uint8Array {
  const dateQuery = concatBytes(encodeString(1, opts.startDate), encodeString(2, opts.endDate));
  return concatBytes(
    encodeString(1, opts.symbol),
    encodeInt(2, opts.period),
    encodeInt(3, opts.adjustType),
    encodeInt(4, 2),
    encodeBytes(6, dateQuery),
  );
}

function readVarint(buf: Uint8Array, offset: number): { value: number; next: number } {
  let value = 0;
  let shift = 0;
  let i = offset;
  while (i < buf.length) {
    const b = buf[i++];
    value += (b & 0x7f) * Math.pow(2, shift);
    if ((b & 0x80) === 0) return { value, next: i };
    shift += 7;
    if (shift > 53) throw new Error("varint too long");
  }
  throw new Error("truncated varint");
}

export function decodeFields(buf: Uint8Array): Map<number, ProtoValue[]> {
  const map = new Map<number, ProtoValue[]>();
  let i = 0;
  while (i < buf.length) {
    const key = readVarint(buf, i);
    i = key.next;
    const field = Math.floor(key.value / 8);
    const wire = (key.value % 8) as 0 | 1 | 2 | 5;
    let bytes: Uint8Array;
    if (wire === 0) {
      const v = readVarint(buf, i);
      bytes = buf.slice(i, v.next);
      i = v.next;
    } else if (wire === 1) {
      bytes = buf.slice(i, i + 8);
      i += 8;
    } else if (wire === 5) {
      bytes = buf.slice(i, i + 4);
      i += 4;
    } else if (wire === 2) {
      const len = readVarint(buf, i);
      i = len.next;
      const end = i + Number(len.value);
      bytes = buf.slice(i, end);
      i = end;
    } else {
      throw new Error(`unsupported wire type ${wire}`);
    }
    const list = map.get(field) ?? [];
    list.push({ field, wire, bytes });
    map.set(field, list);
  }
  return map;
}

export function fieldString(fields: Map<number, ProtoValue[]>, n: number): string {
  const v = fields.get(n)?.[0];
  if (!v) return "";
  return new TextDecoder().decode(v.bytes);
}

export function fieldStrings(fields: Map<number, ProtoValue[]>, n: number): string[] {
  return (fields.get(n) ?? []).map((v) => new TextDecoder().decode(v.bytes));
}

export function fieldInt(fields: Map<number, ProtoValue[]>, n: number): number {
  const v = fields.get(n)?.[0];
  if (!v) return 0;
  const { value } = readVarint(v.bytes, 0);
  return Number.isFinite(value) ? value : 0;
}

export function fieldMessages(fields: Map<number, ProtoValue[]>, n: number): Map<number, ProtoValue[]>[] {
  return (fields.get(n) ?? []).map((v) => decodeFields(v.bytes));
}

export function decodeError(buf: Uint8Array): { code: number; msg: string } {
  const f = decodeFields(buf);
  return { code: fieldInt(f, 1), msg: fieldString(f, 2) };
}

export function decodeAuthResponse(buf: Uint8Array): { sessionId: string; expires: number } {
  const f = decodeFields(buf);
  return { sessionId: fieldString(f, 1), expires: fieldInt(f, 2) };
}

export type LbQuote = {
  symbol: string;
  lastDone: number;
  prevClose: number;
  open: number;
  high: number;
  low: number;
  timestamp: number;
  volume: number;
  turnover: number;
};

function num(s: string): number {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

export function decodeQuoteResponse(buf: Uint8Array): LbQuote[] {
  const root = decodeFields(buf);
  return fieldMessages(root, 1).map((q) => ({
    symbol: fieldString(q, 1),
    lastDone: num(fieldString(q, 2)),
    prevClose: num(fieldString(q, 3)),
    open: num(fieldString(q, 4)),
    high: num(fieldString(q, 5)),
    low: num(fieldString(q, 6)),
    timestamp: fieldInt(q, 7),
    volume: fieldInt(q, 8),
    turnover: num(fieldString(q, 9)),
  }));
}

export type LbStatic = {
  symbol: string;
  nameCn: string;
  nameEn: string;
  nameHk: string;
  exchange: string;
  currency: string;
  totalShares: number;
  epsTtm: number;
};

export function decodeStaticResponse(buf: Uint8Array): LbStatic[] {
  const root = decodeFields(buf);
  return fieldMessages(root, 1).map((s) => ({
    symbol: fieldString(s, 1),
    nameCn: fieldString(s, 2),
    nameEn: fieldString(s, 3),
    nameHk: fieldString(s, 4),
    exchange: fieldString(s, 6),
    currency: fieldString(s, 7),
    totalShares: fieldInt(s, 9),
    epsTtm: num(fieldString(s, 13)),
  }));
}

export type LbCandle = {
  close: number;
  open: number;
  low: number;
  high: number;
  volume: number;
  timestamp: number;
};

export function decodeCandlestickResponse(buf: Uint8Array): { symbol: string; candles: LbCandle[] } {
  const root = decodeFields(buf);
  const candles = fieldMessages(root, 2).map((c) => ({
    close: num(fieldString(c, 1)),
    open: num(fieldString(c, 2)),
    low: num(fieldString(c, 3)),
    high: num(fieldString(c, 4)),
    volume: fieldInt(c, 5),
    timestamp: fieldInt(c, 7),
  }));
  return { symbol: fieldString(root, 1), candles };
}
