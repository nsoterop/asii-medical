import styles from './AboutPage.module.css';

export default function AboutPage() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>ASii Medical Solutions LLC</h1>

      <section className={styles.section}>
        <h2>Company Background</h2>
        <p>
          Founded in 2019 in Raleigh, North Carolina, ASii Medical Solutions LLC aims to challenge
          the traditional consumable and distribution market. With a team boasting over 20 years of
          industry experience, the company has strategically partnered with trusted industry leaders
          and innovative manufacturers. This collaboration allows ASii Medical to offer a wide range
          of commonly used items in the supply chain, including some on an exclusive basis.
        </p>
      </section>

      <section className={styles.section}>
        <h2>Customer Focus and Savings</h2>
        <p>
          ASii Medical&apos;s strategy has enabled the company to deliver customer savings whenever
          possible while consistently meeting customer expectations. As a result, ASii Medical has
          established itself as a trusted resource in the industry, with the capability to offer
          over 200,000 commonly used supplies and equipment.
        </p>
      </section>

      <section className={styles.section}>
        <h2>Fulfillment Commitment</h2>
        <p>
          The company recognizes the critical importance of swift and reliable fulfillment. ASii
          Medical ensures that all markets are well served through its partnered fulfillment centers
          and local contacts, guaranteeing timely delivery of products.
        </p>
      </section>

      <section className={styles.section}>
        <h2>Partnership Programs</h2>
        <p>
          Understanding the value of strong partnerships, ASii Medical has developed programs that
          ensure items frequently ordered by customers are stocked and readily available once a
          relationship is established. The company also offers Group Purchasing Organization (GPO)
          and local vendor contracts to further enhance its service offerings.
        </p>
      </section>
    </div>
  );
}
