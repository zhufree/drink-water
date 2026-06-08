import {
  HttpError,
  readBody,
  requireWeChatLoginCode,
  sanitizeLogMessage
} from "./common.ts";
import type { AppContext } from "./common.ts";

export type WeChatCode2SessionResponse = {
  openid?: string;
  session_key?: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
};

export async function handleWeChatSession(ctx: AppContext) {
  if (ctx.request.method !== "POST") {
    throw new HttpError(405, "Method not allowed");
  }

  const body = await readBody<{ code?: string }>(ctx.request);
  const code = requireWeChatLoginCode(body.code);
  const appId = String(ctx.env.WECHAT_APP_ID ?? "").trim();
  const appSecret = String(ctx.env.WECHAT_APP_SECRET ?? "").trim();

  if (!appId || !appSecret) {
    console.error("[worker] WeChat login is not configured", {
      hasAppId: Boolean(appId),
      hasAppSecret: Boolean(appSecret)
    });
    throw new HttpError(500, "WeChat login is not configured");
  }

  const sessionUrl = new URL("https://api.weixin.qq.com/sns/jscode2session");
  sessionUrl.search = new URLSearchParams({
    appid: appId,
    secret: appSecret,
    js_code: code,
    grant_type: "authorization_code"
  }).toString();

  let response: Response;
  try {
    response = await fetch(sessionUrl);
  } catch (error) {
    console.error("[worker] WeChat jscode2session request failed", {
      error: error instanceof Error ? error.message : String(error)
    });
    throw new HttpError(502, "Failed to exchange WeChat login code");
  }

  if (!response.ok) {
    console.error("[worker] WeChat jscode2session HTTP error", {
      status: response.status
    });
    throw new HttpError(502, "Failed to exchange WeChat login code");
  }

  let payload: WeChatCode2SessionResponse;
  try {
    payload = (await response.json()) as WeChatCode2SessionResponse;
  } catch {
    console.error("[worker] WeChat jscode2session returned invalid JSON");
    throw new HttpError(502, "Failed to exchange WeChat login code");
  }

  if (payload.errcode !== undefined && Number(payload.errcode) !== 0) {
    console.error("[worker] WeChat jscode2session returned an error", {
      errcode: payload.errcode,
      errmsg: sanitizeLogMessage(payload.errmsg)
    });
    throw new HttpError(502, "Failed to exchange WeChat login code");
  }

  const openid = String(payload.openid ?? "").trim();
  if (!openid) {
    console.error("[worker] WeChat jscode2session response missed openid");
    throw new HttpError(502, "Failed to exchange WeChat login code");
  }

  return { openid };
}
