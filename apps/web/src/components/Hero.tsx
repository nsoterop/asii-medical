// Swap the hero background by replacing /public/hero-medical.png.
import Image from 'next/image';

export default function Hero() {
  return (
    <section className="relative flex min-h-[420px] items-center justify-center overflow-hidden bg-slate-950 md:min-h-[520px]">
      <Image
        src="/hero-medical.png"
        alt=""
        fill
        priority
        className="object-cover object-center 2xl:object-contain"
      />
      <div className="absolute inset-0 bg-slate-950/60" aria-hidden="true" />
      <div
        className="absolute inset-0 bg-gradient-to-br from-blue-900/40 via-slate-900/10 to-blue-950/60"
        aria-hidden="true"
      />
    </section>
  );
}
