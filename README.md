# Cepte Not Pro v5.0

Mevcut v4 uygulamasının görev, takip ve ajanda özellikleriyle geliştirilmiş sürümü. GitHub Pages üzerinde derleme gerektirmeyen HTML, CSS ve JavaScript ile çalışır. Harici arayüz kütüphanesi ve CDN bağımlılığı yoktur.

## Kullanım

- Açılışta Bugünüm: gecikenler, bugünkü görevler, hatırlatmalar, kontrol edilecek bekleyenler ve yaklaşan önemli işler.
- Sadece başlık ve Enter ile hızlı not; Daha Fazla ile durum, kategori, tarihler, etiketler, bekleme bilgisi, alt görev, tekrar, bağlantı ve dosya.
- Liste, sürüklenebilir Kanban ve aylık takvim. Mobilde durum seçimi ve uzun basarak taşıma.
- Bekleyen alt görevlerin tamamı kart üzerinde görünür ve kutularından işaretlenebilir. Sağdaki ⠿ tutamaçtan fareyle veya dokunarak yukarı/aşağı sürüklenebilir; bırakıldığında yeni sıra kaydedilir ve Geri Al ile geri çevrilebilir. Klavyede tutamaç odaktayken ↑ / ↓ kullanılabilir. Bekleme açıklaması da kartta okunabilir.
- Türkçe arama; bugün, yarın, geciken, bekleyen, tamamlanan ve #etiket komutları. Arama arşivi de kapsar.
- Toplu tamamlama, kategori/tarih değiştirme, arşivleme ve silme.
- 30 günlük çöp kutusu, geri alma, sabitleme ve isteğe bağlı 7 günlük otomatik arşiv.
- JSON yedek, birleştir/değiştir ile geri yükleme, UTF-8 BOM CSV ve mevcut TXT raporu. Dışa aktardıktan sonra Dosyayı indir bağlantısını seçin.
- Açık/koyu/sistem teması, ayrı taslak kayıtları, N / Esc / Ctrl+Enter kısayolları.

## Verilerin korunması

`core.js`, v4 `cepte_not_notes_v4` verisini v5 `cepte_not_data_v5` biçimine dönüştürür. İlk dönüşümde ham v4 yedeği saklanır; eski anahtarın içeriği değiştirilmez. Sayısal eski kimlikler metin kimliğine dönüştürülür; içerik, kategori, alarm, alt görev ve tanınmayan eski alanlar korunur. Her yazımdan önce son okunabilen sürüm ve bozuk ham kayıt ayrı anahtarlarda tutulur. Depolama hatasında uygulama başarılı kayıt göstermeden değişikliği geri alır.

GitHub eşitlemesi mevcut parçalı anahtar yapısını korur. `notes.json` v5 verisini destekler; en son değiştirilme tarihine göre birleşir, kalıcı silme işaretleri eski verinin yeniden gelmesini önler. Çevrimdışı değişikliklerin eşitleme beklediği bilgisi sayfa yenilendiğinde korunur. Eski v4 istemcileri yeni biçimle yazmamalı; uygulama açık diğer cihazlarda sayfayı yenileyin.

Dosya ekleri yalnızca bu cihazda ve JSON yedeklerinde tutulur; GitHub'a gönderilmez. Dosya sınırı 2 MB'dır; tarayıcı depolama kotası da geçerlidir.

## PWA ve hatırlatmalar

HTTPS üzerinden ilk açılıştan sonra uygulama kabuğu önbelleğe alınır; çevrimdışıyken görüntüleme ve not işlemleri devam eder. iOS'ta Safari Paylaş → Ana Ekrana Ekle kullanılır.

Hatırlatıcılar sayfa açıkken kontrol edilir; kaçırılan alarmlar yeniden açıldığında gösterilir. Statik bir PWA, tarayıcı kapalıyken gelecekteki alarmı kesin zamanda çalıştıramaz. Web bildirimi izni kullanıcı tarafından Ayarlar ekranında verilir. Sesli yazma tarayıcının SpeechRecognition desteğine ve mikrofon iznine bağlıdır.

## Doğrulama

`TZ=Europe/Istanbul node --test tests/*.test.cjs`

14 test: gerçek v4 kayıtlarının dönüşümü, ham yedek, bozuk veri kurtarma, Türkçe arama, tarih/filtre/sıralama, tekrarlar, eşitleme/silme işaretleri, arşiv/çöp süresi, CSV, 2500 kayıt ve çevrimdışı önbellek. İzole tarayıcı testleri: hızlı not, düzenleme, alt görev, geri alma, çöp/geri yükleme, çoklu filtre, Kanban sürükleme, takvim, alarm/erteleme, tekrar, JSON birleştirme/değiştirme ve 320 px mobil form.
