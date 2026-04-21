import type { Metadata } from "next";
import Link from "next/link";
import LegalLayout from "@/components/landing/LegalLayout";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The agreement that governs your use of TaskFlow — accounts, points, subscriptions, content, conduct, liability, termination.",
};

export default function TermsPage() {
  return (
    <LegalLayout
      title="Terms of Service"
      tagline="Please read these terms carefully. By creating an account you agree to everything below."
      lastUpdated="April 22, 2026"
      currentHref="/terms"
    >
      <h2>1. Introduction</h2>
      <p>
        These Terms of Service (the <strong>&ldquo;Terms&rdquo;</strong>) govern your access to and use of
        the TaskFlow platform, including our website, dashboard, and any related services (collectively, the
        <strong> &ldquo;Service&rdquo;</strong>). By creating an account or using the Service you
        agree to be bound by these Terms. If you do not agree, please do not use the Service.
      </p>

      <h2>2. Who can use TaskFlow</h2>
      <p>
        You must be at least 13 years old to use the Service. If you&apos;re under 18, you confirm that
        a parent or legal guardian has reviewed these Terms on your behalf. You must also comply with all
        applicable laws in your country of residence.
      </p>
      <p>
        You are responsible for maintaining the confidentiality of your account credentials and for all
        activity that happens under your account.
      </p>

      <h2>3. What TaskFlow does</h2>
      <p>
        TaskFlow is a peer-to-peer engagement exchange platform. Members complete real, approved social
        media actions (such as likes, shares, follows and comments) on each other&apos;s content in
        return for in-app points. Points are an internal credit used to request similar engagement on
        your own content. They are not a currency, have no monetary value outside the platform, and
        cannot be redeemed for cash.
      </p>

      <h2>4. Accounts and security</h2>
      <ul>
        <li>You agree to provide accurate, complete information when creating an account.</li>
        <li>You may not share your account with others or create multiple accounts to exploit the Service.</li>
        <li>You must notify us immediately of any unauthorised access to your account.</li>
        <li>We may suspend or terminate accounts that violate these Terms.</li>
      </ul>

      <h2>5. Points and subscriptions</h2>
      <h3>Earning points</h3>
      <p>
        Points are credited to your account when an administrator approves your proof of task
        completion. Rejected submissions do not earn points. Repeated rejections on the same task may
        incur a small point penalty as outlined in the Help Center.
      </p>
      <h3>Spending points</h3>
      <p>
        Points may be used to create tasks that other members complete on your behalf. Unspent task
        budget is refunded to your wallet if a task is deleted before completion.
      </p>
      <h3>Subscriptions</h3>
      <p>
        Paid plans unlock additional quotas (tasks per period, group membership, included credits) and
        support tiers. Subscriptions are billed per the cycle you select (monthly, six-month or
        yearly). Payments are processed manually — an administrator reviews every transaction before
        activating the plan. Subscriptions do <strong>not</strong> auto-renew; you&apos;ll receive
        reminders before expiry.
      </p>

      <h2>6. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use automated tools, bots, or scripts to complete tasks or create engagement.</li>
        <li>Submit fake, misleading, or manipulated proofs of completion.</li>
        <li>Engage with, share, or host content that is illegal, harmful, hateful, harassing, defamatory, sexually explicit, or infringing.</li>
        <li>Attempt to bypass quota limits, rate limits, or payment requirements.</li>
        <li>Reverse engineer, scrape, or attempt to extract data from the Service without permission.</li>
        <li>Use the Service to violate any third-party social media platform&apos;s terms of service.</li>
      </ul>
      <p>
        We reserve the right to remove content, suspend accounts, and deduct points earned through
        behaviour that violates these rules.
      </p>

      <h2>7. User content</h2>
      <p>
        You retain ownership of content you upload (proof screenshots, task descriptions, profile
        information). By uploading, you grant TaskFlow a worldwide, non-exclusive, royalty-free license
        to store, display, and transmit that content as needed to operate the Service.
      </p>
      <p>
        You are solely responsible for ensuring you have the rights to any content you upload and that
        it does not violate any third party&apos;s rights.
      </p>

      <h2>8. Payments</h2>
      <ul>
        <li>All prices are shown in your local currency (as selected at purchase) and include applicable taxes unless stated otherwise.</li>
        <li>Payments are submitted with a transaction ID and reviewed manually. Activation typically occurs within a few hours of submission.</li>
        <li>If a payment is rejected, you&apos;ll receive a notification with the reason and instructions.</li>
      </ul>

      <h2>9. Refunds</h2>
      <p>
        All paid plans include a limited money-back window. Please see the{" "}
        <Link href="/refund">Refund Policy</Link> for full eligibility and process details.
      </p>

      <h2>10. Termination</h2>
      <p>
        You may stop using the Service at any time by contacting support to close your account. We may
        suspend or terminate your account immediately, without notice, if we believe you have violated
        these Terms or pose a risk to other members. On termination, unused points and unexpired
        subscription time are generally forfeit, except where required by law.
      </p>

      <h2>11. Changes to the Service</h2>
      <p>
        We continually improve TaskFlow and may add, modify, or remove features at any time. When a
        change is significant, we&apos;ll do our best to notify you in advance through in-app or email
        communication.
      </p>

      <h2>12. Disclaimers</h2>
      <p>
        The Service is provided <strong>&ldquo;as is&rdquo;</strong> and <strong>&ldquo;as
        available&rdquo;</strong>. We make no warranty that the Service will meet your requirements,
        be uninterrupted, timely, secure, or error-free. TaskFlow is not affiliated with, endorsed by,
        or sponsored by any of the third-party social media platforms members may engage with.
      </p>

      <h2>13. Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, TaskFlow, its operators, and contributors shall not be
        liable for any indirect, incidental, consequential, or punitive damages arising out of your use
        of the Service, including loss of engagement, followers, revenue, or content visibility on
        third-party platforms.
      </p>

      <h2>14. Changes to these Terms</h2>
      <p>
        We may update these Terms from time to time. When we do, we&apos;ll update the
        &ldquo;Last updated&rdquo; date above and, for material changes, notify you via email or an
        in-app notification. Continued use of the Service after such changes means you accept the
        revised Terms.
      </p>

      <h2>15. Contact</h2>
      <p>
        Questions about these Terms? Email us at{" "}
        <a href="mailto:hello@taskflow.io">hello@taskflow.io</a> or use the{" "}
        <Link href="/#contact">contact form</Link>.
      </p>
    </LegalLayout>
  );
}
