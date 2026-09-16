import { Store } from './store.js';
import { CATEGORIES } from './sample-data.js';
import { AdManager } from './ads.js';

export const AdminModule = {
  activeTab: 'add-book',
  currentEditingId: null,
  uploadedCoverBase64: null,

  init(renderAppCallback, showToastCallback) {
    this.renderApp = renderAppCallback;
    this.showToast = showToastCallback;
    this.bindEvents();
  },

  bindEvents() {
    // Chuyển tab Admin
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.currentTarget.dataset.tab;
        this.switchTab(tab);
      });
    });

    // Upload ảnh bìa (Kéo thả hoặc Chọn file từ máy)
    const dropzone = document.getElementById('cover-dropzone');
    const fileInput = document.getElementById('cover-file-input');
    const removePreviewBtn = document.getElementById('btn-remove-cover');

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());
      
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });

      dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
      });

      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          this.handleImageFile(e.dataTransfer.files[0]);
        }
      });

      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          this.handleImageFile(e.target.files[0]);
        }
      });
    }

    if (removePreviewBtn) {
      removePreviewBtn.addEventListener('click', () => {
        this.clearCoverPreview();
      });
    }

    // Submit form thêm / sửa sách
    const bookForm = document.getElementById('admin-book-form');
    if (bookForm) {
      bookForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSaveBook();
      });
    }

    // Nút hủy chỉnh sửa
    const cancelEditBtn = document.getElementById('btn-cancel-edit');
    if (cancelEditBtn) {
      cancelEditBtn.addEventListener('click', () => {
        this.resetForm();
        this.switchTab('manage-books');
      });
    }

    // Lưu cấu hình Quảng cáo
    const saveAdBtn = document.getElementById('btn-save-ads');
    const testAdBtn = document.getElementById('btn-test-ad');

    if (saveAdBtn) {
      saveAdBtn.addEventListener('click', () => {
        const enabled = document.getElementById('adsterra-toggle')?.checked || false;
        const directLinkUrl = document.getElementById('adsterra-direct-url')?.value.trim() || '';
        const scriptCode = document.getElementById('adsterra-script-code')?.value.trim() || '';
        const bannerHtml = document.getElementById('adsterra-banner-code')?.value.trim() || '';
        const countdownSeconds = parseInt(document.getElementById('ad-countdown-input')?.value) || 5;

        Store.saveAdSettings({ enabled, directLinkUrl, scriptCode, bannerHtml, countdownSeconds });
        this.showToast('Đã lưu cấu hình quảng cáo thành công!', 'success');
        this.updateStats();
      });
    }

    if (testAdBtn) {
      testAdBtn.addEventListener('click', () => {
        const testBook = {
          id: 'test-demo',
          docxUrl: 'https://file-examples.com/storage/fe07b3017a66f076c8bbdbd/2017/02/file-sample_100kB.docx',
          title: 'File DOCX Thử Nghiệm'
        };
        AdManager.handleBookClick(testBook, (b) => {
          this.showToast('✅ Đã hoàn thành bước quảng cáo -> Mở file DOCX thành công!', 'success');
          window.open(b.docxUrl, '_blank');
        }, this.showToast);
      });
    }

    // Đổi mật khẩu Admin
    const changePinForm = document.getElementById('admin-change-pin-form');
    if (changePinForm) {
      changePinForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const oldPin = document.getElementById('old-pin-input')?.value.trim();
        const newPin = document.getElementById('new-pin-input')?.value.trim();
        const confirmPin = document.getElementById('confirm-new-pin-input')?.value.trim();

        if (oldPin !== Store.getAdminPin()) {
          this.showToast('Mật khẩu hiện tại không chính xác!', 'error');
          return;
        }
        if (!newPin || newPin.length < 4) {
          this.showToast('Mật khẩu mới phải có ít nhất 4 ký tự!', 'warning');
          return;
        }
        if (newPin !== confirmPin) {
          this.showToast('Xác nhận mật khẩu mới không khớp!', 'error');
          return;
        }

        Store.setAdminPin(newPin);
        changePinForm.reset();
        this.showToast('Đã đổi mật khẩu quản trị thành công!', 'success');
      });
    }

    // Nút Xóa toàn bộ sách mẫu
    const clearSampleBtn = document.getElementById('btn-clear-sample-books');
    if (clearSampleBtn) {
      clearSampleBtn.addEventListener('click', () => {
        if (confirm('Bạn có chắc chắn muốn xóa toàn bộ sách hiện tại để bắt đầu nhập sách thật không?')) {
          Store.clearAllBooks();
          this.showToast('Đã xóa danh sách sách. Bạn có thể bắt đầu đăng sách thật!', 'success');
          this.renderApp();
          this.refreshAdminData();
        }
      });
    }

    // Nút Đăng xuất Admin
    const logoutBtn = document.getElementById('btn-admin-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        Store.logoutAdmin();
        this.showToast('Đã đăng xuất khỏi phiên Quản trị viên.', 'info');
        window.history.pushState(null, '', '/');
        if (window.App) {
          window.App.navigateTo('home');
        }
      });
    }

    // Nút Thoát ra trang người dùng
    const backHomeBtn = document.getElementById('btn-admin-back-home');
    if (backHomeBtn) {
      backHomeBtn.addEventListener('click', () => {
        window.history.pushState(null, '', '/');
        if (window.App) {
          window.App.navigateTo('home');
        }
      });
    }

    // Backup & Restore (JSON)
    const exportBtn = document.getElementById('btn-export-data');
    const importInput = document.getElementById('import-file-input');
    const resetBtn = document.getElementById('btn-reset-data');
    const exportDbBtn = document.getElementById('btn-export-database');
    const copyDbJsonBtn = document.getElementById('btn-copy-database-json');

    // Tải file cơ sở dữ liệu web (initial-books.json)
    if (exportDbBtn) {
      exportDbBtn.addEventListener('click', () => {
        const books = Store.getBooks();
        const jsonContent = JSON.stringify(books, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'initial-books.json';
        a.click();
        URL.revokeObjectURL(url);
        this.showToast('✅ Đã tải file initial-books.json! Lưu đè vào src/js/ và đẩy lên GitHub để lưu vĩnh viễn.', 'success');
      });
    }

    // Sao chép mã JSON dữ liệu web
    if (copyDbJsonBtn) {
      copyDbJsonBtn.addEventListener('click', () => {
        const books = Store.getBooks();
        const jsonContent = JSON.stringify(books, null, 2);
        navigator.clipboard.writeText(jsonContent).then(() => {
          this.showToast('📋 Đã sao chép toàn bộ mã JSON dữ liệu vào bộ nhớ tạm!', 'success');
        }).catch(() => {
          this.showToast('Không thể sao chép tự động. Vui lòng thử nút Tải File.', 'warning');
        });
      });
    }

    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const data = Store.exportAllData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tailieufree_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.showToast('Đã xuất file sao lưu JSON thành công!', 'success');
      });
    }

    if (importInput) {
      importInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const parsed = JSON.parse(evt.target.result);
            if (Store.importData(parsed)) {
              this.showToast('Khôi phục dữ liệu thành công!', 'success');
              this.renderApp();
              this.refreshAdminData();
            } else {
              this.showToast('File JSON không đúng cấu trúc!', 'error');
            }
          } catch (err) {
            this.showToast('Lỗi đọc file JSON: ' + err.message, 'error');
          }
        };
        reader.readAsText(file);
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Bạn có chắc chắn muốn khôi phục về cơ sở dữ liệu gốc của web không?')) {
          Store.resetToDefault();
          this.showToast('Đã khôi phục dữ liệu gốc của web!', 'info');
          this.renderApp();
          this.refreshAdminData();
        }
      });
    }
  },

  // Xử lý nén ảnh Base64
  handleImageFile(file) {
    if (!file.type.startsWith('image/')) {
      this.showToast('Vui lòng chọn file hình ảnh (PNG, JPG, WEBP)!', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = (scaleSize < 1) ? MAX_WIDTH : img.width;
        canvas.height = (scaleSize < 1) ? img.height * scaleSize : img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        this.uploadedCoverBase64 = canvas.toDataURL('image/jpeg', 0.85);
        this.showCoverPreview(this.uploadedCoverBase64, file.name);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  },

  showCoverPreview(src, filename = 'Ảnh tải lên') {
    const previewContainer = document.getElementById('cover-preview-container');
    const previewImg = document.getElementById('cover-preview-img');
    const previewName = document.getElementById('cover-preview-name');
    if (previewContainer && previewImg) {
      previewImg.src = src;
      if (previewName) previewName.textContent = filename;
      previewContainer.classList.add('active');
    }
  },

  clearCoverPreview() {
    this.uploadedCoverBase64 = null;
    const previewContainer = document.getElementById('cover-preview-container');
    const previewImg = document.getElementById('cover-preview-img');
    const fileInput = document.getElementById('cover-file-input');
    if (previewContainer) previewContainer.classList.remove('active');
    if (previewImg) previewImg.src = '';
    if (fileInput) fileInput.value = '';
  },

  switchTab(tabId) {
    this.activeTab = tabId;
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    document.querySelectorAll('.admin-panel-content').forEach(panel => {
      panel.classList.toggle('active', panel.id === `tab-${tabId}`);
    });

    if (tabId === 'manage-books') {
      this.renderManageList();
    } else if (tabId === 'ad-settings') {
      this.loadAdSettings();
    }
  },

  loadAdSettings() {
    const settings = Store.getAdSettings();
    const adToggle = document.getElementById('adsterra-toggle');
    const adUrlInput = document.getElementById('adsterra-direct-url');
    const scriptInput = document.getElementById('adsterra-script-code');
    const bannerInput = document.getElementById('adsterra-banner-code');
    const countdownInput = document.getElementById('ad-countdown-input');

    if (adToggle) adToggle.checked = !!settings.enabled;
    if (adUrlInput) adUrlInput.value = settings.directLinkUrl || '';
    if (scriptInput) scriptInput.value = settings.scriptCode || '';
    if (bannerInput) bannerInput.value = settings.bannerHtml || '';
    if (countdownInput) countdownInput.value = settings.countdownSeconds || 5;
  },

  handleSaveBook() {
    const title = document.getElementById('book-title-input')?.value.trim();
    const docxUrl = document.getElementById('book-docx-input')?.value.trim();
    const category = document.getElementById('book-category-select')?.value;
    const author = document.getElementById('book-author-input')?.value.trim();
    const coverUrlInput = document.getElementById('book-cover-url-input')?.value.trim();
    const description = document.getElementById('book-desc-input')?.value.trim();
    const isPinned = document.getElementById('book-pin-checkbox')?.checked;

    if (!title || !docxUrl) {
      this.showToast('Vui lòng điền tiêu đề sách và link file DOCX!', 'warning');
      return;
    }

    let coverImage = this.uploadedCoverBase64 || coverUrlInput;
    if (!coverImage) {
      coverImage = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=600&auto=format&fit=crop';
    }

    if (this.currentEditingId) {
      Store.updateBook(this.currentEditingId, {
        title,
        docxUrl,
        category,
        author: author || 'Tài Liệu Free',
        coverImage,
        description,
        isPinned
      });
      this.showToast('Đã cập nhật sách thành công!', 'success');
      this.currentEditingId = null;
      document.getElementById('btn-submit-book-text').textContent = 'Đăng Sách Mới';
      const cancelBtn = document.getElementById('btn-cancel-edit');
      if (cancelBtn) cancelBtn.style.display = 'none';
    } else {
      Store.addBook({
        title,
        docxUrl,
        category,
        author,
        coverImage,
        description,
        isPinned
      });
      this.showToast('✅ Đã thêm tài liệu thành công! Hãy vào tab "Mật Khẩu & Sao Lưu" -> tải file initial-books.json để lưu vĩnh viễn lên GitHub & Vercel.', 'success');
    }

    this.resetForm();
    this.renderApp();
    this.refreshAdminData();
    this.switchTab('manage-books');
  },

  editBook(id) {
    const book = Store.getBookById(id);
    if (!book) return;

    this.currentEditingId = id;
    this.switchTab('add-book');

    document.getElementById('book-title-input').value = book.title;
    document.getElementById('book-docx-input').value = book.docxUrl;
    document.getElementById('book-category-select').value = book.category;
    document.getElementById('book-author-input').value = book.author || '';
    document.getElementById('book-desc-input').value = book.description || '';
    document.getElementById('book-pin-checkbox').checked = !!book.isPinned;

    if (book.coverImage && book.coverImage.startsWith('data:image')) {
      this.uploadedCoverBase64 = book.coverImage;
      this.showCoverPreview(book.coverImage, 'Ảnh hiện tại');
    } else {
      document.getElementById('book-cover-url-input').value = book.coverImage || '';
      this.clearCoverPreview();
    }

    document.getElementById('btn-submit-book-text').textContent = 'Cập Nhật Thay Đổi';
    const cancelBtn = document.getElementById('btn-cancel-edit');
    if (cancelBtn) cancelBtn.style.display = 'inline-flex';

    window.scrollTo({ top: 100, behavior: 'smooth' });
  },

  deleteBook(id) {
    const book = Store.getBookById(id);
    if (!book) return;
    if (confirm(`Bạn có chắc chắn muốn xoá cuốn sách "${book.title}" không?`)) {
      Store.deleteBook(id);
      this.showToast('Đã xoá sách thành công!', 'info');
      this.renderApp();
      this.renderManageList();
      this.updateStats();
    }
  },

  togglePin(id) {
    const book = Store.togglePin(id);
    if (book) {
      this.showToast(book.isPinned ? 'Đã ghim sách lên đầu!' : 'Đã bỏ ghim sách.', 'info');
      this.renderApp();
      this.renderManageList();
    }
  },

  resetForm() {
    const form = document.getElementById('admin-book-form');
    if (form) form.reset();
    this.clearCoverPreview();
    this.currentEditingId = null;
    const submitText = document.getElementById('btn-submit-book-text');
    if (submitText) submitText.textContent = 'Đăng Sách Mới';
    const cancelBtn = document.getElementById('btn-cancel-edit');
    if (cancelBtn) cancelBtn.style.display = 'none';
  },

  renderManageList() {
    const container = document.getElementById('admin-books-list');
    if (!container) return;

    const books = Store.getBooks();
    if (books.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📂</div>
          <div class="empty-title">Kho sách hiện đang trống</div>
          <div class="empty-desc">Chưa có tài liệu nào. Bạn hãy bấm tab "Đăng Sách Mới" để bắt đầu thêm tài liệu thật của mình!</div>
        </div>
      `;
      return;
    }

    container.innerHTML = books.map(book => `
      <div class="admin-book-item" data-id="${book.id}">
        <img src="${book.coverImage}" alt="${book.title}" class="admin-book-thumb" onerror="this.src='https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=600&auto=format&fit=crop'">
        <div class="admin-book-meta">
          <div class="admin-book-meta-title">${book.title}</div>
          <div class="admin-book-meta-sub">
            <span class="meta-tag">🏷️ ${book.category}</span>
            <span class="meta-tag">👁️ ${book.views || 0}</span>
            <span class="meta-tag">⬇️ ${book.downloads || 0}</span>
            ${book.isPinned ? '<span class="meta-tag pinned-tag">📌 Đã ghim</span>' : ''}
          </div>
          <div class="admin-book-link" title="${book.docxUrl}">🔗 ${book.docxUrl}</div>
        </div>
        <div class="admin-book-actions">
          <button class="btn-action-small ${book.isPinned ? 'pinned' : ''}" title="Ghim lên đầu" onclick="window.AdminModule.togglePin('${book.id}')">
            📌
          </button>
          <button class="btn-action-small" title="Chỉnh sửa" onclick="window.AdminModule.editBook('${book.id}')">
            ✏️
          </button>
          <button class="btn-action-small delete" title="Xoá" onclick="window.AdminModule.deleteBook('${book.id}')">
            🗑️
          </button>
        </div>
      </div>
    `).join('');
  },

  updateStats() {
    const books = Store.getBooks();
    const adSettings = Store.getAdSettings();

    const totalBooksEl = document.getElementById('stat-total-books');
    const totalViewsEl = document.getElementById('stat-total-views');
    const totalPinnedEl = document.getElementById('stat-total-pinned');
    const adStatusEl = document.getElementById('stat-ad-status');

    if (totalBooksEl) totalBooksEl.textContent = books.length;
    if (totalViewsEl) {
      const views = books.reduce((acc, b) => acc + (b.views || 0), 0);
      totalViewsEl.textContent = views;
    }
    if (totalPinnedEl) {
      const pinned = books.filter(b => b.isPinned).length;
      totalPinnedEl.textContent = pinned;
    }
    if (adStatusEl) {
      adStatusEl.textContent = adSettings.enabled ? 'Đang BẬT' : 'Đang TẮT';
      adStatusEl.style.color = adSettings.enabled ? 'var(--success)' : 'var(--text-muted)';
    }
  },

  refreshAdminData() {
    this.updateStats();
    this.renderManageList();
    this.loadAdSettings();
  }
};
