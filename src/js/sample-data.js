// Dữ liệu mẫu sách & tài liệu khởi tạo cho TaiLieuFree
export const INITIAL_BOOKS = [
  {
    id: "book-1",
    title: "Giáo Trình Nhập Môn Trí Tuệ Nhân Tạo & Machine Learning (DOCX)",
    author: "Khoa CNTT - ĐH Bách Khoa",
    category: "Công nghệ",
    docxUrl: "https://file-examples.com/storage/fe07b3017a66f076c8bbdbd/2017/02/file-sample_100kB.docx",
    coverImage: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=600&auto=format&fit=crop",
    description: "Tài liệu giáo trình tổng hợp kiến thức nền tảng về AI, học máy (Supervised & Unsupervised Learning), mạng nơ-ron nhân tạo và ứng dụng thực tiễn trong kỷ nguyên số.",
    views: 1240,
    downloads: 852,
    createdAt: "2026-03-10",
    isPinned: true
  },
  {
    id: "book-2",
    title: "Cẩm Nang Khởi Nghiệp Tinh Gọn (The Lean Startup Tóm Tắt)",
    author: "Eric Ries (Biên dịch)",
    category: "Kinh tế",
    docxUrl: "https://file-examples.com/storage/fe07b3017a66f076c8bbdbd/2017/02/file-sample_500kB.docx",
    coverImage: "https://images.unsplash.com/photo-1553729459-efe14ef6055d?q=80&w=600&auto=format&fit=crop",
    description: "Tổng hợp các phương pháp xây dựng doanh nghiệp và mô hình kinh doanh tinh gọn, đo lường chỉ số sản phẩm, kiểm thử giả thuyết và quay vòng vốn hiệu quả.",
    views: 980,
    downloads: 645,
    createdAt: "2026-03-08",
    isPinned: true
  },
  {
    id: "book-3",
    title: "Kỹ Năng Quản Lý Thời Gian & Làm Việc Năng Suất Cao",
    author: "Ban Biên Tập Kỹ Năng",
    category: "Kỹ năng sống",
    docxUrl: "https://file-examples.com/storage/fe07b3017a66f076c8bbdbd/2017/02/file-sample_1MB.docx",
    coverImage: "https://images.unsplash.com/photo-1506784365847-bbad939e9335?q=80&w=600&auto=format&fit=crop",
    description: "Hướng dẫn thực chiến áp dụng quy tắc Pomodoro, ma trận Eisenhower và kỹ thuật Time Blocking để giải quyết tình trạng trì hoãn và làm chủ 24h mỗi ngày.",
    views: 750,
    downloads: 512,
    createdAt: "2026-03-05",
    isPinned: false
  },
  {
    id: "book-4",
    title: "Tổng Hợp 1000 Từ Vựng & Ngữ Pháp IELTS Nâng Cao 7.5+",
    author: "IELTS Academy",
    category: "Ngoại ngữ",
    docxUrl: "https://file-examples.com/storage/fe07b3017a66f076c8bbdbd/2017/02/file-sample_100kB.docx",
    coverImage: "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?q=80&w=600&auto=format&fit=crop",
    description: "File tài liệu chuẩn DOCX phân loại từ vựng theo 20 chủ đề trọng tâm trong bài thi IELTS Writing & Speaking kèm ví dụ minh họa và collocation thông dụng.",
    views: 1890,
    downloads: 1420,
    createdAt: "2026-03-02",
    isPinned: true
  },
  {
    id: "book-5",
    title: "Giáo Trình Kinh Tế Vi Mô & Vĩ Mô Toàn Tập",
    author: "Bộ Môn Kinh Tế Học",
    category: "Giáo trình",
    docxUrl: "https://file-examples.com/storage/fe07b3017a66f076c8bbdbd/2017/02/file-sample_500kB.docx",
    coverImage: "https://images.unsplash.com/photo-1618042164219-62c820f10723?q=80&w=600&auto=format&fit=crop",
    description: "Hệ thống bài giảng và bài tập có lời giải chi tiết môn Kinh tế vi mô, phân tích cung cầu, thị trường độc quyền, lạm phát và chính sách tiền tệ quốc gia.",
    views: 620,
    downloads: 390,
    createdAt: "2026-02-28",
    isPinned: false
  },
  {
    id: "book-6",
    title: "Lập Trình Web Full-Stack Hiện Đại Với JavaScript & Node.js",
    author: "Cộng Đồng Dev Việt",
    category: "Công nghệ",
    docxUrl: "https://file-examples.com/storage/fe07b3017a66f076c8bbdbd/2017/02/file-sample_1MB.docx",
    coverImage: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=600&auto=format&fit=crop",
    description: "Tài liệu thực hành xây dựng ứng dụng web từ Frontend đến Backend: DOM, Async/Await, RESTful API, Express, MongoDB và triển khai ứng dụng lên đám mây.",
    views: 1105,
    downloads: 780,
    createdAt: "2026-02-25",
    isPinned: false
  }
];

export const CATEGORIES = [
  "Tất cả",
  "Công nghệ",
  "Kinh tế",
  "Kỹ năng sống",
  "Ngoại ngữ",
  "Giáo trình",
  "Văn học",
  "Khác"
];
