import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

// ============================================================================
// TRANSPORT
// ============================================================================
// Email is OPTIONAL. If SMTP_HOST or SMTP_USER is empty the module becomes a
// total no-op: every template returns false silently, no warnings, no errors,
// no nodemailer calls. As soon as all three vars are set, emails start flowing.

const host = (process.env.SMTP_HOST || "").trim();
const port = Number(process.env.SMTP_PORT) || 465;
const user = (process.env.SMTP_USER || "").trim();
const pass = (process.env.SMTP_PASS || "").trim();
const fromEmail = process.env.SMTP_FROM || user || "noreply@taskmos.com";
const appUrl = process.env.AUTH_URL || "http://localhost:3000";
const BRAND = "TaskMOS";

// Compose the From header with a display name so inboxes (Gmail, Apple Mail,
// Outlook) show "TaskMOS" as the sender — not the local-part of the email
// (e.g. "hello"). Format: `Display Name <addr@domain>`. Strip any quotes
// already in BRAND so we don't double-wrap.
const fromHeader = `"${BRAND.replace(/"/g, "")}" <${fromEmail}>`;

const emailEnabled = !!(host && user && pass);

// Build the transporter lazily and only when SMTP is actually configured, so
// nodemailer internals never see blank values. If creation itself throws we
// swallow it and stay in "disabled" mode for the process lifetime.
let transporter: Transporter | null = null;
let transportInitFailed = false;

function getTransporter(): Transporter | null {
  if (!emailEnabled || transportInitFailed) return null;
  if (transporter) return transporter;
  try {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
    return transporter;
  } catch {
    transportInitFailed = true;
    transporter = null;
    return null;
  }
}

export type MailAttachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
};

async function send(
  to: string | string[],
  subject: string,
  html: string,
  attachments?: MailAttachment[]
): Promise<boolean> {
  const t = getTransporter();
  if (!t) return false; // silent no-op — SMTP not configured
  try {
    await t.sendMail({
      from: fromHeader,
      to: Array.isArray(to) ? to.join(", ") : to,
      subject,
      html,
      attachments,
    });
    return true;
  } catch {
    // Swallow send errors too — we never want a bad SMTP response to crash
    // the app flow that triggered the email.
    return false;
  }
}

// ============================================================================
// BRANDED HTML WRAPPER
// ============================================================================
// Shared shell — colored header, body card, footer. All templates below pass
// inner HTML and an optional CTA link; the wrapper handles look & feel.

type ShellOpts = {
  title: string;
  preheader?: string;
  intro?: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaHref?: string;
  footerNote?: string;
};

function shell(opts: ShellOpts): string {
  const { title, preheader = "", intro = "", bodyHtml, ctaLabel, ctaHref, footerNote } = opts;
  const cta =
    ctaLabel && ctaHref
      ? `<div style="text-align:center;margin:28px 0 8px;">
           <a href="${ctaHref}" style="display:inline-block;padding:13px 28px;background:#7C3AED;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;">${ctaLabel}</a>
         </div>`
      : "";

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;">
<span style="display:none !important;visibility:hidden;opacity:0;height:0;width:0;font-size:0;">${preheader}</span>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f4f7;padding:32px 16px;">
  <tr>
    <td align="center">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.04);">
        <tr>
          <td style="background:linear-gradient(135deg,#7C3AED 0%,#C026D3 100%);padding:28px 32px;color:#ffffff;">
            <div style="font-size:22px;font-weight:700;letter-spacing:-0.3px;">${BRAND}</div>
            <div style="font-size:12px;opacity:0.85;margin-top:3px;">Task Marketing Operating System</div>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111827;">${title}</h1>
            ${intro ? `<p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#374151;">${intro}</p>` : ""}
            <div style="font-size:14px;line-height:1.6;color:#374151;">${bodyHtml}</div>
            ${cta}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #e5e7eb;background:#fafafa;">
            <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.6;">
              ${footerNote || `This message was sent by ${BRAND}. If this wasn't you, you can safely ignore this email.`}
            </p>
            <p style="margin:8px 0 0;font-size:11px;color:#9ca3af;">
              © ${new Date().getFullYear()} ${BRAND}. All rights reserved.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

function kvRow(k: string, v: string): string {
  return `<tr>
    <td style="padding:8px 0;color:#6b7280;font-size:13px;width:40%;">${k}</td>
    <td style="padding:8px 0;color:#111827;font-size:13px;font-weight:600;text-align:right;">${v}</td>
  </tr>`;
}

function kvTable(rows: string[]): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:12px 0;border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;">${rows.join("")}</table>`;
}

// ============================================================================
// AUTH / VERIFICATION
// ============================================================================

export async function sendVerificationEmail(to: string, token: string, userName?: string) {
  const verifyUrl = `${appUrl}/api/auth/verify?token=${token}`;
  const html = shell({
    title: "Verify your email",
    preheader: `Confirm your ${BRAND} email address`,
    intro: `Hi${userName ? ` ${userName}` : ""}, welcome to ${BRAND}! Tap the button below to verify your email address. This is optional — you can use your account without verifying — but verified accounts get priority support and faster account recovery.`,
    bodyHtml: `<p style="margin:0;color:#6b7280;font-size:13px;">This link expires in 1 hour.</p>`,
    ctaLabel: "Verify my email",
    ctaHref: verifyUrl,
  });
  return send(to, `Verify your ${BRAND} email`, html);
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const resetUrl = `${appUrl}/forgot-password?token=${token}`;
  const html = shell({
    title: "Reset your password",
    preheader: `Reset your ${BRAND} password`,
    intro: "You requested a password reset. Tap the button below to set a new password. This link expires in 30 minutes.",
    bodyHtml: `<p style="margin:0;color:#6b7280;font-size:13px;">If you didn't request this, you can safely ignore this email — your password won't change.</p>`,
    ctaLabel: "Reset password",
    ctaHref: resetUrl,
  });
  return send(to, `Reset your ${BRAND} password`, html);
}

export async function sendWelcomeEmail(to: string, userName: string, verifyToken?: string) {
  const verifyUrl = verifyToken ? `${appUrl}/api/auth/verify?token=${verifyToken}` : null;
  const html = shell({
    title: `Welcome to ${BRAND}!`,
    preheader: `Your ${BRAND} account is ready`,
    intro: `Hi ${userName}, your account has been created successfully. You can now sign in and start exchanging social-media tasks for rewards.`,
    bodyHtml: verifyUrl
      ? `<p style="margin:0 0 10px;">Optionally verify your email to unlock priority support and smoother account recovery:</p>`
      : `<p style="margin:0;">Head to your dashboard to get started.</p>`,
    ctaLabel: verifyUrl ? "Verify my email" : "Go to dashboard",
    ctaHref: verifyUrl || `${appUrl}/dashboard`,
  });
  return send(to, `Welcome to ${BRAND}`, html);
}

export async function sendAccountApprovedEmail(to: string, userName: string) {
  const html = shell({
    title: "Your account is approved",
    preheader: `Your ${BRAND} account has been approved`,
    intro: `Great news, ${userName} — an admin has approved your account. You can now sign in and use all ${BRAND} features.`,
    bodyHtml: "",
    ctaLabel: "Sign in",
    ctaHref: `${appUrl}/login`,
  });
  return send(to, `Your ${BRAND} account is approved`, html);
}

// ============================================================================
// PAYMENTS / INVOICES
// ============================================================================

type PaymentSummary = {
  invoiceNumber: string;
  amount: number;
  currency: string;
  description: string;
  method: string;
  transactionId: string;
};

export async function sendPaymentReceivedEmail(to: string, userName: string, p: PaymentSummary) {
  const html = shell({
    title: "Payment received — pending review",
    preheader: `We received your payment ${p.invoiceNumber}`,
    intro: `Hi ${userName}, we've received your payment and it's currently pending review by our team. You'll get another email as soon as it's approved.`,
    bodyHtml: kvTable([
      kvRow("Invoice", p.invoiceNumber),
      kvRow("Amount", `${p.amount.toFixed(2)} ${p.currency.toUpperCase()}`),
      kvRow("For", p.description),
      kvRow("Method", p.method),
      kvRow("Transaction", p.transactionId),
    ]),
    ctaLabel: "View invoice",
    ctaHref: `${appUrl}/billing`,
  });
  return send(to, `Payment received — ${p.invoiceNumber}`, html);
}

export async function sendPaymentApprovedEmail(
  to: string,
  userName: string,
  p: PaymentSummary,
  invoicePdf?: Buffer
) {
  const html = shell({
    title: "Payment approved",
    preheader: `Your payment ${p.invoiceNumber} has been approved`,
    intro: `Hi ${userName}, your payment has been approved and your account has been updated. The full invoice is attached to this email as a PDF for your records.`,
    bodyHtml: kvTable([
      kvRow("Invoice", p.invoiceNumber),
      kvRow("Amount paid", `${p.amount.toFixed(2)} ${p.currency.toUpperCase()}`),
      kvRow("For", p.description),
      kvRow("Status", `<span style="color:#10B981;">PAID</span>`),
    ]),
    ctaLabel: "View invoice online",
    ctaHref: `${appUrl}/billing`,
  });
  const attachments: MailAttachment[] | undefined = invoicePdf
    ? [{ filename: `${p.invoiceNumber}.pdf`, content: invoicePdf, contentType: "application/pdf" }]
    : undefined;
  return send(to, `Payment approved — ${p.invoiceNumber}`, html, attachments);
}

export async function sendPaymentRejectedEmail(
  to: string,
  userName: string,
  p: PaymentSummary,
  reason?: string
) {
  const html = shell({
    title: "Payment rejected",
    preheader: `Your payment ${p.invoiceNumber} couldn't be approved`,
    intro: `Hi ${userName}, we weren't able to approve your recent payment. If you believe this is a mistake, please contact support or submit a new payment.`,
    bodyHtml: `${
      reason
        ? `<div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:12px 14px;margin:8px 0 14px;color:#991B1B;font-size:13px;"><strong>Reason:</strong> ${reason}</div>`
        : ""
    }${kvTable([
      kvRow("Invoice", p.invoiceNumber),
      kvRow("Amount", `${p.amount.toFixed(2)} ${p.currency.toUpperCase()}`),
      kvRow("For", p.description),
      kvRow("Status", `<span style="color:#EF4444;">REJECTED</span>`),
    ])}`,
    ctaLabel: "View invoice",
    ctaHref: `${appUrl}/billing`,
  });
  return send(to, `Payment rejected — ${p.invoiceNumber}`, html);
}

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

export async function sendSubscriptionExpiringEmail(
  to: string,
  userName: string,
  planName: string,
  daysLeft: number
) {
  const title = daysLeft <= 1 ? "Your subscription expires tomorrow" : `Your subscription expires in ${daysLeft} days`;
  const html = shell({
    title,
    preheader: `Renew your ${planName} plan`,
    intro: `Hi ${userName}, your ${planName} plan is about to expire. Renew now to avoid losing access to tasks, groups, and your current credits.`,
    bodyHtml: "",
    ctaLabel: "Renew now",
    ctaHref: `${appUrl}/plans`,
  });
  return send(to, title, html);
}

export async function sendSubscriptionExpiredEmail(to: string, userName: string, planName: string) {
  const html = shell({
    title: "Your subscription has expired",
    preheader: `Your ${planName} plan has expired`,
    intro: `Hi ${userName}, your ${planName} plan has expired. Renew now to restart task creation, group management, and recover full access.`,
    bodyHtml: "",
    ctaLabel: "Renew subscription",
    ctaHref: `${appUrl}/plans`,
  });
  return send(to, `Your ${BRAND} subscription has expired`, html);
}

// ============================================================================
// ADMIN ALERTS
// ============================================================================

export async function sendAdminNewSignupAlert(to: string[], signupUser: { name: string; email: string }) {
  if (to.length === 0) return false;
  const html = shell({
    title: "New signup — review needed",
    intro: `A new user has signed up and is awaiting your review.`,
    bodyHtml: kvTable([kvRow("Name", signupUser.name), kvRow("Email", signupUser.email)]),
    ctaLabel: "Review user",
    ctaHref: `${appUrl}/users`,
    footerNote: `Admin alert from ${BRAND}.`,
  });
  return send(to, `[${BRAND}] New signup: ${signupUser.name}`, html);
}

export async function sendAdminNewPaymentAlert(
  to: string[],
  p: { invoiceNumber: string; userName: string; amount: number; currency: string; description: string }
) {
  if (to.length === 0) return false;
  const html = shell({
    title: "New payment — review needed",
    intro: `A new payment is awaiting your review.`,
    bodyHtml: kvTable([
      kvRow("Invoice", p.invoiceNumber),
      kvRow("User", p.userName),
      kvRow("Amount", `${p.amount.toFixed(2)} ${p.currency.toUpperCase()}`),
      kvRow("For", p.description),
    ]),
    ctaLabel: "Review payment",
    ctaHref: `${appUrl}/payments`,
    footerNote: `Admin alert from ${BRAND}.`,
  });
  return send(to, `[${BRAND}] Payment pending: ${p.invoiceNumber}`, html);
}

// ============================================================================
// ACCOUNT STATUS CHANGES
// ============================================================================
// User-facing alerts for status flips driven by admins. The user usually
// CAN'T log in to see the in-app notification (suspended/banned both block
// dashboard access), so an out-of-band signal matters here more than for
// most other admin actions.

function reasonBlock(reason?: string): string {
  if (!reason) return "";
  return `<div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:12px 14px;margin:8px 0 14px;color:#991B1B;font-size:13px;"><strong>Reason:</strong> ${reason}</div>`;
}

export async function sendAccountSuspendedEmail(to: string, userName: string, reason?: string) {
  const html = shell({
    title: "Your account has been suspended",
    preheader: `Your ${BRAND} account is temporarily suspended`,
    intro: `Hi ${userName}, an admin has suspended your ${BRAND} account. While suspended you cannot create tasks, submit proofs, or use most features.`,
    bodyHtml: `${reasonBlock(reason)}<p style="margin:0;">If you believe this is a mistake, you can submit a suspension appeal from the suspended page after signing in.</p>`,
    ctaLabel: "Sign in to appeal",
    ctaHref: `${appUrl}/login`,
  });
  return send(to, `Your ${BRAND} account has been suspended`, html);
}

export async function sendAccountReactivatedEmail(to: string, userName: string) {
  const html = shell({
    title: "Welcome back — your account is active",
    preheader: `Your ${BRAND} account has been reactivated`,
    intro: `Hi ${userName}, your ${BRAND} account has been reactivated. You can now sign in and resume using all features.`,
    bodyHtml: "",
    ctaLabel: "Sign in",
    ctaHref: `${appUrl}/login`,
  });
  return send(to, `Your ${BRAND} account has been reactivated`, html);
}

export async function sendAccountBannedEmail(to: string, userName: string, reason?: string) {
  const html = shell({
    title: "Your account has been banned",
    preheader: `Your ${BRAND} account has been permanently banned`,
    intro: `Hi ${userName}, your ${BRAND} account has been permanently banned by an admin. This action removes your access to the platform and anonymises your stored profile information.`,
    bodyHtml: `${reasonBlock(reason)}<p style="margin:0;">If you believe this decision was made in error, please reply to this email with details and an admin will review it.</p>`,
    footerNote: `This message was sent by ${BRAND}.`,
  });
  return send(to, `Your ${BRAND} account has been banned`, html);
}

export async function sendSignupRejectedEmail(to: string, userName: string, reason?: string) {
  const html = shell({
    title: "Your signup was not approved",
    preheader: `Your ${BRAND} signup application was reviewed`,
    intro: `Hi ${userName}, after reviewing your application, our team wasn't able to approve your ${BRAND} account at this time.`,
    bodyHtml: `${reasonBlock(reason)}<p style="margin:0;">You're welcome to apply again later, or reply to this email if you have questions.</p>`,
    footerNote: `This message was sent by ${BRAND}.`,
  });
  return send(to, `Your ${BRAND} signup was not approved`, html);
}

// ============================================================================
// APPEAL REVIEW
// ============================================================================
// Suspended users have already lost dashboard access, so the email is the
// most reliable channel to deliver the review outcome.

function notesBlock(notes?: string): string {
  if (!notes) return "";
  return `<div style="background:#F3F4F6;border-left:3px solid #9CA3AF;border-radius:6px;padding:12px 14px;margin:8px 0 14px;color:#374151;font-size:13px;"><strong>Reviewer notes:</strong><br/>${notes}</div>`;
}

export async function sendAppealApprovedEmail(to: string, userName: string, notes?: string) {
  const html = shell({
    title: "Your appeal was approved",
    preheader: `Your ${BRAND} suspension appeal has been approved`,
    intro: `Hi ${userName}, an admin has approved your suspension appeal. Your account is now reactivated and you can sign in normally.`,
    bodyHtml: notesBlock(notes),
    ctaLabel: "Sign in",
    ctaHref: `${appUrl}/login`,
  });
  return send(to, `Your ${BRAND} appeal was approved`, html);
}

export async function sendAppealRejectedEmail(to: string, userName: string, notes?: string) {
  const html = shell({
    title: "Your appeal was not approved",
    preheader: `Your ${BRAND} suspension appeal has been rejected`,
    intro: `Hi ${userName}, an admin has reviewed your suspension appeal and decided not to reactivate your account at this time.`,
    bodyHtml: `${notesBlock(notes)}<p style="margin:0;">If your situation changes, you may submit another appeal later.</p>`,
    footerNote: `This message was sent by ${BRAND}.`,
  });
  return send(to, `Your ${BRAND} appeal was not approved`, html);
}

// ============================================================================
// GROUPS
// ============================================================================
// Group leaders care about publication status and the email is more
// reliable than an in-app badge they may not check for days.

export async function sendGroupApprovedEmail(to: string, userName: string, groupName: string) {
  const html = shell({
    title: "Your group is approved",
    preheader: `Your group "${groupName}" is live`,
    intro: `Hi ${userName}, your group <strong>${groupName}</strong> has been approved and is now visible to other members on ${BRAND}.`,
    bodyHtml: "",
    ctaLabel: "View group",
    ctaHref: `${appUrl}/groups`,
  });
  return send(to, `Your group "${groupName}" is approved`, html);
}

export async function sendGroupRejectedEmail(
  to: string,
  userName: string,
  groupName: string,
  reason?: string,
) {
  const html = shell({
    title: "Your group was not approved",
    preheader: `Your group "${groupName}" was reviewed`,
    intro: `Hi ${userName}, after reviewing your group <strong>${groupName}</strong>, our team wasn't able to approve it at this time.`,
    bodyHtml: `${reasonBlock(reason)}<p style="margin:0;">You can edit the group and resubmit, or contact us if you have questions.</p>`,
    ctaLabel: "Open groups",
    ctaHref: `${appUrl}/groups`,
  });
  return send(to, `Your group "${groupName}" was not approved`, html);
}

// ============================================================================
// SUPPORT TICKETS
// ============================================================================
// Sent only when an admin replies to a user's ticket. The reverse direction
// (user → admin) goes through the admin in-app notification path because
// admins are typically active on the platform.

export async function sendTicketReplyEmail(
  to: string,
  userName: string,
  ticketSubject: string,
  ticketId: number,
  replyExcerpt: string,
) {
  // Trim the reply to a reasonable preview so the email body doesn't balloon
  // and so users still have a reason to click through to the ticket page.
  const MAX = 400;
  const excerpt =
    replyExcerpt.length > MAX
      ? `${replyExcerpt.slice(0, MAX).replace(/\s+\S*$/, "")}…`
      : replyExcerpt;

  const html = shell({
    title: `New reply on your ticket`,
    preheader: `Re: ${ticketSubject}`,
    intro: `Hi ${userName}, an admin has replied to your support ticket <strong>${ticketSubject}</strong>.`,
    bodyHtml: `<div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;padding:14px 16px;margin:8px 0 14px;color:#1F2937;font-size:14px;line-height:1.6;white-space:pre-wrap;">${excerpt}</div>`,
    ctaLabel: "Open ticket",
    ctaHref: `${appUrl}/support/${ticketId}`,
  });
  return send(to, `Re: ${ticketSubject}`, html);
}

// ============================================================================
// SECURITY
// ============================================================================
// Sent immediately after a user changes their own password. This is a
// security-best-practice "did you do this?" confirmation — the email is
// the primary way a hijacked-account owner notices the breach.

export async function sendPasswordChangedEmail(
  to: string,
  userName: string,
  changedAt: string,
  ipAddress?: string,
) {
  const ipRow = ipAddress && ipAddress !== "unknown" ? kvRow("From IP", ipAddress) : "";
  const html = shell({
    title: "Your password was changed",
    preheader: `Your ${BRAND} password was just updated`,
    intro: `Hi ${userName}, this is a security confirmation that your ${BRAND} password was just changed.`,
    bodyHtml: `${kvTable([kvRow("When", new Date(changedAt).toUTCString()), ipRow].filter(Boolean))}<p style="margin:0;color:#991B1B;font-size:13px;"><strong>If this wasn't you</strong>, reset your password immediately and contact support.</p>`,
    ctaLabel: "Reset password",
    ctaHref: `${appUrl}/forgot-password`,
    footerNote: `This security alert was sent by ${BRAND}. If you changed your password yourself, no further action is needed.`,
  });
  return send(to, `Your ${BRAND} password was changed`, html);
}

// ============================================================================
// ADMIN CONTACT MESSAGE
// ============================================================================
// Notifies admins out-of-band when a marketing-page contact form is filled
// in. The in-app notification still fires alongside this email.

export async function sendAdminContactMessageAlert(
  to: string[],
  msg: { name: string; email: string; subject?: string | null; messageExcerpt: string },
) {
  if (to.length === 0) return false;
  const MAX = 400;
  const excerpt =
    msg.messageExcerpt.length > MAX
      ? `${msg.messageExcerpt.slice(0, MAX).replace(/\s+\S*$/, "")}…`
      : msg.messageExcerpt;

  const html = shell({
    title: "New contact-form message",
    intro: `A visitor submitted the marketing-site contact form.`,
    bodyHtml: `${kvTable([
      kvRow("Name", msg.name),
      kvRow("Email", msg.email),
      ...(msg.subject ? [kvRow("Subject", msg.subject)] : []),
    ])}<div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;padding:14px 16px;margin:8px 0 14px;color:#1F2937;font-size:14px;line-height:1.6;white-space:pre-wrap;">${excerpt}</div>`,
    ctaLabel: "Open inbox",
    ctaHref: `${appUrl}/contact-messages`,
    footerNote: `Admin alert from ${BRAND}.`,
  });
  return send(to, `[${BRAND}] Contact: ${msg.name}${msg.subject ? ` — ${msg.subject}` : ""}`, html);
}
