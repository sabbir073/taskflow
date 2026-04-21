import type { Metadata } from "next";
import Link from "next/link";
import LegalLayout from "@/components/landing/LegalLayout";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How TaskFlow collects, uses, shares, and protects your personal data. Your rights, cookies, data retention, and how to contact us.",
};

export default function PrivacyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      tagline="We collect the minimum needed to run TaskFlow, never sell your data, and give you full control."
      lastUpdated="April 22, 2026"
      currentHref="/privacy"
    >
      <h2>1. Who we are</h2>
      <p>
        TaskFlow (<strong>&ldquo;we&rdquo;</strong>, <strong>&ldquo;us&rdquo;</strong>, <strong>&ldquo;our&rdquo;</strong>)
        operates the TaskFlow platform. This Privacy Policy explains what personal data we collect, how
        we use it, and your rights over it. This policy applies to all visitors, registered users, and
        paying customers.
      </p>

      <h2>2. Information we collect</h2>
      <h3>Information you provide</h3>
      <ul>
        <li><strong>Account data:</strong> name, email address, password (hashed), and optional profile avatar.</li>
        <li><strong>Profile data:</strong> phone number (optional), preferences, notification settings.</li>
        <li><strong>Payment data:</strong> transaction ID and payment method reference that you submit during subscription purchase. We do <strong>not</strong> store credit card numbers on our servers.</li>
        <li><strong>Content:</strong> tasks you create, groups you form, proofs you submit (URLs, screenshots), support messages, and contact-form submissions.</li>
      </ul>
      <h3>Information collected automatically</h3>
      <ul>
        <li><strong>Usage data:</strong> pages visited, actions taken, timestamps — used to operate and improve the Service.</li>
        <li><strong>Device data:</strong> IP address, browser type, operating system, referrer URL.</li>
        <li><strong>Cookies:</strong> essential cookies for signing you in and remembering preferences (see our <Link href="/cookies">Cookie Policy</Link>).</li>
      </ul>

      <h2>3. How we use your data</h2>
      <p>We use the data we collect to:</p>
      <ul>
        <li>Provide, operate, and maintain the Service.</li>
        <li>Authenticate your account and secure it against abuse.</li>
        <li>Process payments and activate subscriptions.</li>
        <li>Communicate with you about your account, tasks, approvals, and service updates.</li>
        <li>Enforce our <Link href="/terms">Terms of Service</Link> and investigate abuse.</li>
        <li>Comply with legal obligations.</li>
      </ul>
      <p>
        We do <strong>not</strong> sell your personal data to advertisers or data brokers. We do not
        share your task content with third parties except as necessary to operate the platform
        (e.g. when you engage with another member&apos;s content on a third-party social network).
      </p>

      <h2>4. Legal basis (for EU / UK users)</h2>
      <p>
        If you&apos;re in the European Economic Area or the United Kingdom, we process your data based
        on one or more of these lawful grounds:
      </p>
      <ul>
        <li><strong>Contract:</strong> to deliver the Service you signed up for.</li>
        <li><strong>Legitimate interest:</strong> to keep the platform secure, prevent fraud, and improve features.</li>
        <li><strong>Consent:</strong> where we ask for it (e.g. optional marketing emails).</li>
        <li><strong>Legal obligation:</strong> to comply with tax, anti-fraud, and other laws.</li>
      </ul>

      <h2>5. Sharing your data</h2>
      <p>We only share your data with:</p>
      <ul>
        <li><strong>Other members</strong> — limited to your public profile (name, avatar) when you interact through tasks or groups.</li>
        <li><strong>Service providers</strong> who help us run TaskFlow (hosting, database, email delivery, file storage). They&apos;re contractually bound to process data only on our instructions.</li>
        <li><strong>Administrators</strong> within our organisation, strictly on a need-to-know basis.</li>
        <li><strong>Law enforcement or regulators</strong> when legally required or to protect our users from imminent harm.</li>
      </ul>

      <h2>6. Data retention</h2>
      <p>
        We keep your personal data for as long as your account is active. When you delete your account,
        we anonymise profile data within 30 days. Some records (transaction history, audit logs,
        invoices) are retained for up to 7 years to comply with accounting and legal obligations.
      </p>

      <h2>7. Your rights</h2>
      <p>Depending on your jurisdiction, you have the right to:</p>
      <ul>
        <li>Access the personal data we hold about you.</li>
        <li>Correct inaccurate or incomplete data.</li>
        <li>Delete your data (&ldquo;right to be forgotten&rdquo;).</li>
        <li>Restrict or object to certain processing.</li>
        <li>Receive your data in a portable format.</li>
        <li>Withdraw consent at any time where processing is based on consent.</li>
        <li>File a complaint with a data-protection authority.</li>
      </ul>
      <p>
        To exercise any of these rights, email{" "}
        <a href="mailto:hello@taskflow.io">hello@taskflow.io</a>. We&apos;ll respond within 30 days.
      </p>

      <h2>8. Security</h2>
      <p>
        We take reasonable measures to protect your data, including:
      </p>
      <ul>
        <li>Passwords are hashed with industry-standard algorithms before storage.</li>
        <li>All data in transit is encrypted with TLS.</li>
        <li>Access to production data is limited to authorised personnel with two-factor authentication.</li>
        <li>Atomic balance updates and audit logging protect against fraud.</li>
      </ul>
      <p>
        No system is 100% secure. If a breach occurs that affects your data, we&apos;ll notify you and
        any relevant authority as required by law.
      </p>

      <h2>9. Children</h2>
      <p>
        TaskFlow is not intended for children under 13. We do not knowingly collect data from children
        under 13. If you believe a child has provided us with personal data, please contact us so we
        can delete it.
      </p>

      <h2>10. International transfers</h2>
      <p>
        Your data may be processed in countries other than the one you reside in. When we transfer
        data internationally, we rely on standard contractual clauses or equivalent safeguards to
        protect it.
      </p>

      <h2>11. Third-party links</h2>
      <p>
        TaskFlow contains links to third-party websites (for example, the social platforms you engage
        with during tasks). We are not responsible for the privacy practices of those sites — please
        review their privacy policies separately.
      </p>

      <h2>12. Changes to this policy</h2>
      <p>
        We may update this Privacy Policy from time to time. When we do, we&apos;ll update the
        &ldquo;Last updated&rdquo; date above. Material changes will be communicated through the
        dashboard or by email.
      </p>

      <h2>13. Contact</h2>
      <p>
        For any privacy questions or to exercise your rights, reach out to{" "}
        <a href="mailto:hello@taskflow.io">hello@taskflow.io</a> or use the{" "}
        <Link href="/#contact">contact form</Link>.
      </p>
    </LegalLayout>
  );
}
