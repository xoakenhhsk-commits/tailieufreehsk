import { INITIAL_BOOKS } from './sample-data.js';
import DEFAULT_DATABASE_BOOKS from './initial-books.json';

const STORAGE_KEYS = {
  BOOKS: 'tailieufree_books',
  FAVORITES: 'tailieufree_favorites',
  AD_SETTINGS: 'tailieufree_ad_settings',
  ADMIN_PIN: 'tailieufree_admin_pin',
  ADMIN_AUTH: 'tailieufree_admin_auth',
  SAMPLE_CLEANED: 'tailieufree_sample_cleaned_v3'
};

const DEFAULT_ADMIN_PIN = '12102010';

const DEFAULT_AD_SETTINGS = {
  enabled: true, // Kích hoạt tính năng quảng cáo
  directLinkUrl: 'https://www.profitableratecpmnetwork.com/wxg5rhv9?key=f4704f44269e309bf6b70c1aa745cc75', // Link Direct Link Adsterra thật của bạn
  scriptCode: '', // Mã Script Popunder / Social Bar Adsterra
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
        if (typeof parsed.countdownSeconds === 'undefined') {
          parsed.countdownSeconds = 3;
        }
        localStorage.setItem(STORAGE_KEYS.AD_SETTINGS, JSON.stringify(parsed));
      } catch (e) {
        localStorage.setItem(STORAGE_KEYS.AD_SETTINGS, JSON.stringify(DEFAULT_AD_SETTINGS));
      }
    }

    // Cập nhật mã PIN sang 12102010 nếu chưa có hoặc đang là mã cũ 123456
    const currentPin = localStorage.getItem(STORAGE_KEYS.ADMIN_PIN);
    if (!currentPin || currentPin === '123456') {
      localStorage.setItem(STORAGE_KEYS.ADMIN_PIN, DEFAULT_ADMIN_PIN);
    }
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
      return books[index];
    }
    return null;
  },

  deleteBook(id) {
    let books = this.getBooks();
    books = books.filter(b => b.id !== id);
    this.saveBooks(books);
  },

  clearAllBooks() {
    this.saveBooks([]);
  },

  togglePin(id) {
    const books = this.getBooks();
    const book = books.find(b => b.id === id);
    if (book) {
      book.isPinned = !book.isPinned;
      this.saveBooks(books);
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
  },

  incrementDownloads(id) {
    const books = this.getBooks();
    const book = books.find(b => b.id === id);
    if (book) {
      book.downloads = (book.downloads || 0) + 1;
      this.saveBooks(books);
    }
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

  // --- Quản lý Mật khẩu Quản trị ---
  getAdminPin() {
    return localStorage.getItem(STORAGE_KEYS.ADMIN_PIN) || DEFAULT_ADMIN_PIN;
  },

  setAdminPin(newPin) {
    localStorage.setItem(STORAGE_KEYS.ADMIN_PIN, newPin.trim());
  },

  isAdminAuthenticated() {
    return sessionStorage.getItem(STORAGE_KEYS.ADMIN_AUTH) === 'true';
  },

  setAdminAuthenticated(status) {
    sessionStorage.setItem(STORAGE_KEYS.ADMIN_AUTH, status ? 'true' : 'false');
  },

  logoutAdmin() {
    sessionStorage.removeItem(STORAGE_KEYS.ADMIN_AUTH);
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
  }
};

// Khởi chạy lưu trữ ngay
Store.init();
