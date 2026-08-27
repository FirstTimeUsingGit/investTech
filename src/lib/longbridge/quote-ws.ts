import "server-only";

import { CMD, QUOTE_WS_URL, QUOTE_WS_URL_FALLBACK } from "./constants";
import { packRequest, unpackPacket } from "./packet";
import {
  decodeAuthResponse,
  decodeCandlestickResponse,
  decodeError,
  decodeQuoteResponse,
  decodeStaticResponse,
  encodeAuthRequest,
  encodeCandlestickRequest,
  encodeHistoryCandlestickByDate,
  encodeInt,
  encodeMultiSecurity,
  type LbCandle,
  type LbQuote,
  type LbStatic,
} from "./proto";
import { ADJUST_NO, PERIOD_DAY } from "./constants";

type Pending = {
  resolve: (body: Uint8Array) => void;
  reject: (err: Error) => void;
};

function wsUrl(base: string): string {
  const u = new URL(base);
  u.searchParams.set("version", "1");
  u.searchParams.set("codec", "1");
  u.searchParams.set("platform", "9");
  return u.toString();
}

export class QuoteWsClient {
  private ws: WebSocket;
  private nextId = 1;
  private pending = new Map<number, Pending>();
  alive = true;

  private constructor(ws: WebSocket) {
    this.ws = ws;
    this.ws.addEventListener("message", (ev) => this.onMessage(ev.data));
    this.ws.addEventListener("close", () => this.failAll(new Error("行情連線已斷")));
    this.ws.addEventListener("error", () => this.failAll(new Error("行情連線出錯")));
  }

  static async connect(otp: string): Promise<QuoteWsClient> {
    const urls = [QUOTE_WS_URL, QUOTE_WS_URL_FALLBACK];
    let last = "無法連接行情通道";
    for (const base of urls) {
      try {
        const ws = await openSocket(wsUrl(base));
        const client = new QuoteWsClient(ws);
        await client.auth(otp);
        client.startHeartbeat();
        return client;
      } catch (err) {
        last = err instanceof Error ? err.message : String(err);
      }
    }
    throw new Error(last);
  }

  private failAll(err: Error) {
    this.alive = false;
    for (const p of this.pending.values()) p.reject(err);
    this.pending.clear();
  }

  private onMessage(data: unknown) {
    try {
      const buf = toBytes(data);
      const pkt = unpackPacket(buf);
      if (pkt.type !== 2) return;
      const wait = this.pending.get(pkt.requestId);
      if (!wait) return;
      this.pending.delete(pkt.requestId);
      if (pkt.status !== 0) {
        const err = decodeError(pkt.body);
        wait.reject(new Error(err.msg || `行情錯誤 ${err.code || pkt.status}`));
        return;
      }
      wait.resolve(pkt.body);
    } catch (err) {
      // ignore malformed push frames
      void err;
    }
  }

  private request(cmd: number, body: Uint8Array, timeoutMs = 12_000): Promise<Uint8Array> {
    if (!this.alive) return Promise.reject(new Error("行情連線已斷"));
    const requestId = this.nextId++;
    const frame = packRequest({ cmd, requestId, timeoutMs, body });
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error("行情請求逾時"));
      }, timeoutMs + 1_000);
      this.pending.set(requestId, {
        resolve: (b) => {
          clearTimeout(timer);
          resolve(b);
        },
        reject: (e) => {
          clearTimeout(timer);
          reject(e);
        },
      });
      this.ws.send(frame);
    });
  }

  private async auth(otp: string) {
    const body = await this.request(CMD.auth, encodeAuthRequest(otp), 8_000);
    decodeAuthResponse(body);
  }

  private startHeartbeat() {
    const tick = () => {
      if (!this.alive) return;
      const ts = Math.floor(Date.now() / 1000);
      void this.request(CMD.heartbeat, encodeInt(1, ts), 5_000).catch(() => {
        this.close();
      });
    };
    const id = setInterval(tick, 25_000);
    this.ws.addEventListener("close", () => clearInterval(id));
  }

  async staticInfo(symbols: string[]): Promise<LbStatic[]> {
    const body = await this.request(CMD.staticInfo, encodeMultiSecurity(symbols));
    return decodeStaticResponse(body);
  }

  async quote(symbols: string[]): Promise<LbQuote[]> {
    const body = await this.request(CMD.quote, encodeMultiSecurity(symbols));
    return decodeQuoteResponse(body);
  }

  async candlesticks(symbol: string, count = 1000): Promise<LbCandle[]> {
    const body = await this.request(
      CMD.candlestick,
      encodeCandlestickRequest({
        symbol,
        period: PERIOD_DAY,
        count,
        adjustType: ADJUST_NO,
      }),
    );
    return decodeCandlestickResponse(body).candles;
  }

  async historyByDate(symbol: string, startDate: string, endDate: string): Promise<LbCandle[]> {
    const body = await this.request(
      CMD.historyCandlestick,
      encodeHistoryCandlestickByDate({
        symbol,
        period: PERIOD_DAY,
        adjustType: ADJUST_NO,
        startDate,
        endDate,
      }),
    );
    return decodeCandlestickResponse(body).candles;
  }

  close() {
    this.alive = false;
    try {
      this.ws.close();
    } catch {
      // ignore
    }
  }
}

function toBytes(data: unknown): Uint8Array {
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(data)) {
    return new Uint8Array(data);
  }
  throw new Error("unexpected websocket payload");
}

function openSocket(url: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.binaryType = "arraybuffer";
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error("行情通道連線逾時"));
    }, 10_000);
    ws.addEventListener("open", () => {
      clearTimeout(timer);
      resolve(ws);
    });
    ws.addEventListener("error", () => {
      clearTimeout(timer);
      reject(new Error("行情通道連線失敗"));
    });
  });
}

let shared: { token: string; client: QuoteWsClient } | null = null;
let connecting: Promise<QuoteWsClient> | null = null;

export async function withQuoteClient<T>(
  accessToken: string,
  connect: () => Promise<QuoteWsClient>,
  fn: (client: QuoteWsClient) => Promise<T>,
): Promise<T> {
  if (shared && shared.token !== accessToken) {
    shared.client.close();
    shared = null;
  }
  if (shared && shared.client.alive) {
    return fn(shared.client);
  }
  if (!connecting) {
    connecting = (async () => {
      const client = await connect();
      shared = { token: accessToken, client };
      return client;
    })().finally(() => {
      connecting = null;
    });
  }
  const inflight = connecting;
  const client = await inflight;
  return fn(client);
}

export function dropQuoteClient() {
  shared?.client.close();
  shared = null;
}
