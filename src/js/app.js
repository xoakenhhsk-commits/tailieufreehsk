import { Store } from './store.js';
import { AdManager } from './ads.js';
import { AdminModule } from './admin.js';
import { Analytics } from './analytics.js';

// Expose modules to global window for inline onclick handlers
window.AdminModule = AdminModule;
window.Analytics = Analytics;

export const App = {
  searchQuery: '',
  activeTab: 'home', // 'home' | 'favorites' | 'admin'
  selectedBook: null,
  logoClickCount: 0,
  logoClickTimer: null,

  init() {
    this.renderBooks();
    this.bindEvents();
    this.updateFavoritesCount();

    // Khởi tạo hệ thống thống kê realtime & bảo vệ người xem thật
    Analytics.init();

    // Khởi tạo hệ thống quảng cáo và cổng tải
    AdManager.init();

    // Khởi tạo admin controller
    AdminModule.init(
      () => this.renderBooks(),
      (msg, type, duration) => this.showToast(msg, type, duration)
    );

    // Kiểm tra URL xem có vào ./admin, /admin hoặc #admin không
    this.checkAdminRoute();

    // Lắng nghe thay đổi URL (Back / Forward)
    window.addEventListener('popstate', () => this.checkAdminRoute());
    window.addEventListener('hashchange', () => this.checkAdminRoute());

    // Đồng bộ tức thì giữa các tab trình duyệt (Real-time Storage Sync)
    window.addEventListener('storage', (e) => {
      if (e.key === 'tailieufree_books' || e.key === 'tailieufree_ad_settings') {
        this.renderBooks();
        this.updateFavoritesCount();
        if (this.activeTab === 'admin') {
          AdminModule.refreshAdminData();
        }
      }
    });

    window.addEventListener('tailieufree_store_updated', () => {
      this.renderBooks();
      this.updateFavoritesCount();
    });

    // Expose app to window
    window.App = this;
  },

  // Kiểm tra route URL xem có yêu cầu vào Admin không (./admin, /admin, #admin)
  checkAdminRoute() {
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    const search = window.location.search.toLowerCase();
    const href = window.location.href.toLowerCase();

    const isAdminRequested = 
      path.includes('/admin') || 
      hash.includes('admin') || 
      search.includes('admin') ||
      href.includes('./admin');

    if (isAdminRequested) {
      if (Store.isAdminAuthenticated()) {
        this.navigateTo('admin');
      } else {
        this.openPinModal();
      }
    } else {
      if (this.activeTab === 'admin') {
        this.navigateTo('home');
      }
    }
  },

  bindEvents() {
    // Tìm kiếm tức thì thông minh
    const searchInput = document.getElementById('main-search-input');
    const searchClearBtn = document.getElementById('search-clear-btn');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        if (searchClearBtn) {
          searchClearBtn.classList.toggle('active', this.searchQuery.length > 0);
        }
        this.renderBooks();
      });

      // Hỗ trợ phím tắt / hoặc Ctrl + K để tìm kiếm
      document.addEventListener('keydown', (e) => {
        if ((e.key === '/' && document.activeElement !== searchInput) || (e.ctrlKey && e.key === 'k')) {
          e.preventDefault();
          searchInput.focus();
          searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    }

    if (searchClearBtn && searchInput) {
      searchClearBtn.addEventListener('click', () => {
        searchInput.value = '';
        this.searchQuery = '';
        searchClearBtn.classList.remove('active');
        this.renderBooks();
        searchInput.focus();
      });
    }

    // Nút tìm kiếm trên Header
    const headerSearchBtn = document.getElementById('btn-header-search');
    if (headerSearchBtn && searchInput) {
      headerSearchBtn.addEventListener('click', () => {
        searchInput.focus();
        searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }

    // Menu 3 Gạch dành cho Laptop / Web và Điện thoại
    const menuBtn = document.getElementById('btn-header-menu');
    const bottomNavMenuBtn = document.getElementById('bottom-nav-menu-btn');
    const menuOverlay = document.getElementById('liquid-menu-overlay');
    const closeDropdownBtn = document.getElementById('btn-close-dropdown');

    const toggleMenu = (show) => {
      if (!menuOverlay) return;
      if (typeof show === 'boolean') {
        menuOverlay.classList.toggle('active', show);
      } else {
        menuOverlay.classList.toggle('active');
      }
    };

    if (menuBtn) menuBtn.addEventListener('click', () => toggleMenu());
    if (bottomNavMenuBtn) bottomNavMenuBtn.addEventListener('click', () => toggleMenu());
    if (closeDropdownBtn) closeDropdownBtn.addEventListener('click', () => toggleMenu(false));

    if (menuOverlay) {
      menuOverlay.addEventListener('click', (e) => {
        if (e.target === menuOverlay) toggleMenu(false);
      });
    }

    // Các hành động trong Menu Dropdown 3 Gạch
    document.querySelectorAll('[data-menu-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.currentTarget.dataset.menuAction;
        toggleMenu(false);
        if (action === 'home') {
          this.navigateTo('home');
        } else if (action === 'favorites') {
          this.navigateTo('favorites');
        } else if (action === 'search') {
          if (searchInput) {
            searchInput.focus();
            searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        } else if (action === 'reload') {
          this.renderBooks();
          this.showToast('Đã làm mới danh sách tài liệu!', 'info');
        }
      });
    });

    // Nút Tìm kiếm trên taskbar đáy của Điện thoại
    const bottomNavSearchBtn = document.getElementById('bottom-nav-search-btn');
    if (bottomNavSearchBtn && searchInput) {
      bottomNavSearchBtn.addEventListener('click', () => {
        searchInput.focus();
        searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }

    // Điều hướng đáy trên Mobile
    document.querySelectorAll('.bottom-nav-item[data-nav-target]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget.dataset.navTarget;
        this.navigateTo(target);
      });
    });

    // Logo click: Bấm 1 lần về trang chủ; Bấm 5 lần nhanh kích hoạt mở Quản Trị bí mật
    const brandLogo = document.getElementById('brand-logo');
    if (brandLogo) {
      brandLogo.addEventListener('click', (e) => {
        e.preventDefault();
        this.logoClickCount++;
        clearTimeout(this.logoClickTimer);
        this.logoClickTimer = setTimeout(() => {
          this.logoClickCount = 0;
        }, 2500);

        if (this.logoClickCount >= 5) {
          this.logoClickCount = 0;
          this.showToast('🔐 Kích hoạt lối vào Quản trị hệ thống', 'info');
          if (Store.isAdminAuthenticated()) {
            this.navigateTo('admin');
          } else {
            this.openPinModal();
          }
          return;
        }

        this.navigateTo('home');
      });
    }

    // Phím tắt bí mật cho admin: Ctrl + Shift + A (hoặc Cmd + Shift + A)
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        if (Store.isAdminAuthenticated()) {
          this.navigateTo('admin');
        } else {
          this.openPinModal();
        }
      }
    });

    // Nút toggle ẩn/hiện mật khẩu trong popup PIN
    const togglePinBtn = document.getElementById('btn-toggle-pin-visibility');
    const pinInput = document.getElementById('pin-input');
    if (togglePinBtn && pinInput) {
      togglePinBtn.addEventListener('click', () => {
        pinInput.classList.toggle('revealed');
        togglePinBtn.textContent = pinInput.classList.contains('revealed') ? '🙈' : '👁️';
      });
    }

    // Modal đóng
    const modalCloseBtns = document.querySelectorAll('[data-close-modal]');
    modalCloseBtns.forEach(btn => {
      btn.addEventListener('click', () => this.closeModal());
    });

    // Bấm phím Escape đóng modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeModal();
    });

    // Form PIN đăng nhập admin
    const pinForm = document.getElementById('pin-login-form');
    if (pinForm) {
      pinForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handlePinSubmit();
      });
    }
  },

  openAdminWithAuth() {
    if (Store.isAdminAuthenticated()) {
      this.navigateTo('admin');
    } else {
      this.openPinModal();
    }
  },

  openAdminFromEmpty() {
    this.openAdminWithAuth();
  },

  navigateTo(tab) {
    this.activeTab = tab;

    // Cập nhật trạng thái nút thanh điều hướng
    document.querySelectorAll('.bottom-nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.navTarget === tab);
    });

    const userView = document.getElementById('user-view');
    const adminWrapper = document.getElementById('admin-view');

    if (tab === 'admin') {
      if (!Store.isAdminAuthenticated()) {
        this.openPinModal();
        return;
      }
      userView.style.display = 'none';
      adminWrapper.classList.add('active');
      AdminModule.refreshAdminData();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Trở về các view của người dùng
    adminWrapper.classList.remove('active');
    userView.style.display = 'block';

    if (tab === 'home') {
      this.searchQuery = '';
      const sInput = document.getElementById('main-search-input');
      if (sInput) sInput.value = '';
      this.renderBooks();
    } else if (tab === 'favorites') {
      this.renderBooks({ onlyFavorites: true });
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  openPinModal() {
    const modal = document.getElementById('pin-modal');
    const pinInput = document.getElementById('pin-input');
    if (modal) {
      modal.classList.add('active');
      if (pinInput) {
        pinInput.value = '';
        pinInput.classList.remove('revealed');
        const togglePinBtn = document.getElementById('btn-toggle-pin-visibility');
        if (togglePinBtn) togglePinBtn.textContent = '👁️';
        setTimeout(() => pinInput.focus(), 200);
      }
    }
  },

  async handlePinSubmit() {
    const pinInput = document.getElementById('pin-input');
    const enteredPin = pinInput ? pinInput.value.trim() : '';

    if (!enteredPin) {
      this.showToast('Vui lòng nhập mật khẩu quản trị!', 'warning');
      return;
    }

    const submitBtn = document.getElementById('btn-submit-pin');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Đang xác thực...';
    }

    const result = await Store.verifyAdminPin(enteredPin);

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Xác Nhận';
    }

    if (result.success) {
      this.closeModal('pin-modal');
      this.showToast('🔒 Đăng nhập Quản trị viên thành công (Đã mã hóa bảo vệ)!', 'success');
      if (!window.location.pathname.includes('/admin')) {
        window.history.pushState(null, '', '#admin');
      }
      this.navigateTo('admin');
    } else {
      this.showToast(result.error || 'Mật khẩu quản trị không chính xác!', 'error');
      if (pinInput) {
        pinInput.value = '';
        pinInput.focus();
      }
    }
  },

  renderBooks(options = {}) {
    const container = document.getElementById('books-grid');
    const countBadge = document.getElementById('book-count-badge');
    const sectionTitle = document.getElementById('section-title-text');
    if (!container) return;

    let books = Store.getBooks();

    // Sắp xếp: Sách ghim (isPinned) lên đầu tiên
    books.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));

    // Lọc theo yêu thích nếu tab favorites
    if (options.onlyFavorites || this.activeTab === 'favorites') {
      const favs = Store.getFavorites();
      books = books.filter(b => favs.includes(b.id));
      if (sectionTitle) sectionTitle.textContent = 'Tài Liệu Yêu Thích Của Bạn';
    } else {
      if (sectionTitle) sectionTitle.textContent = 'Kho Tài Liệu DOCX';
    }

    // Lọc theo Từ khóa tìm kiếm
    if (this.searchQuery) {
      books = books.filter(b =>
        b.title.toLowerCase().includes(this.searchQuery) ||
        (b.author && b.author.toLowerCase().includes(this.searchQuery)) ||
        (b.description && b.description.toLowerCase().includes(this.searchQuery)) ||
        (b.category && b.category.toLowerCase().includes(this.searchQuery))
      );
    }

    // Cập nhật số lượng
    if (countBadge) {
      countBadge.textContent = `${books.length} tài liệu`;
    }

    // Khi không có sách nào:
    if (books.length === 0) {
      if (this.searchQuery) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-droplet">🔍</div>
            <h3 class="empty-title">Không tìm thấy tài liệu phù hợp</h3>
            <p class="empty-desc">Không có tài liệu nào khớp với từ khóa "${this.searchQuery}". Hãy thử tìm kiếm với từ khóa khác.</p>
          </div>
        `;
      } else if (options.onlyFavorites || this.activeTab === 'favorites') {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-droplet">❤️</div>
            <h3 class="empty-title">Chưa có tài liệu yêu thích</h3>
            <p class="empty-desc">Nhấn vào biểu tượng trái tim trên các thẻ tài liệu để lưu vào danh sách xem sau của bạn.</p>
          </div>
        `;
      } else {
        // Trạng thái kho sách ban đầu rỗng hoàn toàn, không hiển thị nút quản trị công khai cho khách
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-droplet">💧</div>
            <h3 class="empty-title">Kho Tài Liệu Đang Sẵn Sàng</h3>
            <p class="empty-desc">Hệ thống đang được cập nhật các tài liệu mới chất lượng cao. Bạn có thể sử dụng thanh tìm kiếm để tra cứu hoặc quay lại sau ít phút.</p>
          </div>
        `;
      }
      return;
    }

    container.innerHTML = books.map(book => {
      const isFav = Store.isFavorite(book.id);
      const coverUrl = book.coverImage || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=600&auto=format&fit=crop';
      return `
        <div class="book-card" onclick="window.App.openBookDetail('${book.id}')">
          <div class="book-cover-wrapper">
            <img 
              src="${coverUrl}" 
              alt="${book.title}" 
              class="book-cover-img" 
              loading="lazy"
              onerror="this.src='https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=600&auto=format&fit=crop'"
            >
            <div class="cover-gradient-overlay"></div>
            <div class="card-badges-top">
              <span class="badge-docx">DOCX</span>
              ${book.isPinned ? '<span class="badge-pinned">📌 Ghim</span>' : '<span></span>'}
            </div>
            <button 
              class="btn-favorite-card ${isFav ? 'active' : ''}" 
              title="${isFav ? 'Bỏ yêu thích' : 'Yêu thích'}"
              onclick="event.stopPropagation(); window.App.toggleFavorite('${book.id}')"
            >
              <svg width="16" height="16" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"/>
              </svg>
            </button>
          </div>

          <div class="book-card-body">
            <div class="book-card-main-info">
              <div class="book-card-cat">${book.category || 'Tài Liệu'}</div>
              <h3 class="book-card-title" title="${book.title}">${book.title}</h3>
              <div class="book-card-author">${book.author || 'Tài Liệu Free'}</div>
            </div>

            <div class="book-card-footer">
              <div class="book-card-stats">
                <span class="stat-item">👁️ ${book.views || 0}</span>
                <span class="stat-item">⬇️ ${book.downloads || 0}</span>
              </div>
              <button 
                class="btn-read-card ${AdManager.isSmartlinkUnlocked(book.id) ? 'step-two-ready' : ''}"
                onclick="event.stopPropagation(); window.App.handleDirectDocxAction('${book.id}', this)"
              >
                ${AdManager.isSmartlinkUnlocked(book.id) 
                  ? '⚡ Bấm Lần 2 Để Tải DOCX' 
                  : `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.5V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/>
                    </svg>
                    Tải DOCX`}
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  openBookDetail(bookId) {
    const book = Store.getBookById(bookId);
    if (!book) return;

    // Tăng lượt xem thật khi người dùng xem chi tiết tài liệu
    Store.incrementViews(book.id);
    book.views = (book.views || 0) + 1;
    this.selectedBook = book;

    const modal = document.getElementById('book-detail-modal');
    if (!modal) return;

    document.getElementById('modal-book-cover').src = book.coverImage || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=600&auto=format&fit=crop';
    document.getElementById('modal-book-title').textContent = book.title;
    document.getElementById('modal-book-category').textContent = book.category || 'Tài Liệu';
    document.getElementById('modal-book-author').textContent = book.author || 'Tài Liệu Free';
    document.getElementById('modal-book-desc').textContent = book.description || 'Chưa có mô tả chi tiết cho tài liệu này.';
    document.getElementById('modal-book-views').textContent = book.views || 0;
    document.getElementById('modal-book-downloads').textContent = book.downloads || 0;

    // Gán nút Mở DOCX trong Modal với trạng thái Smartlink
    const btnOpenDocx = document.getElementById('modal-btn-open-docx');
    if (btnOpenDocx) {
      if (AdManager.isSmartlinkUnlocked(book.id)) {
        btnOpenDocx.classList.add('step-two-ready');
        btnOpenDocx.innerHTML = `
          <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
          ⚡ Bấm Lần 2 Để Mở File DOCX
        `;
      } else {
        btnOpenDocx.classList.remove('step-two-ready');
        btnOpenDocx.innerHTML = `
          <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.5V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/>
          </svg>
          Tải / Mở File DOCX Ngay
        `;
      }

      btnOpenDocx.onclick = () => {
        this.handleDirectDocxAction(book.id, btnOpenDocx);
      };
    }

    modal.classList.add('active');
  },

  handleDirectDocxAction(bookId, targetBtn) {
    const book = Store.getBookById(bookId);
    if (!book) return;

    // Cơ chế Smartlink 2 bước: Lần 1 mở tab Smartlink quảng cáo, Lần 2 mở thẳng file DOCX
    AdManager.handleSmartlinkDownload(
      book,
      (targetBook) => {
        this.renderBooks();
        window.open(targetBook.docxUrl, '_blank', 'noopener,noreferrer');
      },
      (msg, type, duration) => this.showToast(msg, type, duration),
      targetBtn
    );
  },

  toggleFavorite(bookId) {
    const isNowFav = Store.toggleFavorite(bookId);
    this.showToast(
      isNowFav ? 'Đã thêm vào danh sách yêu thích!' : 'Đã xoá khỏi yêu thích!',
      'info'
    );
    this.updateFavoritesCount();
    this.renderBooks();
  },

  updateFavoritesCount() {
    const favs = Store.getFavorites();
    const badge = document.getElementById('nav-fav-badge');
    if (badge) {
      badge.textContent = favs.length;
      badge.style.display = favs.length > 0 ? 'inline-block' : 'none';
    }
  },

  closeModal(modalId) {
    if (modalId) {
      const target = document.getElementById(modalId);
      if (target) target.classList.remove('active');
    } else {
      document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.classList.remove('active');
      });
      // Nếu đóng download gate, ngắt timer
      AdManager.closeDownloadGate();
    }
  },

  showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'warning') icon = '⚠️';
    if (type === 'error') icon = '❌';

    toast.innerHTML = `
      <span>${icon} ${message}</span>
      <button style="background:none;border:none;color:#fff;cursor:pointer;opacity:0.7;font-size:16px;">✕</button>
    `;

    toast.querySelector('button').addEventListener('click', () => {
      toast.remove();
    });

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
};

// Khởi chạy ứng dụng khi DOM sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
