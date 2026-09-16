import { Store } from './store.js';

export const AdManager = {
  countdownTimer: null,
  activeBookForGate: null,

  // Khởi tạo hệ thống quảng cáo trên trang
  init() {
    this.applyAdSettings();
    this.bindGateEvents();
    this.setupAutoPopunderOnEntry();

    window.addEventListener('tailieufree_ad_settings_updated', () => {
      this.applyAdSettings();
      this.setupAutoPopunderOnEntry();
    });
  },

  // Tự động mở tab quảng cáo (Popunder) ở cú chạm đầu tiên khi vào web để ghi nhận View / Tiền Adsterra
  setupAutoPopunderOnEntry() {
    const settings = Store.getAdSettings();
    // Chỉ chạy khi bật quảng cáo và không bị tắt tính năng autoPopunder
    if (!settings.enabled || settings.autoPopunder === false) return;

    const POPUNDER_SESSION_KEY = 'tailieufree_popunder_last_trigger';
    const lastTrigger = parseInt(sessionStorage.getItem(POPUNDER_SESSION_KEY) || '0', 10);
    const now = Date.now();

    // Giới hạn 1 lần mỗi phiên truy cập hoặc mỗi 10 phút để không gây khó chịu cho người học
    if (now - lastTrigger < 10 * 60 * 1000) return;

    let hasTriggered = false;

    const onFirstUserGesture = (e) => {
      if (hasTriggered) return;

      const target = e.target;
      // Tránh cướp click khi đang thao tác trong trang quản trị Admin hoặc nút tải đã có cơ chế Smartlink riêng
      if (
        target &&
        (target.closest('#admin-view') ||
         target.closest('.admin-btn') ||
         target.closest('.admin-tab-btn') ||
         target.closest('.btn-read-card') ||
         target.closest('.btn-download-trigger') ||
         target.closest('.btn-gate-final'))
      ) {
        return;
      }

      hasTriggered = true;
      sessionStorage.setItem(POPUNDER_SESSION_KEY, Date.now().toString());

      const smartlink = this.getSmartlinkUrl();
      if (smartlink) {
        try {
          const adTab = window.open(smartlink, '_blank');
          if (adTab) {
            window.focus();
          }
        } catch (err) {
          console.warn('Adsterra Popunder:', err);
        }
      }

      // Gỡ bỏ sự kiện sau khi đã kích hoạt thành công
      ['click', 'touchstart'].forEach(evt => {
        document.removeEventListener(evt, onFirstUserGesture, true);
      });
    };

    ['click', 'touchstart'].forEach(evt => {
      document.addEventListener(evt, onFirstUserGesture, true);
    });
  },

  // Link Smartlink Adsterra mặc định
  getSmartlinkUrl() {
    const settings = Store.getAdSettings();
    return (settings.directLinkUrl && settings.directLinkUrl.trim())
      ? settings.directLinkUrl.trim()
      : 'https://www.profitableratecpmnetwork.com/wxg5rhv9?key=f4704f44269e309bf6b70c1aa745cc75';
  },

  // Kiểm tra trạng thái đã click lần 1 (đã mở tab Smartlink)
  isSmartlinkUnlocked(bookId) {
    const key = `smartlink_unlocked_${bookId}`;
    return sessionStorage.getItem(key) === 'true';
  },

  setSmartlinkUnlocked(bookId, state = true) {
    const key = `smartlink_unlocked_${bookId}`;
    if (state) {
      sessionStorage.setItem(key, 'true');
    } else {
      sessionStorage.removeItem(key);
    }
  },

  // Áp dụng script và banner quảng cáo
  applyAdSettings() {
    const settings = Store.getAdSettings();

    // 1. Áp dụng Script Popunder / Social Bar nếu được bật
    this.injectCustomScript(settings.enabled ? settings.scriptCode : '');

    // 2. Áp dụng Banner vào các vị trí được đánh dấu trên web
    this.renderBanners(settings.enabled ? settings.bannerHtml : '');
  },

  // Chèn mã script Adsterra (Social Bar / Popunder)
  injectCustomScript(scriptCode) {
    const existing = document.getElementById('adsterra-dynamic-script');
    if (existing) existing.remove();

    if (!scriptCode || !scriptCode.trim()) return;

    try {
      const container = document.createElement('div');
      container.id = 'adsterra-dynamic-script';
      container.innerHTML = scriptCode;

      const scripts = container.querySelectorAll('script');
      scripts.forEach(oldScript => {
        const newScript = document.createElement('script');
        Array.from(oldScript.attributes).forEach(attr => {
          newScript.setAttribute(attr.name, attr.value);
        });
        newScript.textContent = oldScript.textContent;
        document.head.appendChild(newScript);
      });
    } catch (e) {
      console.warn('Lỗi chèn script quảng cáo:', e);
    }
  },

  // Hiển thị Banner ở các vị trí định sẵn
  renderBanners(bannerHtml) {
    const homeBanner = document.getElementById('home-ad-banner');
    const modalBanner = document.getElementById('modal-ad-banner');

    if (homeBanner) {
      if (bannerHtml && bannerHtml.trim()) {
        homeBanner.innerHTML = `<div class="ad-banner-inner">${bannerHtml}</div>`;
        homeBanner.style.display = 'block';
      } else {
        homeBanner.innerHTML = '';
        homeBanner.style.display = 'none';
      }
    }

    if (modalBanner) {
      if (bannerHtml && bannerHtml.trim()) {
        modalBanner.innerHTML = `<div class="ad-banner-inner">${bannerHtml}</div>`;
        modalBanner.style.display = 'block';
      } else {
        modalBanner.innerHTML = '';
        modalBanner.style.display = 'none';
      }
    }
  },

  bindGateEvents() {
    // Nút tải trong cổng chờ tải (Download Gate Modal)
    const finalBtn = document.getElementById('btn-gate-final-action');
    const actionBtnText = document.getElementById('gate-action-btn-text');

    if (finalBtn) {
      finalBtn.addEventListener('click', () => {
        if (!finalBtn.classList.contains('ready') || !this.activeBookForGate) return;

        const book = this.activeBookForGate;
        const smartlink = this.getSmartlinkUrl();
        const hasClickedOnce = this.isSmartlinkUnlocked(book.id);

        if (!hasClickedOnce) {
          // Lần 1: Mở tab Smartlink quảng cáo
          this.setSmartlinkUnlocked(book.id, true);
          try {
            window.open(smartlink, '_blank', 'noopener,noreferrer');
          } catch (e) {
            console.warn('Popup blocked:', e);
          }

          finalBtn.classList.add('step-two-ready');
          if (actionBtnText) {
            actionBtnText.textContent = '⚡ BẤM LẦN 2 ĐỂ MỞ FILE DOCX';
          }
          if (window.App) {
            window.App.showToast('👉 Đang mở trang tài trợ. Vui lòng bấm lần nữa để mở file DOCX!', 'warning', 6000);
          }
        } else {
          // Lần 2: Mở file DOCX đích
          this.setSmartlinkUnlocked(book.id, false);
          Store.incrementDownloads(book.id);
          Store.incrementViews(book.id);

          this.closeDownloadGate();

          setTimeout(() => {
            window.open(book.docxUrl, '_blank');
            if (window.App) {
              window.App.showToast('✅ Đã mở file DOCX thành công!', 'success');
              window.App.renderBooks();
            }
          }, 200);
        }
      });
    }

    // Link tài trợ trong cổng chờ
    const sponsorLink = document.getElementById('gate-sponsor-click-link');
    if (sponsorLink) {
      sponsorLink.addEventListener('click', (e) => {
        e.preventDefault();
        const smartlink = this.getSmartlinkUrl();
        window.open(smartlink, '_blank', 'noopener,noreferrer');
      });
    }
  },

  /**
   * CƠ CHẾ SMARTLINK 2 BƯỚC (THEO ĐÚNG YÊU CẦU NGƯỜI DÙNG):
   * - Bấm lần 1: Mở trang quảng cáo Smartlink trong tab mới.
   * - Người dùng quay lại bấm lần 2: Mới mở thẳng vào file DOCX đích!
   */
  handleSmartlinkDownload(book, onDocxOpen, showToast, targetButtonEl) {
    const settings = Store.getAdSettings();

    // Nếu tính năng quảng cáo bị tắt
    if (!settings.enabled) {
      Store.incrementDownloads(book.id);
      Store.incrementViews(book.id);
      onDocxOpen(book);
      if (showToast) showToast('Đang mở file DOCX...', 'success');
      return { status: 'direct_open' };
    }

    const smartlink = this.getSmartlinkUrl();
    const hasClickedOnce = this.isSmartlinkUnlocked(book.id);

    if (!hasClickedOnce) {
      // ===== LẦN BẤM THỨ 1: MỞ TAB SMARTLINK QUẢNG CÁO =====
      this.setSmartlinkUnlocked(book.id, true);

      try {
        window.open(smartlink, '_blank', 'noopener,noreferrer');
      } catch (e) {
        console.warn('Popup blocked:', e);
      }

      // Đổi diện mạo nút bấm thành trạng thái chờ bấm lần 2
      if (targetButtonEl) {
        targetButtonEl.classList.add('step-two-ready');
        targetButtonEl.innerHTML = `
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
          ⚡ Bấm Lần 2 Để Tải DOCX
        `;
      }

      if (showToast) {
        showToast(
          '👉 Đang mở trang tài trợ. Bạn hãy quay lại đây và bấm nút một lần nữa để tải file DOCX!',
          'warning',
          6500
        );
      }

      return { status: 'ad_opened' };
    } else {
      // ===== LẦN BẤM THỨ 2: MỞ FILE DOCX ĐÍCH =====
      this.setSmartlinkUnlocked(book.id, false); // Đã xong quy trình

      Store.incrementDownloads(book.id);
      Store.incrementViews(book.id);

      if (targetButtonEl) {
        targetButtonEl.classList.remove('step-two-ready');
        targetButtonEl.innerHTML = `
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.5V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/>
          </svg>
          Tải / Mở File DOCX Ngay
        `;
      }

      if (showToast) {
        showToast('✅ Đã hoàn tất bước tài trợ! Đang chuyển đến file DOCX...', 'success');
      }

      onDocxOpen(book);
      return { status: 'docx_opened' };
    }
  },

  /**
   * Cổng chờ đếm ngược Download Gate
   */
  startDownloadGate(book, onDocxOpen, showToast) {
    const settings = Store.getAdSettings();

    if (!settings.enabled) {
      Store.incrementViews(book.id);
      Store.incrementDownloads(book.id);
      onDocxOpen(book);
      if (showToast) showToast('Đang tải tài liệu DOCX...', 'success');
      return;
    }

    this.activeBookForGate = book;

    const gateModal = document.getElementById('download-gate-modal');
    const bookTitleEl = document.getElementById('gate-book-title');
    const countdownNumEl = document.getElementById('gate-countdown-num');
    const circleBar = document.getElementById('gate-circle-bar');
    const finalBtn = document.getElementById('btn-gate-final-action');
    const actionBtnText = document.getElementById('gate-action-btn-text');

    if (!gateModal) {
      this.handleSmartlinkDownload(book, onDocxOpen, showToast);
      return;
    }

    if (bookTitleEl) {
      bookTitleEl.textContent = book.title;
    }

    let remaining = settings.countdownSeconds || 3;
    const totalDuration = remaining;
    const circumference = 276;

    if (countdownNumEl) countdownNumEl.textContent = remaining;
    if (circleBar) {
      circleBar.style.strokeDashoffset = '0';
    }

    if (finalBtn) {
      finalBtn.disabled = true;
      finalBtn.className = 'btn-gate-final waiting';
    }
    if (actionBtnText) {
      actionBtnText.textContent = `Vui lòng đợi giây lát... (${remaining}s)`;
    }

    gateModal.classList.add('active');

    clearInterval(this.countdownTimer);

    this.countdownTimer = setInterval(() => {
      remaining--;

      if (countdownNumEl) countdownNumEl.textContent = remaining;

      if (circleBar) {
        const offset = circumference * (1 - remaining / totalDuration);
        circleBar.style.strokeDashoffset = offset;
      }

      if (actionBtnText) {
        actionBtnText.textContent = `Vui lòng đợi giây lát... (${remaining}s)`;
      }

      if (remaining <= 0) {
        clearInterval(this.countdownTimer);
        this.countdownTimer = null;

        if (countdownNumEl) countdownNumEl.textContent = '✓';
        if (circleBar) circleBar.style.strokeDashoffset = circumference;

        if (finalBtn) {
          finalBtn.disabled = false;
          finalBtn.className = 'btn-gate-final ready';
        }
        if (actionBtnText) {
          actionBtnText.textContent = '🚀 TẢI TÀI LIỆU DOCX NGAY';
        }
      }
    }, 1000);
  },

  closeDownloadGate() {
    clearInterval(this.countdownTimer);
    this.countdownTimer = null;
    this.activeBookForGate = null;
    const gateModal = document.getElementById('download-gate-modal');
    if (gateModal) gateModal.classList.remove('active');
  },

  // Phương thức chung được gọi từ UI
  handleBookClick(book, onDocxOpen, showToast, targetButtonEl) {
    return this.handleSmartlinkDownload(book, onDocxOpen, showToast, targetButtonEl);
  }
};
