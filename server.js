const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT || 3001);
const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, "data.json");

const WECOM_CORP_ID = (process.env.WECOM_CORP_ID || process.env.WEWORK_CORP_ID || "").trim();
const WECOM_AGENT_ID = (process.env.WECOM_AGENT_ID || process.env.WEWORK_AGENT_ID || "").trim();
const WECOM_SECRET = (process.env.WECOM_SECRET || process.env.WEWORK_SECRET || "").trim();
const WECOM_TOKEN = (process.env.WECOM_TOKEN || "").trim();
const WECOM_ENCODING_AES_KEY = (process.env.WECOM_ENCODING_AES_KEY || "").trim();
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || "https://zhidu.xh028.com").replace(/\/$/, "");
const ENV_ADMIN_USERIDS = (process.env.WECOM_ADMIN_USERIDS || process.env.WEWORK_ADMIN_USERIDS || "")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

const sessions = new Map();
let tokenCache = { token: "", expiresAt: 0 };

const defaultData = {
  policies: [],
  options: {
    departments: ["人力行政部", "教学教研部", "课程顾问部", "市场运营部", "财务部", "校区管理部", "综合管理部"],
    categories: ["人事制度", "教学制度", "财务制度", "行政制度", "安全制度", "服务规范", "操作流程"]
  },
  account: {
    account: "admin",
    password: "123456"
  },
  admins: [],
  users: {}
};

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function readData() {
  if (!fs.existsSync(DATA_FILE)) {
    writeData(defaultData);
    return structuredClone(defaultData);
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    return {
      policies: Array.isArray(parsed.policies) ? parsed.policies : [],
      options: {
        departments: Array.isArray(parsed.options?.departments) ? parsed.options.departments : defaultData.options.departments,
        categories: Array.isArray(parsed.options?.categories) ? parsed.options.categories : defaultData.options.categories
      },
      account: {
        account: String(parsed.account?.account || defaultData.account.account),
        password: String(parsed.account?.password || defaultData.account.password)
      },
      admins: Array.isArray(parsed.admins) ? parsed.admins : [],
      users: parsed.users && typeof parsed.users === "object" ? parsed.users : {}
    };
  } catch {
    return structuredClone(defaultData);
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, status, text) {
  res.writeHead(status, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(text);
}

function redirect(res, location) {
  res.writeHead(302, { Location: location });
  res.end();
}

function parseCookies(req) {
  return Object.fromEntries(
    String(req.headers.cookie || "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      })
  );
}

function getSession(req) {
  const sid = parseCookies(req).zhidu_sid;
  if (!sid) return null;
  const session = sessions.get(sid);
  if (!session || session.expiresAt < Date.now()) {
    sessions.delete(sid);
    return null;
  }
  return session;
}

function setSessionCookie(res, user) {
  const sid = crypto.randomBytes(24).toString("hex");
  sessions.set(sid, {
    user,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
  });
  res.setHeader("Set-Cookie", `zhidu_sid=${sid}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`);
}

function requireWeComLoginConfig() {
  return WECOM_CORP_ID && WECOM_AGENT_ID && WECOM_SECRET;
}

function requireWeComMessageConfig() {
  return WECOM_TOKEN && WECOM_ENCODING_AES_KEY && WECOM_CORP_ID;
}

function httpsGetJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      let body = "";
      response.on("data", (chunk) => {
        body += chunk;
      });
      response.on("end", () => {
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
    }).on("error", reject);
  });
}

async function getAccessToken() {
  if (tokenCache.token && tokenCache.expiresAt > Date.now() + 60 * 1000) return tokenCache.token;
  const url = `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${encodeURIComponent(WECOM_CORP_ID)}&corpsecret=${encodeURIComponent(WECOM_SECRET)}`;
  const data = await httpsGetJson(url);
  if (data.errcode !== 0) throw new Error(data.errmsg || "企业微信 access_token 获取失败");
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + Number(data.expires_in || 7200) * 1000
  };
  return tokenCache.token;
}

async function getDepartmentMap(accessToken) {
  const data = await httpsGetJson(`https://qyapi.weixin.qq.com/cgi-bin/department/list?access_token=${encodeURIComponent(accessToken)}`);
  if (data.errcode !== 0 || !Array.isArray(data.department)) return {};
  return Object.fromEntries(data.department.map((item) => [String(item.id), item.name]));
}

async function getWeComUser(code) {
  const accessToken = await getAccessToken();
  const userInfo = await httpsGetJson(`https://qyapi.weixin.qq.com/cgi-bin/auth/getuserinfo?access_token=${encodeURIComponent(accessToken)}&code=${encodeURIComponent(code)}`);
  if (userInfo.errcode !== 0 || !userInfo.UserId) throw new Error(userInfo.errmsg || "企业微信登录失败");

  const detail = await httpsGetJson(`https://qyapi.weixin.qq.com/cgi-bin/user/get?access_token=${encodeURIComponent(accessToken)}&userid=${encodeURIComponent(userInfo.UserId)}`);
  const departmentMap = await getDepartmentMap(accessToken);
  const departmentIds = Array.isArray(detail.department) ? detail.department.map(String) : [];
  return {
    userid: userInfo.UserId,
    name: detail.name || userInfo.UserId,
    avatar: detail.avatar || "",
    mobile: detail.mobile || "",
    departmentIds,
    departmentNames: departmentIds.map((id) => departmentMap[id]).filter(Boolean)
  };
}

function isAdmin(user, data = readData()) {
  if (!user?.userid) return false;
  return ENV_ADMIN_USERIDS.includes(user.userid) || data.admins.includes(user.userid);
}

function bootstrapAdminIfNeeded(user) {
  const data = readData();
  if (!data.admins.length && !ENV_ADMIN_USERIDS.length) {
    data.admins.push(user.userid);
    writeData(data);
  }
}

function saveUser(user) {
  const data = readData();
  data.users[user.userid] = {
    ...data.users[user.userid],
    ...user,
    lastLoginAt: new Date().toISOString()
  };
  writeData(data);
}

function canViewPolicy(policy, user, admin = false) {
  if (admin) return true;
  const visibility = policy.visibility || { scope: "all", departments: [], users: [] };
  if (!visibility.scope || visibility.scope === "all") return true;
  if (visibility.scope === "departments") {
    const allowed = new Set((visibility.departments || []).map(String));
    return [...(user.departmentNames || []), ...(user.departmentIds || [])].some((item) => allowed.has(String(item)));
  }
  if (visibility.scope === "users") {
    return (visibility.users || []).map(String).includes(String(user.userid));
  }
  return true;
}

function filterDataForUser(data, user) {
  const admin = isAdmin(user, data);
  return {
    ...data,
    policies: data.policies.filter((policy) => canViewPolicy(policy, user, admin)),
    account: undefined,
    user,
    isAdmin: admin
  };
}

function readRawBody(req, limit = 25 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > limit) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

async function readJsonBody(req) {
  const body = await readRawBody(req);
  return body ? JSON.parse(body) : null;
}

function makeLoginUrl(next = "/") {
  const redirectUri = `${PUBLIC_BASE_URL}/api/wecom/oauth/callback`;
  const state = Buffer.from(JSON.stringify({ next })).toString("base64url");
  return `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${encodeURIComponent(WECOM_CORP_ID)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=snsapi_base&agentid=${encodeURIComponent(WECOM_AGENT_ID)}&state=${encodeURIComponent(state)}#wechat_redirect`;
}

function decodeState(state) {
  try {
    return JSON.parse(Buffer.from(state || "", "base64url").toString("utf8"));
  } catch {
    return { next: "/" };
  }
}

function sha1(items) {
  return crypto.createHash("sha1").update(items.map(String).sort().join("")).digest("hex");
}

function createWeComSignature(timestamp, nonce, encrypted) {
  return sha1([WECOM_TOKEN || "", timestamp || "", nonce || "", encrypted || ""]);
}

function logWeComCallback(message, extra = {}) {
  console.log("[wecom-message-callback]", message, extra);
}

function getAesKey() {
  if (WECOM_ENCODING_AES_KEY.length !== 43) {
    throw new Error("WECOM_ENCODING_AES_KEY 长度必须为 43 位");
  }
  const key = Buffer.from(`${WECOM_ENCODING_AES_KEY}=`, "base64");
  if (key.length !== 32) {
    throw new Error("invalid aes key");
  }
  return key;
}

function pkcs7Unpad(buffer) {
  const pad = buffer[buffer.length - 1];
  if (pad < 1 || pad > 32) return buffer;
  return buffer.subarray(0, buffer.length - pad);
}

function decryptWeComMessage(encrypted) {
  const key = getAesKey();
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, key.subarray(0, 16));
  decipher.setAutoPadding(false);
  const decrypted = pkcs7Unpad(Buffer.concat([
    decipher.update(encrypted, "base64"),
    decipher.final()
  ]));
  const msgLength = decrypted.readUInt32BE(16);
  const message = decrypted.subarray(20, 20 + msgLength).toString("utf8");
  const receiveId = decrypted.subarray(20 + msgLength).toString("utf8");
  if (receiveId && receiveId !== WECOM_CORP_ID) {
    throw new Error("企业微信回调 CorpID 校验失败");
  }
  return { message, receiveId };
}

function extractXmlValue(xml, tag) {
  const match = String(xml).match(new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`));
  return match ? match[1].trim() : "";
}

async function handleWeComMessageCallback(req, res, url) {
  const signature = url.searchParams.get("msg_signature") || "";
  const timestamp = url.searchParams.get("timestamp") || "";
  const nonce = url.searchParams.get("nonce") || "";

  if (req.method === "GET") {
    const echostr = url.searchParams.get("echostr") || "";
    const expectedSignature = createWeComSignature(timestamp, nonce, echostr);
    logWeComCallback("GET verify start", {
      hasMsgSignature: Boolean(signature),
      hasTimestamp: Boolean(timestamp),
      hasNonce: Boolean(nonce),
      hasEchostr: Boolean(echostr),
      tokenLength: WECOM_TOKEN.length,
      aesKeyLength: WECOM_ENCODING_AES_KEY.length,
      hasCorpId: Boolean(WECOM_CORP_ID),
      expectedSignature,
      receivedSignature: signature
    });

    if (!requireWeComMessageConfig()) {
      logWeComCallback("GET config missing", {
        tokenLength: WECOM_TOKEN.length,
        aesKeyLength: WECOM_ENCODING_AES_KEY.length,
        hasCorpId: Boolean(WECOM_CORP_ID)
      });
      sendText(res, 500, "wecom message config missing");
      return true;
    }

    if (!signature || !timestamp || !nonce || !echostr) {
      logWeComCallback("GET query missing");
      sendText(res, 400, "missing query");
      return true;
    }

    if (expectedSignature !== signature) {
      logWeComCallback("GET signature mismatch", { expectedSignature, receivedSignature: signature });
      sendText(res, 403, "invalid signature");
      return true;
    }

    try {
      const decrypted = decryptWeComMessage(echostr);
      const hasReceiveId = Boolean(decrypted.receiveId);
      const corpIdMatched = hasReceiveId ? decrypted.receiveId === WECOM_CORP_ID : true;
      logWeComCallback("GET decrypt success", {
        decrypted: true,
        hasReceiveId,
        corpIdMatched,
        plainTextLength: decrypted.message.length
      });

      if (hasReceiveId && !corpIdMatched) {
        sendText(res, 403, "corpId mismatch");
        return true;
      }

      logWeComCallback("GET verify response sent", {
        status: 200,
        plainTextLength: decrypted.message.length
      });
      res.writeHead(200, {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store"
      });
      res.end(decrypted.message);
      return true;
    } catch (error) {
      logWeComCallback("GET decrypt failed", { decrypted: false, error: error.message });
      sendText(res, 400, "decrypt failed");
      return true;
    }
  }

  if (req.method === "POST") {
    const xml = await readRawBody(req, 2 * 1024 * 1024);
    const encrypted = extractXmlValue(xml, "Encrypt");
    const expectedSignature = createWeComSignature(timestamp, nonce, encrypted);
    logWeComCallback("POST receive", {
      hasMsgSignature: Boolean(signature),
      hasTimestamp: Boolean(timestamp),
      hasNonce: Boolean(nonce),
      hasEncrypt: Boolean(encrypted),
      tokenLength: WECOM_TOKEN.length,
      aesKeyLength: WECOM_ENCODING_AES_KEY.length,
      hasCorpId: Boolean(WECOM_CORP_ID),
      expectedSignature,
      receivedSignature: signature
    });
    if (!encrypted) {
      sendText(res, 400, "missing Encrypt");
      return true;
    }
    if (!requireWeComMessageConfig()) {
      sendText(res, 500, "wecom message config missing");
      return true;
    }
    if (expectedSignature !== signature) {
      logWeComCallback("POST signature mismatch", { expectedSignature, receivedSignature: signature });
      sendText(res, 403, "invalid signature");
      return true;
    }
    try {
      const decrypted = decryptWeComMessage(encrypted);
      const toUserName = extractXmlValue(decrypted.message, "ToUserName");
      const corpIdMatched = toUserName
        ? toUserName === WECOM_CORP_ID
        : decrypted.receiveId === WECOM_CORP_ID;
      logWeComCallback("POST decrypt success", {
        decrypted: true,
        hasToUserName: Boolean(toUserName),
        hasReceiveId: Boolean(decrypted.receiveId),
        corpIdMatched
      });
      if (!corpIdMatched) {
        sendText(res, 403, "corpId mismatch");
        return true;
      }
    } catch (error) {
      logWeComCallback("POST decrypt failed", { decrypted: false, error: error.message });
      sendText(res, 400, "decrypt failed");
      return true;
    }
    sendText(res, 200, "success");
    return true;
  }

  return false;
}

async function handleAuth(req, res, pathname, url) {
  if (pathname === "/api/wecom/login") {
    if (!requireWeComLoginConfig()) {
      sendJson(res, 500, { error: "企业微信登录配置缺失，请设置 WECOM_CORP_ID / WECOM_AGENT_ID / WECOM_SECRET" });
      return true;
    }
    redirect(res, makeLoginUrl(url.searchParams.get("next") || "/"));
    return true;
  }

  if (pathname === "/api/wecom/oauth/callback") {
    try {
      const user = await getWeComUser(url.searchParams.get("code") || "");
      bootstrapAdminIfNeeded(user);
      saveUser(user);
      setSessionCookie(res, user);
      redirect(res, decodeState(url.searchParams.get("state")).next || "/");
    } catch (error) {
      sendJson(res, 401, { error: error.message || "企业微信登录失败" });
    }
    return true;
  }

  if (pathname === "/api/wecom/callback") {
    sendJson(res, 400, { error: "登录回调已迁移到 /api/wecom/oauth/callback；消息回调请使用 /api/wecom/message/callback" });
    return true;
  }

  if (pathname === "/api/session") {
    const session = getSession(req);
    if (!session) {
      sendJson(res, 200, { loggedIn: false, loginUrl: makeLoginUrl("/") });
      return true;
    }
    sendJson(res, 200, { loggedIn: true, user: session.user, isAdmin: isAdmin(session.user) });
    return true;
  }

  if (pathname === "/api/logout") {
    res.setHeader("Set-Cookie", "zhidu_sid=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
    sendJson(res, 200, { ok: true });
    return true;
  }

  return false;
}

async function handleApi(req, res, pathname) {
  const session = getSession(req);
  if (!session) {
    sendJson(res, 401, { error: "未登录", loginUrl: makeLoginUrl(req.url) });
    return true;
  }

  if (req.method === "GET" && pathname === "/api/data") {
    sendJson(res, 200, filterDataForUser(readData(), session.user));
    return true;
  }

  if (req.method !== "POST") return false;

  const data = readData();
  if (!isAdmin(session.user, data)) {
    sendJson(res, 403, { error: "没有后台权限" });
    return true;
  }

  const payload = await readJsonBody(req);

  if (pathname === "/api/policies") {
    data.policies = Array.isArray(payload) ? payload : [];
  } else if (pathname === "/api/options") {
    data.options = {
      departments: Array.isArray(payload?.departments) ? payload.departments : data.options.departments,
      categories: Array.isArray(payload?.categories) ? payload.categories : data.options.categories
    };
  } else if (pathname === "/api/account") {
    data.account = {
      account: String(payload?.account || data.account.account),
      password: String(payload?.password || data.account.password)
    };
  } else if (pathname === "/api/admins") {
    data.admins = Array.isArray(payload) ? payload.map(String).filter(Boolean) : data.admins;
  } else {
    return false;
  }

  writeData(data);
  sendJson(res, 200, { ok: true });
  return true;
}

function serveStatic(req, res, pathname) {
  const protectedHtml = pathname === "/" || pathname === "/index.html" || pathname === "/admin.html";
  const session = getSession(req);
  if (protectedHtml && !session) {
    redirect(res, makeLoginUrl(req.url));
    return;
  }
  if (pathname === "/admin.html" && !isAdmin(session?.user)) {
    sendText(res, 403, "没有后台权限");
    return;
  }

  const safePath = pathname === "/" ? "/index.html" : decodeURIComponent(pathname);
  const filePath = path.normalize(path.join(ROOT, safePath));

  if (!filePath.startsWith(ROOT) || filePath === DATA_FILE) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": mimeTypes[ext] || "application/octet-stream",
      "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=60"
    });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname === "/api/wecom/message/callback" && await handleWeComMessageCallback(req, res, url)) return;
    if (await handleAuth(req, res, url.pathname, url)) return;
    if (url.pathname.startsWith("/api/") && await handleApi(req, res, url.pathname)) return;
    serveStatic(req, res, url.pathname);
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Server error" });
  }
});

server.listen(PORT, () => {
  console.log(`Management handbook server running at http://127.0.0.1:${PORT}`);
});
