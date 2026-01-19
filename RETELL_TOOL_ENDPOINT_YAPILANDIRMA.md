# 🔧 Retell Tool Endpoint Yapılandırma Rehberi

Bu dokümanda Retell dashboard'da tool'lar için endpoint yapılandırması açıklanmaktadır.

## 📌 Genel Bilgiler

### Tool Call Webhook URL

Tüm tool'lar için aynı endpoint kullanılır:

**Production:**
```
https://siparisbot.vercel.app/api/webhooks/tool-call
```

**Staging/Development:**
```
https://sercan-siparisbot.vercel.app/api/webhooks/tool-call
```

**Localhost (Test):**
```
http://localhost:3000/api/webhooks/tool-call
```

### Ortak Ayarlar

Tüm tool'lar için aşağıdaki ayarlar geçerlidir:

- **HTTP Method:** `POST`
- **Timeout:** `120000` ms (120 saniye)
- **Headers:**
  ```
  Content-Type: application/json
  ```
- **Query Parameters:** (Boş bırakın)
- **Payload: args only:** ✅ **AÇIK** (checked) - **ÇOK ÖNEMLİ!**

---

## 🏨 Hotel Bot Tool'ları

Hotel bot'ları için aşağıdaki tool'lar otomatik olarak eklenir:

### 1. check_availability

**Name:**
```
check_availability
```

**Description:**
```
Check room availability for a given date range and number of guests. Use this whenever a customer asks about room availability, prices, or vacancy. Always ask for check-in and check-out dates if not provided.
```

**API Endpoint:**
```
https://siparisbot.vercel.app/api/webhooks/tool-call
```

**Parameters (JSON Schema):**
```json
{
  "type": "object",
  "properties": {
    "checkIn": {
      "type": "string",
      "description": "Check-in date in YYYY-MM-DD format. If user says 'tomorrow', calculate the date based on current date."
    },
    "checkOut": {
      "type": "string",
      "description": "Check-out date in YYYY-MM-DD format."
    },
    "guests": {
      "type": "number",
      "description": "Number of guests (adults + children). Default to 2 if not specified."
    },
    "roomType": {
      "type": "string",
      "description": "Optional specific room type name (e.g. 'Deluxe', 'Suite')."
    }
  },
  "required": ["checkIn", "checkOut", "guests"]
}
```

---

### 2. create_reservation

**Name:**
```
create_reservation
```

**Description:**
```
Create a new hotel reservation. CRITICAL: You MUST have checked availability first. You MUST have verbally confirmed all details (dates, room, name) with the user and received a clear 'YES' before using this tool. IMPORTANT: If you mentioned price information to the guest (e.g., 'gecelik 1000 TL, toplam 3000 TL'), you MUST include totalPrice parameter with the total amount.
```

**API Endpoint:**
```
https://siparisbot.vercel.app/api/webhooks/tool-call
```

**Parameters (JSON Schema):**
```json
{
  "type": "object",
  "properties": {
    "checkIn": {
      "type": "string",
      "description": "Check-in date in YYYY-MM-DD format."
    },
    "checkOut": {
      "type": "string",
      "description": "Check-out date in YYYY-MM-DD format."
    },
    "guests": {
      "type": "number",
      "description": "Number of guests."
    },
    "roomType": {
      "type": "string",
      "description": "Room type name to book (e.g. 'Standard', 'Deluxe')."
    },
    "guestName": {
      "type": "string",
      "description": "Full name of the guest."
    },
    "guestPhone": {
      "type": "string",
      "description": "Contact phone number of the guest. If not provided, the system will attempt to use the caller's phone number."
    },
    "specialRequests": {
      "type": "string",
      "description": "Any special requests (e.g. 'Late check-in', 'High floor'). Optional."
    },
    "totalPrice": {
      "type": "number",
      "description": "Total price for the reservation in local currency (e.g., 3000 for 3000 TL). CRITICAL: If you mentioned any price to the guest (e.g., 'toplam 3000 TL', 'gecelik 1000 TL toplam 3000 TL'), you MUST include this parameter with the total amount. Extract the number from your conversation."
    },
    "adultPrice": {
      "type": "number",
      "description": "Price per adult if mentioned separately. Optional."
    },
    "childPrice": {
      "type": "number",
      "description": "Price per child if mentioned separately. Optional."
    },
    "numberOfAdults": {
      "type": "number",
      "description": "Number of adults if specified separately from total guests. Optional."
    },
    "numberOfChildren": {
      "type": "number",
      "description": "Number of children if specified separately. Optional."
    }
  },
  "required": ["checkIn", "checkOut", "guests", "guestName", "roomType"]
}
```

---

### 3. get_room_types

**Name:**
```
get_room_types
```

**Description:**
```
Get all available room types with their details including features, capacity, pricing, and current availability. Use this when customer asks about room types, room features, or wants to see what rooms are available.
```

**API Endpoint:**
```
https://siparisbot.vercel.app/api/webhooks/tool-call
```

**Parameters (JSON Schema):**
```json
{
  "type": "object",
  "properties": {},
  "required": []
}
```

**Not:** Bu tool parametre gerektirmez.

---

### 4. get_hotel_info

**Name:**
```
get_hotel_info
```

**Description:**
```
Get general hotel information including facility details, services (free and paid), policies, concept features, and menus. Use this when customer asks about hotel facilities, services, policies, or general information about the hotel.
```

**API Endpoint:**
```
https://siparisbot.vercel.app/api/webhooks/tool-call
```

**Parameters (JSON Schema):**
```json
{
  "type": "object",
  "properties": {
    "section": {
      "type": "string",
      "description": "Optional specific section to retrieve: 'facility', 'services', 'policies', 'concept', 'menus', or 'all' for everything. If not provided, returns all information.",
      "enum": ["facility", "services", "policies", "concept", "menus", "all"]
    }
  },
  "required": []
}
```

---

### 5. get_pricing_info

**Name:**
```
get_pricing_info
```

**Description:**
```
Get pricing information including daily rates, pricing rules, and available discounts. Use this when customer asks about prices, rates, discounts, or pricing policies.
```

**API Endpoint:**
```
https://siparisbot.vercel.app/api/webhooks/tool-call
```

**Parameters (JSON Schema):**
```json
{
  "type": "object",
  "properties": {
    "date": {
      "type": "string",
      "description": "Optional specific date in YYYY-MM-DD format to get pricing for that date. If not provided, returns general pricing information."
    }
  },
  "required": []
}
```

---

## 🍕 Restaurant Bot Tool'ları

Restaurant bot'ları için aşağıdaki tool'lar otomatik olarak eklenir:

### 1. get_restaurant_info

**Name:**
```
get_restaurant_info
```

**Description:**
```
Get restaurant information from the knowledge base including facility details, menus, campaigns, and other information. CRITICAL: Use this BEFORE creating an order to access menu items, prices, delivery information, working hours, and other restaurant details. Use this when customer asks about menu items, prices, delivery options, working hours, or any restaurant information.
```

**API Endpoint:**
```
https://siparisbot.vercel.app/api/webhooks/tool-call
```

**Parameters (JSON Schema):**
```json
{
  "type": "object",
  "properties": {
    "section": {
      "type": "string",
      "description": "Optional specific section to retrieve: 'facility' (restaurant facility info, working hours, delivery info), 'menus' (food, drinks, desserts, diet items, minimum order amount), 'campaigns' (current promotions and discounts), 'other' (payment methods, special products, certificates, vision/mission, story, reservations, hygiene/security), or 'all' for everything. If not provided, returns all information.",
      "enum": ["facility", "menus", "campaigns", "other", "all"]
    }
  },
  "required": []
}
```

**Not:** Bu tool parametre gerektirmez. Section parametresi opsiyoneldir.

---

### 2. create_order

**Name:**
```
create_order
```

**Description:**
```
Create a new restaurant order. CRITICAL: Before using this tool, you MUST first use get_restaurant_info to access menu items, prices, and delivery information from the knowledge base. You MUST have verbally confirmed all details (items, address, customer name) with the user and received a clear confirmation before using this tool. Use this when the customer wants to place an order.
```

**API Endpoint:**
```
https://siparisbot.vercel.app/api/webhooks/tool-call
```

**Parameters (JSON Schema):**
```json
{
  "type": "object",
  "properties": {
    "customer_phone": {
      "type": "string",
      "description": "Customer's phone number if mentioned explicitly"
    },
    "delivery_address": {
      "type": "string",
      "description": "Complete delivery address if provided"
    },
    "customer_name": {
      "type": "string",
      "description": "Customer's name if mentioned"
    },
    "notes": {
      "type": "string",
      "description": "Special instructions like 'No onions'"
    },
    "items": {
      "type": "string",
      "description": "List of items and quantities, e.g. '1 Adana Acılı, 2 Ayran'"
    },
    "total_amount": {
      "type": "number",
      "description": "Total estimated price if discussed"
    }
  },
  "required": ["items"]
}
```

---

## ⚙️ Retell LLM Yapılandırması

### Manuel Tool Ekleme

**ÖNEMLİ:** Tool'lar Retell Dashboard'dan manuel olarak eklenmelidir. Sistem otomatik olarak tool eklemez.

### Tool Call URL

Bot oluşturulurken veya güncellenirken, sistem otomatik olarak `tool_call_url` ayarını yapar:

```
https://siparisbot.vercel.app/api/webhooks/tool-call
```

Bu URL Retell LLM'in `tool_call_url` field'ına otomatik olarak eklenir.

---

## 📋 Retell Dashboard'da Tool Ekleme Adımları

### Adım Adım Manuel Ekleme

Her bot için tool'ları Retell Dashboard'dan manuel olarak eklemeniz gerekiyor:

#### 1. Retell Dashboard'a Giriş
1. [Retell Dashboard](https://dashboard.retellai.com)'a gidin
2. Giriş yapın

#### 2. LLM'i Bulun
1. Sol menüden **LLM** bölümüne gidin
2. Bot'unuzun LLM'ini bulun (LLM ID'yi admin panel'den görebilirsiniz)
3. LLM'e tıklayın

#### 3. Tool Call URL'i Kontrol Edin
1. LLM ayarlarında **Tool Call URL** field'ını kontrol edin
2. Şu URL olmalı: `https://siparisbot.vercel.app/api/webhooks/tool-call`
3. Eğer yoksa veya yanlışsa, düzeltin

#### 4. Tool'ları Ekleyin

**Hotel Bot'ları için 5 tool ekleyin:**
1. `check_availability`
2. `create_reservation`
3. `get_room_types`
4. `get_hotel_info`
5. `get_pricing_info`

**Restaurant Bot'ları için 2 tool ekleyin:**
1. `get_restaurant_info`
2. `create_order`

Her tool için:
1. **Add Tool** veya **+ Tool** butonuna tıklayın
2. Tool adını girin (yukarıdaki tool tanımlarından)
3. Description'ı kopyalayın
4. API Endpoint: `https://siparisbot.vercel.app/api/webhooks/tool-call`
5. HTTP Method: `POST`
6. Timeout: `120000` ms
7. Headers: `Content-Type: application/json`
8. **Payload: args only:** ✅ **AÇIK** (checked) - **ÇOK ÖNEMLİ!**
9. Parameters (JSON Schema): Yukarıdaki tool tanımlarından ilgili JSON Schema'yı kopyalayın
10. **Save** butonuna tıklayın

#### 5. Tool'ları Kontrol Edin
1. Tüm tool'ların eklendiğinden emin olun
2. Her tool'un doğru yapılandırıldığını kontrol edin
3. **Payload: args only** ayarının açık olduğundan emin olun

---

## 🔍 Tool Call Request Format

Retell, tool çağrıldığında şu formatta request gönderir:

### Format 1: Payload: args only = True (Önerilen)

```json
{
  "checkIn": "2024-12-20",
  "checkOut": "2024-12-22",
  "guests": 2,
  "roomType": "Standard",
  "guestName": "Ahmet Yılmaz"
}
```

### Format 2: Payload: args only = False

```json
{
  "name": "create_reservation",
  "args": {
    "checkIn": "2024-12-20",
    "checkOut": "2024-12-22",
    "guests": 2,
    "roomType": "Standard",
    "guestName": "Ahmet Yılmaz"
  },
  "call": {
    "call_id": "retell_call_123"
  }
}
```

**Önerilen:** Format 1 (Payload: args only = True) kullanın.

---

## ✅ Kontrol Listesi

Her tool için kontrol edin:

- [ ] **Name:** Tool adı tam olarak doğru (case-sensitive)
- [ ] **Description:** Tool açıklaması doğru ve yeterli
- [ ] **API URL:** Doğru endpoint URL'i
- [ ] **HTTP Method:** `POST`
- [ ] **Timeout:** `120000` ms
- [ ] **Headers:** `Content-Type: application/json`
- [ ] **Payload: args only:** ✅ **AÇIK** (checked)
- [ ] **JSON Schema:** Doğru ve geçerli JSON formatında
- [ ] **Required fields:** Doğru alanlar required olarak işaretli

---

## 🐛 Yaygın Hatalar

### Hata: "Tool not found"

**Sebep:** Tool Retell LLM'e eklenmemiş veya yanlış isimle eklenmiş

**Çözüm:**
1. Retell Dashboard'da LLM'in Tools sekmesini kontrol edin
2. Tool'un doğru isimle eklenip eklenmediğini kontrol edin
3. Admin panel'den bot'u güncelleyin (otomatik tool injection)

### Hata: "Invalid JSON Schema"

**Sebep:** JSON Schema formatı yanlış

**Çözüm:**
1. JSON Schema'yı JSON validator ile kontrol edin
2. Tırnak işaretlerinin doğru olduğundan emin olun
3. Son satırdan sonra virgül olmamalı
4. `required` array'i doğru formatta olmalı

### Hata: "Payload: args only" ayarı yanlış

**Sebep:** Payload: args only checkbox'ı kapalı

**Çözüm:**
1. Retell Dashboard'da tool'u açın
2. Parameters sekmesine gidin
3. **Payload: args only** checkbox'ını açın (checked)
4. Save butonuna tıklayın

### Hata: Tool çağrılmıyor

**Sebep:** Tool Call URL yanlış veya eksik

**Çözüm:**
1. Retell Dashboard'da LLM'in Settings sekmesini kontrol edin
2. `tool_call_url` field'ının doğru olduğundan emin olun
3. Admin panel'den bot'u güncelleyin (otomatik tool_call_url ayarı)

---

## 📞 Destek

Sorun yaşarsanız:

1. Server log'larını kontrol edin (Vercel Dashboard > Functions > Logs)
2. Retell Dashboard'da tool ayarlarını kontrol edin
3. Admin panel'den bot'u güncelleyin (otomatik tool injection)
4. Postman ile manuel test yapın

---

## 🔗 İlgili Dokümanlar

- `RETELL_OTEL_FUNCTION_AYARLARI.md` - Otel rezervasyon function ayarları
- `POSTMAN_TEST_TOOL_CALL.md` - Postman ile tool test rehberi

