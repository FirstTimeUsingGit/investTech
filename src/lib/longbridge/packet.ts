import { gunzipSync } from "node:zlib";

export const PACKET_REQUEST = 1;
export const PACKET_RESPONSE = 2;
export const PACKET_PUSH = 3;

export type UnpackedPacket = {
  type: number;
  cmd: number;
  requestId: number;
  status: number;
  gzip: boolean;
  body: Uint8Array;
};

export function packRequest(opts: {
  cmd: number;
  requestId: number;
  timeoutMs?: number;
  body: Uint8Array;
}): Uint8Array {
  const timeout = opts.timeoutMs ?? 15_000;
  const body = opts.body;
  const header = new Uint8Array(11);
  header[0] = PACKET_REQUEST & 0xf;
  header[1] = opts.cmd & 0xff;
  header[2] = (opts.requestId >>> 24) & 0xff;
  header[3] = (opts.requestId >>> 16) & 0xff;
  header[4] = (opts.requestId >>> 8) & 0xff;
  header[5] = opts.requestId & 0xff;
  header[6] = (timeout >>> 8) & 0xff;
  header[7] = timeout & 0xff;
  header[8] = (body.length >>> 16) & 0xff;
  header[9] = (body.length >>> 8) & 0xff;
  header[10] = body.length & 0xff;
  const out = new Uint8Array(11 + body.length);
  out.set(header, 0);
  out.set(body, 11);
  return out;
}

export function unpackPacket(frame: Uint8Array): UnpackedPacket {
  if (frame.length < 5) throw new Error("quote frame too short");
  const b0 = frame[0];
  const type = b0 & 0xf;
  const gzip = ((b0 >> 5) & 1) === 1;
  const cmd = frame[1];
  let idx = 2;
  let requestId = 0;
  let status = 0;
  if (type === PACKET_REQUEST || type === PACKET_RESPONSE) {
    if (frame.length < idx + 4) throw new Error("truncated request id");
    requestId =
      ((frame[idx] << 24) | (frame[idx + 1] << 16) | (frame[idx + 2] << 8) | frame[idx + 3]) >>> 0;
    idx += 4;
    if (type === PACKET_REQUEST) idx += 2;
    if (type === PACKET_RESPONSE) {
      status = frame[idx];
      idx += 1;
    }
  }
  if (frame.length < idx + 3) throw new Error("truncated body length");
  const bodyLen = (frame[idx] << 16) | (frame[idx + 1] << 8) | frame[idx + 2];
  idx += 3;
  let body = frame.slice(idx, idx + bodyLen);
  if (gzip && body.length) {
    body = new Uint8Array(gunzipSync(Buffer.from(body)));
  }
  return { type, cmd, requestId, status, gzip, body };
}
