# Postman ile Tool Call Endpoint Test Rehberi

## Endpoint Bilgileri

**URL:** `POST https://siparisbot.vercel.app/api/webhooks/tool-call`

## Request Format

### Headers
```
Content-Type: application/json
```

### Body (JSON)

#### Senaryo 1: Mevcut Call Kaydı ile Test (Önerilen)

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

#### Senaryo 2: Minimal Test (Sadece Required Fields)

```json
{
  "call_id": "YOUR_RETELL_CALL_ID",
  "tool_call_id": "test_tool_call_456",
  "tool_name": "create_order",
  "arguments": {
    "items": "1 Pizza, 2 Kola"
  },
  "agent_id": "YOUR_RETELL_AGENT_ID"
}
```

#### Senaryo 3: Recovery Testi (Call Kaydı Yoksa)

```json
{
  "call_id": "retell_call_test_789",
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

## Test İçin Gerekli Bilgiler

### 1. Retell Call ID Nasıl Bulunur?

**Yöntem A: Veritabanından**
- Call tablosundan gerçek bir `retellCallId` alın
- Veya son oluşturulan call'ı kullanın

**Yöntem B: Retell Dashboard'dan**
- Retell dashboard'dan aktif veya geçmiş call'ları görüntüleyin
- Call ID'sini kopyalayın

**Yöntem C: Test İçin Geçici Call Oluştur**
- Önce bir test call oluşturun (`/api/calls` endpoint'i ile)
- Oluşturulan call'ın `retellCallId`'sini kullanın

### 2. Retell Agent ID Nasıl Bulunur?

**Yöntem A: Bot Tablosundan**
```sql
SELECT id, name, "retellAgentId" FROM "Bot" WHERE "organizationId" = 'YOUR_ORG_ID';
```

**Yöntem B: API'den**
- GET `/api/bots` endpoint'inden bot listesini çekin
- İstediğiniz bot'un `retellAgentId`'sini kullanın

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

## Postman Test Adımları

### Adım 1: Collection Oluştur
1. Postman'de yeni Collection oluşturun: "SiparisBot API Tests"
2. Environment variable'ları ekleyin:
   - `BASE_URL`: `https://siparisbot.vercel.app` (veya local)
   - `CALL_ID`: Gerçek bir Retell call ID
   - `AGENT_ID`: Bot'un Retell agent ID'si

### Adım 2: Request Oluştur
1. New Request → "Tool Call - Create Order"
2. Method: **POST**
3. URL: `{{BASE_URL}}/api/webhooks/tool-call`
4. Headers:
   - `Content-Type`: `application/json`

### Adım 3: Body Ayarla
- Body tab'ına gidin
- **raw** ve **JSON** seçin
- Yukarıdaki örnek body'lerden birini kullanın
- Environment variable'ları kullanabilirsiniz:
```json
{
  "call_id": "{{CALL_ID}}",
  "tool_call_id": "test_{{$timestamp}}",
  "tool_name": "create_order",
  "arguments": {
    "customer_name": "Test Müşteri",
    "items": "1 Test Ürün",
    "total_amount": 50
  },
  "agent_id": "{{AGENT_ID}}"
}
```

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

## Yaygın Hatalar ve Çözümleri

### Hata: "Call not found and recovery failed"
**Sebep:** `call_id` veritabanında yok ve recovery başarısız
**Çözüm:** 
- Geçerli bir `call_id` kullanın
- Veya `agent_id` field'ını ekleyin (recovery için gerekli)

### Hata: "Tool 'create_order' not found"
**Sebep:** Bot'ta `create_order` tool'u tanımlı değil
**Çözüm:**
- Bot'u güncelleyin (herhangi bir field değiştirip kaydedin)
- Bot'un `customTools` field'ında `CREATE_ORDER_TOOL` olduğundan emin olun

### Hata: "No user found for organization"
**Sebep:** Organizasyonda kullanıcı yok
**Çözüm:**
- Organizasyona en az bir kullanıcı ekleyin
- Veya admin panel'den kontrol edin

### Hata: "Items are required but not provided"
**Sebep:** `arguments.items` field'ı eksik
**Çözüm:**
- Request body'de `arguments.items` field'ını ekleyin

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

## Hızlı Test için SQL Query

Test için call ve agent ID bulmak için:

```sql
-- Son call'ı al
SELECT id, "retellCallId", "retellAgentId" 
FROM "Call" 
ORDER BY "createdAt" DESC 
LIMIT 1;

-- Bot'un agent ID'sini al
SELECT id, name, "retellAgentId" 
FROM "Bot" 
WHERE "organizationId" = 'YOUR_ORG_ID' 
LIMIT 1;
```

