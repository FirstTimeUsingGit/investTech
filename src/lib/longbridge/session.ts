import { cookies } from "next/headers";
import { SID_COOKIE } from "./constants";
import { getSession } from "./store";

export async function readSessionId(): Promise<string | undefined> {
  try {
    const jar = await cookies();
    return jar.get(SID_COOKIE)?.value;
  } catch {
    return undefined;
  }
}

export async function isLongbridgeConnected(sessionId?: string | null): Promise<boolean> {
  try {
    const sid = sessionId ?? (await readSessionId());
    if (!sid) return false;
    const session = await getSession(sid);
    return Boolean(session?.refreshToken);
  } catch {
    return false;
  }
}
