import type { Metadata } from "next";
import Link from "next/link";
import LegalLayout from "@/components/landing/LegalLayout";

export const metadata: Metadata = {
  title: "Refund Policy",
  description:
    "Our 14-day money-back guarantee, refund eligibility, processing time, and how to request one.",
};

export default function RefundPage() {
  return (
    <LegalLayout
      title="Refund Policy"
      tagline="Straightforward rules — if TaskFlow doesn't work for you, we'll give your money back within the window."
      lastUpdated="April 22, 2026"
      currentHref="/refund"
    >
      <h2>1. 14-day money-back guarantee</h2>
      <p>
        Every paid subscription on TaskFlow is covered by a <strong>14-day money-back guarantee</strong>.
        If you&apos;re not satisfied for any reason, contact us within 14 days of the payment approval
        date and we&apos;ll refund 100% of what you paid.
      </p>

      <h2>2. Eligibility</h2>
      <p>You&apos;re eligible for a full refund if:</p>
      <ul>
        <li>The request is made within <strong>14 days</strong> of the payment being approved.</li>
        <li>You haven&apos;t consumed more than <strong>25%</strong> of your plan&apos;s included credits.</li>
        <li>Your account is in good standing — not suspended, banned, or flagged for abuse.</li>
        <li>The payment was made directly through TaskFlow (not via a third-party reseller).</li>
      </ul>
      <p>
        Partial refunds may be considered on a case-by-case basis outside the 14-day window if there is
        a clear platform issue that prevented normal usage.
      </p>

      <h2>3. What is not refundable</h2>
      <ul>
        <li>Points purchases and point packages — once added to your wallet they cannot be reversed.</li>
        <li>Subscriptions that have already been renewed once (only the current cycle is refundable).</li>
        <li>Fees imposed by the payment processor or your bank, if any.</li>
        <li>Any cycle where more than 25% of included credits have been consumed.</li>
        <li>Accounts terminated for Terms of Service violations.</li>
      </ul>

      <h2>4. How to request a refund</h2>
      <ol>
        <li>
          Email us at{" "}
          <a href="mailto:hello@taskflow.io">hello@taskflow.io</a> from the email address on your
          TaskFlow account, or submit the <Link href="/#contact">contact form</Link>.
        </li>
        <li>Include your invoice number (format <strong>INV-YYYY-######</strong>) and the reason for the refund.</li>
        <li>An administrator will review within 2 business days. We may ask for a short confirmation.</li>
        <li>Approved refunds are returned via the same payment method used for the original transaction.</li>
      </ol>

      <h2>5. Processing time</h2>
      <p>
        Once approved, refunds are initiated within <strong>3 business days</strong>. Depending on your
        bank or payment provider, the funds may take an additional <strong>5&ndash;10 business days</strong>
        to appear on your statement.
      </p>

      <h2>6. What happens to your account after a refund</h2>
      <ul>
        <li>Your subscription is immediately cancelled and the plan-included credits are reversed.</li>
        <li>Points earned through tasks during that period are <strong>not</strong> deducted.</li>
        <li>Any promotional tasks still active on your account will be stopped; unused budget is returned to your wallet.</li>
        <li>You can continue using TaskFlow on the free Basic plan.</li>
      </ul>

      <h2>7. Subscription cancellations (no refund)</h2>
      <p>
        Because subscriptions do <strong>not</strong> auto-renew, there&apos;s nothing to &ldquo;cancel&rdquo;.
        If you simply stop submitting new payments, your plan ends at the expiry date and your account
        automatically reverts to the Basic tier.
      </p>

      <h2>8. Chargebacks</h2>
      <p>
        Please contact us first before initiating a chargeback with your bank or card issuer. Almost
        every refund dispute can be resolved directly. Unauthorised chargebacks may result in account
        suspension until the dispute is resolved.
      </p>

      <h2>9. Changes to this policy</h2>
      <p>
        We may update this Refund Policy from time to time. The &ldquo;Last updated&rdquo; date above
        will reflect the most recent revision. Existing paid subscribers will be notified of material
        changes before they take effect.
      </p>

      <h2>10. Contact</h2>
      <p>
        Questions about a refund? Email{" "}
        <a href="mailto:hello@taskflow.io">hello@taskflow.io</a> — we typically respond within 2 hours
        during business hours (Mon&ndash;Sat, 9 AM&ndash;9 PM).
      </p>
    </LegalLayout>
  );
}
