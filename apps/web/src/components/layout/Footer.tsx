import Link from 'next/link';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer} data-testid="site-footer">
      <div className={`layout-container ${styles.inner}`}>
        <div className={styles.contact}>
          <div className={styles.company}>ASii Medical Solutions llc</div>
          <a className={`${styles.link} text-link`} href="tel:9194442339">
            919-444-2339
          </a>
          <a className={`${styles.link} text-link`} href="mailto:Info@asiimedical.com">
            Info@asiimedical.com
          </a>
        </div>
        <div className={styles.links}>
          <a
            className={`${styles.link} text-link`}
            href="https://www.linkedin.com/posts/asii-medical-solutions-llc_asiimedicalcom-let-us-know-how-we-can-activity-7271024271236206592-fAxI/?utm_source=share&utm_medium=member_android&rcm=ACoAAD2pSYQBQhP_Qtk7ozcYpeiLQY_kPWaSDOU"
            target="_blank"
            rel="noreferrer noopener"
          >
            Overview
          </a>
          <Link className={`${styles.link} text-link`} href="/about">
            About
          </Link>
          <Link className={`${styles.link} text-link`} href="/terms">
            Terms &amp; Conditions
          </Link>
        </div>
        <div className={styles.social}>
          <Link
            href="https://www.facebook.com/ASIIMedical/"
            target="_blank"
            rel="noreferrer noopener"
            className={styles.iconButton}
            aria-label="Facebook"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M13.5 8.5V7c0-.8.7-1 1.2-1h1.3V3.3H13c-2.2 0-3.5 1.4-3.5 3.6v1.6H7.5V11h2v7h3v-7h2.4l.4-2.5h-2.8Z"
                fill="currentColor"
              />
            </svg>
          </Link>
          <Link
            href="https://www.linkedin.com/company/asii-medical-solutions-llc/"
            target="_blank"
            rel="noreferrer noopener"
            className={styles.iconButton}
            aria-label="LinkedIn"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M6.5 9.3H4V20h2.5V9.3ZM5.2 4a1.3 1.3 0 1 0 0 2.6A1.3 1.3 0 0 0 5.2 4ZM10.2 9.3H7.8V20h2.4v-5.5c0-1.4.3-2.8 2.1-2.8s1.8 1.7 1.8 2.9V20h2.4v-6c0-3-1.6-4.9-4.2-4.9-1.4 0-2.4.8-2.7 1.5h-.1V9.3Z"
                fill="currentColor"
              />
            </svg>
          </Link>
        </div>
      </div>
    </footer>
  );
}
