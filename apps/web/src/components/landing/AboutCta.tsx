import Link from 'next/link';
import styles from './AboutCta.module.css';

export default function AboutCta() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.textBlock}>
          <h2 className={styles.title}>Built for reliable healthcare supply relationships.</h2>
          <p className={styles.subtitle}>
            ASii Medical partners with trusted industry leaders and innovative manufacturers to
            bring a curated catalog—including select exclusive items—built for real-world healthcare
            supply needs. We support long-term customer relationships with stocking programs and
            contract options like GPO and local vendor agreements.
          </p>
        </div>
        <div className={styles.actions}>
          <Link href="/about" className={styles.secondaryButton}>
            Learn more
          </Link>
        </div>
      </div>
    </section>
  );
}
