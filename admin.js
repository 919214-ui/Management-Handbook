const POLICY_STORAGE_KEY = "xinhua-education-policy-manual";
const NOTICE_STORAGE_KEY = "xinhua-education-notices";
const LOGIN_KEY = "xinhua-education-admin-login";
const ADMIN_ACCOUNT = "admin";
const ADMIN_PASSWORD = "123456";

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

const state = {
  policies: loadPolicies(),
  notices: loadNotices(),
  imageDraft: null,
  documentDraft: null
};

const els = {
  loginPanel: document.querySelector("#loginPanel"),
  adminWorkspace: document.querySelector("#adminWorkspace"),
  loginForm: document.querySelector("#loginForm"),
  loginAccount: document.querySelector("#loginAccount"),
  loginPassword: document.querySelector("#loginPassword"),
  logoutButton: document.querySelector("#logoutButton"),
  noticeForm: document.querySelector("#noticeForm"),
  noticeId: document.querySelector("#noticeId"),
  noticeTitle: document.querySelector("#noticeTitle"),
  noticeContent: document.querySelector("#noticeContent"),
  noticeStart: document.querySelector("#noticeStart"),
  noticeEnd: document.querySelector("#noticeEnd"),
  noticePinned: document.querySelector("#noticePinned"),
  resetNoticeButton: document.querySelector("#resetNoticeButton"),
  noticeAdminCount: document.querySelector("#noticeAdminCount"),
  noticeAdminList: document.querySelector("#noticeAdminList"),
  form: document.querySelector("#policyForm"),
  formHint: document.querySelector("#formHint"),
  policyId: document.querySelector("#policyId"),
  policyTitle: document.querySelector("#policyTitle"),
  policyCategory: document.querySelector("#policyCategory"),
  policyOwner: document.querySelector("#policyOwner"),
  policyStatus: document.querySelector("#policyStatus"),
  policyUpdated: document.querySelector("#policyUpdated"),
  policyExecuteStart: document.querySelector("#policyExecuteStart"),
  policyExecuteEnd: document.querySelector("#policyExecuteEnd"),
  policyKeywords: document.querySelector("#policyKeywords"),
  policySummary: document.querySelector("#policySummary"),
  policyContent: document.querySelector("#policyContent"),
  policyImage: document.querySelector("#policyImage"),
  policyDocument: document.querySelector("#policyDocument"),
  mediaPreview: document.querySelector("#mediaPreview"),
  resetFormButton: document.querySelector("#resetFormButton"),
  adminCount: document.querySelector("#adminCount"),
  adminPolicyList: document.querySelector("#adminPolicyList"),
  importFile: document.querySelector("#importFile"),
  importText: document.querySelector("#importText"),
  importButton: document.querySelector("#importButton"),
  exportButton: document.querySelector("#exportButton"),
  toast: document.querySelector("#toast")
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
    const list = saved ? JSON.parse(saved) : [];
    return list.map(normalizeNotice);
  } catch {
    return [];
  }
}

function savePolicies() {
  localStorage.setItem(POLICY_STORAGE_KEY, JSON.stringify(state.policies));
}

function saveNotices() {
  localStorage.setItem(NOTICE_STORAGE_KEY, JSON.stringify(state.notices));
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function splitKeywords(value) {
  return String(value)
    .split(/[、，,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizePolicy(policy) {
  const keywords = Array.isArray(policy.keywords) ? policy.keywords : splitKeywords(policy.keywords || "");
  return {
    id: policy.id || createId("policy"),
    title: String(policy.title || "未命名制度").trim(),
    category: String(policy.category || "未分类").trim(),
    owner: String(policy.owner || "未设置").trim(),
    status: String(policy.status || "现行有效").trim(),
    updated: String(policy.updated || today()).trim(),
    executeStart: String(policy.executeStart || "").trim(),
    executeEnd: String(policy.executeEnd || "").trim(),
    keywords: keywords.map((item) => String(item).trim()).filter(Boolean),
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
    id: notice.id || createId("notice"),
    title: String(notice.title || "未命名公告").trim(),
    content: String(notice.content || "").trim(),
    start: String(notice.start || "").trim(),
    end: String(notice.end || "").trim(),
    pinned: Boolean(notice.pinned),
    createdAt: String(notice.createdAt || today()).trim()
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => els.toast.classList.remove("show"), 2200);
}

function setLoggedIn(isLoggedIn) {
  localStorage.setItem(LOGIN_KEY, isLoggedIn ? "1" : "");
  els.loginPanel.hidden = isLoggedIn;
  els.adminWorkspace.hidden = !isLoggedIn;
}

function fileToDraft(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ data: reader.result, name: file.name, type: file.type });
    reader.onerror = () => reject(new Error("文件读取失败"));
    reader.readAsDataURL(file);
  });
}

function renderMediaPreview(policy = null) {
  const image = state.imageDraft || (policy?.imageData ? {
    data: policy.imageData,
    name: policy.imageName,
    type: "image/*"
  } : null);
  const documentFile = state.documentDraft || (policy?.documentData ? {
    data: policy.documentData,
    name: policy.documentName,
    type: policy.documentType
  } : null);

  els.mediaPreview.innerHTML = `
    <div class="preview-box">
      <strong>图片展示</strong>
      ${image ? `<img src="${image.data}" alt="${escapeHtml(image.name || "制度图片")}" />` : `<p>未选择图片</p>`}
    </div>
    <div class="preview-box">
      <strong>正式文件</strong>
      ${documentFile ? `<p>${escapeHtml(documentFile.name || "已上传文件")}</p>` : `<p>未选择正式文件</p>`}
    </div>
  `;
}

function resetForm() {
  els.form.reset();
  els.policyId.value = "";
  els.policyUpdated.value = today();
  els.policyExecuteStart.value = "";
  els.policyExecuteEnd.value = "";
  els.formHint.textContent = "填写后保存到制度库";
  state.imageDraft = null;
  state.documentDraft = null;
  renderMediaPreview();
}

function resetNoticeForm() {
  els.noticeForm.reset();
  els.noticeId.value = "";
}

function fillForm(policy) {
  els.policyId.value = policy.id;
  els.policyTitle.value = policy.title;
  els.policyCategory.value = policy.category;
  els.policyOwner.value = policy.owner;
  els.policyStatus.value = policy.status;
  els.policyUpdated.value = policy.updated;
  els.policyExecuteStart.value = policy.executeStart;
  els.policyExecuteEnd.value = policy.executeEnd;
  els.policyKeywords.value = policy.keywords.join("、");
  els.policySummary.value = policy.summary;
  els.policyContent.value = policy.content;
  els.formHint.textContent = `正在编辑：${policy.title}`;
  state.imageDraft = null;
  state.documentDraft = null;
  renderMediaPreview(policy);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function fillNoticeForm(notice) {
  els.noticeId.value = notice.id;
  els.noticeTitle.value = notice.title;
  els.noticeContent.value = notice.content;
  els.noticeStart.value = notice.start;
  els.noticeEnd.value = notice.end;
  els.noticePinned.checked = notice.pinned;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderNoticeAdminList() {
  els.noticeAdminCount.textContent = `${state.notices.length} 条`;

  if (!state.notices.length) {
    els.noticeAdminList.innerHTML = `<div class="empty-state">暂无公告，可以先新增一条通知。</div>`;
    return;
  }

  els.noticeAdminList.innerHTML = state.notices
    .slice()
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt))
    .map((notice) => `
      <article class="admin-item">
        <div class="policy-title-row">
          <h3>${escapeHtml(notice.title)}</h3>
          ${notice.pinned ? `<span class="pill status-pill">置顶</span>` : ""}
        </div>
        <p>${escapeHtml(notice.content)}</p>
        <div class="policy-meta">
          <span>${escapeHtml(getNoticeTimeText(notice))}</span>
        </div>
        <div class="item-actions">
          <button class="secondary-button" type="button" data-edit-notice-id="${notice.id}">编辑</button>
          <button class="danger-button" type="button" data-delete-notice-id="${notice.id}">删除</button>
        </div>
      </article>
    `)
    .join("");
}

function renderAdminList() {
  els.adminCount.textContent = `${state.policies.length} 条`;

  if (!state.policies.length) {
    els.adminPolicyList.innerHTML = `<div class="empty-state">制度库为空，可以先新增或导入制度。</div>`;
    return;
  }

  els.adminPolicyList.innerHTML = state.policies
    .map((policy) => `
      <article class="admin-item">
        <div class="policy-title-row">
          <h3>${escapeHtml(policy.title)}</h3>
          <span class="pill">${escapeHtml(policy.category)}</span>
          ${policy.documentData ? `<span class="pill status-pill">有正式文件</span>` : ""}
        </div>
        <p>${escapeHtml(policy.summary || "暂无摘要")}</p>
        <div class="policy-meta">
          <span>${escapeHtml(policy.owner)}</span>
          <span>${escapeHtml(policy.updated)}</span>
          <span>${escapeHtml(getExecuteText(policy))}</span>
          <span>${escapeHtml(policy.status)}</span>
          <span>${policy.imageData ? "已上传图片" : "无图片"}</span>
        </div>
        <div class="item-actions">
          <button class="secondary-button" type="button" data-edit-id="${policy.id}">编辑</button>
          <button class="danger-button" type="button" data-delete-id="${policy.id}">删除</button>
        </div>
      </article>
    `)
    .join("");
}

function importPolicies(rawText) {
  const parsed = JSON.parse(rawText);
  const incoming = Array.isArray(parsed) ? parsed : parsed.policies;
  if (!Array.isArray(incoming)) {
    throw new Error("导入内容需要是制度数组，或包含 policies 数组。");
  }

  const normalized = incoming.map(normalizePolicy);
  const existingIds = new Set(state.policies.map((policy) => policy.id));
  normalized.forEach((policy) => {
    if (existingIds.has(policy.id)) policy.id = createId("policy");
  });

  state.policies = [...normalized, ...state.policies];
  savePolicies();
  renderAdminList();
  showToast(`已导入 ${normalized.length} 条制度`);
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

els.loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const accountOk = els.loginAccount.value.trim() === ADMIN_ACCOUNT;
  const passwordOk = els.loginPassword.value === ADMIN_PASSWORD;
  if (!accountOk || !passwordOk) {
    showToast("账号或密码不正确");
    return;
  }
  setLoggedIn(true);
  renderNoticeAdminList();
  renderAdminList();
  showToast("已登录后台");
});

els.logoutButton.addEventListener("click", () => {
  setLoggedIn(false);
  showToast("已退出登录");
});

els.noticeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const notice = normalizeNotice({
    id: els.noticeId.value || createId("notice"),
    title: els.noticeTitle.value,
    content: els.noticeContent.value,
    start: els.noticeStart.value,
    end: els.noticeEnd.value,
    pinned: els.noticePinned.checked,
    createdAt: state.notices.find((item) => item.id === els.noticeId.value)?.createdAt || today()
  });

  const index = state.notices.findIndex((item) => item.id === notice.id);
  if (index >= 0) {
    state.notices.splice(index, 1, notice);
  } else {
    state.notices.unshift(notice);
  }
  saveNotices();
  resetNoticeForm();
  renderNoticeAdminList();
  showToast("公告已保存");
});

els.resetNoticeButton.addEventListener("click", resetNoticeForm);

els.noticeAdminList.addEventListener("click", (event) => {
  const editButton = event.target.closest("[data-edit-notice-id]");
  const deleteButton = event.target.closest("[data-delete-notice-id]");

  if (editButton) {
    const notice = state.notices.find((item) => item.id === editButton.dataset.editNoticeId);
    if (notice) fillNoticeForm(notice);
  }

  if (deleteButton) {
    const notice = state.notices.find((item) => item.id === deleteButton.dataset.deleteNoticeId);
    if (!notice) return;
    const confirmed = window.confirm(`确定删除公告《${notice.title}》吗？`);
    if (!confirmed) return;
    state.notices = state.notices.filter((item) => item.id !== notice.id);
    saveNotices();
    renderNoticeAdminList();
    showToast("公告已删除");
  }
});

els.policyImage.addEventListener("change", async () => {
  const file = els.policyImage.files[0];
  state.imageDraft = file ? await fileToDraft(file) : null;
  const policy = state.policies.find((item) => item.id === els.policyId.value);
  renderMediaPreview(policy);
});

els.policyDocument.addEventListener("change", async () => {
  const file = els.policyDocument.files[0];
  state.documentDraft = file ? await fileToDraft(file) : null;
  const policy = state.policies.find((item) => item.id === els.policyId.value);
  renderMediaPreview(policy);
});

els.form.addEventListener("submit", (event) => {
  event.preventDefault();
  const existing = state.policies.find((item) => item.id === els.policyId.value);
  const policy = normalizePolicy({
    id: els.policyId.value || createId("policy"),
    title: els.policyTitle.value,
    category: els.policyCategory.value,
    owner: els.policyOwner.value,
    status: els.policyStatus.value,
    updated: els.policyUpdated.value,
    executeStart: els.policyExecuteStart.value,
    executeEnd: els.policyExecuteEnd.value,
    keywords: splitKeywords(els.policyKeywords.value),
    summary: els.policySummary.value,
    content: els.policyContent.value,
    imageData: state.imageDraft?.data || existing?.imageData || "",
    imageName: state.imageDraft?.name || existing?.imageName || "",
    documentData: state.documentDraft?.data || existing?.documentData || "",
    documentName: state.documentDraft?.name || existing?.documentName || "",
    documentType: state.documentDraft?.type || existing?.documentType || ""
  });

  const index = state.policies.findIndex((item) => item.id === policy.id);
  if (index >= 0) {
    state.policies.splice(index, 1, policy);
  } else {
    state.policies.unshift(policy);
  }

  savePolicies();
  resetForm();
  renderAdminList();
  showToast("制度已保存，员工端可查询");
});

els.resetFormButton.addEventListener("click", resetForm);

els.adminPolicyList.addEventListener("click", (event) => {
  const editButton = event.target.closest("[data-edit-id]");
  const deleteButton = event.target.closest("[data-delete-id]");

  if (editButton) {
    const policy = state.policies.find((item) => item.id === editButton.dataset.editId);
    if (policy) fillForm(policy);
  }

  if (deleteButton) {
    const policy = state.policies.find((item) => item.id === deleteButton.dataset.deleteId);
    if (!policy) return;
    const confirmed = window.confirm(`确定删除《${policy.title}》吗？`);
    if (!confirmed) return;
    state.policies = state.policies.filter((item) => item.id !== policy.id);
    savePolicies();
    renderAdminList();
    showToast("制度已删除");
  }
});

els.importFile.addEventListener("change", async () => {
  const file = els.importFile.files[0];
  if (!file) return;
  els.importText.value = await file.text();
});

els.importButton.addEventListener("click", () => {
  try {
    const text = els.importText.value.trim();
    if (!text) {
      showToast("请先选择文件或粘贴 JSON 内容");
      return;
    }
    importPolicies(text);
    els.importText.value = "";
    els.importFile.value = "";
  } catch (error) {
    showToast(error.message || "导入失败，请检查格式");
  }
});

els.exportButton.addEventListener("click", () => {
  const backup = {
    policies: state.policies,
    notices: state.notices
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `新火教育制度手册备份-${today()}.json`;
  link.click();
  URL.revokeObjectURL(url);
  showToast("已生成备份文件");
});

resetForm();
resetNoticeForm();
setLoggedIn(localStorage.getItem(LOGIN_KEY) === "1");
renderNoticeAdminList();
renderAdminList();
