const POLICY_STORAGE_KEY = "xinhua-education-policy-manual";
const NOTICE_STORAGE_KEY = "xinhua-education-notices";
const ALL_CATEGORY = "全部制度";

const defaultPolicies = [
  {
    id: "attendance",
    title: "员工考勤管理制度",
    category: "人事制度",
    owner: "人力行政部",
    status: "现行有效",
    updated: "2026-06-01",
    executeStart: "2026-06-01",
    executeEnd: "",
    keywords: ["考勤", "打卡", "迟到", "早退", "外勤"],
    summary: "规范员工上下班打卡、迟到早退、外勤登记和考勤异常处理方式。",
    content:
      "员工应按公司规定时间上下班，并通过指定系统完成打卡。\n因外勤、出差、客户拜访无法正常打卡的，应在当日提交外勤说明。\n迟到、早退、缺卡等异常记录由员工本人在三个工作日内发起说明。\n连续或频繁出现考勤异常的，由直属上级与人力行政部共同跟进。",
    imageData: "",
    imageName: "",
    documentData: "",
    documentName: "",
    documentType: ""
  }
];

const defaultNotices = [
  {
    id: "notice-welcome",
    title: "制度手册上线通知",
    content: "新火教育制度手册已上线，员工可通过搜索快速查询各项规章制度。",
    start: "",
    end: "",
    pinned: true,
    createdAt: "2026-06-15"
  }
];

const state = {
  policies: loadPolicies(),
  notices: loadNotices(),
  activeCategory: ALL_CATEGORY,
  activePolicyId: null
};

const els = {
  noticeCard: document.querySelector("#noticeCard"),
  noticeList: document.querySelector("#noticeList"),
  noticeCount: document.querySelector("#noticeCount"),
  search: document.querySelector("#employeeSearch"),
  quickTags: document.querySelector("#quickTags"),
  employeeCategories: document.querySelector("#employeeCategories"),
  employeeCount: document.querySelector("#employeeCount"),
  employeePolicyList: document.querySelector("#employeePolicyList"),
  employeePolicyDetail: document.querySelector("#employeePolicyDetail")
};

function loadPolicies() {
  try {
    const saved = localStorage.getItem(POLICY_STORAGE_KEY);
    const list = saved ? JSON.parse(saved) : defaultPolicies;
    return list.map(normalizePolicy);
  } catch {
    return defaultPolicies.map(normalizePolicy);
  }
}

function loadNotices() {
  try {
    const saved = localStorage.getItem(NOTICE_STORAGE_KEY);
    const list = saved ? JSON.parse(saved) : defaultNotices;
    return list.map(normalizeNotice);
  } catch {
    return defaultNotices.map(normalizeNotice);
  }
}

function normalizePolicy(policy) {
  return {
    id: policy.id || `policy-${Date.now()}`,
    title: String(policy.title || "未命名制度").trim(),
    category: String(policy.category || "未分类").trim(),
    owner: String(policy.owner || "未设置").trim(),
    status: String(policy.status || "现行有效").trim(),
    updated: String(policy.updated || "").trim(),
    executeStart: String(policy.executeStart || "").trim(),
    executeEnd: String(policy.executeEnd || "").trim(),
    keywords: Array.isArray(policy.keywords) ? policy.keywords : [],
    summary: String(policy.summary || "").trim(),
    content: String(policy.content || policy.body || "").trim(),
    imageData: policy.imageData || "",
    imageName: policy.imageName || "",
    documentData: policy.documentData || "",
    documentName: policy.documentName || "",
    documentType: policy.documentType || ""
  };
}

function normalizeNotice(notice) {
  return {
    id: notice.id || `notice-${Date.now()}`,
    title: String(notice.title || "未命名公告").trim(),
    content: String(notice.content || "").trim(),
    start: String(notice.start || "").trim(),
    end: String(notice.end || "").trim(),
    pinned: Boolean(notice.pinned),
    createdAt: String(notice.createdAt || today()).trim()
  };
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlight(value, query) {
  const safe = escapeHtml(value);
  const trimmed = query.trim();
  if (!trimmed) return safe;
  return safe.replace(new RegExp(`(${escapeRegExp(trimmed)})`, "gi"), "<mark>$1</mark>");
}

function getCategories() {
  return [ALL_CATEGORY, ...new Set(state.policies.filter(isEmployeeVisible).map((policy) => policy.category))];
}

function getFilteredPolicies() {
  const query = els.search.value.trim().toLowerCase();

  return state.policies.filter((policy) => {
    if (!isEmployeeVisible(policy)) return false;
    const categoryMatch = state.activeCategory === ALL_CATEGORY || policy.category === state.activeCategory;
    const text = [
      policy.title,
      policy.category,
      policy.owner,
      policy.status,
      policy.updated,
      policy.executeStart,
      policy.executeEnd,
      policy.summary,
      policy.content,
      policy.keywords.join(" ")
    ]
      .join(" ")
      .toLowerCase();
    return categoryMatch && (!query || text.includes(query));
  });
}

function isEmployeeVisible(policy) {
  if (policy.status === "已停用") return false;
  if (!policy.executeEnd) return true;
  return policy.executeEnd >= today();
}

function isNoticeVisible(notice) {
  const current = today();
  if (notice.start && notice.start > current) return false;
  if (notice.end && notice.end < current) return false;
  return true;
}

function renderNotices() {
  const visible = state.notices
    .filter(isNoticeVisible)
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt));

  els.noticeCard.hidden = visible.length === 0;
  els.noticeCount.textContent = `${visible.length} 条`;
  els.noticeList.innerHTML = visible
    .map((notice) => `
      <article class="notice-item">
        <div class="notice-title-row">
          <h3>${escapeHtml(notice.title)}</h3>
          ${notice.pinned ? `<span class="pill status-pill">置顶</span>` : ""}
        </div>
        <p>${escapeHtml(notice.content)}</p>
        <div class="policy-meta">
          <span>${escapeHtml(getNoticeTimeText(notice))}</span>
        </div>
      </article>
    `)
    .join("");
}

function renderQuickTags() {
  const tags = [...new Set(state.policies.filter(isEmployeeVisible).flatMap((policy) => policy.keywords))].slice(0, 10);
  els.quickTags.innerHTML = tags
    .map((tag) => `<button class="tag-button" type="button" data-keyword="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`)
    .join("");
}

function renderCategories() {
  const visiblePolicies = state.policies.filter(isEmployeeVisible);
  els.employeeCategories.innerHTML = getCategories()
    .map((category) => {
      const count = category === ALL_CATEGORY
        ? visiblePolicies.length
        : visiblePolicies.filter((policy) => policy.category === category).length;
      const active = category === state.activeCategory ? " active" : "";
      return `<button class="category-button${active}" type="button" data-category="${escapeHtml(category)}">${escapeHtml(category)} ${count}</button>`;
    })
    .join("");
}

function renderEmployeeList() {
  const policies = getFilteredPolicies();
  const query = els.search.value;
  els.employeeCount.textContent = `${policies.length} 条`;

  if (!policies.length) {
    els.employeePolicyList.innerHTML = `<div class="empty-state">没有找到相关制度，可以换个关键词试试。</div>`;
    els.employeePolicyDetail.innerHTML = `<div class="empty-state">暂无可查看的制度详情。</div>`;
    return;
  }

  if (!policies.some((policy) => policy.id === state.activePolicyId)) {
    state.activePolicyId = policies[0].id;
  }

  els.employeePolicyList.innerHTML = policies
    .map((policy) => {
      const active = policy.id === state.activePolicyId ? " active" : "";
      return `
        <button class="policy-item${active}" type="button" data-policy-id="${policy.id}">
          <div class="policy-title-row">
            <h3>${highlight(policy.title, query)}</h3>
            <span class="pill status-pill">${escapeHtml(policy.status)}</span>
          </div>
          <div class="policy-meta">
            <span class="pill">${escapeHtml(policy.category)}</span>
            <span>${escapeHtml(policy.owner)}</span>
            <span>${escapeHtml(policy.updated)}</span>
            <span>${escapeHtml(getExecuteText(policy))}</span>
          </div>
          <p>${highlight(policy.summary, query)}</p>
        </button>
      `;
    })
    .join("");

  renderEmployeeDetail();
}

function renderEmployeeDetail() {
  const policy = state.policies.find((item) => item.id === state.activePolicyId) || getFilteredPolicies()[0];
  const query = els.search.value;
  if (!policy) return;

  const lines = policy.content
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const imageHtml = policy.imageData
    ? `<img class="policy-image" src="${policy.imageData}" alt="${escapeHtml(policy.imageName || policy.title)}" />`
    : `<div class="image-placeholder">暂无制度图片展示</div>`;

  els.employeePolicyDetail.innerHTML = `
    <div class="detail-header">
      <div>
        <span class="pill">${escapeHtml(policy.category)}</span>
        <h2>${highlight(policy.title, query)}</h2>
      </div>
      <span class="pill status-pill">${escapeHtml(policy.status)}</span>
    </div>
    <div class="detail-grid">
      <div class="detail-stat"><span>责任部门</span><strong>${escapeHtml(policy.owner)}</strong></div>
      <div class="detail-stat"><span>执行时间</span><strong>${escapeHtml(getExecuteText(policy))}</strong></div>
      <div class="detail-stat"><span>关键词</span><strong>${policy.keywords.map(escapeHtml).join("、") || "未设置"}</strong></div>
    </div>
    <section class="detail-section">
      <h3>图片展示</h3>
      ${imageHtml}
    </section>
    <section class="detail-section">
      <h3>制度摘要</h3>
      <p>${highlight(policy.summary, query)}</p>
    </section>
    <section class="detail-section">
      <h3>制度正文</h3>
      <div class="content-lines">
        ${lines.map((line) => `<div class="content-line">${highlight(line, query)}</div>`).join("") || "<p>暂无正文内容。</p>"}
      </div>
    </section>
  `;
}

function getExecuteText(policy) {
  if (policy.executeStart && policy.executeEnd) return `${policy.executeStart} 至 ${policy.executeEnd}`;
  if (policy.executeStart) return `${policy.executeStart} 起执行`;
  if (policy.executeEnd) return `执行至 ${policy.executeEnd}`;
  return "长期执行";
}

function getNoticeTimeText(notice) {
  if (notice.start && notice.end) return `${notice.start} 至 ${notice.end}`;
  if (notice.start) return `${notice.start} 起展示`;
  if (notice.end) return `展示至 ${notice.end}`;
  return "长期展示";
}

els.search.addEventListener("input", renderEmployeeList);

els.quickTags.addEventListener("click", (event) => {
  const button = event.target.closest("[data-keyword]");
  if (!button) return;
  els.search.value = button.dataset.keyword;
  renderEmployeeList();
});

els.employeeCategories.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  state.activeCategory = button.dataset.category;
  renderCategories();
  renderEmployeeList();
});

els.employeePolicyList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-policy-id]");
  if (!button) return;
  state.activePolicyId = button.dataset.policyId;
  renderEmployeeList();
});

renderNotices();
renderQuickTags();
renderCategories();
renderEmployeeList();
