import Link from 'next/link';
import styles from './GetStartedCta.module.css';

export default function GetStartedCta() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.textBlock}>
          <h2 className={styles.title}>Get started</h2>
          <p className={styles.subtitle}>
            Create an account to place orders, manage saved carts, and track shipments.
          </p>
        </div>
        <div className={styles.actions}>
          <Link href="/signup" className={styles.primaryButton}>
            Create account
          </Link>
          <Link href="/login" className={styles.secondaryButton}>
            Log in
          </Link>
        </div>
      </div>
    </section>
  );
}
