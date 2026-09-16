import { INITIAL_BOOKS } from './sample-data.js';
import DEFAULT_DATABASE_BOOKS from './initial-books.json';

const STORAGE_KEYS = {
  BOOKS: 'tailieufree_books',
  FAVORITES: 'tailieufree_favorites',
  AD_SETTINGS: 'tailieufree_ad_settings',
  ADMIN_PIN_HASH: 'tailieufree_admin_pin_hash_v2',
  ADMIN_CUSTOM_PIN: 'tailieufree_admin_custom_pin',
  ADMIN_TOKEN: 'tailieufree_admin_token',
  ADMIN_AUTH: 'tailieufree_admin_auth',
  SAMPLE_CLEANED: 'tailieufree_sample_cleaned_v3',
  GITHUB_SETTINGS: 'tailieufree_github_sync_v2'
};

const DEFAULT_PIN_HASH = '0ce624655f24e07f6c87aff2d126edab6a2219c704e0d9db3d645d85fb7d69d5';

export async function hashPin(pin) {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin.trim() + '_salt_tailieufree_2026');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return DEFAULT_PIN_HASH;
  }
}

// Chuyển chuỗi UTF-8 tiếng Việt sang Base64 chuẩn quốc tế
export function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  const binString = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
  return btoa(binString);
}

// Giải mã Base64 sang chuỗi UTF-8 tiếng Việt
export function base64ToUtf8(base64) {
  const clean = (base64 || '').replace(/\s/g, '');
  const binString = atob(clean);
  const bytes = Uint8Array.from(binString, (m) => m.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export const DEFAULT_GITHUB_SETTINGS = {
  token: '',
  repo: 'xoakenhhsk-commits/tailieufreehsk',
  branch: 'main',
  path: 'src/js/initial-books.json',
  autoSync: true
};

const DEFAULT_AD_SETTINGS = {
  enabled: true, // Kích hoạt tính năng quảng cáo
  autoPopunder: true, // Tự động mở quảng cáo ngay khi khách vào web chạm màn hình (tính tiền view 100%)
  directLinkUrl: 'https://www.profitableratecpmnetwork.com/wxg5rhv9?key=f4704f44269e309bf6b70c1aa745cc75', // Link Direct Link Adsterra thật của bạn
  scriptCode: '<script src="https://pl31365543.profitableratecpmnetwork.com/e7/fd/18/e7fd18b9a2b3388bb4ca6b2e343fdc4f.js"></script>', // Mã Script Popunder / Social Bar Adsterra
  bannerHtml: '', // Mã HTML Banner Adsterra / Adsense
  countdownSeconds: 5, // Đếm ngược cổng chờ tải
  clicksRequired: 1
};

export const Store = {
  // --- Khởi tạo dữ liệu ---
  init() {
    // 1. Luôn nạp cơ sở dữ liệu gốc của web (initial-books.json)
    const localData = localStorage.getItem(STORAGE_KEYS.BOOKS);
    if (!localData) {
      localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(DEFAULT_DATABASE_BOOKS));
    } else {
      try {
        let books = JSON.parse(localData);
        if (!Array.isArray(books) || books.length === 0) {
          if (DEFAULT_DATABASE_BOOKS.length > 0) {
            localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(DEFAULT_DATABASE_BOOKS));
          }
        } else {
          // Tự động gộp các sách có trong cơ sở dữ liệu web nếu local chưa có
          const localIds = new Set(books.map(b => b.id));
          let hasNew = false;
          for (const dbBook of DEFAULT_DATABASE_BOOKS) {
            if (!localIds.has(dbBook.id)) {
              books.push(dbBook);
              hasNew = true;
            }
          }
          if (hasNew) {
            localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(books));
          }
        }
      } catch (e) {
        localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(DEFAULT_DATABASE_BOOKS));
      }
    }

    const currentAdSettings = localStorage.getItem(STORAGE_KEYS.AD_SETTINGS);
    if (!currentAdSettings) {
      localStorage.setItem(STORAGE_KEYS.AD_SETTINGS, JSON.stringify(DEFAULT_AD_SETTINGS));
    } else {
      try {
        const parsed = JSON.parse(currentAdSettings);
        parsed.directLinkUrl = DEFAULT_AD_SETTINGS.directLinkUrl;
        parsed.enabled = true;
        if (!parsed.scriptCode) {
          parsed.scriptCode = DEFAULT_AD_SETTINGS.scriptCode;
        }
        if (typeof parsed.autoPopunder === 'undefined') {
          parsed.autoPopunder = true;
        }
        if (typeof parsed.countdownSeconds === 'undefined') {
          parsed.countdownSeconds = 3;
        }
        localStorage.setItem(STORAGE_KEYS.AD_SETTINGS, JSON.stringify(parsed));
      } catch (e) {
        localStorage.setItem(STORAGE_KEYS.AD_SETTINGS, JSON.stringify(DEFAULT_AD_SETTINGS));
      }
    }

    // Bảo mật: Xóa vĩnh viễn mã PIN dạng văn bản thô (cleartext) cũ khỏi bộ nhớ
    localStorage.removeItem('tailieufree_admin_pin');
    if (!localStorage.getItem(STORAGE_KEYS.ADMIN_PIN_HASH)) {
      localStorage.setItem(STORAGE_KEYS.ADMIN_PIN_HASH, DEFAULT_PIN_HASH);
    }

    // 2. Tự động đồng bộ sách mới nhất từ GitHub Cloud trong nền (Áp dụng cho mọi điện thoại/người dùng vào web)
    this.fetchRemoteBooks();
  },

  // --- Quản lý Sách (Books CRUD) ---
  getBooks() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BOOKS);
      const books = data ? JSON.parse(data) : [];
      if (Array.isArray(books) && books.length > 0) {
        return books;
      }
      return DEFAULT_DATABASE_BOOKS || [];
    } catch (e) {
      console.error('Lỗi đọc dữ liệu sách:', e);
      return DEFAULT_DATABASE_BOOKS || [];
    }
  },

  saveBooks(books) {
    localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(books));
    // Phát event đồng bộ cho các listener
    window.dispatchEvent(new Event('tailieufree_store_updated'));
  },

  getBookById(id) {
    const books = this.getBooks();
    return books.find(b => b.id === id);
  },

  addBook(newBook) {
    const books = this.getBooks();
    const cleanDocxUrl = this.normalizeDocxUrl(newBook.docxUrl.trim());
    const book = {
      id: 'book-' + Date.now(),
      title: newBook.title.trim(),
      author: newBook.author?.trim() || 'Tài Liệu Free',
      category: newBook.category || 'Khác',
      docxUrl: cleanDocxUrl,
      coverImage: newBook.coverImage?.trim() || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=600&auto=format&fit=crop',
      description: newBook.description?.trim() || 'Tài liệu học tập và nghiên cứu chuẩn định dạng DOCX.',
      views: 0,
      downloads: 0,
      createdAt: new Date().toISOString().split('T')[0],
      isPinned: !!newBook.isPinned
    };
    books.unshift(book);
    this.saveBooks(books);
    this.triggerAutoSync(`Đăng sách mới: "${book.title}"`);
    return book;
  },

  updateBook(id, updatedFields) {
    const books = this.getBooks();
    const index = books.findIndex(b => b.id === id);
    if (index !== -1) {
      if (updatedFields.docxUrl) {
        updatedFields.docxUrl = this.normalizeDocxUrl(updatedFields.docxUrl.trim());
      }
      books[index] = { ...books[index], ...updatedFields };
      this.saveBooks(books);
      this.triggerAutoSync(`Cập nhật sách: "${books[index].title}"`);
      return books[index];
    }
    return null;
  },

  deleteBook(id) {
    let books = this.getBooks();
    const target = books.find(b => b.id === id);
    books = books.filter(b => b.id !== id);
    this.saveBooks(books);
    this.triggerAutoSync(`Xóa sách: "${target ? target.title : id}"`);
  },

  clearAllBooks() {
    this.saveBooks([]);
    this.triggerAutoSync('Xóa toàn bộ sách khỏi cơ sở dữ liệu');
  },

  togglePin(id) {
    const books = this.getBooks();
    const book = books.find(b => b.id === id);
    if (book) {
      book.isPinned = !book.isPinned;
      this.saveBooks(books);
      this.triggerAutoSync(`${book.isPinned ? 'Ghim' : 'Bỏ ghim'} sách: "${book.title}"`);
    }
    return book;
  },

  incrementViews(id) {
    const books = this.getBooks();
    const book = books.find(b => b.id === id);
    if (book) {
      book.views = (book.views || 0) + 1;
      this.saveBooks(books);
    }
    window.dispatchEvent(new CustomEvent('tailieufree_view_recorded', { detail: { bookId: id } }));
  },

  incrementDownloads(id) {
    const books = this.getBooks();
    const book = books.find(b => b.id === id);
    if (book) {
      book.downloads = (book.downloads || 0) + 1;
      this.saveBooks(books);
    }
    window.dispatchEvent(new CustomEvent('tailieufree_download_recorded', { detail: { bookId: id } }));
  },

  // Chuẩn hóa link Google Drive để tải/mở trực tiếp
  normalizeDocxUrl(url) {
    if (!url) return '';
    // Xử lý link Google Drive dạng https://drive.google.com/file/d/ID/view...
    const driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch && driveMatch[1]) {
      return `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
    }
    // Xử lý link Google Drive dạng open?id=ID
    const openMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (url.includes('drive.google.com') && openMatch && openMatch[1]) {
      return `https://drive.google.com/uc?export=download&id=${openMatch[1]}`;
    }
    return url;
  },

  // --- Yêu thích (Favorites) ---
  getFavorites() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.FAVORITES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  toggleFavorite(bookId) {
    let favs = this.getFavorites();
    const exists = favs.includes(bookId);
    if (exists) {
      favs = favs.filter(id => id !== bookId);
    } else {
      favs.push(bookId);
    }
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favs));
    return !exists;
  },

  isFavorite(bookId) {
    const favs = this.getFavorites();
    return favs.includes(bookId);
  },

  // --- Cài đặt Quảng cáo Adsterra / Adsense ---
  getAdSettings() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.AD_SETTINGS);
      return data ? { ...DEFAULT_AD_SETTINGS, ...JSON.parse(data) } : DEFAULT_AD_SETTINGS;
    } catch {
      return DEFAULT_AD_SETTINGS;
    }
  },

  saveAdSettings(settings) {
    const current = this.getAdSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(STORAGE_KEYS.AD_SETTINGS, JSON.stringify(updated));
    window.dispatchEvent(new Event('tailieufree_ad_settings_updated'));
    return updated;
  },

  // --- Quản lý Mã PIN Quản trị (Mã hóa SHA-256 & Luôn đảm bảo đổi được PIN) ---
  getAdminPin() {
    return localStorage.getItem(STORAGE_KEYS.ADMIN_CUSTOM_PIN) || '12102010';
  },

  getAdminPinHash() {
    return localStorage.getItem(STORAGE_KEYS.ADMIN_PIN_HASH) || DEFAULT_PIN_HASH;
  },

  async verifyAdminPin(inputPin) {
    const cleanPin = (inputPin || '').trim();
    if (!cleanPin) return { success: false, error: 'Vui lòng nhập mã PIN quản trị!' };

    const currentPin = this.getAdminPin();
    const storedHash = this.getAdminPinHash();
    const hashed = await hashPin(cleanPin);

    // 1. Kiểm tra trực tiếp với mã PIN hiện tại trong máy, mã hash hoặc mã gốc 12102010
    if (cleanPin === currentPin || cleanPin === '12102010' || hashed === storedHash || hashed === DEFAULT_PIN_HASH) {
      sessionStorage.setItem(STORAGE_KEYS.ADMIN_AUTH, 'true');
      
      // Xin token từ Python backend trong nền (nếu backend đang chạy)
      try {
        fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: cleanPin })
        }).then(res => res.json()).then(data => {
          if (data && data.token) {
            sessionStorage.setItem(STORAGE_KEYS.ADMIN_TOKEN, data.token);
          }
        }).catch(() => {});
      } catch {}

      return { success: true, message: 'Xác thực mã PIN thành công!' };
    }

    // 2. Thử kiểm tra qua Python Backend nếu có cấu hình từ xa
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: cleanPin })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.token) {
          sessionStorage.setItem(STORAGE_KEYS.ADMIN_TOKEN, data.token);
        }
        sessionStorage.setItem(STORAGE_KEYS.ADMIN_AUTH, 'true');
        return { success: true, message: data.message };
      }
    } catch {}

    return { success: false, error: 'Mã PIN quản trị không chính xác! (Mặc định: 12102010)' };
  },

  async setAdminPin(newPin) {
    const cleanPin = (newPin || '').trim();
    if (cleanPin.length < 4) return { success: false, error: 'Mã PIN mới phải có ít nhất 4 ký tự!' };

    const newHash = await hashPin(cleanPin);
    localStorage.setItem(STORAGE_KEYS.ADMIN_PIN_HASH, newHash);
    localStorage.setItem(STORAGE_KEYS.ADMIN_CUSTOM_PIN, cleanPin);

    // Thông báo cho Python backend cập nhật phiên nếu có token
    try {
      const token = sessionStorage.getItem(STORAGE_KEYS.ADMIN_TOKEN);
      fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Token': token || ''
        },
        body: JSON.stringify({ new_pin: cleanPin })
      }).catch(() => {});
    } catch {}

    return { success: true, hash: newHash, pin: cleanPin };
  },

  isAdminAuthenticated() {
    return sessionStorage.getItem(STORAGE_KEYS.ADMIN_AUTH) === 'true';
  },

  setAdminAuthenticated(status) {
    sessionStorage.setItem(STORAGE_KEYS.ADMIN_AUTH, status ? 'true' : 'false');
  },

  logoutAdmin() {
    sessionStorage.removeItem(STORAGE_KEYS.ADMIN_AUTH);
    sessionStorage.removeItem(STORAGE_KEYS.ADMIN_TOKEN);
  },

  // --- Backup & Khôi phục (Export / Import) ---
  exportAllData() {
    return {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      books: this.getBooks(),
      adSettings: this.getAdSettings()
    };
  },

  importData(jsonData) {
    if (Array.isArray(jsonData)) {
      this.saveBooks(jsonData);
      return true;
    }
    if (jsonData && Array.isArray(jsonData.books)) {
      this.saveBooks(jsonData.books);
      if (jsonData.adSettings) {
        this.saveAdSettings(jsonData.adSettings);
      }
      return true;
    }
    return false;
  },

  resetToDefault() {
    localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(DEFAULT_DATABASE_BOOKS));
    localStorage.setItem(STORAGE_KEYS.AD_SETTINGS, JSON.stringify(DEFAULT_AD_SETTINGS));
    this.saveBooks(DEFAULT_DATABASE_BOOKS);
  },

  // --- Đồng Bộ Cơ Sở Dữ Liệu Lên GitHub (Cloud Database Sync) ---
  getGitHubSettings() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.GITHUB_SETTINGS);
      return data ? { ...DEFAULT_GITHUB_SETTINGS, ...JSON.parse(data) } : { ...DEFAULT_GITHUB_SETTINGS };
    } catch {
      return { ...DEFAULT_GITHUB_SETTINGS };
    }
  },

  saveGitHubSettings(settings) {
    const current = this.getGitHubSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(STORAGE_KEYS.GITHUB_SETTINGS, JSON.stringify(updated));
    window.dispatchEvent(new Event('tailieufree_github_settings_updated'));
    return updated;
  },

  // Kiểm tra kết nối tài khoản GitHub & quyền ghi vào Repo
  async testGitHubConnection(token, repo, branch = 'main', path = 'src/js/initial-books.json') {
    const cleanToken = (token || '').trim();
    const cleanRepo = (repo || 'xoakenhhsk-commits/tailieufreehsk').trim();
    if (!cleanToken) {
      return { success: false, error: 'Vui lòng nhập GitHub Personal Access Token!' };
    }

    try {
      // 1. Kiểm tra tài khoản
      const userRes = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${cleanToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      if (!userRes.ok) {
        return { success: false, error: `Token GitHub không hợp lệ hoặc đã hết hạn (Mã lỗi HTTP: ${userRes.status})` };
      }
      const userData = await userRes.json();

      // 2. Kiểm tra quyền truy cập file trong repo
      const fileRes = await fetch(`https://api.github.com/repos/${cleanRepo}/contents/${path}?ref=${branch}`, {
        headers: {
          'Authorization': `Bearer ${cleanToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!fileRes.ok && fileRes.status !== 404) {
        return { success: false, error: `Không thể đọc Repo ${cleanRepo}. Hãy đảm bảo token có quyền 'repo' hoặc 'Contents: Read & Write'.` };
      }

      return {
        success: true,
        user: userData.login,
        name: userData.name || userData.login,
        repo: cleanRepo,
        message: `Kết nối thành công với tài khoản GitHub: @${userData.login}!`
      };
    } catch (e) {
      return { success: false, error: 'Lỗi mạng khi kết nối GitHub: ' + e.message };
    }
  },

  // Đồng bộ toàn bộ danh sách sách lên GitHub
  async syncToGitHub(customMessage) {
    const gh = this.getGitHubSettings();
    if (!gh.token) {
      return { success: false, notConfigured: true, error: 'Chưa cài đặt GitHub Token' };
    }

    const repo = (gh.repo || 'xoakenhhsk-commits/tailieufreehsk').trim();
    const branch = (gh.branch || 'main').trim();
    const path = (gh.path || 'src/js/initial-books.json').trim();
    const books = this.getBooks();

    try {
      // 1. Lấy SHA của file hiện tại trên GitHub
      let currentSha = null;
      const getRes = await fetch(`https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}`, {
        headers: {
          'Authorization': `Bearer ${gh.token}`,
          'Accept': 'application/vnd.github.v3+json'
        },
        cache: 'no-store'
      });

      if (getRes.ok) {
        const fileInfo = await getRes.json();
        currentSha = fileInfo.sha;
      }

      // 2. Mã hóa danh sách sách UTF-8 sang Base64
      const jsonString = JSON.stringify(books, null, 2);
      const contentBase64 = utf8ToBase64(jsonString);

      const commitBody = {
        message: customMessage || `Cập nhật dữ liệu sách (${books.length} sách) từ Quản trị viên [skip ci]`,
        content: contentBase64,
        branch: branch
      };
      if (currentSha) {
        commitBody.sha = currentSha;
      }

      // 3. Gửi commit cập nhật lên GitHub API
      const putRes = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${gh.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(commitBody)
      });

      const result = await putRes.json();
      if (!putRes.ok) {
        throw new Error(result.message || `Lỗi GitHub API (${putRes.status})`);
      }

      window.dispatchEvent(new CustomEvent('tailieufree_github_synced', { detail: result }));
      return {
        success: true,
        commitUrl: result.commit?.html_url || '',
        booksCount: books.length
      };
    } catch (err) {
      console.error('Lỗi sync GitHub:', err);
      return { success: false, error: err.message };
    }
  },

  // Tự động kích hoạt đồng bộ khi có thao tác dữ liệu
  triggerAutoSync(actionDesc) {
    const gh = this.getGitHubSettings();
    if (gh.token && gh.autoSync) {
      window.dispatchEvent(new CustomEvent('tailieufree_github_syncing', { detail: { action: actionDesc } }));
      this.syncToGitHub(actionDesc).then(res => {
        if (res.success) {
          window.dispatchEvent(new CustomEvent('tailieufree_github_synced', { detail: res }));
        } else if (!res.notConfigured) {
          window.dispatchEvent(new CustomEvent('tailieufree_github_sync_error', { detail: res }));
        }
      }).catch(() => {});
    }
  },

  // Tự động tải dữ liệu sách mới nhất từ GitHub Cloud (Mọi thiết bị khác vào web sẽ nhận sách mới ngay)
  async fetchRemoteBooks() {
    try {
      const gh = this.getGitHubSettings();
      const repo = (gh.repo || 'xoakenhhsk-commits/tailieufreehsk').trim();
      const branch = (gh.branch || 'main').trim();
      const path = (gh.path || 'src/js/initial-books.json').trim();
      
      const rawUrl = `https://raw.githubusercontent.com/${repo}/${branch}/${path}?_t=${Date.now()}`;
      const res = await fetch(rawUrl, { cache: 'no-store' });
      if (!res.ok) return { success: false, status: res.status };

      const remoteBooks = await res.json();
      if (!Array.isArray(remoteBooks) || remoteBooks.length === 0) return { success: false, error: 'Empty/invalid remote data' };

      const currentBooks = this.getBooks();

      // So sánh dữ liệu từ GitHub với dữ liệu đang lưu trong máy
      const isDifferent = remoteBooks.length !== currentBooks.length || 
                          remoteBooks.some((b, i) => !currentBooks[i] || b.id !== currentBooks[i].id || b.title !== currentBooks[i].title);

      if (isDifferent) {
        console.log(`[TaiLieuFree] Đã đồng bộ ${remoteBooks.length} sách mới nhất từ GitHub Cloud!`);
        localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(remoteBooks));
        window.dispatchEvent(new Event('tailieufree_store_updated'));
        return { success: true, updated: true, booksCount: remoteBooks.length };
      }

      return { success: true, updated: false, booksCount: remoteBooks.length };
    } catch (err) {
      console.warn('Không thể tải dữ liệu mới từ GitHub Cloud:', err);
      return { success: false, error: err.message };
    }
  }
};

// Khởi chạy lưu trữ ngay
Store.init();
