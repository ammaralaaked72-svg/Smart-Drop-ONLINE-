SMARTDROP BACKEND V1
====================

المسار:
ESP32 -> POST /api/readings -> SQLite -> Dashboard

1) المتطلبات
- Node.js 18 أو أحدث
- npm

2) التشغيل
افتح Terminal داخل مجلد المشروع:
npm install
npm start

ثم افتح:
http://localhost:3000

3) اختبار بدون ESP32
اضغط "إضافة قراءة تجريبية" في لوحة التحكم، أو:
POST /api/demo

4) API
GET  /api/health
GET  /api/latest
GET  /api/history?limit=50
POST /api/readings
POST /api/demo

5) إرسال قراءة من ESP32
يجب وضع Header:
x-api-key: smartdrop-demo-key

Body JSON:
{
  "device":"SmartDrop-01",
  "ph":7.1,
  "ec":420,
  "turbidity":1.4,
  "temperature":25.5,
  "reliability":96,
  "anomaly":false,
  "sensor_health":{"ph":"OK","ec":"OK","turbidity":"OK","temperature":"OK"}
}

6) قاعدة البيانات
يتم إنشاء:
data/smartdrop.db
تلقائيا عند أول تشغيل.

7) الأمان
مفتاح API الموجود في README تجريبي فقط. قبل نشر المشروع على الإنترنت غيّره إلى متغير بيئة:
SMARTDROP_API_KEY=ضع_مفتاحا_قويا

ملاحظة علمية:
القيم والتحويلات الخاصة بحساسات pH/EC/turbidity يجب معايرتها حسب موديل الحساس وورقة بياناته. لا تستخدم النظام لإثبات أن الماء صالح للشرب.
