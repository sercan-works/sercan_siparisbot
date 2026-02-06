# Bot'a create_order Tool'u Ekleme Rehberi..

## Sorun
Bot'ta `create_order` tool'u tanımlı değil. Response: `"Available tools: "` (boş)

## Çözüm Yöntemleri

### Yöntem 1: Bot'u Güncellemek (Önerilen - Otomatik)

Bot'u güncellediğinizde sistem RESTAURANT bot'ları için otomatik olarak `create_order` tool'unu ekler.

**Postman ile:**
```
PUT https://siparisbot.vercel.app/api/bots/{botId}

Headers:
  Content-Type: application/json
  Cookie: next-auth.session-token=YOUR_SESSION_TOKEN

Body (herhangi bir field değiştirip kaydetmek yeterli):
{
  "generalPrompt": "Mevcut prompt'unuz..." 
}
```

**Veya UI'dan:**
- Bot ayarlarına gidin
- Herhangi bir field'ı (örn: `generalPrompt`) değiştirip kaydedin
- Sistem otomatik olarak `create_order` tool'unu ekleyecek

### Yöntem 2: Tool'u Manuel Eklemek

**Postman ile:**

```
PUT https://siparisbot.vercel.app/api/bots/{botId}/tools

Headers:
  Content-Type: application/json
  Cookie: next-auth.session-token=YOUR_SESSION_TOKEN

Body:
{
  "customTools": [
    {
      "type": "function",
      "function": {
        "name": "create_order",
        "description": "Create a new restaurant order. CRITICAL: You MUST have verbally confirmed all details (items, address, customer name) with the user and received a clear confirmation before using this tool. Use this when the customer wants to place an order.",
        "parameters": {
          "type": "object",
          "properties": {
            "customer_name": {
              "type": "string",
              "description": "Full name of the customer placing the order."
            },
            "customer_phone": {
              "type": "string",
              "description": "Contact phone number of the customer. If not provided, the system will use the caller's phone number."
            },
            "items": {
              "type": "string",
              "description": "Detailed list of items ordered (e.g. '2 Adana Kebap, 1 Ayran, 1 Salata'). Include quantities and item names clearly."
            },
            "total_amount": {
              "type": "string",
              "description": "Total amount of the order in local currency (e.g. '150.00' or '150 TL'). Include numbers and currency if mentioned."
            },
            "delivery_address": {
              "type": "string",
              "description": "Delivery address for the order. Include full address with street, district, city if provided. If pickup, use 'PICKUP' or 'RESTAURANT'."
            },
            "notes": {
              "type": "string",
              "description": "Any special instructions or notes for the order (e.g. 'Extra spicy', 'No onions', 'Call before delivery'). Optional."
            }
          },
          "required": ["items"]
        }
      }
    }
  ]
}
```

**Not:** Eğer mevcut tool'larınız varsa, onları da array'e ekleyin:
```json
{
  "customTools": [
    ...mevcutTool'larınız...,
    {
      "type": "function",
      "function": {
        "name": "create_order",
        ...
      }
    }
  ]
}
```

### Yöntem 3: Mevcut Tool Tanımınıza Uygun Versiyon

Eğer bot'unuzda zaten farklı bir `create_order` parametresi varsa, ona uygun olarak ekleyin:

```json
{
  "customTools": [
    {
      "type": "function",
      "function": {
        "name": "create_order",
        "description": "Create a new restaurant order. CRITICAL: You MUST have verbally confirmed all details (items, address, customer name) with the user and received a clear confirmation before using this tool.",
        "parameters": {
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
      }
    }
  ]
}
```

## Adımlar

### 1. Bot ID'sini Bulun
```
GET https://siparisbot.vercel.app/api/bots
```

### 2. Mevcut Tool'ları Kontrol Edin
```
GET https://siparisbot.vercel.app/api/bots/{botId}/tools
```

### 3. Tool'u Ekleyin
Yukarıdaki Yöntem 2 veya 3'ü kullanın

### 4. Doğrulayın
```
GET https://siparisbot.vercel.app/api/bots/{botId}/tools
```

Response'da `create_order` tool'unu görmelisiniz.

### 5. Test Edin
```
POST https://siparisbot.vercel.app/api/webhooks/tool-call
```

## Önemli Notlar

1. **Session Token:** Postman'de cookie olarak session token eklemelisiniz. Veya browser'dan Network tab'ından cookie'yi kopyalayın.

2. **Tool Call URL:** Tool'u ekledikten sonra LLM'de `tool_call_url` otomatik olarak ayarlanacak.

3. **Bot Güncellemesi:** Bot güncellendiğinde `customTools` field'ı da güncellenecek.

4. **Parametre Uyumsuzluğu:** Eğer mevcut tool tanımınızda `total_amount` number ise, kod string bekliyor ama number de kabul edecek şekilde güncellendi.

## Hızlı Test Script (Node.js)

```javascript
// Bot'a tool ekle
const botId = 'YOUR_BOT_ID';
const createOrderTool = {
  type: "function",
  function: {
    name: "create_order",
    description: "Create a new restaurant order...",
    parameters: {
      type: "object",
      properties: {
        customer_name: { type: "string", description: "..." },
        customer_phone: { type: "string", description: "..." },
        items: { type: "string", description: "..." },
        total_amount: { type: "string", description: "..." },
        delivery_address: { type: "string", description: "..." },
        notes: { type: "string", description: "..." }
      },
      required: ["items"]
    }
  }
};

// Mevcut tool'ları al
const currentTools = await fetch(`/api/bots/${botId}/tools`).then(r => r.json());

// Yeni tool'u ekle (eğer yoksa)
const updatedTools = [...(currentTools.customTools || []), createOrderTool];

// Güncelle
await fetch(`/api/bots/${botId}/tools`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ customTools: updatedTools })
});
```

