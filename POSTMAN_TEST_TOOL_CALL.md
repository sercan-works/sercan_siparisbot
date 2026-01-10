# Postman ile Tool Call Endpoint Test Rehberi

## ⚡ Hızlı Başlangıç (30 Saniye)

**Call ID'ye ihtiyacınız YOK!** Sadece şunu gönderin:

```bash
POST https://siparisbot.vercel.app/api/webhooks/tool-call

Headers:
Content-Type: application/json

Body:
{
  "tool_call_id": "test_123",
  "tool_name": "create_order",
  "arguments": {
    "items": "1 Pizza"
  }
}
```

✅ Sistem otomatik olarak:
- Uygun bot'u bulur (`create_order` için restaurant bot)
- Test call kaydı oluşturur
- Siparişi başarıyla oluşturur

---

## 🎯 Endpoint Bilgileri

**URL:** `POST https://siparisbot.vercel.app/api/webhooks/tool-call`

**Not:** Bu endpoint `call_id` olmadan da çalışabilir! Sistem otomatik olarak test call kaydı oluşturur.

## 📋 Request Format

### Headers
```
Content-Type: application/json
```

### Body (JSON)

## 🚀 Test Senaryoları

### ✅ Senaryo 1: Call ID OLMAYAN Test (EN KOLAY - ÖNERİLEN)

**Bu senaryo call_id göndermeden test yapmak için ideal!** Sistem otomatik olarak:
- `tool_name`'e göre uygun bot'u bulur (`create_order` için restaurant bot)
- Test amaçlı geçici call kaydı oluşturur
- Siparişi başarıyla oluşturur

```json
{
  "tool_call_id": "test_{{$timestamp}}",
  "tool_name": "create_order",
  "arguments": {
    "customer_name": "Test Müşteri",
    "items": "2 Adana Kebap, 1 Ayran, 1 Salata",
    "total_amount": 150.00,
    "delivery_address": "İstanbul, Kadıköy, Bağdat Caddesi No:123",
    "notes": "Acılı olsun"
  }
}
```

**Minimal Versiyon (Sadece Zorunlu Alanlar):**
```json
{
  "tool_call_id": "test_{{$timestamp}}",
  "tool_name": "create_order",
  "arguments": {
    "items": "1 Pizza, 2 Kola"
  }
}
```

### ✅ Senaryo 2: Agent ID ile Test (Call ID Olmadan)

Eğer belirli bir bot kullanmak istiyorsanız, `agent_id` ekleyin:

```json
{
  "tool_call_id": "test_{{$timestamp}}",
  "tool_name": "create_order",
  "agent_id": "YOUR_RETELL_AGENT_ID",
  "arguments": {
    "customer_name": "Ahmet Yılmaz",
    "customer_phone": "+905551234567",
    "items": "2 Adana Kebap, 1 Ayran",
    "total_amount": 150.00,
    "delivery_address": "İstanbul, Kadıköy"
  }
}
```

### ✅ Senaryo 3: Call ID ile Test (Gerçek Call Senaryosu)

Gerçek bir call kaydı varsa ve ona bağlı sipariş oluşturmak istiyorsanız:

```json
{
  "call_id": "YOUR_RETELL_CALL_ID",
  "tool_call_id": "test_tool_call_123",
  "tool_name": "create_order",
  "arguments": {
    "customer_name": "Ahmet Yılmaz",
    "customer_phone": "+905551234567",
    "items": "2 Adana Kebap, 1 Ayran, 1 Salata",
    "total_amount": 150.00,
    "delivery_address": "İstanbul, Kadıköy, Bağdat Caddesi No:123",
    "notes": "Acılı olsun"
  },
  "agent_id": "YOUR_RETELL_AGENT_ID"
}
```

### ✅ Senaryo 4: Call ID Olmayan Yeni Call (Sistem Otomatik Oluşturur)

```json
{
  "call_id": "test_call_{{$timestamp}}",
  "tool_call_id": "test_tool_call_789",
  "tool_name": "create_order",
  "arguments": {
    "customer_name": "Mehmet Demir",
    "items": "3 Hamburger, 2 Patates",
    "total_amount": "200 TL",
    "delivery_address": "Ankara, Çankaya, Kızılay"
  },
  "agent_id": "YOUR_RETELL_AGENT_ID"
}
```

## 📝 Test İçin Gerekli Bilgiler

### ⚡ Hızlı Başlangıç (Call ID Gerekmez!)

**En kolay yol:** Senaryo 1'i kullanın! Sadece `tool_name` ve `arguments` yeterli. Sistem:
- Otomatik olarak uygun bot'u bulur
- Test call kaydı oluşturur
- Siparişi başarıyla oluşturur

```json
{
  "tool_call_id": "test_123",
  "tool_name": "create_order",
  "arguments": {
    "items": "1 Pizza"
  }
}
```

### 🔍 Opsiyonel: Agent ID Nasıl Bulunur?

Agent ID'yi bulmak istiyorsanız (zorunlu değil):

**Yöntem A: API'den**
```bash
GET https://siparisbot.vercel.app/api/bots
# Response'dan retellAgentId'yi kopyalayın
```

**Yöntem B: Veritabanından**
```sql
SELECT id, name, "retellAgentId" 
FROM "Bot" 
WHERE "organizationId" = 'YOUR_ORG_ID';
```

**Yöntem C: Mevcut Call'dan**
```sql
SELECT "retellCallId", "botId"
FROM "Call"
ORDER BY "createdAt" DESC
LIMIT 1;
```

### 📞 Call ID Nasıl Bulunur? (Opsiyonel)

Call ID sadece gerçek bir call'a bağlı sipariş oluşturmak istiyorsanız gerekli:

**Yöntem A: Veritabanından**
```sql
SELECT id, "retellCallId" 
FROM "Call" 
ORDER BY "createdAt" DESC 
LIMIT 1;
```

**Yöntem B: Retell Dashboard'dan**
- Retell dashboard'dan aktif veya geçmiş call'ları görüntüleyin
- Call ID'sini kopyalayın

**Not:** Test için call_id'ye ihtiyacınız yok! Senaryo 1'i kullanın.

## Beklenen Response Formatları

### Başarılı Response (200 OK)
```json
{
  "result": "{\"success\":true,\"order_id\":\"clx1234567890\",\"message\":\"Siparişiniz alındı. Sipariş numaranız: 7890. Hazırlanmaya başlıyor.\"}",
  "tool_call_id": "test_tool_call_123"
}
```

**Not:** `result` field'ı string formatında JSON içeriyor. Parse etmek için:
```javascript
const parsed = JSON.parse(response.result);
// { success: true, order_id: "...", message: "..." }
```

### Hata Response (200 OK - Retell Format)
```json
{
  "result": "Error: Tool 'create_order' not found. Available tools: ...",
  "tool_call_id": "test_tool_call_123"
}
```

## 🚀 Postman Test Adımları (Adım Adım)

### Adım 1: Collection ve Environment Oluştur

1. **Postman'i açın** ve yeni Collection oluşturun:
   - Sağ üstteki **"New"** → **"Collection"**
   - Collection adı: `SiparisBot Tool Call Tests`

2. **Environment oluşturun** (opsiyonel ama önerilir):
   - Sağ üstteki **"Environments"** → **"+"** butonu
   - Environment adı: `SiparisBot Production`
   - Variable'ları ekleyin:
     ```
     BASE_URL: https://siparisbot.vercel.app
     AGENT_ID: (opsiyonel - eğer belirli bot kullanacaksanız)
     ```
   - Environment'ı seçili hale getirin (sağ üst köşede)

### Adım 2: Request Oluştur (Call ID Olmadan - ÖNERİLEN)

1. **Yeni Request oluşturun:**
   - Collection'a sağ tıklayın → **"Add Request"**
   - Request adı: `Create Order - No Call ID (Easiest)`

2. **Request ayarları:**
   - Method: **POST** (dropdown'dan seçin)
   - URL: `{{BASE_URL}}/api/webhooks/tool-call`
     - Veya direkt: `https://siparisbot.vercel.app/api/webhooks/tool-call`

3. **Headers ekleyin:**
   - **Headers** tab'ına gidin
   - **Key:** `Content-Type`
   - **Value:** `application/json`
   - **Save** butonuna tıklayın

4. **Body ayarları (ÖNEMLİ):**
   - **Body** tab'ına gidin
   - **raw** seçeneğini seçin
   - Dropdown'dan **JSON** seçin
   - Aşağıdaki body'yi yapıştırın:

```json
{
  "tool_call_id": "test_{{$timestamp}}",
  "tool_name": "create_order",
  "arguments": {
    "customer_name": "Test Müşteri",
    "items": "2 Adana Kebap, 1 Ayran",
    "total_amount": 150.00,
    "delivery_address": "İstanbul, Kadıköy, Test Mahallesi",
    "notes": "Test siparişi"
  }
}
```

**Not:** `{{$timestamp}}` Postman'ın otomatik değişkeni - her request'te farklı değer oluşturur.

5. **Send butonuna tıklayın!** 🎉

### Adım 3: Response Kontrolü

Başarılı response şöyle görünür:

```json
{
  "result": "{\"success\":true,\"order_id\":\"clx1234567890\",\"message\":\"Siparişiniz alındı. Sipariş numaranız: 7890. Hazırlanmaya başlıyor.\"}",
  "tool_call_id": "test_1234567890"
}
```

**Response'u parse etmek için:**
- `result` field'ı string formatında JSON içerir
- JavaScript'te: `JSON.parse(response.result)`
- Postman'de: Test script'inde parse edebilirsiniz (aşağıdaki bölüm)

### Adım 4: Minimal Test (Sadece Zorunlu Alanlar)

Daha basit bir test için yeni request oluşturun:

**Request adı:** `Create Order - Minimal`

**Body:**
```json
{
  "tool_call_id": "minimal_{{$timestamp}}",
  "tool_name": "create_order",
  "arguments": {
    "items": "1 Pizza"
  }
}
```

Bu da çalışmalı! ✅

### Adım 4: Test Script'i (Opsiyonel)
Response'u kontrol etmek için:
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has result and tool_call_id", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('result');
    pm.expect(jsonData).to.have.property('tool_call_id');
});

pm.test("Result is valid", function () {
    var jsonData = pm.response.json();
    var result = JSON.parse(jsonData.result);
    
    if (result.error) {
        console.log("Error:", result.message);
    } else {
        console.log("Success:", result.message);
        pm.expect(result).to.have.property('success', true);
    }
});
```

## Debug İçin Log Kontrolü

Server log'larında şunları arayın:
- `[tool-call] Executing tool: create_order`
- `[create_order] Starting with args:`
- `[create_order] Call info:`
- `[create_order] Order created/updated successfully:`

Hata varsa:
- `[create_order] Failed to create order:`
- Error stack trace

## ❌ Yaygın Hatalar ve Çözümleri

### Hata: "call_id is required but was not provided"
**Sebep:** Sistem bot bulamadı veya call oluşturamadı
**Çözüm:** 
- ✅ **En kolay:** Senaryo 1'i kullanın (call_id gerekmez!)
- Veya `agent_id` ekleyin
- Veya sistemde en az bir bot olduğundan emin olun

### ❌ Hata: "Tool 'create_order' not found. Available tools: (none)"

**Sebep:** Bulunan bot'ta `create_order` tool'u tanımlı değil veya `customTools` boş

**Geçici Çözüm (Otomatik - Yeni!):** 
- ✅ Kod artık otomatik olarak built-in tool'ları (`create_order`, `create_reservation`, `check_availability`) inject ediyor
- Eğer hala hata alıyorsanız, aşağıdaki kalıcı çözümü uygulayın

**Kalıcı Çözüm (Önerilen):**

#### Yöntem 1: Bot'u UI'dan Güncellemek (En Kolay)
1. Admin panel'e giriş yapın (`http://localhost:3000`)
2. Bot ayarlarına gidin
3. Herhangi bir field'ı değiştirip kaydedin (örn: `generalPrompt`)
4. Sistem RESTAURANT tipindeki bot'lar için otomatik olarak `create_order` tool'unu ekler

#### Yöntem 2: Postman ile Bot'u Güncellemek

**Adım 1: Bot ID'sini Bulun**
```bash
GET http://localhost:3000/api/bots

Headers:
Cookie: next-auth.session-token=YOUR_SESSION_TOKEN
```

Response'dan `id` field'ını kopyalayın.

**Adım 2: Bot'u Güncelleyin (Herhangi Bir Field)**
```bash
PUT http://localhost:3000/api/bots/{botId}

Headers:
Content-Type: application/json
Cookie: next-auth.session-token=YOUR_SESSION_TOKEN

Body:
{
  "generalPrompt": "Mevcut prompt'unuz (herhangi bir değişiklik yapabilirsiniz)"
}
```

**Not:** Eğer kullanıcınız `customerType: "RESTAURANT"` ise, sistem otomatik olarak `create_order` tool'unu ekler.

#### Yöntem 3: Tool'u Manuel Eklemek (İleri Seviye)

Detaylar için `ADD_CREATE_ORDER_TOOL.md` dosyasına bakın.

### Hata: "No bot found in system"
**Sebep:** Veritabanında hiç bot yok
**Çözüm:**
- Önce bir bot oluşturun
- POST `/api/bots` endpoint'ini kullanın
- Veya admin panel'den bot oluşturun

### Hata: "No user found for organization"
**Sebep:** Bot'un organization'ında kullanıcı yok
**Çözüm:**
- Organizasyona en az bir kullanıcı ekleyin
- Admin panel'den kullanıcı oluşturun

### Hata: "Items are required but not provided"
**Sebep:** `arguments.items` field'ı eksik veya boş
**Çözüm:**
- Request body'de `arguments.items` field'ını ekleyin
- Örnek: `"items": "1 Pizza"`

### Hata: "Call ID is missing - call may not be saved yet"
**Sebep:** (Nadir) Call kaydı oluşturulamadı
**Çözüm:**
- Tekrar deneyin
- Server log'larını kontrol edin
- `agent_id` ekleyerek tekrar deneyin

## Örnek Postman Collection JSON

```json
{
  "info": {
    "name": "SiparisBot Tool Call Tests",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Create Order - Full",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"call_id\": \"{{CALL_ID}}\",\n  \"tool_call_id\": \"test_{{$timestamp}}\",\n  \"tool_name\": \"create_order\",\n  \"arguments\": {\n    \"customer_name\": \"Ahmet Yılmaz\",\n    \"customer_phone\": \"+905551234567\",\n    \"items\": \"2 Adana Kebap, 1 Ayran\",\n    \"total_amount\": 150.00,\n    \"delivery_address\": \"İstanbul, Kadıköy\",\n    \"notes\": \"Acılı olsun\"\n  },\n  \"agent_id\": \"{{AGENT_ID}}\"\n}"
        },
        "url": {
          "raw": "{{BASE_URL}}/api/webhooks/tool-call",
          "host": ["{{BASE_URL}}"],
          "path": ["api", "webhooks", "tool-call"]
        }
      }
    },
    {
      "name": "Create Order - Minimal",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"call_id\": \"{{CALL_ID}}\",\n  \"tool_call_id\": \"test_minimal_{{$timestamp}}\",\n  \"tool_name\": \"create_order\",\n  \"arguments\": {\n    \"items\": \"1 Pizza\"\n  },\n  \"agent_id\": \"{{AGENT_ID}}\"\n}"
        },
        "url": {
          "raw": "{{BASE_URL}}/api/webhooks/tool-call",
          "host": ["{{BASE_URL}}"],
          "path": ["api", "webhooks", "tool-call"]
        }
      }
    }
  ]
}
```

## 📊 Test Sonuçlarını Kontrol Etme

### Veritabanında Oluşturulan Siparişi Görüntüleme

```sql
-- Son oluşturulan siparişleri görüntüle
SELECT 
  o.id as order_id,
  o."customerName",
  o.items,
  o."totalAmount",
  o.status,
  o."createdAt",
  c."retellCallId" as call_id
FROM "Order" o
LEFT JOIN "Call" c ON o."callId" = c.id
ORDER BY o."createdAt" DESC
LIMIT 5;

-- Test call'larını görüntüle (test_ ile başlayanlar)
SELECT 
  id,
  "retellCallId",
  status,
  "createdAt"
FROM "Call"
WHERE "retellCallId" LIKE 'test_%'
ORDER BY "createdAt" DESC
LIMIT 10;
```

### API ile Siparişleri Görüntüleme

```bash
GET https://siparisbot.vercel.app/api/orders
# Cookie ile authentication gerekli
```

## 🎓 Test Senaryoları Özeti

| Senaryo | Call ID Gerekli? | Agent ID Gerekli? | Kullanım Durumu |
|---------|------------------|-------------------|-----------------|
| Senaryo 1 | ❌ Hayır | ❌ Hayır | ⭐ **EN KOLAY - ÖNERİLEN** |
| Senaryo 2 | ❌ Hayır | ✅ Evet | Belirli bot kullanmak istiyorsanız |
| Senaryo 3 | ✅ Evet | ✅ Evet | Gerçek call'a bağlı sipariş |
| Senaryo 4 | ✅ Test ID | ✅ Evet | Yeni test call oluşturma |

**Tavsiye:** Her zaman Senaryo 1'i kullanın! En basit ve en hızlı yöntem.

