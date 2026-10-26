// A minimal browser window around each Projects card: three dots and the
// site's domain in a mono address bar (34 px tall, STRIP.CHROME_PX), over a
// 16:10 shot area that matches the 1440×900 screenshots. The chrome is
// decorative; the card's link carries the accessible name.

export default function BrowserFrame({ domain, addressRef, children }) {
  return (
    <div className="overflow-hidden rounded-md border border-rule bg-paper shadow-[0_24px_60px_-30px_rgb(11_31_58/0.35)] dark:shadow-[0_24px_60px_-30px_rgb(0_0_0/0.6)]">
      <div aria-hidden="true" className="flex h-[34px] items-center gap-3 border-b border-rule px-3">
        <span className="flex shrink-0 gap-1.5">
          <span className="h-2 w-2 rounded-full bg-ink/15" />
          <span className="h-2 w-2 rounded-full bg-ink/15" />
          <span className="h-2 w-2 rounded-full bg-ink/15" />
        </span>
        <span className="mx-auto min-w-0 max-w-[70%] truncate rounded-full bg-mist px-3 py-0.5 font-mono text-[10px] tracking-[0.06em] text-ink-soft">
          <span ref={addressRef} data-address>
            {domain}
          </span>
        </span>
        <span className="w-[36px] shrink-0" />
      </div>
      <div data-shot-area className="relative aspect-[16/10] overflow-hidden">
        {children}
      </div>
    </div>
  );
}
