import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 465,
  secure: (Number(process.env.SMTP_PORT) || 465) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@taskflow.com";

async function send(to: string, subject: string, html: string) {
  try {
    const info = await transporter.sendMail({
      from: fromEmail,
      to,
      subject,
      html,
    });
    console.log(`[Email] Sent "${subject}" to ${to}: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error(`[Email] Failed to send "${subject}" to ${to}:`, (err as Error).message);
    throw err;
  }
}

export async function sendVerificationEmail(to: string, token: string) {
  const verifyUrl = `${process.env.AUTH_URL}/api/auth/verify?token=${token}`;
  await send(to, "Verify your TaskFlow account", `
    <h2>Welcome to TaskFlow!</h2>
    <p>Click the link below to verify your email address:</p>
    <a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#7C3AED;color:#fff;text-decoration:none;border-radius:8px;">Verify Email</a>
    <p>This link expires in 1 hour.</p>
    <p>If you didn't create an account, you can safely ignore this email.</p>
  `);
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const resetUrl = `${process.env.AUTH_URL}/forgot-password?token=${token}`;
  await send(to, "Reset your TaskFlow password", `
    <h2>Password Reset</h2>
    <p>Click the link below to reset your password:</p>
    <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#7C3AED;color:#fff;text-decoration:none;border-radius:8px;">Reset Password</a>
    <p>This link expires in 1 hour.</p>
    <p>If you didn't request this, you can safely ignore this email.</p>
  `);
}

export async function sendTaskNotificationEmail(
  to: string,
  taskTitle: string,
  status: "assigned" | "approved" | "rejected",
  reason?: string
) {
  const subjects = {
    assigned: `New task assigned: ${taskTitle}`,
    approved: `Task approved: ${taskTitle}`,
    rejected: `Task needs revision: ${taskTitle}`,
  };

  const messages = {
    assigned: `You have been assigned a new task: <strong>${taskTitle}</strong>. Log in to TaskFlow to view and complete it.`,
    approved: `Your submission for <strong>${taskTitle}</strong> has been approved! Points have been awarded.`,
    rejected: `Your submission for <strong>${taskTitle}</strong> needs revision.${reason ? ` Reason: ${reason}` : ""} Please resubmit.`,
  };

  await send(to, subjects[status], `
    <h2>${subjects[status]}</h2>
    <p>${messages[status]}</p>
    <a href="${process.env.AUTH_URL}/dashboard/tasks" style="display:inline-block;padding:12px 24px;background:#7C3AED;color:#fff;text-decoration:none;border-radius:8px;">View Tasks</a>
  `);
}

export async function sendGroupInviteEmail(
  to: string,
  groupName: string,
  inviterName: string
) {
  await send(to, `You've been invited to join ${groupName} on TaskFlow`, `
    <h2>Group Invitation</h2>
    <p><strong>${inviterName}</strong> has invited you to join <strong>${groupName}</strong> on TaskFlow.</p>
    <a href="${process.env.AUTH_URL}/dashboard/groups" style="display:inline-block;padding:12px 24px;background:#7C3AED;color:#fff;text-decoration:none;border-radius:8px;">View Groups</a>
  `);
}
