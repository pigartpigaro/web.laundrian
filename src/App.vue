<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

const configuredApiBase = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:8020/api' : '')
if (!configuredApiBase) throw new Error('VITE_API_BASE_URL belum dikonfigurasi untuk production.')
const apiBase = configuredApiBase.replace(/\/$/, '')
const apiOrigin = new URL(apiBase).origin
const outletId = new URLSearchParams(window.location.search).get('outlet') || import.meta.env.VITE_OUTLET_ID || (import.meta.env.DEV ? '1' : '')
if (!outletId) throw new Error('VITE_OUTLET_ID belum dikonfigurasi untuk production.')
const outlet = ref(null)
const loading = ref(true)
const error = ref('')
const mobileMenuOpen = ref(false)
const activeSection = ref('beranda')
const heroImageFailed = ref(false)
let revealObserver
let sectionObserver
const waNumber = computed(() => (outlet.value?.phone || '').replace(/\D/g, '').replace(/^0/, '62'))
const whatsappUrl = computed(() => {
  if (!waNumber.value) return ''
  const greeting = outlet.value?.whatsapp_message || `Halo {nama}, saya ingin bertanya tentang layanan laundry.`
  return `https://wa.me/${waNumber.value}?text=${encodeURIComponent(greeting.replaceAll('{nama}', outlet.value?.name || ''))}`
})
const resolveApiAsset = value => {
  if (!value) return ''
  try {
    const asset = new URL(value, apiBase)
    // Laravel's APP_URL may omit the host port used by the browser (for example :8020).
    // Media must come from the same API origin that served the website JSON.
    return new URL(`${asset.pathname}${asset.search}${asset.hash}`, apiOrigin).href
  } catch {
    return ''
  }
}
const logoUrl = computed(() => resolveApiAsset(outlet.value?.logo_url))
const heroImageUrl = computed(() => resolveApiAsset(outlet.value?.hero_image_url))
const displayedHeroImageUrl = computed(() => heroImageUrl.value && !heroImageFailed.value ? heroImageUrl.value : '/images/laundry-illustration.jpg')
const displayedHeroImageAlt = computed(() => heroImageUrl.value && !heroImageFailed.value ? `Foto utama ${outlet.value?.name || 'outlet'}` : 'Ilustrasi suasana laundry')
const galleryImageUrls = computed(() => (outlet.value?.gallery_image_urls || []).map(resolveApiAsset).filter(Boolean))
const serviceIconImage = icon => ({
  'laundry-kiloan': '/images/Kiloan.png', 'laundry-satuan': '/images/Satuan.png',
  bedding: '/images/Tidur.png', household: '/images/Rumahtangga.png', shoes: '/images/Sepatu.png',
  shirt: '/images/Kiloan.png', person: '/images/Satuan.png', curtains: '/images/Rumahtangga.png',
  carpet: '/images/Rumahtangga.png', bag: '/images/Kiloan.png', iron: '/images/Kiloan.png',
}[icon] || '/images/Kiloan.png')
const aboutText = computed(() => {
  const about = (outlet.value?.about_text || '').replace(/\s+/g, ' ').trim()
  const introduction = (outlet.value?.description || '').replace(/\s+/g, ' ').trim()
  return about || introduction
})
const mapEmbedUrl = computed(() => {
  const address = outlet.value?.address?.trim()
  if (!address) return ''
  const suppliedMap = outlet.value?.map_url
  if (suppliedMap) {
    try {
      const url = new URL(suppliedMap)
      if ((url.hostname === 'google.com' || url.hostname.endsWith('.google.com')) && url.pathname.includes('/maps/embed')) return url.href
    } catch { /* Fall back to searching the outlet address. */ }
  }
  return `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`
})
const directionsUrl = computed(() => outlet.value?.map_url || (outlet.value?.address
  ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(outlet.value.address)}`
  : ''))
const displayedHours = computed(() => {
  const days = [['monday', 'Senin'], ['tuesday', 'Selasa'], ['wednesday', 'Rabu'], ['thursday', 'Kamis'], ['friday', 'Jumat'], ['saturday', 'Sabtu'], ['sunday', 'Minggu']]
  return days.map(([id, label]) => {
    const schedule = outlet.value?.hours?.[id] || {}
    const closed = schedule.closed === true || schedule.closed === 1 || ['1', 'true'].includes(String(schedule.closed).toLowerCase())
    return { label, ...schedule, closed }
  })
})
const navigation = computed(() => [
  { label: 'Beranda', href: '#beranda', show: true },
  { label: 'Tentang', href: '#tentang', show: outlet.value?.show_about },
  { label: 'Layanan', href: '#layanan', show: outlet.value?.show_services },
  { label: 'Galeri', href: '#galeri', show: outlet.value?.show_gallery },
  { label: 'Lokasi', href: '#lokasi', show: outlet.value?.show_location },
].filter(item => item.show))
const closeMenu = () => { mobileMenuOpen.value = false }
const toggleMenu = () => { mobileMenuOpen.value = !mobileMenuOpen.value }
const hideBrokenImage = event => {
  const image = event.currentTarget
  image.hidden = true
  image.closest('.footer-brand, .footer-whatsapp-link')?.setAttribute('hidden', '')
}
const handleHeroImageError = event => {
  if (!heroImageFailed.value) {
    heroImageFailed.value = true
    return
  }
  event.currentTarget.removeAttribute('src')
  event.currentTarget.hidden = true
}
const handleGlobalKeydown = event => {
  if (event.key === 'Escape' && mobileMenuOpen.value) {
    closeMenu()
    document.querySelector('.menu-toggle')?.focus()
  }
}

const updatePageMetadata = () => {
  document.title = outlet.value.seo_title || `${outlet.value.name} — Laundry dekat Anda`
  const description = outlet.value.seo_description || outlet.value.description || `Lihat layanan laundry ${outlet.value.name} dan hubungi outlet secara langsung.`
  document.querySelector('meta[name="description"]')?.setAttribute('content', description)
  const updateMeta = (selector, attribute, value) => {
    let tag = document.querySelector(selector)
    if (!tag) {
      tag = document.createElement('meta')
      tag.setAttribute(attribute, selector.match(/property="([^"]+)"/)?.[1] || selector.match(/name="([^"]+)"/)?.[1] || '')
      document.head.append(tag)
    }
    tag.content = value
  }
  updateMeta('meta[property="og:title"]', 'property', document.title)
  updateMeta('meta[property="og:description"]', 'property', description)
  updateMeta('meta[property="og:image"]', 'property', heroImageUrl.value || `${window.location.origin}/images/laundry-illustration.jpg`)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#002170')
  let robots = document.querySelector('meta[name="robots"]')
  if (!robots) {
    robots = document.createElement('meta')
    robots.name = 'robots'
    document.head.append(robots)
  }
  robots.content = outlet.value.search_index ? 'index,follow' : 'noindex,nofollow'
}

const setupPageObservers = async () => {
  await nextTick()
  revealObserver?.disconnect()
  sectionObserver?.disconnect()

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return

  const revealTargets = document.querySelectorAll('.section-heading, .service-card, .about-copy, .photo-strip figure, .hours-block, .location-map-block, .footer-column')
  revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return
      entry.target.classList.add('is-visible')
      revealObserver.unobserve(entry.target)
    })
  }, { threshold: 0.12, rootMargin: '0px 0px -24px 0px' })
  revealTargets.forEach((element, index) => {
    element.style.setProperty('--reveal-order', String(index % 5))
    element.classList.add('motion-reveal')
    revealObserver.observe(element)
  })

  const sectionTargets = navigation.value
    .map(item => document.querySelector(item.href))
    .filter(Boolean)
  sectionObserver = new IntersectionObserver(entries => {
    const visibleSection = entries
      .filter(entry => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
    if (visibleSection) activeSection.value = visibleSection.target.id
  }, { threshold: [0, 0.15, 0.35], rootMargin: '-12% 0px -62% 0px' })
  sectionTargets.forEach(section => sectionObserver.observe(section))
}

const loadOutlet = async () => {
  loading.value = true
  error.value = ''
  try {
    const response = await fetch(`${apiBase}/public/outlets/${encodeURIComponent(outletId)}/website`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    })
    const body = await response.json().catch(() => ({}))
    if (response.status === 404) throw new Error('Website outlet belum ditemukan atau belum dipublikasikan. Periksa outlet dan status publikasinya.')
    if (response.status >= 500) throw new Error('Server outlet sedang mengalami kendala. Coba muat ulang dalam beberapa saat.')
    if (!response.ok) throw new Error(body.message || 'Halaman outlet belum dipublikasikan.')
    if (!body.data) throw new Error('Informasi outlet belum dikirim oleh server.')
    outlet.value = body.data
    heroImageFailed.value = false
    updatePageMetadata()
    await setupPageObservers()
  } catch (cause) {
    if (cause.name === 'TimeoutError' || cause.name === 'AbortError') {
      error.value = 'Server outlet terlambat merespons. Coba muat ulang dalam beberapa saat.'
    } else if (cause instanceof TypeError) {
      error.value = 'Tidak dapat terhubung ke server outlet. Periksa koneksi lalu coba lagi.'
    } else {
      error.value = cause.message || 'Informasi outlet gagal dimuat.'
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeydown)
  loadOutlet()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
  revealObserver?.disconnect()
  sectionObserver?.disconnect()
})
</script>

<template>
  <a class="skip-link" href="#content">Lewati ke konten utama</a>
  <main id="content" class="site" :aria-busy="loading" tabindex="-1">
    <div v-if="loading" class="state-screen" role="status" aria-live="polite">
      <span class="spinner" aria-hidden="true"></span>
      <p>Memuat informasi outlet</p>
    </div>
    <section v-else-if="error" class="state-screen error-screen" role="alert">
      <p class="state-title">Informasi outlet belum tersedia</p>
      <p>{{ error }}</p>
      <small>Periksa koneksi atau pengaturan publikasi website outlet.</small>
      <button class="button retry-button" type="button" @click="loadOutlet">
        Coba lagi
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M16 8a6 6 0 0 0-10.2-3L4 7m0 0V3m0 4h4m-4 5a6 6 0 0 0 10.2 3L16 13m0 0v4m0-4h-4" /></svg>
      </button>
    </section>

    <template v-else-if="outlet">
      <header class="site-header">
        <div class="topbar wrap">
          <a class="brand" href="#beranda" :aria-label="`Beranda ${outlet.name}`" @click="closeMenu">
            <img v-if="logoUrl" :src="logoUrl" :alt="`Logo ${outlet.name}`" @error="hideBrokenImage" />
            <span class="brand-name">{{ outlet.name }}</span>
          </a>
          <nav class="desktop-navigation" aria-label="Navigasi utama">
            <a v-for="item in navigation" :key="item.href" :href="item.href" :aria-current="activeSection === item.href.slice(1) ? 'location' : undefined">{{ item.label }}</a>
          </nav>
          <div class="header-actions">
            <a v-if="whatsappUrl" class="button button-small header-contact" :href="whatsappUrl" :aria-label="`Hubungi ${outlet.name} lewat WhatsApp`" target="_blank" rel="noreferrer">
              {{ outlet.whatsapp_button_text || 'Hubungi WhatsApp' }}
              <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11m-5-5 5 5-5 5" /></svg>
            </a>
            <button class="menu-toggle" type="button" :aria-expanded="mobileMenuOpen" aria-controls="mobile-navigation" :aria-label="mobileMenuOpen ? 'Tutup navigasi' : 'Buka navigasi'" @click="toggleMenu">
              <span>{{ mobileMenuOpen ? 'Tutup' : 'Menu' }}</span>
              <svg viewBox="0 0 20 20" aria-hidden="true"><path v-if="!mobileMenuOpen" d="M3 6h14M3 10h14M3 14h14" /><path v-else d="m5 5 10 10M15 5 5 15" /></svg>
            </button>
          </div>
        </div>
        <Transition name="nav-panel">
          <nav v-if="mobileMenuOpen" id="mobile-navigation" class="mobile-navigation" aria-label="Navigasi mobile">
            <a v-for="item in navigation" :key="item.href" :href="item.href" :aria-current="activeSection === item.href.slice(1) ? 'location' : undefined" @click="closeMenu">{{ item.label }}</a>
            <a v-if="whatsappUrl" class="mobile-whatsapp" :href="whatsappUrl" target="_blank" rel="noreferrer" @click="closeMenu">{{ outlet.whatsapp_button_text || 'Hubungi WhatsApp' }}</a>
          </nav>
        </Transition>
      </header>

      <section id="beranda" class="hero-section wrap" :class="`hero-${outlet.hero_layout === 'vertical' ? 'vertical' : 'horizontal'}`">
        <div class="hero-copy">
          <h1 :class="{ 'long-heading': (outlet.headline || '').length > 28 }">{{ outlet.headline || 'Laundry lebih mudah.' }}</h1>
          <p class="hero-description">{{ outlet.description || 'Lihat pilihan layanan dan harga, lalu hubungi outlet untuk menanyakan kebutuhan laundry Anda.' }}</p>
          <div class="hero-actions">
            <a v-if="outlet.show_about" class="button" href="#tentang">
              Tentang Kami
              <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11m-5-5 5 5-5 5" /></svg>
            </a>
          </div>
          <!-- <p v-if="outlet.address" class="hero-address">
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M16 8.3c0 4.1-6 9-6 9s-6-4.9-6-9a6 6 0 1 1 12 0Z" /><circle cx="10" cy="8" r="2" /></svg>
            {{ outlet.address }}
          </p> -->
        </div>
        <figure class="hero-visual has-photo">
          <img
            :src="displayedHeroImageUrl"
            :alt="displayedHeroImageAlt"
            fetchpriority="high"
            @error="handleHeroImageError"
          />
          <figcaption v-if="!heroImageUrl || heroImageFailed">Foto ilustrasi · unggah foto outlet di Pengaturan website untuk mengganti</figcaption>
        </figure>
        <!-- <div class="hero-index"><span>{{ outlet.services?.length || 0 }} layanan tersedia</span></div> -->
      </section>

      <section v-if="outlet.show_about" id="tentang" class="about-section wrap">
        <div class="about-illustration" aria-hidden="true">
          <img src="/images/about-laundry.png" alt="" loading="lazy" />
        </div>
        <div class="about-copy">
          <h2 :class="{ 'long-heading': (outlet.about_title || '').length > 30 }">{{ outlet.about_title || `Tentang ${outlet.name}` }}</h2>
          <p v-if="aboutText">{{ aboutText }}</p>
          <a v-if="outlet.show_services" class="button about-services-link" href="#layanan">
            Layanan Kami
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
          </a>
        </div>
      </section>

      <section v-if="outlet.show_services" id="layanan" class="services-section">
        <div class="wrap">
          <div class="section-heading services-heading">
            <div><h2 :class="{ 'long-heading': (outlet.services_title || '').length > 30 }">{{ outlet.services_title || 'Layanan yang tersedia' }}</h2></div>
            <p v-if="outlet.services_intro">{{ outlet.services_intro }}</p>
          </div>
          <div v-if="outlet.services?.length" class="service-grid" aria-label="Jenis layanan outlet">
            <article v-for="service in outlet.services" :key="service.name" class="service-card">
              <span class="service-icon" aria-hidden="true">
                <img class="service-icon-art" :src="serviceIconImage(service.icon)" alt="" loading="lazy" />
              </span>
              <h3>{{ service.name }}</h3>
              <p>{{ service.description }}</p>
            </article>
          </div>
          <p v-else class="empty-services">Informasi layanan dapat ditanyakan langsung kepada outlet.</p>
        </div>
      </section>

      <section v-if="outlet.show_gallery" id="galeri" class="gallery-section">
        <div class="wrap gallery-wrap">
          <div class="section-heading gallery-heading"><div><h2 :class="{ 'long-heading': (outlet.gallery_title || '').length > 30 }">{{ outlet.gallery_title || 'Suasana dan layanan kami.' }}</h2></div></div>
          <div v-if="galleryImageUrls.length" class="photo-strip" :class="`count-${galleryImageUrls.length}`">
            <figure v-for="(photo, index) in galleryImageUrls" :key="`${photo}-${index}`" :class="`photo-${index + 1}`">
              <img :src="photo" :alt="`Foto ${index + 1} dari ${outlet.name}`" loading="lazy" @error="hideBrokenImage" />
            </figure>
          </div>
          <p v-else class="gallery-empty">Foto galeri belum ditambahkan. Unggah foto outlet melalui Pengaturan website.</p>
        </div>
      </section>

      <section v-if="outlet.show_location" id="lokasi" class="contact-section">
        <div class="wrap location-content" :class="{ 'location-one-column': !(outlet.hours_active && mapEmbedUrl) }">
          <section v-if="outlet.hours_active" class="hours-block" aria-labelledby="hours-title">
            <h2 id="hours-title">Jam Operasional</h2>
            <ul class="hours-list" aria-label="Jadwal operasional outlet">
              <li v-for="day in displayedHours" :key="day.label"><span>{{ day.label }}</span><b>{{ day.closed ? 'Tutup' : (day.open && day.close ? `${day.open}–${day.close}` : 'Jam belum diatur') }}</b></li>
            </ul>
          </section>
          <section v-if="mapEmbedUrl" class="location-map-block" aria-labelledby="location-title">
            <h2 id="location-title">Lokasi Kami</h2>
            <iframe class="contact-map" :src="mapEmbedUrl" :title="`Peta lokasi ${outlet.name}`" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
            <a v-if="directionsUrl" class="map-link" :href="directionsUrl" target="_blank" rel="noreferrer">Lihat petunjuk arah</a>
          </section>
          <section v-if="!outlet.hours_active && !mapEmbedUrl" class="location-empty">
            <h2>Lokasi outlet</h2>
            <p>Informasi lokasi belum tersedia. Hubungi outlet untuk menanyakan alamat dan jam operasional.</p>
            <a v-if="whatsappUrl" class="button button-light" :href="whatsappUrl" target="_blank" rel="noreferrer">Hubungi lewat WhatsApp</a>
          </section>
        </div>
      </section>

      <footer class="site-footer">
        <div class="wrap footer-main">
          <section v-if="outlet.footer_show_logo && ((outlet.footer_logo_mode !== 'tagline' && outlet.footer_logo_url) || (outlet.footer_logo_mode !== 'logo' && outlet.footer_tagline))" class="footer-column footer-identity">
            <a v-if="outlet.footer_logo_mode !== 'tagline' && outlet.footer_logo_url" class="footer-brand" href="#beranda">
              <img :src="resolveApiAsset(outlet.footer_logo_url)" :alt="`Logo ${outlet.name}`" :style="{ height: `${outlet.footer_logo_size || 120}px` }" loading="lazy" @error="hideBrokenImage" />
            </a>
            <p v-if="outlet.footer_logo_mode !== 'logo' && outlet.footer_tagline" class="footer-tagline">{{ outlet.footer_tagline }}</p>
          </section>
          <section v-if="outlet.footer_show_support" class="footer-column footer-platform">
            <h2>{{ outlet.footer_support_title || 'Dukungan' }}</h2>
            <a v-if="outlet.footer_support_url" :href="outlet.footer_support_url" target="_blank" rel="noreferrer">{{ outlet.footer_text || 'Didukung oleh Laundrian' }}</a>
            <p v-else>{{ outlet.footer_text || 'Website outlet didukung oleh Laundrian' }}</p>
            <div v-if="outlet.footer_payment_logos?.length" class="footer-payment-logos" aria-label="Metode pembayaran yang diterima">
              <img v-for="payment in outlet.footer_payment_logos" :key="payment.url" :src="resolveApiAsset(payment.url)" :alt="payment.name || 'Logo pembayaran'" loading="lazy" @error="hideBrokenImage" />
            </div>
          </section>
          <section v-if="outlet.footer_show_contact" class="footer-column footer-contact">
            <h2>{{ outlet.footer_contact_title || 'Kontak outlet' }}</h2>
            <p v-if="outlet.address">{{ outlet.address }}</p>
            <a v-if="outlet.phone" :href="`tel:${outlet.phone.replace(/[^+\d]/g, '')}`">{{ outlet.phone }}</a>
            <a v-if="whatsappUrl" class="footer-whatsapp-link" :href="whatsappUrl" aria-label="Hubungi outlet lewat WhatsApp" target="_blank" rel="noreferrer">
              <img src="/images/whatsapp-512.png" alt="" aria-hidden="true" @error="hideBrokenImage" />
            </a>
            <div class="social-links"><a v-if="outlet.instagram_url" :href="outlet.instagram_url" target="_blank" rel="noreferrer">Instagram</a><a v-if="outlet.facebook_url" :href="outlet.facebook_url" target="_blank" rel="noreferrer">Facebook</a></div>
          </section>
          <div class="footer-bottom"><a class="footer-top" href="#beranda">Kembali ke atas</a></div>
        </div>
      </footer>
    </template>
  </main>
</template>
