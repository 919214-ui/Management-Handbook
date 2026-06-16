const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 3001);
const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, "data.json");

const defaultData = {
  policies: [],
  options: {
    departments: ["人力行政部", "教学教研部", "课程顾问部", "市场运营部", "财务部", "校区管理部", "综合管理部"],
    categories: ["人事制度", "教学制度", "财务制度", "行政制度", "安全制度", "服务规范", "操作流程"]
  },
  account: {
    account: "admin",
    password: "123456"
  }
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
      }
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

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 25 * 1024 * 1024) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : null);
      } catch (error) {
        reject(error);
      }
    });
  });
}

async function handleApi(req, res, pathname) {
  if (req.method === "GET" && pathname === "/api/data") {
    sendJson(res, 200, readData());
    return true;
  }

  if (req.method !== "POST") return false;

  const data = readData();
  const payload = await readBody(req);

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
  } else {
    return false;
  }

  writeData(data);
  sendJson(res, 200, { ok: true });
  return true;
}

function serveStatic(req, res, pathname) {
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
    const { pathname } = new URL(req.url, `http://${req.headers.host}`);
    if (pathname.startsWith("/api/") && await handleApi(req, res, pathname)) return;
    serveStatic(req, res, pathname);
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Server error" });
  }
});

server.listen(PORT, () => {
  console.log(`Management handbook server running at http://127.0.0.1:${PORT}`);
});
