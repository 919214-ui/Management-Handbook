const POLICY_STORAGE_KEY = "xinhua-education-policy-manual";
const OPTIONS_STORAGE_KEY = "xinhua-education-policy-options";
const LOGIN_KEY = "xinhua-education-admin-login";
const ADMIN_ACCOUNT = "admin";
const ADMIN_PASSWORD = "123456";

const defaultPolicies = [
  {
    id: "attendance",
    title: "员工考勤管理制度",
    department: "人力行政部",
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
  options: loadOptions(),
  imageDraft: null
};

const els = {
  loginPanel: document.querySelector("#loginPanel"),
  adminWorkspace: document.querySelector("#adminWorkspace"),
  loginForm: document.querySelector("#loginForm"),
  loginAccount: document.querySelector("#loginAccount"),
  loginPassword: document.querySelector("#loginPassword"),
  logoutButton: document.querySelector("#logoutButton"),
  newDepartmentInput: document.querySelector("#newDepartmentInput"),
  addDepartmentButton: document.querySelector("#addDepartmentButton"),
  departmentOptionList: document.querySelector("#departmentOptionList"),
  newCategoryInput: document.querySelector("#newCategoryInput"),
  addCategoryButton: document.querySelector("#addCategoryButton"),
  categoryOptionList: document.querySelector("#categoryOptionList"),
  form: document.querySelector("#policyForm"),
  formHint: document.querySelector("#formHint"),
  policyId: document.querySelector("#policyId"),
  policyTitle: document.querySelector("#policyTitle"),
  policyDepartment: document.querySelector("#policyDepartment"),
  policyCategory: document.querySelector("#policyCategory"),
  policyStatus: document.querySelector("#policyStatus"),
  policyUpdated: document.querySelector("#policyUpdated"),
  policyExecuteStart: document.querySelector("#policyExecuteStart"),
  policyExecuteEnd: document.querySelector("#policyExecuteEnd"),
  policySummary: document.querySelector("#policySummary"),
  policyContent: document.querySelector("#policyContent"),
  policyImage: document.querySelector("#policyImage"),
  imagePasteBox: document.querySelector("#imagePasteBox"),
  mediaPreview: document.querySelector("#mediaPreview"),
  resetFormButton: document.querySelector("#resetFormButton"),
  adminCount: document.querySelector("#adminCount"),
  adminPolicyList: document.querySelector("#adminPolicyList"),
  adminSearchInput: document.querySelector("#adminSearchInput"),
  adminDepartmentFilter: document.querySelector("#adminDepartmentFilter"),
  adminCategoryFilter: document.querySelector("#adminCategoryFilter"),
  adminStatusFilter: document.querySelector("#adminStatusFilter"),
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

function loadOptions() {
  const defaults = {
    departments: ["人力行政部", "教学教研部", "课程顾问部", "市场运营部", "财务部", "校区管理部", "综合管理部"],
    categories: ["人事制度", "教学制度", "财务制度", "行政制度", "安全制度", "服务规范", "操作流程"]
  };

  try {
    const saved = localStorage.getItem(OPTIONS_STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : defaults;
    return {
      departments: normalizeOptions(parsed.departments, defaults.departments),
      categories: normalizeOptions(parsed.categories, defaults.categories)
    };
  } catch {
    return defaults;
  }
}

function savePolicies() {
  localStorage.setItem(POLICY_STORAGE_KEY, JSON.stringify(state.policies));
}

function saveOptions() {
  localStorage.setItem(OPTIONS_STORAGE_KEY, JSON.stringify(state.options));
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

function normalizeOptions(values, fallback) {
  const source = Array.isArray(values) && values.length ? values : fallback;
  return [...new Set(source.map((item) => String(item).trim()).filter(Boolean))];
}

function buildKeywords(fields) {
  return [...new Set([
    fields.department,
    fields.category,
    ...splitKeywords(fields.title),
    ...splitKeywords(fields.summary)
  ].filter(Boolean))];
}

function normalizePolicy(policy) {
  const keywords = Array.isArray(policy.keywords) ? policy.keywords : splitKeywords(policy.keywords || "");
  return {
    id: policy.id || createId("policy"),
    title: String(policy.title || "未命名制度").trim(),
    department: String(policy.department || policy.owner || "未设置部门").trim(),
    category: String(policy.category || "未分类").trim(),
    owner: String(policy.owner || policy.department || "未设置").trim(),
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
  els.mediaPreview.innerHTML = `
    <div class="preview-box">
      <strong>图片展示</strong>
      ${image ? `<a href="${image.data}" target="_blank" rel="noopener"><img src="${image.data}" alt="${escapeHtml(image.name || "制度图片")}" /></a>` : `<p>未选择图片，可点击选择或粘贴上传。</p>`}
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
  renderMediaPreview();
}

function renderSelectOptions() {
  syncOptionsWithPolicies();
  els.policyDepartment.innerHTML = state.options.departments
    .map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`)
    .join("");
  els.policyCategory.innerHTML = state.options.categories
    .map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`)
    .join("");
  renderAdminFilters();
}

function renderAdminFilters() {
  const selectedDepartment = els.adminDepartmentFilter.value;
  const selectedCategory = els.adminCategoryFilter.value;
  els.adminDepartmentFilter.innerHTML = [
    `<option value="">全部部门</option>`,
    ...state.options.departments.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`)
  ].join("");
  els.adminCategoryFilter.innerHTML = [
    `<option value="">全部类型</option>`,
    ...state.options.categories.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`)
  ].join("");
  els.adminDepartmentFilter.value = state.options.departments.includes(selectedDepartment) ? selectedDepartment : "";
  els.adminCategoryFilter.value = state.options.categories.includes(selectedCategory) ? selectedCategory : "";
}

function renderOptionLists() {
  els.departmentOptionList.innerHTML = state.options.departments
    .map((item) => renderOptionTag(item, "department"))
    .join("");
  els.categoryOptionList.innerHTML = state.options.categories
    .map((item) => renderOptionTag(item, "category"))
    .join("");
}

function renderOptionTag(item, type) {
  return `
    <span class="option-tag">
      ${escapeHtml(item)}
      <button type="button" aria-label="删除${escapeHtml(item)}" data-option-type="${type}" data-option-value="${escapeHtml(item)}">×</button>
    </span>
  `;
}

function syncOptionsWithPolicies() {
  state.options.departments = normalizeOptions([
    ...state.options.departments,
    ...state.policies.map((policy) => policy.department)
  ], state.options.departments);
  state.options.categories = normalizeOptions([
    ...state.options.categories,
    ...state.policies.map((policy) => policy.category)
  ], state.options.categories);
}

function addOption(type, value) {
  const trimmed = value.trim();
  if (!trimmed) {
    showToast("请输入选项名称");
    return;
  }
  const key = type === "department" ? "departments" : "categories";
  if (!state.options[key].includes(trimmed)) state.options[key].push(trimmed);
  saveOptions();
  renderSelectOptions();
  renderOptionLists();
  showToast("选项已保存");
}

function deleteOption(type, value) {
  const key = type === "department" ? "departments" : "categories";
  const used = type === "department"
    ? state.policies.some((policy) => policy.department === value)
    : state.policies.some((policy) => policy.category === value);
  if (used) {
    showToast("已有制度正在使用该选项，不能删除");
    return;
  }
  state.options[key] = state.options[key].filter((item) => item !== value);
  saveOptions();
  renderSelectOptions();
  renderOptionLists();
  showToast("选项已删除");
}

function fillForm(policy) {
  els.policyId.value = policy.id;
  els.policyTitle.value = policy.title;
  els.policyDepartment.value = policy.department;
  els.policyCategory.value = policy.category;
  els.policyStatus.value = policy.status;
  els.policyUpdated.value = policy.updated;
  els.policyExecuteStart.value = policy.executeStart;
  els.policyExecuteEnd.value = policy.executeEnd;
  els.policySummary.value = policy.summary;
  els.policyContent.value = policy.content;
  els.formHint.textContent = `正在编辑：${policy.title}`;
  state.imageDraft = null;
  renderMediaPreview(policy);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderAdminList() {
  const policies = getFilteredAdminPolicies();
  els.adminCount.textContent = `${policies.length} / ${state.policies.length} 条`;

  if (!state.policies.length) {
    els.adminPolicyList.innerHTML = `<div class="empty-state">制度库为空，可以先新增制度。</div>`;
    return;
  }

  if (!policies.length) {
    els.adminPolicyList.innerHTML = `<div class="empty-state">没有找到匹配的制度。</div>`;
    return;
  }

  els.adminPolicyList.innerHTML = policies
    .map((policy) => `
      <article class="admin-item">
        <div class="policy-title-row">
          <h3>${escapeHtml(policy.title)}</h3>
          <span class="pill">${escapeHtml(policy.department)}</span>
          <span class="pill">${escapeHtml(policy.category)}</span>
          ${policy.imageData ? `<span class="pill status-pill">有图片</span>` : ""}
        </div>
        <p>${escapeHtml(policy.summary || "暂无摘要")}</p>
        <div class="policy-meta">
          <span>${escapeHtml(policy.department)}</span>
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

function getFilteredAdminPolicies() {
  const query = els.adminSearchInput.value.trim().toLowerCase();
  const department = els.adminDepartmentFilter.value;
  const category = els.adminCategoryFilter.value;
  const status = els.adminStatusFilter.value;

  return state.policies.filter((policy) => {
    const text = [
      policy.title,
      policy.department,
      policy.category,
      policy.status,
      policy.summary,
      policy.content
    ].join(" ").toLowerCase();
    return (!query || text.includes(query))
      && (!department || policy.department === department)
      && (!category || policy.category === category)
      && (!status || policy.status === status);
  });
}

function getExecuteText(policy) {
  if (policy.executeStart && policy.executeEnd) return `${policy.executeStart} 至 ${policy.executeEnd}`;
  if (policy.executeStart) return `${policy.executeStart} 起执行`;
  if (policy.executeEnd) return `执行至 ${policy.executeEnd}`;
  return "长期执行";
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
  renderAdminList();
  showToast("已登录后台");
});

els.logoutButton.addEventListener("click", () => {
  setLoggedIn(false);
  showToast("已退出登录");
});

els.addDepartmentButton.addEventListener("click", () => {
  addOption("department", els.newDepartmentInput.value);
  els.newDepartmentInput.value = "";
});

els.addCategoryButton.addEventListener("click", () => {
  addOption("category", els.newCategoryInput.value);
  els.newCategoryInput.value = "";
});

els.departmentOptionList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-option-type]");
  if (!button) return;
  deleteOption(button.dataset.optionType, button.dataset.optionValue);
});

els.categoryOptionList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-option-type]");
  if (!button) return;
  deleteOption(button.dataset.optionType, button.dataset.optionValue);
});

els.policyImage.addEventListener("change", async () => {
  const file = els.policyImage.files[0];
  state.imageDraft = file ? await fileToDraft(file) : null;
  const policy = state.policies.find((item) => item.id === els.policyId.value);
  renderMediaPreview(policy);
});

els.imagePasteBox.addEventListener("paste", async (event) => {
  const imageItem = [...event.clipboardData.items].find((item) => item.type.startsWith("image/"));
  if (!imageItem) {
    showToast("剪贴板里没有图片");
    return;
  }
  event.preventDefault();
  state.imageDraft = await fileToDraft(imageItem.getAsFile());
  const policy = state.policies.find((item) => item.id === els.policyId.value);
  renderMediaPreview(policy);
  showToast("图片已粘贴上传");
});

els.form.addEventListener("submit", (event) => {
  event.preventDefault();
  const existing = state.policies.find((item) => item.id === els.policyId.value);
  const policy = normalizePolicy({
    id: els.policyId.value || createId("policy"),
    title: els.policyTitle.value,
    department: els.policyDepartment.value,
    category: els.policyCategory.value,
    owner: els.policyDepartment.value,
    status: els.policyStatus.value,
    updated: els.policyUpdated.value,
    executeStart: els.policyExecuteStart.value,
    executeEnd: els.policyExecuteEnd.value,
    keywords: buildKeywords({
      title: els.policyTitle.value,
      department: els.policyDepartment.value,
      category: els.policyCategory.value,
      summary: els.policySummary.value
    }),
    summary: els.policySummary.value,
    content: els.policyContent.value,
    imageData: state.imageDraft?.data || existing?.imageData || "",
    imageName: state.imageDraft?.name || existing?.imageName || "",
    documentData: "",
    documentName: "",
    documentType: ""
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

[els.adminSearchInput, els.adminDepartmentFilter, els.adminCategoryFilter, els.adminStatusFilter].forEach((control) => {
  control.addEventListener("input", renderAdminList);
  control.addEventListener("change", renderAdminList);
});

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

els.exportButton.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state.policies, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `新火教育制度手册备份-${today()}.json`;
  link.click();
  URL.revokeObjectURL(url);
  showToast("已生成备份文件");
});

resetForm();
renderSelectOptions();
renderOptionLists();
setLoggedIn(localStorage.getItem(LOGIN_KEY) === "1");
renderAdminList();
