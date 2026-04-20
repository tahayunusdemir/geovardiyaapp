'use client'

import { useInstallPrompt } from './InstallPromptProvider'

interface InstallGuide {
  badgeClassName: string
  badgeLabel: string
  description: string
  hint: string
  steps: string[]
}

export default function InstallPrompt() {
  const { deferredPrompt, isIOS, isStandalone, isSecureContext, serviceWorkerError, install } =
    useInstallPrompt()
  const userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent
  const isSafari =
    /Safari/i.test(userAgent) && !/Chrome|CriOS|FxiOS|EdgiOS|OPiOS/i.test(userAgent)
  const isSamsungBrowser = /SamsungBrowser/i.test(userAgent)
  const isFirefox = /Firefox|FxiOS/i.test(userAgent)
  const browserMenuLabel = isSamsungBrowser
    ? 'Samsung Internet menusu'
    : isFirefox
      ? 'Firefox menusu'
      : 'tarayici menusu'

  if (isStandalone) return null

  let guide: InstallGuide

  if (!isSecureContext) {
    guide = {
      badgeClassName: 'bg-yellow-500/15 text-yellow-200 border-yellow-500/30',
      badgeLabel: 'HTTPS gerekli',
      description:
        'Bu baglanti guvenli olmadigi icin tarayici ana ekrana ekleme akisini acmaz.',
      hint: 'Telefonla test ederken HTTPS veya localhost kullanmadan PWA kurulumu cikmaz.',
      steps: [
        'Uygulamayi HTTPS uzerinden veya bilgisayarda localhost ile ac.',
        'Sayfa yeniden yuklenince tarayici menusu icindeki kurulum secenegini kontrol et.',
        '"Uygulamayi yukle" ya da "Ana ekrana ekle" secenegiyle kurulumu tamamla.',
      ],
    }
  } else if (isIOS) {
    guide = {
      badgeClassName: 'bg-sky-500/15 text-sky-100 border-sky-500/30',
      badgeLabel: 'Safari ile ekle',
      description:
        'iPhone ve iPad tarafinda tek tik yukleme yerine Safari paylas menusu kullaniliyor.',
      hint: isSafari
        ? 'Paylas dugmesi alt ya da ust barda gorunebilir.'
        : 'Kurulum secenegi gormek icin sayfayi Safari icinde acman gerekiyor.',
      steps: [
        isSafari ? 'Safari icinde bu sayfayi acik tut.' : 'Bu sayfayi Safari ile ac.',
        'Paylas dugmesine dokun.',
        '"Ana Ekrana Ekle" secenegini secip "Ekle" ile onayla.',
      ],
    }
  } else if (deferredPrompt) {
    guide = {
      badgeClassName: 'bg-emerald-500/15 text-emerald-100 border-emerald-500/30',
      badgeLabel: 'Hazir',
      description:
        'Tarayici uygulamayi yuklemeye hazir. Istersen tek dokunusla kurulumu baslatabilirsin.',
      hint: 'Buton acilmazsa yine tarayici menusundeki kurulum secenegini kullanabilirsin.',
      steps: [
        'Asagidaki "Telefona Yukle" butonuna dokun.',
        'Tarayicinin acacagi kurulum penceresini onayla.',
        'Uygulama ana ekrana eklendiginde tarayicidan ayri acilacak.',
      ],
    }
  } else {
    guide = {
      badgeClassName: 'bg-white/10 text-zinc-100 border-white/10',
      badgeLabel: 'Elle ekle',
      description:
        'Tarayici bazen ozel kurulum butonunu hemen vermez. Bu durumda menu uzerinden ekleyebilirsin.',
      hint: 'Android tarafinda secenek genelde "Uygulamayi yukle" veya "Ana ekrana ekle" olarak gorunur.',
      steps: [
        `${browserMenuLabel} ac.`,
        '"Uygulamayi yukle" ya da "Ana ekrana ekle" secenegine dokun.',
        '"Yukle" veya "Ekle" ile islemi bitir.',
      ],
    }
  }

  return (
    <section className="rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-950 via-zinc-900 to-black p-5 text-white shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-base font-semibold">Ana Ekrana Ekle</p>
            <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${guide.badgeClassName}`}>
              {guide.badgeLabel}
            </span>
          </div>
          <p className="mt-2 text-sm text-zinc-300">{guide.description}</p>
        </div>

        {deferredPrompt && isSecureContext && !isIOS && (
          <button
            onClick={install}
            className="shrink-0 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-zinc-200"
          >
            Telefona Yukle
          </button>
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">
          Kurulum Adimlari
        </p>
        <ol className="mt-3 flex flex-col gap-2.5 text-sm text-zinc-200">
          {guide.steps.map((step, index) => (
            <li key={step} className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-bold text-black">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <p className="mt-4 text-xs text-zinc-400">{guide.hint}</p>
      {serviceWorkerError && (
        <p className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          Servis worker kaydi basarisiz: {serviceWorkerError}
        </p>
      )}
    </section>
  )
}
