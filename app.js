// Default Appwrite configuration constants
// You can either change these directly in code OR use the "Appwrite Config" button in the UI
const DEFAULT_CONFIG = {
  endpoint: 'https://cloud.appwrite.io/v1',
  projectId: '',       // e.g. '660f8df7000...'
  databaseId: '',      // e.g. 'articles_db'
  collectionId: '',    // e.g. 'articles'
};

// State management
let config = { ...DEFAULT_CONFIG };
let articles = [];
let activeTab = 'ongoing';
let isAppwriteReady = false;
let userName = localStorage.getItem('article_tracker_user_name') || 'Uma Chandra';
let selectedArticleIds = new Set();

// Appwrite instances
let client = null;
let databases = null;

// DOM Elements
const addArticleForm = document.getElementById('addArticleForm');
const articleTitleInput = document.getElementById('articleTitle');
const articleUrlInput = document.getElementById('articleUrl');
const ongoingList = document.getElementById('ongoingList');
const historyList = document.getElementById('historyList');
const ongoingSection = document.getElementById('ongoingSection');
const historySection = document.getElementById('historySection');
const ongoingCount = document.getElementById('ongoingCount');
const historyCount = document.getElementById('historyCount');
const tabOngoing = document.getElementById('tabOngoing');
const tabHistory = document.getElementById('tabHistory');

// Profile Elements
const openProfileBtn = document.getElementById('openProfileBtn');
const headerAvatarCircle = document.getElementById('headerAvatarCircle');
const headerProfileName = document.getElementById('headerProfileName');
const profileModal = document.getElementById('profileModal');
const closeProfileBtn = document.getElementById('closeProfileBtn');
const closeProfileFooterBtn = document.getElementById('closeProfileFooterBtn');
const modalAvatarCircle = document.getElementById('modalAvatarCircle');
const profileDisplayName = document.getElementById('profileDisplayName');
const editNameBtn = document.getElementById('editNameBtn');
const editNameGroup = document.getElementById('editNameGroup');
const profileNameInput = document.getElementById('profileNameInput');
const saveNameBtn = document.getElementById('saveNameBtn');
const cancelNameBtn = document.getElementById('cancelNameBtn');
const statTotalLinks = document.getElementById('statTotalLinks');
const statOngoingLinks = document.getElementById('statOngoingLinks');
const statCompletedLinks = document.getElementById('statCompletedLinks');

// Link Delete Management Elements
const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
const selectedCountText = document.getElementById('selectedCountText');
const moreDeleteOptionsBtn = document.getElementById('moreDeleteOptionsBtn');
const moreDeleteMenu = document.getElementById('moreDeleteMenu');
const deleteAllOngoingBtn = document.getElementById('deleteAllOngoingBtn');
const deleteAllCompletedBtn = document.getElementById('deleteAllCompletedBtn');
const deleteAllLinksBtn = document.getElementById('deleteAllLinksBtn');
const profileSearchInput = document.getElementById('profileSearchInput');
const profileStatusFilter = document.getElementById('profileStatusFilter');
const selectAllCheckbox = document.getElementById('selectAllCheckbox');
const profileLinksList = document.getElementById('profileLinksList');

// Modal Elements
const addModal = document.getElementById('addModal');
const openAddModalBtn = document.getElementById('openAddModalBtn');
const closeAddModalBtn = document.getElementById('closeAddModalBtn');
const cancelAddBtn = document.getElementById('cancelAddBtn');

// Link Action Modal Elements
const linkActionModal = document.getElementById('linkActionModal');
const closeLinkActionBtn = document.getElementById('closeLinkActionBtn');
const modalArticleTitle = document.getElementById('modalArticleTitle');
const modalArticleUrl = document.getElementById('modalArticleUrl');
const modalOpenBtn = document.getElementById('modalOpenBtn');
const modalCopyBtn = document.getElementById('modalCopyBtn');
const modalCopyBtnText = document.getElementById('modalCopyBtnText');
const statusOngoingBtn = document.getElementById('statusOngoingBtn');
const statusCompletedBtn = document.getElementById('statusCompletedBtn');
let activeModalArticleId = null;

// Custom Confirmation Dialog Elements
const customConfirmModal = document.getElementById('customConfirmModal');
const customConfirmTitle = document.getElementById('customConfirmTitle');
const customConfirmMessage = document.getElementById('customConfirmMessage');
const customConfirmCancelBtn = document.getElementById('customConfirmCancelBtn');
const customConfirmOkBtn = document.getElementById('customConfirmOkBtn');
const toastContainer = document.getElementById('toastContainer');
let confirmModalResolver = null;

// Custom Confirmation Dialog Function (Replaces browser confirm)
function showCustomConfirm({ title = 'Delete Link', message = 'Are you sure?', confirmText = 'Delete', danger = true }) {
  return new Promise((resolve) => {
    confirmModalResolver = resolve;

    if (customConfirmTitle) customConfirmTitle.textContent = title;
    if (customConfirmMessage) customConfirmMessage.textContent = message;
    if (customConfirmOkBtn) {
      customConfirmOkBtn.textContent = confirmText;
      customConfirmOkBtn.className = danger ? 'btn btn-danger-action' : 'btn btn-primary';
    }

    if (customConfirmModal) {
      customConfirmModal.classList.add('open');
      if (customConfirmOkBtn) customConfirmOkBtn.focus();
    }
  });
}

function closeCustomConfirm(result = false) {
  if (customConfirmModal) {
    customConfirmModal.classList.remove('open');
  }
  if (confirmModalResolver) {
    confirmModalResolver(result);
    confirmModalResolver = null;
  }
}

// In-app Toast Notification (Replaces browser alert)
function showToast(message, type = 'info', duration = 3200) {
  if (!toastContainer) return;

  const toast = document.createElement('div');
  toast.className = `toast-item toast-${type}`;
  toast.textContent = message;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-hiding');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 260);
  }, duration);
}

// Detect if running from direct file protocol and show warning
function checkProtocolWarning() {
  if (window.location.protocol === 'file:') {
    const banner = document.createElement('div');
    banner.className = 'protocol-warning-banner';
    banner.innerHTML = `
      <div class="protocol-warning-content">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink: 0;">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <span>
          <strong>Viewing as local file (file://):</strong> Appwrite Cloud blocks requests from direct <code>file://</code> URLs due to browser security policies.
          Please open this app through your local web server: <a href="http://localhost:5500" target="_blank" style="color: inherit; text-decoration: underline; font-weight: 600;">http://localhost:5500</a>
        </span>
      </div>
    `;
    const container = document.querySelector('.container');
    if (container) {
      container.insertBefore(banner, container.firstChild);
    } else {
      document.body.prepend(banner);
    }
  }
}

// --- Initialization ---
async function init() {
  checkProtocolWarning();
  await loadConfig();
  updateProfileDisplay();
  setupEventListeners();
  initAppwrite();
  loadArticles();
}

// Parse .env format key=value pairs
function parseEnv(text) {
  const env = {};
  text.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        env[key] = val;
      }
    }
  });
  return env;
}

// Load config from window.ENV (via env.js) or .env file
async function loadConfig() {
  localStorage.removeItem('appwrite_article_tracker_config');

  // 1. Read directly from window.ENV (loaded via env.js - immune to 404 dotfile restrictions)
  if (window.ENV) {
    if (window.ENV.APPWRITE_ENDPOINT) config.endpoint = window.ENV.APPWRITE_ENDPOINT;
    if (window.ENV.APPWRITE_PROJECT_ID) config.projectId = window.ENV.APPWRITE_PROJECT_ID;
    if (window.ENV.APPWRITE_DATABASE_ID) config.databaseId = window.ENV.APPWRITE_DATABASE_ID;
    if (window.ENV.APPWRITE_COLLECTION_ID || window.ENV.APPWRITE_TABLE_ID) {
      config.collectionId = window.ENV.APPWRITE_COLLECTION_ID || window.ENV.APPWRITE_TABLE_ID;
    }
  }

  // 2. If config is already complete from env.js, do not fetch .env to prevent 404 dotfile blocking
  if (config.endpoint && config.projectId && config.databaseId && config.collectionId) {
    return;
  }

  // 3. Fallback: try fetching .env if available on server (only when window.ENV is missing)
  try {
    const response = await fetch('.env');
    if (response.ok) {
      const text = await response.text();
      const env = parseEnv(text);
      if (env.APPWRITE_ENDPOINT) config.endpoint = env.APPWRITE_ENDPOINT;
      if (env.APPWRITE_PROJECT_ID) config.projectId = env.APPWRITE_PROJECT_ID;
      if (env.APPWRITE_DATABASE_ID) config.databaseId = env.APPWRITE_DATABASE_ID;
      if (env.APPWRITE_COLLECTION_ID || env.APPWRITE_TABLE_ID) {
        config.collectionId = env.APPWRITE_COLLECTION_ID || env.APPWRITE_TABLE_ID;
      }
    }
  } catch (err) {
    // Expected in environments that block direct fetch of dotfiles
  }
}

// Initialize Appwrite Client & Databases strictly from environment configuration
function initAppwrite() {
  if (config.endpoint && config.projectId && config.databaseId && config.collectionId) {
    try {
      client = new Appwrite.Client()
        .setEndpoint(config.endpoint)
        .setProject(config.projectId);
      
      databases = new Appwrite.Databases(client);
      isAppwriteReady = true;
      console.log('Appwrite successfully connected to database:', config.databaseId);
    } catch (err) {
      console.error('Appwrite init error:', err);
      isAppwriteReady = false;
    }
  } else {
    isAppwriteReady = false;
    console.warn('Appwrite configuration missing or incomplete.', config);
  }
}

// --- Event Listeners ---
function setupEventListeners() {
  // Tabs
  tabOngoing.addEventListener('click', () => switchTab('ongoing'));
  tabHistory.addEventListener('click', () => switchTab('history'));

  // Form Submit
  addArticleForm.addEventListener('submit', handleAddArticle);

  // Add Article Modal
  if (openAddModalBtn) {
    openAddModalBtn.addEventListener('click', openAddModal);
  }
  if (closeAddModalBtn) {
    closeAddModalBtn.addEventListener('click', closeAddModal);
  }
  if (cancelAddBtn) {
    cancelAddBtn.addEventListener('click', closeAddModal);
  }
  if (addModal) {
    addModal.addEventListener('click', (e) => {
      if (e.target === addModal) closeAddModal();
    });
  }

  // Profile Modal & Delete Options
  if (openProfileBtn) {
    openProfileBtn.addEventListener('click', openProfileModal);
  }
  if (closeProfileBtn) {
    closeProfileBtn.addEventListener('click', closeProfileModal);
  }
  if (closeProfileFooterBtn) {
    closeProfileFooterBtn.addEventListener('click', closeProfileModal);
  }
  if (profileModal) {
    profileModal.addEventListener('click', (e) => {
      if (e.target === profileModal) closeProfileModal();
    });
  }

  // Profile Name Editing
  if (editNameBtn) {
    editNameBtn.addEventListener('click', () => {
      editNameGroup.style.display = 'flex';
      profileNameInput.focus();
    });
  }
  if (saveNameBtn) {
    saveNameBtn.addEventListener('click', handleSaveName);
  }
  if (cancelNameBtn) {
    cancelNameBtn.addEventListener('click', () => {
      editNameGroup.style.display = 'none';
      profileNameInput.value = userName;
    });
  }
  if (profileNameInput) {
    profileNameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSaveName();
      }
    });
  }

  // Profile Link Management & Delete Controls
  if (deleteSelectedBtn) {
    deleteSelectedBtn.addEventListener('click', handleDeleteSelected);
  }
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', handleSelectAllChange);
  }
  if (profileSearchInput) {
    profileSearchInput.addEventListener('input', () => renderProfileLinksList());
  }
  if (profileStatusFilter) {
    profileStatusFilter.addEventListener('change', () => renderProfileLinksList());
  }

  // More Delete Options dropdown toggle
  if (moreDeleteOptionsBtn) {
    moreDeleteOptionsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = moreDeleteMenu.style.display === 'flex';
      moreDeleteMenu.style.display = isVisible ? 'none' : 'flex';
    });
  }
  document.addEventListener('click', (e) => {
    if (moreDeleteMenu && moreDeleteOptionsBtn && !moreDeleteOptionsBtn.contains(e.target) && !moreDeleteMenu.contains(e.target)) {
      moreDeleteMenu.style.display = 'none';
    }
  });

  if (deleteAllOngoingBtn) {
    deleteAllOngoingBtn.addEventListener('click', () => {
      moreDeleteMenu.style.display = 'none';
      handleDeleteByStatus('ongoing');
    });
  }
  if (deleteAllCompletedBtn) {
    deleteAllCompletedBtn.addEventListener('click', () => {
      moreDeleteMenu.style.display = 'none';
      handleDeleteByStatus('completed');
    });
  }
  if (deleteAllLinksBtn) {
    deleteAllLinksBtn.addEventListener('click', () => {
      moreDeleteMenu.style.display = 'none';
      handleDeleteAllArticles();
    });
  }

  // Link Action Modal
  if (closeLinkActionBtn) {
    closeLinkActionBtn.addEventListener('click', closeLinkActionModal);
  }
  if (linkActionModal) {
    linkActionModal.addEventListener('click', (e) => {
      if (e.target === linkActionModal) closeLinkActionModal();
    });
  }

  // Custom Confirmation Modal Listeners
  if (customConfirmCancelBtn) {
    customConfirmCancelBtn.addEventListener('click', () => closeCustomConfirm(false));
  }
  if (customConfirmOkBtn) {
    customConfirmOkBtn.addEventListener('click', () => closeCustomConfirm(true));
  }
  if (customConfirmModal) {
    customConfirmModal.addEventListener('click', (e) => {
      if (e.target === customConfirmModal) closeCustomConfirm(false);
    });
  }

  // Global escape key to close modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeCustomConfirm(false);
      closeAddModal();
      closeProfileModal();
      closeLinkActionModal();
      if (moreDeleteMenu) moreDeleteMenu.style.display = 'none';
    }
  });
}

function openAddModal() {
  addModal.classList.add('open');
  setTimeout(() => articleTitleInput.focus(), 60);
}

function closeAddModal() {
  addModal.classList.remove('open');
}

// Link Action Modal & Clipboard Functions
function openLinkActionModal(id) {
  const article = articles.find(a => a.id === id);
  if (!article) return;

  activeModalArticleId = id;
  modalArticleTitle.textContent = article.title;
  modalArticleUrl.textContent = article.url;
  modalCopyBtnText.textContent = 'Copy Link';

  modalOpenBtn.onclick = () => {
    window.open(article.url, '_blank', 'noopener,noreferrer');
  };

  modalCopyBtn.onclick = () => {
    navigator.clipboard.writeText(article.url);
    modalCopyBtnText.textContent = 'Copied!';
    setTimeout(() => {
      if (modalCopyBtnText) modalCopyBtnText.textContent = 'Copy Link';
    }, 1500);
  };

  if (article.status === 'ongoing') {
    statusOngoingBtn.className = 'btn-status-option active ongoing';
    statusCompletedBtn.className = 'btn-status-option';
  } else {
    statusOngoingBtn.className = 'btn-status-option';
    statusCompletedBtn.className = 'btn-status-option active completed';
  }

  statusOngoingBtn.onclick = () => {
    if (article.status !== 'ongoing') {
      updateArticleStatus(article.id, 'ongoing');
    }
    closeLinkActionModal();
  };

  statusCompletedBtn.onclick = () => {
    if (article.status !== 'completed') {
      updateArticleStatus(article.id, 'completed');
    }
    closeLinkActionModal();
  };

  linkActionModal.classList.add('open');
}

function closeLinkActionModal() {
  if (linkActionModal) linkActionModal.classList.remove('open');
  activeModalArticleId = null;
}

function copyArticleLink(url, btnElement) {
  navigator.clipboard.writeText(url);
  if (btnElement) {
    const origHtml = btnElement.innerHTML;
    btnElement.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    `;
    setTimeout(() => {
      btnElement.innerHTML = origHtml;
    }, 1500);
  }
}

// Profile Modal & Management Functions
function getInitials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function updateProfileDisplay() {
  const initials = getInitials(userName);
  if (headerProfileName) headerProfileName.textContent = userName;
  if (headerAvatarCircle) headerAvatarCircle.textContent = initials;
  if (profileDisplayName) profileDisplayName.textContent = userName;
  if (modalAvatarCircle) modalAvatarCircle.textContent = initials;
  if (profileNameInput) profileNameInput.value = userName;
}

function handleSaveName() {
  const val = profileNameInput.value.trim();
  if (val) {
    userName = val;
    localStorage.setItem('article_tracker_user_name', userName);
    updateProfileDisplay();
    editNameGroup.style.display = 'none';
  }
}

function openProfileModal() {
  selectedArticleIds.clear();
  if (profileSearchInput) profileSearchInput.value = '';
  if (profileStatusFilter) profileStatusFilter.value = 'all';
  if (editNameGroup) editNameGroup.style.display = 'none';
  renderProfileModal();
  profileModal.classList.add('open');
}

function closeProfileModal() {
  profileModal.classList.remove('open');
  if (moreDeleteMenu) moreDeleteMenu.style.display = 'none';
}

function renderProfileModal() {
  renderProfileStats();
  renderProfileLinksList();
}

function renderProfileStats() {
  const total = articles.length;
  const ongoing = articles.filter(a => a.status === 'ongoing').length;
  const completed = articles.filter(a => a.status === 'completed').length;

  if (statTotalLinks) statTotalLinks.textContent = total;
  if (statOngoingLinks) statOngoingLinks.textContent = ongoing;
  if (statCompletedLinks) statCompletedLinks.textContent = completed;
}

function getFilteredProfileArticles() {
  const query = profileSearchInput ? profileSearchInput.value.trim().toLowerCase() : '';
  const filter = profileStatusFilter ? profileStatusFilter.value : 'all';

  return articles.filter(article => {
    const matchesFilter = filter === 'all' || article.status === filter;
    const matchesQuery = !query || 
      (article.title && article.title.toLowerCase().includes(query)) || 
      (article.url && article.url.toLowerCase().includes(query));
    return matchesFilter && matchesQuery;
  });
}

function renderProfileLinksList() {
  if (!profileLinksList) return;
  const filtered = getFilteredProfileArticles();
  
  if (filtered.length === 0) {
    profileLinksList.innerHTML = `
      <div class="profile-empty-links">
        No links found matching your search or filter criteria.
      </div>
    `;
    updateSelectAllCheckbox(filtered);
    updateSelectedCountUI();
    return;
  }

  profileLinksList.innerHTML = filtered.map(article => {
    const isChecked = selectedArticleIds.has(article.id);
    const domain = getDomain(article.url);
    const statusText = article.status === 'completed' ? 'Completed' : 'Ongoing';
    const statusClass = article.status === 'completed' ? 'completed' : 'ongoing';

    return `
      <div class="profile-link-row ${isChecked ? 'selected' : ''}" data-id="${article.id}">
        <div class="profile-link-left">
          <input type="checkbox" class="profile-link-checkbox" data-id="${article.id}" ${isChecked ? 'checked' : ''} onchange="toggleArticleSelection('${article.id}', this.checked)">
          <div class="profile-link-info">
            <a href="${escapeHtml(article.url)}" target="_blank" rel="noopener noreferrer" class="profile-link-title-link" title="${escapeHtml(article.title)}">
              ${escapeHtml(article.title)}
            </a>
            <span class="profile-link-url-sub">${escapeHtml(domain)} &bull; ${escapeHtml(article.url)}</span>
          </div>
        </div>
        <div class="profile-link-right">
          <span class="status-pill ${statusClass}">${statusText}</span>
          <button type="button" class="btn-delete-row" title="Delete this link" onclick="deleteArticle('${article.id}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            Delete
          </button>
        </div>
      </div>
    `;
  }).join('');

  updateSelectAllCheckbox(filtered);
  updateSelectedCountUI();
}

function toggleArticleSelection(id, checked) {
  if (checked) {
    selectedArticleIds.add(id);
  } else {
    selectedArticleIds.delete(id);
  }
  const row = profileLinksList.querySelector(`.profile-link-row[data-id="${id}"]`);
  if (row) {
    if (checked) row.classList.add('selected');
    else row.classList.remove('selected');
  }
  const filtered = getFilteredProfileArticles();
  updateSelectAllCheckbox(filtered);
  updateSelectedCountUI();
}

function handleSelectAllChange(e) {
  const isChecked = e.target.checked;
  const filtered = getFilteredProfileArticles();
  filtered.forEach(article => {
    if (isChecked) {
      selectedArticleIds.add(article.id);
    } else {
      selectedArticleIds.delete(article.id);
    }
  });
  renderProfileLinksList();
}

function updateSelectAllCheckbox(filteredList) {
  if (!selectAllCheckbox) return;
  if (!filteredList || filteredList.length === 0) {
    selectAllCheckbox.checked = false;
    selectAllCheckbox.indeterminate = false;
    return;
  }

  const selectedInFiltered = filteredList.filter(a => selectedArticleIds.has(a.id)).length;
  if (selectedInFiltered === 0) {
    selectAllCheckbox.checked = false;
    selectAllCheckbox.indeterminate = false;
  } else if (selectedInFiltered === filteredList.length) {
    selectAllCheckbox.checked = true;
    selectAllCheckbox.indeterminate = false;
  } else {
    selectAllCheckbox.checked = false;
    selectAllCheckbox.indeterminate = true;
  }
}

function updateSelectedCountUI() {
  if (selectedCountText) selectedCountText.textContent = selectedArticleIds.size;
  if (deleteSelectedBtn) {
    deleteSelectedBtn.disabled = selectedArticleIds.size === 0;
  }
}

// Switch between Ongoing and History tabs
function switchTab(tab) {
  activeTab = tab;
  if (tab === 'ongoing') {
    tabOngoing.classList.add('active');
    tabHistory.classList.remove('active');
    ongoingSection.style.display = 'block';
    historySection.style.display = 'none';
  } else {
    tabHistory.classList.add('active');
    tabOngoing.classList.remove('active');
    ongoingSection.style.display = 'none';
    historySection.style.display = 'block';
  }
  renderArticles();
}

// --- Data Operations (Appwrite & Local Storage Fallback) ---

// Load articles
async function loadArticles() {
  if (isAppwriteReady) {
    try {
      const response = await databases.listDocuments(
        config.databaseId,
        config.collectionId,
        [Appwrite.Query.orderDesc('$createdAt'), Appwrite.Query.limit(100)]
      );

      articles = response.documents.map(doc => ({
        id: doc.$id,
        title: doc.title,
        url: doc.url,
        status: doc.status || 'ongoing',
        completed_at: doc.completed_at || null,
        created_at: doc.$createdAt || new Date().toISOString()
      }));
    } catch (err) {
      console.error('Error fetching articles from Appwrite:', err);
      let errorMsg = 'Error loading from Appwrite: ' + (err.message || 'Check permissions & table schema.');
      
      if (window.location.protocol === 'file:') {
        errorMsg = 'Cannot connect to Appwrite from file:// URL. Please open via http://localhost:5500 (Live Server).';
      } else if (err.code === 403 || err.type === 'general_unknown_origin') {
        errorMsg = `Appwrite 403 (Invalid Origin): Register '${window.location.origin}' under Platforms in your Appwrite console.`;
      } else if (err.code === 401) {
        errorMsg = 'Appwrite 401: Unauthorized. Please check Project ID or Database collection permissions.';
      } else if (err.code === 404) {
        errorMsg = 'Appwrite 404: Database or Collection ID not found.';
      }
      
      showToast(errorMsg, 'error', 6000);
      loadLocalFallback();
    }
  } else {
    loadLocalFallback();
  }

  renderArticles();
}

function loadLocalFallback() {
  const localData = localStorage.getItem('local_articles');
  if (localData) {
    try {
      articles = JSON.parse(localData);
    } catch (e) {
      articles = [];
    }
  } else {
    // Provide a sample demo article if first time
    articles = [
      {
        id: 'sample-1',
        title: 'Modern CSS Architectures and Patterns',
        url: 'https://web.dev/learn/css/',
        status: 'ongoing',
        completed_at: null,
        created_at: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: 'sample-2',
        title: 'Appwrite 101: Getting Started Guide',
        url: 'https://appwrite.io/docs',
        status: 'completed',
        completed_at: new Date().toISOString(),
        created_at: new Date(Date.now() - 172800000).toISOString()
      }
    ];
    saveLocalFallback();
  }
}

function saveLocalFallback() {
  localStorage.setItem('local_articles', JSON.stringify(articles));
}

// Add new article
async function handleAddArticle(e) {
  e.preventDefault();

  const title = articleTitleInput.value.trim();
  let url = articleUrlInput.value.trim();
  const initialStatusRadio = document.querySelector('input[name="initialStatus"]:checked');
  const status = initialStatusRadio ? initialStatusRadio.value : 'ongoing';

  if (!title || !url) return;

  // Ensure url has protocol
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }

  const completed_at = status === 'completed' ? new Date().toISOString() : null;

  const saveBtn = document.getElementById('saveArticleBtn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  if (isAppwriteReady) {
    try {
      const docData = {
        title: title,
        url: url,
        status: status,
        completed_at: completed_at
      };

      const newDoc = await databases.createDocument(
        config.databaseId,
        config.collectionId,
        Appwrite.ID.unique(),
        docData
      );

      articles.unshift({
        id: newDoc.$id,
        title: newDoc.title,
        url: newDoc.url,
        status: newDoc.status,
        completed_at: newDoc.completed_at,
        created_at: newDoc.$createdAt
      });
    } catch (err) {
      console.error('Appwrite createDocument error:', err);
      showToast('Failed to save to Appwrite: ' + (err.message || 'Check database permissions'), 'error');
      saveBtn.disabled = false;
      saveBtn.innerHTML = 'Save Article';
      return;
    }
  } else {
    const localItem = {
      id: 'local-' + Date.now(),
      title: title,
      url: url,
      status: status,
      completed_at: completed_at,
      created_at: new Date().toISOString()
    };
    articles.unshift(localItem);
    saveLocalFallback();
  }

  articleTitleInput.value = '';
  articleUrlInput.value = '';
  document.querySelector('input[name="initialStatus"][value="ongoing"]').checked = true;

  saveBtn.disabled = false;
  saveBtn.innerHTML = `
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
    Save Article
  `;

  // Switch to the relevant tab if added completed
  if (status === 'completed' && activeTab !== 'history') {
    switchTab('history');
  } else if (status === 'ongoing' && activeTab !== 'ongoing') {
    switchTab('ongoing');
  } else {
    renderArticles();
  }

  closeAddModal();
  showToast('Article added successfully', 'success');
}

// Update article status (Ongoing <-> Completed)
async function updateArticleStatus(id, newStatus) {
  const article = articles.find(a => a.id === id);
  if (!article) return;

  const prevStatus = article.status;
  const prevCompletedAt = article.completed_at;

  article.status = newStatus;
  article.completed_at = newStatus === 'completed' ? new Date().toISOString() : null;

  renderArticles();

  if (isAppwriteReady) {
    try {
      await databases.updateDocument(
        config.databaseId,
        config.collectionId,
        id,
        {
          status: newStatus,
          completed_at: article.completed_at
        }
      );
      showToast(`Status updated to ${newStatus}`, 'info');
    } catch (err) {
      console.error('Failed to update status in Appwrite:', err);
      // Revert on error
      article.status = prevStatus;
      article.completed_at = prevCompletedAt;
      renderArticles();
      showToast('Failed to update in Appwrite: ' + err.message, 'error');
    }
  } else {
    saveLocalFallback();
    showToast(`Status updated to ${newStatus}`, 'info');
  }
}

// Delete an article
async function deleteArticle(id) {
  const article = articles.find(a => a.id === id);
  const title = article ? `"${article.title}"` : 'this link';

  const confirmed = await showCustomConfirm({
    title: 'Delete Link',
    message: `Are you sure you want to delete ${title}? This action cannot be undone.`,
    confirmText: 'Delete Link',
    danger: true
  });
  if (!confirmed) return;

  const prevArticles = [...articles];
  articles = articles.filter(a => a.id !== id);
  selectedArticleIds.delete(id);
  renderArticles();
  renderProfileModal();

  if (isAppwriteReady) {
    try {
      await databases.deleteDocument(
        config.databaseId,
        config.collectionId,
        id
      );
      showToast('Link deleted successfully', 'success');
    } catch (err) {
      console.error('Failed to delete from Appwrite:', err);
      articles = prevArticles;
      renderArticles();
      renderProfileModal();
      showToast('Failed to delete from Appwrite: ' + err.message, 'error');
    }
  } else {
    saveLocalFallback();
    showToast('Link deleted successfully', 'success');
  }
}

// Batch delete selected articles
async function handleDeleteSelected() {
  const count = selectedArticleIds.size;
  if (count === 0) return;

  const confirmed = await showCustomConfirm({
    title: 'Delete Selected Links',
    message: `Are you sure you want to delete the ${count} selected link(s)? These will be permanently removed.`,
    confirmText: `Delete ${count} Link${count > 1 ? 's' : ''}`,
    danger: true
  });
  if (!confirmed) return;

  const idsToDelete = Array.from(selectedArticleIds);
  const prevArticles = [...articles];
  articles = articles.filter(a => !selectedArticleIds.has(a.id));
  selectedArticleIds.clear();

  renderArticles();
  renderProfileModal();

  if (isAppwriteReady) {
    try {
      const deletePromises = idsToDelete.map(id =>
        databases.deleteDocument(config.databaseId, config.collectionId, id)
      );
      await Promise.allSettled(deletePromises);
      showToast(`Deleted ${count} link(s)`, 'success');
    } catch (err) {
      console.error('Batch delete error:', err);
      articles = prevArticles;
      renderArticles();
      renderProfileModal();
      showToast('Failed to delete some articles from Appwrite', 'error');
    }
  } else {
    saveLocalFallback();
    showToast(`Deleted ${count} link(s)`, 'success');
  }
}

// Delete by status (ongoing or completed)
async function handleDeleteByStatus(status) {
  const targetArticles = articles.filter(a => a.status === status);
  const label = status === 'ongoing' ? 'Ongoing' : 'Completed';

  if (targetArticles.length === 0) {
    showToast(`No ${label.toLowerCase()} links found to delete.`, 'info');
    return;
  }

  const confirmed = await showCustomConfirm({
    title: `Delete All ${label} Links`,
    message: `Are you sure you want to delete all ${targetArticles.length} ${label.toLowerCase()} link(s)? This action cannot be undone.`,
    confirmText: `Delete All ${label}`,
    danger: true
  });
  if (!confirmed) return;

  const idsToDelete = targetArticles.map(a => a.id);
  const prevArticles = [...articles];
  articles = articles.filter(a => a.status !== status);
  idsToDelete.forEach(id => selectedArticleIds.delete(id));

  renderArticles();
  renderProfileModal();

  if (isAppwriteReady) {
    try {
      const deletePromises = idsToDelete.map(id =>
        databases.deleteDocument(config.databaseId, config.collectionId, id)
      );
      await Promise.allSettled(deletePromises);
      showToast(`Deleted all ${label.toLowerCase()} links`, 'success');
    } catch (err) {
      console.error('Appwrite batch delete error:', err);
      articles = prevArticles;
      renderArticles();
      renderProfileModal();
      showToast('Failed to delete some articles from Appwrite.', 'error');
    }
  } else {
    saveLocalFallback();
    showToast(`Deleted all ${label.toLowerCase()} links`, 'success');
  }
}

// Delete all articles
async function handleDeleteAllArticles() {
  if (articles.length === 0) {
    showToast('No links found to delete.', 'info');
    return;
  }

  const confirmed = await showCustomConfirm({
    title: 'Delete All Links',
    message: `Are you sure you want to delete ALL ${articles.length} links? This will clear your entire list and cannot be undone.`,
    confirmText: 'Delete All Links',
    danger: true
  });
  if (!confirmed) return;

  const idsToDelete = articles.map(a => a.id);
  const prevArticles = [...articles];
  articles = [];
  selectedArticleIds.clear();

  renderArticles();
  renderProfileModal();

  if (isAppwriteReady) {
    try {
      const deletePromises = idsToDelete.map(id =>
        databases.deleteDocument(config.databaseId, config.collectionId, id)
      );
      await Promise.allSettled(deletePromises);
      showToast('All links deleted', 'success');
    } catch (err) {
      console.error('Appwrite delete all error:', err);
      articles = prevArticles;
      renderArticles();
      renderProfileModal();
      showToast('Failed to delete all articles from Appwrite.', 'error');
    }
  } else {
    saveLocalFallback();
    showToast('All links deleted', 'success');
  }
}

// Format Date
function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Clean Domain display for URL
function getDomain(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace('www.', '');
  } catch (e) {
    return url;
  }
}

// --- Render UI ---
function renderArticles() {
  const ongoingArticles = articles.filter(a => a.status === 'ongoing');
  const completedArticles = articles.filter(a => a.status === 'completed');

  ongoingCount.textContent = ongoingArticles.length;
  historyCount.textContent = completedArticles.length;

  // Render Ongoing Tab
  if (ongoingArticles.length === 0) {
    ongoingList.innerHTML = `
      <div class="empty-state">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
        </svg>
        <h3>No ongoing articles</h3>
      </div>
    `;
  } else {
    ongoingList.innerHTML = ongoingArticles.map(article => `
      <div class="article-item" data-id="${article.id}" onclick="openLinkActionModal('${article.id}')" title="Click to view options">
        <div class="article-main">
          <div class="article-link">
            <span>${escapeHtml(article.title)}</span>
          </div>
        </div>
      </div>
    `).join('');
  }

  // Render History Tab
  if (completedArticles.length === 0) {
    historyList.innerHTML = `
      <div class="empty-state">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 14 14"></polyline>
        </svg>
        <h3>No reading history yet</h3>
      </div>
    `;
  } else {
    historyList.innerHTML = completedArticles.map(article => `
      <div class="article-item" data-id="${article.id}" onclick="openLinkActionModal('${article.id}')" title="Click to view options">
        <div class="article-main">
          <div class="history-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Read on ${formatDate(article.completed_at || article.created_at)}
          </div>
          <div class="article-link">
            <span>${escapeHtml(article.title)}</span>
          </div>
        </div>
      </div>
    `).join('');
  }
}

// Utility: Escape HTML for security
function escapeHtml(string) {
  if (!string) return '';
  return String(string)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Make functions globally available for inline onclick/onchange handlers
window.updateArticleStatus = updateArticleStatus;
window.deleteArticle = deleteArticle;
window.toggleArticleSelection = toggleArticleSelection;
window.openLinkActionModal = openLinkActionModal;
window.copyArticleLink = copyArticleLink;

// Start app
document.addEventListener('DOMContentLoaded', init);
