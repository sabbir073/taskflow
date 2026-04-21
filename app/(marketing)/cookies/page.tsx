import type { Metadata } from "next";
import Link from "next/link";
import LegalLayout from "@/components/landing/LegalLayout";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description:
    "What cookies TaskFlow uses, why we use them, and how you can control them in your browser.",
};

export default function CookiesPage() {
  return (
    <LegalLayout
      title="Cookie Policy"
      tagline="Plain-English explanation of the small files we store in your browser and what each one does."
      lastUpdated="April 22, 2026"
      currentHref="/cookies"
    >
      <h2>1. What are cookies?</h2>
      <p>
        Cookies are small text files that a website stores in your browser. They let sites remember who
        you are between pages and across visits — for example, so you don&apos;t have to sign in on
        every page load.
      </p>
      <p>
        Similar technologies used here include <strong>localStorage</strong> and{" "}
        <strong>sessionStorage</strong>, which work the same way but store data directly in the
        browser rather than sending it back to a server.
      </p>

      <h2>2. The cookies TaskFlow uses</h2>
      <h3>Essential cookies</h3>
      <p>These are required for the Service to work. Disabling them will break core features.</p>
      <ul>
        <li>
          <strong>Session cookie</strong> — keeps you signed in as you navigate the dashboard. Expires
          when you sign out (or after 30 days of inactivity).
        </li>
        <li>
          <strong>CSRF token</strong> — protects against cross-site request forgery attacks on forms
          and admin actions.
        </li>
        <li>
          <strong>Theme preference</strong> — stores your light/dark mode choice in localStorage so it
          persists between visits.
        </li>
        <li>
          <strong>Dismissed popups</strong> — remembers which admin-managed popups you&apos;ve closed
          so they don&apos;t reappear in the same session.
        </li>
      </ul>

      <h3>Functional cookies</h3>
      <p>Optional and used only if you opt in to them. They enhance the experience but aren&apos;t essential.</p>
      <ul>
        <li>
          <strong>Remember me</strong> — extends your session to 30 days when you tick the box on
          sign-in.
        </li>
        <li>
          <strong>Sidebar collapse state</strong> — remembers whether you had the dashboard sidebar
          expanded or collapsed.
        </li>
      </ul>

      <h3>Analytics cookies</h3>
      <p>
        We do <strong>not</strong> currently use any third-party analytics (such as Google Analytics),
        tracking pixels, or advertising cookies. Usage data shown in admin reports is stored internally
        and tied only to your account — never sold or shared.
      </p>

      <h2>3. Why we use them</h2>
      <ul>
        <li>To keep you signed in and the platform secure.</li>
        <li>To remember your preferences (theme, sidebar layout).</li>
        <li>To prevent abuse (rate limiting relies on transient in-memory state keyed by IP).</li>
      </ul>
      <p>
        We do <strong>not</strong> use cookies to track you across other websites or to build
        advertising profiles.
      </p>

      <h2>4. How long cookies last</h2>
      <ul>
        <li><strong>Session cookies</strong> — deleted when you close your browser or sign out.</li>
        <li><strong>Persistent cookies</strong> — stay for the duration specified above (longest is 30 days for the remember-me session).</li>
        <li><strong>localStorage items</strong> — remain until you clear browser data or delete them manually.</li>
      </ul>

      <h2>5. Controlling cookies</h2>
      <p>
        All major browsers let you inspect, block, or delete cookies from their settings:
      </p>
      <ul>
        <li><strong>Chrome:</strong> Settings → Privacy and security → Cookies and other site data</li>
        <li><strong>Firefox:</strong> Settings → Privacy &amp; Security → Cookies and Site Data</li>
        <li><strong>Safari:</strong> Preferences → Privacy → Manage Website Data</li>
        <li><strong>Edge:</strong> Settings → Cookies and site permissions → Cookies and site data</li>
      </ul>
      <p>
        If you block essential cookies, you won&apos;t be able to sign in or use the dashboard. Blocking
        functional cookies is fine — the app will still work, just with resettable preferences.
      </p>

      <h2>6. Do we use third-party cookies?</h2>
      <p>
        Only the bare minimum. When you submit a payment and we redirect to your bank or payment
        gateway, <em>that</em> site sets its own cookies under its own policy. We have no control over
        those and recommend reviewing the relevant provider&apos;s privacy notices.
      </p>

      <h2>7. Changes to this policy</h2>
      <p>
        If we introduce new types of cookies or change how we use them, we&apos;ll update this policy
        and the &ldquo;Last updated&rdquo; date above. Material changes will also be surfaced as an
        in-app notification.
      </p>

      <h2>8. Contact</h2>
      <p>
        Questions about cookies or tracking? Email{" "}
        <a href="mailto:hello@taskflow.io">hello@taskflow.io</a> or reach out via the{" "}
        <Link href="/#contact">contact form</Link>.
      </p>
    </LegalLayout>
  );
}
