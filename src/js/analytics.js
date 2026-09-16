/**
 * TaiLieuFree - Realtime Analytics & Security Client
 * Kết nối với Python Serverless Engine (/api/track) để thống kê người xem thật và lượt tải thật
 */

const ANALYTICS_CONFIG = {
  HEARTBEAT_INTERVAL_MS: 35000, // Ping mỗi 35 giây
  API_BASE: '/api'
};

export const Analytics = {
  sessionId: null,
  heartbeatTimer: null,
  cachedStats: {
    onlineNow: 1,
    totalViews: 0,
    totalDownloads: 0
  },

  init() {
    this.initSession();
    this.trackVisit();
    this.startHeartbeat();
    this.fetchLiveStats();

    // Lắng nghe sự kiện tải file DOCX thật từ toàn bộ ứng dụng
    window.addEventListener('tailieufree_download_recorded', (e) => {
      if (e.detail && e.detail.bookId) {
        this.recordDownload(e.detail.bookId);
      }
    });
  },

  initSession() {
    let sid = sessionStorage.getItem('tlf_session_id');
    if (!sid) {
      sid = 'usr_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
      sessionStorage.setItem('tlf_session_id', sid);
    }
    this.sessionId = sid;
  },

  async trackVisit(bookId = null) {
    try {
      const res = await fetch(`${ANALYTICS_CONFIG.API_BASE}/track/visit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: this.sessionId,
          book_id: bookId,
          referrer: document.referrer || '',
          timestamp: Date.now()
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          this.cachedStats.onlineNow = data.online_now || 1;
          this.cachedStats.totalViews = data.total_views || 0;
          this.cachedStats.totalDownloads = data.total_downloads || 0;
          this.updateUiBadges();
        }
      }
    } catch {
      // Fallback cục bộ mượt mà nếu API chưa sẵn sàng hoặc offline
      this.updateUiBadges();
    }
  },

  async recordDownload(bookId) {
    if (!bookId) return;
    try {
      const res = await fetch(`${ANALYTICS_CONFIG.API_BASE}/track/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          book_id: bookId,
          session_id: this.sessionId,
          timestamp: Date.now()
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          this.cachedStats.totalDownloads = data.total_downloads || (this.cachedStats.totalDownloads + 1);
          this.updateUiBadges();
        }
      }
    } catch {
      // Fallback offline
    }
  },

  async fetchLiveStats() {
    try {
      const res = await fetch(`${ANALYTICS_CONFIG.API_BASE}/stats`);
      if (res.ok) {
        const data = await res.json();
        if (data.realtime) {
          this.cachedStats.onlineNow = data.realtime.online_now || 1;
          this.cachedStats.totalViews = data.realtime.total_views || 0;
          this.cachedStats.totalDownloads = data.realtime.total_downloads || 0;
          this.updateUiBadges();
        }
      }
    } catch {
      this.updateUiBadges();
    }
  },

  startHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      this.trackVisit();
    }, ANALYTICS_CONFIG.HEARTBEAT_INTERVAL_MS);
  },

  updateUiBadges() {
    const liveTextEl = document.getElementById('realtime-online-text');
    const onlineBadgeCount = document.getElementById('realtime-badge-count');
    const statOnlineEl = document.getElementById('stat-realtime-online');
    const statViewsEl = document.getElementById('stat-total-views');
    const statDownloadsEl = document.getElementById('stat-total-downloads');

    const online = Math.max(1, this.cachedStats.onlineNow);

    if (liveTextEl) {
      liveTextEl.innerHTML = `Đang có <strong>${online}</strong> người xem trực tiếp`;
    }
    if (onlineBadgeCount) {
      onlineBadgeCount.textContent = online;
    }
    if (statOnlineEl) {
      statOnlineEl.textContent = online;
    }
    if (statViewsEl && this.cachedStats.totalViews > 0) {
      statViewsEl.textContent = this.cachedStats.totalViews;
    }
    if (statDownloadsEl && this.cachedStats.totalDownloads > 0) {
      statDownloadsEl.textContent = this.cachedStats.totalDownloads;
    }
  }
};
