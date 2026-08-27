import { describe, expect, it } from "vitest";
import { fromLongbridgeSymbol, toLongbridgeSymbol } from "./longbridge/symbols";
import {
  decodeAuthResponse,
  decodeCandlestickResponse,
  decodeFields,
  decodeQuoteResponse,
  encodeAuthRequest,
  encodeBytes,
  encodeCandlestickRequest,
  encodeInt,
  encodeMultiSecurity,
  encodeString,
  fieldInt,
  fieldMessages,
  fieldString,
} from "./longbridge/proto";
import { packRequest, unpackPacket } from "./longbridge/packet";

describe("Longbridge symbols", () => {
  it("maps Yahoo HK codes to unpadded Longbridge symbols", () => {
    expect(toLongbridgeSymbol("0700.HK")).toBe("700.HK");
    expect(toLongbridgeSymbol("0005.HK")).toBe("5.HK");
    expect(toLongbridgeSymbol("9988.HK")).toBe("9988.HK");
  });

  it("maps US tickers to .US", () => {
    expect(toLongbridgeSymbol("AAPL")).toBe("AAPL.US");
    expect(toLongbridgeSymbol("BRK-B")).toBe("BRK-B.US");
  });

  it("maps Longbridge symbols back to internal format", () => {
    expect(fromLongbridgeSymbol("700.HK")).toEqual({ symbol: "0700.HK", market: "HK" });
    expect(fromLongbridgeSymbol("AAPL.US")).toEqual({ symbol: "AAPL", market: "US" });
  });
});

describe("protobuf helpers", () => {
  it("round-trips auth token", () => {
    const body = encodeAuthRequest("otp-token");
    const decoded = decodeAuthResponse(body);
    expect(fieldString(decodeFields(body), 1)).toBe("otp-token");
    expect(decoded.sessionId).toBe("otp-token");
  });

  it("asks for overnight quotes in AuthRequest metadata", () => {
    const body = encodeAuthRequest("otp-token");
    const meta = fieldMessages(decodeFields(body), 2)[0];
    expect(fieldString(meta, 1)).toBe("need_over_night_quote");
    expect(fieldString(meta, 2)).toBe("true");
  });

  it("encodes symbol lists", () => {
    const body = encodeMultiSecurity(["700.HK", "AAPL.US"]);
    const fields = decodeFields(body);
    expect(fields.get(1)?.map((v) => new TextDecoder().decode(v.bytes))).toEqual(["700.HK", "AAPL.US"]);
  });

  it("decodes quote last_done strings", () => {
    const q = encodeString(1, "700.HK");
    const last = encodeString(2, "338.000");
    const prev = encodeString(3, "334.800");
    const inner = new Uint8Array([...q, ...last, ...prev]);
    const wrapper = encodeLengthDelimited(1, inner);
    const quotes = decodeQuoteResponse(wrapper);
    expect(quotes[0]?.symbol).toBe("700.HK");
    expect(quotes[0]?.lastDone).toBe(338);
    expect(quotes[0]?.prevClose).toBe(334.8);
    expect(quotes[0]?.preMarket).toBeNull();
    expect(quotes[0]?.postMarket).toBeNull();
    expect(quotes[0]?.overNight).toBeNull();
  });

  it("decodes US pre, post and overnight nested quotes", () => {
    const pre = encodePrePost({ lastDone: "155.880", timestamp: 1651066201, high: "158.400", low: "155.100", prevClose: "156.800" });
    const post = encodePrePost({ lastDone: "158.770", timestamp: 1651103995, high: "159.400", low: "156.400", prevClose: "156.570" });
    const overnight = encodePrePost({ lastDone: "159.100", timestamp: 1651120000, high: "159.500", low: "157.000", prevClose: "158.770" });
    const inner = concatForTest(
      encodeString(1, "AAPL.US"),
      encodeString(2, "156.570"),
      encodeString(3, "156.800"),
      encodeInt(7, 1651089600),
      encodeBytes(11, pre),
      encodeBytes(12, post),
      encodeBytes(13, overnight),
    );
    const quotes = decodeQuoteResponse(encodeLengthDelimited(1, inner));
    expect(quotes[0]?.symbol).toBe("AAPL.US");
    expect(quotes[0]?.lastDone).toBe(156.57);
    expect(quotes[0]?.preMarket).toMatchObject({ lastDone: 155.88, timestamp: 1651066201 });
    expect(quotes[0]?.postMarket).toMatchObject({ lastDone: 158.77, timestamp: 1651103995 });
    expect(quotes[0]?.overNight).toMatchObject({ lastDone: 159.1, timestamp: 1651120000 });
  });

  it("decodes candlesticks", () => {
    const candle = new Uint8Array([
      ...encodeString(1, "362.000"),
      ...encodeString(2, "364.600"),
      ...encodeString(3, "361.600"),
      ...encodeString(4, "368.800"),
    ]);
    const body = new Uint8Array([...encodeString(1, "700.HK"), ...encodeLengthDelimited(2, candle)]);
    const parsed = decodeCandlestickResponse(body);
    expect(parsed.symbol).toBe("700.HK");
    expect(parsed.candles[0]?.close).toBe(362);
    expect(parsed.candles[0]?.high).toBe(368.8);
  });

  it("includes period and count in candlestick request", () => {
    const body = encodeCandlestickRequest({
      symbol: "AAPL.US",
      period: 1000,
      count: 1000,
      adjustType: 0,
    });
    const fields = decodeFields(body);
    expect(fieldString(fields, 1)).toBe("AAPL.US");
    expect(fieldInt(fields, 2)).toBe(1000);
    expect(fieldInt(fields, 3)).toBe(1000);
    expect(fields.get(5)).toBeUndefined();
  });
});

describe("quote packets", () => {
  it("packs and unpacks a request/response pair", () => {
    const payload = encodeAuthRequest("abc");
    const req = packRequest({ cmd: 2, requestId: 7, timeoutMs: 15000, body: payload });
    const unpacked = unpackPacket(req);
    expect(unpacked.type).toBe(1);
    expect(unpacked.cmd).toBe(2);
    expect(unpacked.requestId).toBe(7);
    expect(new TextDecoder().decode(decodeFields(unpacked.body).get(1)![0].bytes)).toBe("abc");

    const res = packResponse({ cmd: 2, requestId: 7, status: 0, body: payload });
    const ures = unpackPacket(res);
    expect(ures.type).toBe(2);
    expect(ures.status).toBe(0);
    expect(ures.requestId).toBe(7);
  });
});

function encodePrePost(opts: {
  lastDone: string;
  timestamp: number;
  high?: string;
  low?: string;
  prevClose?: string;
}): Uint8Array {
  return concatForTest(
    encodeString(1, opts.lastDone),
    encodeInt(2, opts.timestamp),
    encodeString(5, opts.high ?? ""),
    encodeString(6, opts.low ?? ""),
    encodeString(7, opts.prevClose ?? ""),
  );
}

function concatForTest(...chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}

function encodeLengthDelimited(field: number, value: Uint8Array): Uint8Array {
  const key = encodeVarintForTest((field << 3) | 2);
  const len = encodeVarintForTest(value.length);
  const out = new Uint8Array(key.length + len.length + value.length);
  out.set(key, 0);
  out.set(len, key.length);
  out.set(value, key.length + len.length);
  return out;
}

function encodeVarintForTest(n: number): Uint8Array {
  const out: number[] = [];
  let v = n >>> 0;
  while (v >= 0x80) {
    out.push((v & 0x7f) | 0x80);
    v >>>= 7;
  }
  out.push(v);
  return Uint8Array.from(out);
}

function packResponse(opts: { cmd: number; requestId: number; status: number; body: Uint8Array }): Uint8Array {
  const body = opts.body;
  const header = new Uint8Array(10);
  header[0] = 2;
  header[1] = opts.cmd & 0xff;
  header[2] = (opts.requestId >>> 24) & 0xff;
  header[3] = (opts.requestId >>> 16) & 0xff;
  header[4] = (opts.requestId >>> 8) & 0xff;
  header[5] = opts.requestId & 0xff;
  header[6] = opts.status & 0xff;
  header[7] = (body.length >>> 16) & 0xff;
  header[8] = (body.length >>> 8) & 0xff;
  header[9] = body.length & 0xff;
  const out = new Uint8Array(10 + body.length);
  out.set(header, 0);
  out.set(body, 10);
  return out;
}
