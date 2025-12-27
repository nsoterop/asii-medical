import Image from 'next/image';
import Link from 'next/link';
import styles from './HeroSection.module.css';

type HeroSectionProps = {
  isLoggedIn?: boolean;
};

export default function HeroSection({ isLoggedIn = false }: HeroSectionProps) {
  return (
    <section className={`${styles.hero} ${styles.bleed}`}>
      <div className={styles.heroInner}>
        {/* Drop the image at /public/hero-medical.png */}
        <div className={styles.imageLayer}>
          <Image
            src="/hero-medical.png"
            alt="Operating room"
            fill
            priority
            sizes="100vw"
            className={styles.heroImage}
          />
        </div>
        <div className={styles.overlay} aria-hidden="true" />
        <div
          className={styles.gradient}
          aria-hidden="true"
        />
        <div className={styles.contentWrap}>
          <div className={styles.content}>
            <h1 className={styles.title}>ASii Medical</h1>
            <p className={styles.subtitle}>
              Founded in 2019, industry veterans providing over 200,000 medical
              supplies &amp; equipment with fast, reliable fulfillment.
            </p>
            <div className={styles.actions}>
              {isLoggedIn ? (
                <Link href="/search" className={styles.primaryButton}>
                  Browse products
                </Link>
              ) : (
                <Link href="/about" className={styles.secondaryButton}>
                  Learn more
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
