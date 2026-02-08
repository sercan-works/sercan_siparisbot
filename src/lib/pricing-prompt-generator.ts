interface DailyRate {
  date: string
  availableRooms: string
  ppPrice: string
  single: string
  dbl: string
  triple: string
}

interface PricingRules {
  singleCarpani: string
  tripleCarpani: string
  bebekIndirimi: string
  singleOdaCocukInd: string
  dblOdaIlkCocukInd: string
  dblOdaIkinciCocukInd: string
  dblOdaIlk7_11CocukInd: string
  realiseDate: string
  odaTipiBagimsizFiyat: string
}

interface Discount {
  id: string
  aksiyonAdi: string
  indirimOrani: string
  satisTarihiBaslangic: string
  satisTarihiBitis: string
  konaklamaTarihiBaslangic: string
  konaklamaTarihiBitis: string
  odaTipi: string
}

interface PricingData {
  dailyRates?: DailyRate[]
  dailyRatesByRoomType?: Record<string, DailyRate[]>
  rules: PricingRules
  discounts: Discount[]
}

export function generatePricingPrompt(pricing: PricingData): string {
  const { rules, discounts } = pricing

  let prompt = `## FİYAT HESAPLAMA KURALLARI

Bu bölüm, müşteri sorularına doğru fiyat hesaplaması yapmanız için gerekli tüm bilgileri içermektedir. Lütfen aşağıdaki adımları takip ederek fiyat hesaplaması yapınız.

### 1. VERİ YAPISI

Fiyat hesaplaması için aşağıdaki veri yapılarını kullanacaksınız:

#### Günlük Fiyat Verileri (dailyRates)
get_pricing_info tool'u size **dailyRates** dizisini döndürür. Fiyatlar oda tipine göre ayrılmış olabilir:
- Müşteri belirli bir oda tipi (örn. "Deluxe", "Suite") sorduğunda, get_pricing_info'yu **roomType** parametresiyle çağırın
- Dönen dailyRates o oda tipine ait fiyatları içerir

Her tarih için aşağıdaki alanlar mevcuttur:
- **date**: Tarih (YYYY-MM-DD formatında)
- **availableRooms**: Satışa açık oda sayısı
- **ppPrice**: PP (kişi başı) fiyatı
- **single**: Single oda fiyatı
- **dbl**: Dbl (Double) oda fiyatı
- **triple**: Triple oda fiyatı
- **roomTypeName** (opsiyonel): Birden fazla oda tipi varsa, bu alan hangi oda tipine ait olduğunu gösterir

**ÖNEMLİ**: Günlük fiyat verilerini dinamik olarak okuyun. Oda tipi bazlı fiyatlandırma varsa, müşterinin sorduğu oda tipine ait dailyRates'i kullanın (get_pricing_info roomType parametresiyle çağrılabilir).

#### Fiyat Kuralları (rules)
- **singleCarpani**: Single oda çarpanı (varsa kullanın, yoksa gözardı edin)
- **tripleCarpani**: Triple oda çarpanı (varsa kullanın, yoksa gözardı edin)
- **bebekIndirimi**: 0-2.99 yaş bebek indirimi yüzdesi (varsa kullanın, yoksa gözardı edin)
- **singleOdaCocukInd**: Single odada çocuk (3-11.99) indirimi yüzdesi (varsa kullanın, yoksa gözardı edin)
- **dblOdaIlkCocukInd**: Dbl odada ilk çocuk (0-6.99) indirimi yüzdesi (varsa kullanın, yoksa gözardı edin)
- **dblOdaIkinciCocukInd**: Dbl odada ikinci çocuk (3-6.99) indirimi yüzdesi (varsa kullanın, yoksa gözardı edin)
- **dblOdaIlk7_11CocukInd**: Dbl odada ilk çocuk (7-11.99) indirimi yüzdesi (varsa kullanın, yoksa gözardı edin)
- **realiseDate**: Realise date (gün sayısı) (varsa kullanın, yoksa gözardı edin)
- **odaTipiBagimsizFiyat**: Kişi sayısından bağımsız oda fiyatı olan oda tipleri (varsa kullanın, yoksa gözardı edin)

#### İndirimler (discounts)
Her indirim için aşağıdaki alanlar mevcuttur:
- **aksiyonAdi**: Kampanya adı
- **indirimOrani**: İndirim oranı yüzdesi
- **satisTarihiBaslangic**: Satış tarihi başlangıç (YYYY-MM-DD formatında)
- **satisTarihiBitis**: Satış tarihi bitiş (YYYY-MM-DD formatında)
- **konaklamaTarihiBaslangic**: Konaklama tarihi başlangıç (YYYY-MM-DD formatında)
- **konaklamaTarihiBitis**: Konaklama tarihi bitiş (YYYY-MM-DD formatında)
- **odaTipi**: Uygulanacak oda tipi

### 2. FİYAT HESAPLAMA ADIMLARI

Müşteri bir fiyat sorusu sorduğunda, aşağıdaki adımları sırasıyla takip ediniz:

#### Adım 1: Oda Tipi ve Tarih Kontrolü
1. Müşterinin istediği **oda tipini** belirleyin (isimle söylüyorsa: "Deluxe", "Suite" vb.; söylemiyorsa kişi sayısına göre single/dbl/triple)
2. **get_pricing_info** tool'unu mümkünse **roomType** parametresiyle çağırın (müşteri belirli oda tipi söylediyse)
3. Müşterinin istediği konaklama tarihini belirleyin
4. **dailyRates** verisinde bu tarihi arayın (date alanını kontrol edin)
5. Eğer tam tarih bulunamazsa, en yakın tarihi kullanın
6. Tarih bulunamazsa müşteriye bilgi verin
7. Bulunan tarih için **ppPrice**, **single**, **dbl**, **triple** değerlerini alın
8. **availableRooms** değerini kontrol edin (müsaitlik için)

#### Adım 2: Oda Tipi Belirleme
Kişi sayısına göre oda tipini belirleyin:
- **1 kişi** → Single oda
- **2 kişi** → Dbl (Double) oda
- **3 veya daha fazla kişi** → Triple oda

#### Adım 3: Temel Fiyat Hesaplama
Seçilen tarih ve oda tipine göre temel fiyatı belirleyin:

**Yöntem 1**: Eğer ilgili oda tipi için direkt fiyat varsa (single, dbl, triple alanlarından):
- Single oda için: **single** değerini kullanın
- Dbl oda için: **dbl** değerini kullanın
- Triple oda için: **triple** değerini kullanın

**Yöntem 2**: Eğer direkt fiyat yoksa, PP fiyatından hesaplayın:
- **ppPrice** değerini alın
- Kişi sayısı ile çarpın (veya çarpanları uygulayın)

#### Adım 4: Çarpan Uygulama (Eğer Varsa)
Eğer **rules** verisinde çarpanlar tanımlıysa:

- **Single oda**: Eğer **singleCarpani** değeri varsa, PP fiyatı × **singleCarpani** = Single oda fiyatı
  - Eğer **singleCarpani** yoksa veya boşsa, bu adımı atlayın
- **Triple oda**: Eğer **tripleCarpani** değeri varsa, PP fiyatı × **tripleCarpani** = Triple oda fiyatı
  - Eğer **tripleCarpani** yoksa veya boşsa, bu adımı atlayın
- **Dbl oda**: PP fiyatı × 2 = Dbl oda fiyatı (veya direkt **dbl** fiyatı kullanılabilir)

**ÖNEMLİ**: Çarpan değeri yoksa veya boşsa, o çarpanı gözardı edin ve direkt fiyatları kullanın.

#### Adım 5: Çocuk ve Bebek İndirimleri (Eğer Varsa)
Yaş gruplarına göre indirim uygulayın. **rules** verisindeki ilgili değerleri kontrol edin:

**Yaş Grupları:**
- **0-2.99 yaş (Bebek)**: Eğer **bebekIndirimi** değeri varsa, bu yüzdeyi uygulayın. Yoksa gözardı edin.
- **3-6.99 yaş (Küçük çocuk)**: İlgili oda tipine göre indirim uygulanır
- **7-11.99 yaş (Çocuk)**: İlgili oda tipine göre indirim uygulanır
- **12+ yaş**: Yetişkin fiyatı (indirim yok)

**Single Odada Çocuk İndirimi:**
- Eğer **singleOdaCocukInd** değeri varsa, 3-11.99 yaş arası çocuklar için bu yüzdeyi uygulayın
- Eğer **singleOdaCocukInd** yoksa veya boşsa, bu indirimi gözardı edin

**Dbl Odada Çocuk İndirimleri:**
- Eğer **dblOdaIlkCocukInd** değeri varsa, ilk çocuk (0-6.99 yaş) için bu yüzdeyi uygulayın. Yoksa gözardı edin.
- Eğer **dblOdaIkinciCocukInd** değeri varsa, ikinci çocuk (3-6.99 yaş) için bu yüzdeyi uygulayın. Yoksa gözardı edin.
- Eğer **dblOdaIlk7_11CocukInd** değeri varsa, ilk çocuk (7-11.99 yaş) için bu yüzdeyi uygulayın. Yoksa gözardı edin.

**ÖNEMLİ**: İndirim değeri yoksa veya boşsa, o indirimi gözardı edin ve normal fiyat uygulayın.

#### Adım 6: Özel Durum - Kişi Sayısından Bağımsız Oda Fiyatı (Eğer Varsa)
Eğer **odaTipiBagimsizFiyat** değeri varsa ve boş değilse:
- Bu değerde belirtilen oda tipleri için kişi sayısından bağımsız sabit fiyat uygulanır
- 1 kişi de kalsa 4 kişi de kalsa aynı fiyat geçerlidir
- **odaTipiBagimsizFiyat** değeri yoksa veya boşsa, bu kuralı gözardı edin

#### Adım 7: Kampanya İndirimleri (Eğer Varsa)
**discounts** verisindeki tüm indirimleri kontrol edin:

Her indirim için:
1. **satisTarihiBaslangic** ve **satisTarihiBitis** kontrolü: Bugünün tarihi bu aralıkta mı? (YYYY-MM-DD formatında)
2. **konaklamaTarihiBaslangic** ve **konaklamaTarihiBitis** kontrolü: Müşterinin istediği tarih bu aralıkta mı? (YYYY-MM-DD formatında)
3. **odaTipi** kontrolü: Seçilen oda tipi eşleşiyor mu?
4. Tüm koşullar sağlanıyorsa, **indirimOrani** yüzdesini uygulayın

**ÖNEMLİ**: 
- İndirim verisi yoksa veya boşsa, bu adımı atlayın
- Tarih alanları boşsa, o kontrolü atlayın (örn: satisTarihiBaslangic boşsa satış tarihi kontrolü yapmayın)
- Tarih formatı YYYY-MM-DD'dir, direkt karşılaştırma yapabilirsiniz

#### Adım 8: Final Fiyat Hesaplama
1. Temel fiyatı belirleyin (Adım 3)
2. Çarpanları uygulayın (Adım 4 - eğer varsa)
3. Çocuk/bebek indirimlerini hesaplayın ve uygulayın (Adım 5 - eğer varsa)
4. Uygun kampanya indirimlerini uygulayın (Adım 7 - eğer varsa)
5. Toplam fiyatı hesaplayın ve müşteriye net bir şekilde sunun

### 3. ÖNEMLİ NOTLAR

- **Dinamik Veri Kullanımı**: Tüm fiyat hesaplamalarını **dailyRates**, **rules** ve **discounts** verilerinden dinamik olarak yapın. Hardcoded değer kullanmayın.
- **Eksik Değerler**: Eğer bir değer yoksa veya boşsa, o kuralı/indirimi gözardı edin ve hesaplamaya devam edin.
- **Tarih Kontrolü**: Tarih bulunamazsa, en yakın tarihi kullanın veya müşteriye bilgi verin.
- **Yaş Tespiti**: Çocuk yaşlarını doğru tespit edin ve ilgili indirimleri uygulayın.
- **Müsaitlik**: **availableRooms** değerini kontrol edin ve müsaitlik durumunu müşteriye bildirin.
- **Realise Date**: Eğer **realiseDate** değeri varsa, rezervasyon için minimum gün sayısını kontrol edin.

### 4. HESAPLAMA ÖRNEĞI (GENEL YAKLAŞIM)

1. Müşteri bilgilerini toplayın: Tarih, kişi sayısı, yaşlar, oda tipi tercihi (varsa)
2. Oda tipi belirtilmişse **get_pricing_info(roomType: "Oda Tipi Adı")** ile ilgili oda tipinin fiyatlarını alın
3. **dailyRates** içinden ilgili tarihi bulun
4. Kişi sayısına göre oda tipini (single/dbl/triple) belirleyin
5. Temel fiyatı alın (direkt fiyat veya PP × kişi sayısı)
6. Çarpanları uygulayın (varsa)
7. Çocuk/bebek indirimlerini hesaplayın (varsa)
8. Kampanya indirimlerini kontrol edin ve uygulayın (varsa)
9. Toplam fiyatı hesaplayın ve sunun

**ÖNEMLİ**: Her adımda değer yoksa veya boşsa, o adımı atlayın ve bir sonrakine geçin.

`

  return prompt
}
