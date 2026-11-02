# An Tịnh – Chùa trên mây (bản web MVP)

Chính điện 3D chạy trên trình duyệt (Three.js), không cần build, không backend.

## Tính năng
- Màn chào → camera đi qua cửa vào chính điện, chuông ngân.
- **Thắp hương**: viết lời nguyện (tuỳ chọn), chọn 1 hoặc 3 nén; hương cháy dần trong 4 phút, toả khói; lời nguyện bay lên rồi tan.
- **Gõ mõ**: "Công đức +1", đủ 108 tiếng có lời nhắc.
- **Thỉnh chuông**: chuông đung đưa, tiếng ngân dài (giới hạn 1 lần/2,5 giây).
- **Ngồi thiền** 1/3/5/10 phút: vòng thở 4 giây hít, 6 giây thở; chuông đầu và cuối.
- **Xin xăm**: 24 thẻ lời dạy kèm câu hỏi suy ngẫm, *không đoán vận mệnh*.
- **Nhật ký**: chuỗi ngày, nén hương, tiếng mõ, phút thiền, lời nguyện (chỉ lưu trên máy).
- **Chia sẻ**: ảnh 1080×1920 (khung hình chùa + lời dạy + số liệu) để đăng TikTok/Story.
- Chạm trực tiếp vào lư hương, mõ, chuông, đài sen trong cảnh 3D.

Toàn bộ hình 3D, texture và âm thanh đều tự tạo bằng code: không dùng ảnh tượng, tên chùa thật hay file ghi âm của người khác.
Lời dạy được tự diễn đạt (phỏng ý), không chép bản dịch có bản quyền.

## Chạy thử
```bash
python3 -m http.server 5180
```
Mở http://localhost:5180

## Đưa lên mạng
Thư mục này là site tĩnh, kéo thả cả thư mục lên Netlify Drop, hoặc dùng Cloudflare Pages / GitHub Pages / Vercel.

## Cấu trúc
- `index.html`: giao diện, hộp thoại
- `style.css`: giao diện tối, ưu tiên điện thoại
- `js/scene.js`: cảnh 3D, khói hương, chạm vật thể
- `js/audio.js`: chuông, mõ, ống xăm, âm nền (Web Audio)
- `js/state.js`: nhật ký lưu localStorage
- `js/data.js`: thẻ lời dạy
- `js/main.js`: nối giao diện với cảnh

## Việc tiếp theo
- "Cùng hiện diện ẩn danh" (đếm người đang ở chùa, hương của người khác): cần backend (Firebase/Supabase) và kiểm duyệt lời nguyện công khai.
- Phân tích lượt truy cập (Plausible/GA4) để đo trước khi đóng gói app.
- Tên miền, ảnh OG cho link chia sẻ, PWA (thêm vào màn hình chính).
