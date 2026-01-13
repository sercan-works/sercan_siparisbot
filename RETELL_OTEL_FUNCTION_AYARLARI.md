# 🏨 Otel Rezervasyonu için Retell Function Ayarları

Bu dokümanda otel rezervasyon bot'u için Retell dashboard'da yapılması gereken Custom Function ayarları açıklanmaktadır.

## 📌 Hızlı Başlangıç

Otel bot'u için **1 adet Custom Function** tanımlamanız gerekiyor:
- ✅ `create_reservation` - Rezervasyon oluşturma

**Not:** `check_availability` function'una gerek yok çünkü müsaitlik bilgileri Knowledge Base (KB) üzerinden sağlanıyor.

---

## 📋 Function: create_reservation

### Retell Dashboard Ayarları

#### Name
```
create_reservation
```

#### Description
```
Create a new hotel reservation. CRITICAL: You MUST have checked availability first. You MUST have verbally confirmed all details (dates, room, name) with the user and received a clear 'YES' before using this tool.
```

#### API Endpoint

**HTTP Method:** `POST`

**API URL:** 
```
https://sercan-siparisbot.vercel.app/api/webhooks/tool-call
```
veya production için:
```
https://siparisbot.vercel.app/api/webhooks/tool-call
```

**Timeout (ms):** `120000` (120 saniye)

#### Headers
```
Content-Type: application/json
```

#### Query Parameters
(Boş bırakın)

#### Parameters (JSON Schema)

**Tab:** JSON seçili olmalı

**Payload: args only:** ✅ **AÇIK** (checked)

**⚠️ ÖNEMLİ:** Retell dashboard'da Parameters kısmına aşağıdaki JSON Schema'yı **TAM OLARAK** kopyalayın. Format tam olarak şu şekilde olmalı:

**JSON Schema (Retell Dashboard'a Kopyalayın):**
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
    }
  },
  "required": [
    "checkIn",
    "checkOut",
    "guests",
    "guestName",
    "roomType"
  ]
}
```

**📋 Adım Adım:**
1. Retell Dashboard'da Custom Function oluştururken **Parameters** bölümüne gidin
2. **Tab:** dropdown'dan **JSON** seçin
3. **Payload: args only** checkbox'ını **AÇIK** yapın (checked)
4. Yukarıdaki JSON Schema'yı **tam olarak** kopyalayıp yapıştırın
5. **Save** butonuna tıklayın

#### Example 1 (Minimal - Zorunlu Alanlar)
```json
{
  "checkIn": "2024-12-20",
  "checkOut": "2024-12-22",
  "guests": 2,
  "guestName": "Ahmet Yılmaz",
  "roomType": "Standard"
}
```

#### Example 2 (Tam Dolu)
```json
{
  "checkIn": "2024-12-25",
  "checkOut": "2024-12-28",
  "guests": 4,
  "roomType": "Deluxe",
  "guestName": "Mehmet Demir",
  "guestPhone": "+905551234567",
  "specialRequests": "Late check-in, high floor preferred"
}
```

#### Example 3 (Telefon Olmadan)
```json
{
  "checkIn": "2025-01-01",
  "checkOut": "2025-01-03",
  "guests": 2,
  "roomType": "Suite",
  "guestName": "Ayşe Kaya",
  "specialRequests": "Non-smoking room"
}
```

---

## ✅ Kontrol Listesi

Function'ı oluştururken şunları kontrol edin:

### create_reservation için:
- [ ] Name: `create_reservation` (tam olarak böyle)
- [ ] Description'da CRITICAL uyarısı var (availability kontrolü ve onay)
- [ ] API URL doğru (production veya staging)
- [ ] HTTP Method: `POST`
- [ ] Timeout: `120000` ms
- [ ] Headers'da `Content-Type: application/json` var
- [ ] Parameters tab'ında JSON seçili
- [ ] **Payload: args only AÇIK** ✅
- [ ] JSON Schema'da `checkIn`, `checkOut`, `guests`, `guestName`, `roomType` required
- [ ] `guestPhone` ve `specialRequests` optional

---

## 🔄 Çalışma Akışı

1. **Müşteri müsaitlik sorar:**
   - Bot Knowledge Base (KB) üzerinden müsaitlik bilgilerini alır
   - KB'den gelen bilgiler müşteriye sunulur (oda tipleri, fiyatlar, müsaitlik durumu)

2. **Müşteri rezervasyon yapmak ister:**
   - Bot **ÖNCE** detayları müşteriye tekrar okur ve onay alır
   - Onay alındıktan sonra `create_reservation` function'unu çağırır
   - Sistem rezervasyonu oluşturur ve onay kodu verir

**ÖNEMLİ:** Bot'un `generalPrompt`'unda rezervasyon yapmadan önce detayları tekrar okuma ve onay alma talimatı olmalı! (Sistem otomatik olarak ekliyor)

---

## 🧪 Test Senaryoları

### Test: Rezervasyon Oluşturma (Postman)
**Request:**
```json
{
  "tool_call_id": "test_reservation_456",
  "tool_name": "create_reservation",
  "arguments": {
    "checkIn": "2024-12-20",
    "checkOut": "2024-12-22",
    "guests": 2,
    "roomType": "Standard",
    "guestName": "Test Müşteri"
  }
}
```

**Beklenen Response:**
```json
{
  "result": "{\"success\":true,\"confirmationCode\":\"ABC123\",\"message\":\"Rezervasyon oluşturuldu! Onay kodunuz: ABC123. Bizi tercih ettiğiniz için teşekkürler.\"}",
  "tool_call_id": "test_reservation_456"
}
```

---

## ⚠️ Önemli Notlar

1. **Payload: args only:** Her iki function için de **MUTLAKA AÇIK OLMALI**. Bu ayar Retell'in sadece `arguments` kısmını göndermesini sağlar.

2. **API URL:** 
   - Development/Staging: `https://sercan-siparisbot.vercel.app/api/webhooks/tool-call`
   - Production: `https://siparisbot.vercel.app/api/webhooks/tool-call`
   - Localhost test: `http://localhost:3000/api/webhooks/tool-call`

3. **Tarih Formatı:** Tarihler mutlaka `YYYY-MM-DD` formatında olmalı (örn: `2024-12-20`).

4. **Oda Tipi:** `roomType` parametresi veritabanındaki oda tipi adlarıyla eşleşmelidir. Büyük/küçük harf duyarlı değildir (case-insensitive).

5. **Güvenlik Protokolü:** Bot'un `generalPrompt`'unda rezervasyon yapmadan önce detayları tekrar okuma ve müşteriden onay alma talimatı olmalı. Sistemde otomatik olarak ekleniyor olmalı.

---

## 🐛 Yaygın Hatalar ve Çözümleri

### Hata: "Tool 'create_reservation' not found"
**Sebep:** Bot'ta tool tanımlı değil
**Çözüm:** Bot'u güncelleyin veya `PUT /api/bots/{botId}` endpoint'i ile tool'ları ekleyin. HOTEL tipindeki bot'lar için sistem otomatik olarak `create_reservation` tool'unu ekler.

### Hata: Retell'de JSON Schema Format Hatası
**Sebep:** Retell dashboard'da Parameters kısmına yanlış format girilmiş
**Çözüm:** 
1. Retell Dashboard'da Custom Function'ı açın
2. **Parameters** bölümüne gidin
3. **Tab:** dropdown'dan **JSON** seçili olduğundan emin olun
4. **Payload: args only** checkbox'ının **AÇIK** olduğundan emin olun
5. Yukarıdaki JSON Schema'yı **tam olarak** (tırnak işaretleri dahil) kopyalayıp yapıştırın
6. JSON'un geçerli olduğundan emin olun (virgül hataları, eksik tırnak işaretleri olmamalı)
7. **Save** butonuna tıklayın

**⚠️ ÖNEMLİ:** JSON Schema'yı kopyalarken:
- Tüm tırnak işaretlerinin doğru olduğundan emin olun (`"` karakteri)
- Son satırdan sonra virgül olmamalı
- `required` array'i doğru formatta olmalı

### Hata: "Room type not found"
**Sebep:** Veritabanında oda tipi bulunamadı
**Çözüm:** 
- Oda tipi adının doğru yazıldığından emin olun
- Admin panel'den oda tiplerini kontrol edin
- Oda tipinin aktif (`isActive: true`) olduğundan emin olun

### Hata: "Invalid date format"
**Sebep:** Tarih formatı yanlış
**Çözüm:** Tarihler mutlaka `YYYY-MM-DD` formatında olmalı (örn: `2024-12-20`)

### Hata: "No availability found"
**Sebep:** İstenen tarih aralığında müsait oda yok
**Çözüm:** 
- Farklı tarih aralığı deneyin
- Farklı oda tipi seçin
- Sistem normal çalışıyor, sadece müsaitlik yok

### Hata: Retell'de Function Çağrılmıyor veya Hata Dönüyor
**Sebep:** API endpoint'i yanıt vermiyor veya hata dönüyor
**Çözüm:**
1. Retell Dashboard'da **Webhook Settings** bölümünü kontrol edin
2. Webhook URL'in doğru olduğundan emin olun: `https://siparisbot.vercel.app/api/webhooks/tool-call`
3. Server log'larını kontrol edin (Vercel Dashboard > Functions > Logs)
4. Postman ile manuel test yapın (yukarıdaki Postman test rehberine bakın)
5. Retell Dashboard'da **Test** butonunu kullanarak function'ı test edin

### Sorun: guestPhone Null Oluyor
**Sebep:** Telefon numarası birkaç sebepten null olabilir:
1. **Retell'den `guestPhone` parametresi gönderilmemiş**: Müşteri telefon numarasını söylemediyse Retell bu parametreyi göndermeyebilir
2. **Call kaydında `fromNumber` yok**: Retell webhook'unda `from_number` null olabilir (özellikle test call'larında)
3. **Retell API'den telefon numarası çekilememiş**: Retell API çağrısı başarısız olabilir veya `from_number` field'ı response'da olmayabilir

**Sistem Davranışı:**
- Sistem önce `args.guestPhone` (Retell'den gelen parametre) kontrol eder
- Sonra `call.fromNumber` (Call kaydındaki telefon) kontrol eder
- Son olarak Retell API'den telefon numarası çekmeye çalışır
- Eğer hiçbiri yoksa, `guestPhone` olarak `"Unknown"` kullanılır

**Çözüm:**
- Rezervasyon oluşturulurken telefon numarası `"Unknown"` olarak kaydedilir, bu normal bir durumdur
- Eğer telefon numarası önemliyse, Retell bot'unun müşteriden telefon numarasını sormasını sağlayın
- Veya `guestPhone` parametresini Retell Custom Function'da zorunlu hale getirebilirsiniz (ancak bu müşteri deneyimini olumsuz etkileyebilir)

**Log Kontrolü:**
Vercel log'larında şu mesajları arayın:
- `[create_reservation] Phone number lookup:` - Telefon numarası arama sürecini gösterir
- `[create_reservation] Attempting to fetch phone from Retell API...` - Retell API çağrısı yapılıyor
- `[create_reservation] No phone number found from any source. Will use 'Unknown' as fallback.` - Telefon numarası bulunamadı

---

## 📞 Destek

Herhangi bir sorun için:
1. Server log'larını kontrol edin
2. Veritabanında oda tiplerini kontrol edin
3. Bot'un `customTools` field'ını kontrol edin
4. Retell dashboard'daki function ayarlarını tekrar kontrol edin

