import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { env } from "./env";

let transporter: Transporter | undefined;

function getTransporter() {
  const e = env();
  transporter ??= nodemailer.createTransport({
    host: e.SMTP_HOST,
    port: e.SMTP_PORT,
    secure: e.SMTP_PORT === 465,
    auth: { user: e.SMTP_EMAIL, pass: e.SMTP_PASSWORD },
  });
  return transporter;
}

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(title: string, body: string, cta?: { label: string; url: string }) {
  const button = cta
    ? `<p style="margin:32px 0"><a href="${cta.url}" style="background:#1E1916;color:#F9F7F2;padding:14px 28px;text-decoration:none;font-size:14px;letter-spacing:1px;text-transform:uppercase;border-radius:3px">${escape(cta.label)}</a></p>
       <p style="font-size:12px;color:#4A3525">Or open this link: <br><a href="${cta.url}" style="color:#4A3525;word-break:break-all">${cta.url}</a></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#F3EFE7;font-family:Helvetica,Arial,sans-serif;color:#1E1916">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
  <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#F9F7F2;border:1px solid #e4dccf">
    <tr><td style="background:#1E1916;padding:24px;text-align:center;font-family:Georgia,serif;font-size:24px;letter-spacing:10px;color:#F9F7F2">QAHAF</td></tr>
    <tr><td style="padding:32px">
      <h1 style="font-family:Georgia,serif;font-weight:normal;font-size:24px;margin:0 0 16px">${escape(title)}</h1>
      ${body}${button}
    </td></tr>
    <tr><td style="background:#C4A482;padding:16px;text-align:center;font-size:12px;color:#1E1916">QAHAF · Wear Your Style</td></tr>
  </table></td></tr></table></body></html>`;
}

const p = (text: string) => `<p style="font-size:15px;line-height:1.6;color:#4A3525;margin:0 0 12px">${escape(text)}</p>`;

export async function sendMail(to: string, subject: string, html: string) {
  await getTransporter().sendMail({ from: `"QAHAF" <${env().SMTP_EMAIL}>`, to, subject, html });
}

export const emails = {
  verify: (name: string, url: string) => ({
    subject: "Verify your QAHAF account",
    html: layout(`Welcome, ${name}`, p("Please confirm your email address to activate your account."), {
      label: "Verify email",
      url,
    }),
  }),
  resetPassword: (name: string, url: string) => ({
    subject: "Reset your QAHAF password",
    html: layout(
      "Reset your password",
      p(`Hi ${name}, we received a request to reset your password. This link expires in 1 hour.`) +
        p("If you didn't ask for this, you can ignore this email."),
      { label: "Reset password", url },
    ),
  }),
  changeEmail: (name: string, newEmail: string, url: string) => ({
    subject: "Confirm your new email",
    html: layout("Confirm email change", p(`Hi ${name}, confirm that you want to use ${newEmail} for your account.`), {
      label: "Confirm change",
      url,
    }),
  }),
  orderPlaced: (name: string, orderNumber: string, total: string, url: string) => ({
    subject: `Order ${orderNumber} received`,
    html: layout(
      "Thank you for your order",
      p(`Hi ${name}, we've received order ${orderNumber} (${total}, cash on delivery).`) +
        p("Our team will verify it shortly and let you know once it's confirmed."),
      { label: "View order", url },
    ),
  }),
  orderStatus: (name: string, orderNumber: string, status: string, url: string, reason?: string | null) => ({
    subject: `Order ${orderNumber} is ${status}`,
    html: layout(
      `Your order is ${status}`,
      p(`Hi ${name}, order ${orderNumber} is now ${status}.`) + (reason ? p(`Note: ${reason}`) : ""),
      { label: "View order", url },
    ),
  }),
  adminNewOrder: (orderNumber: string, total: string, url: string) => ({
    subject: `New order ${orderNumber} awaiting verification`,
    html: layout("New order", p(`Order ${orderNumber} (${total}) needs verification.`), { label: "Review order", url }),
  }),
  adminLowStock: (lines: string[], url: string) => ({
    subject: "Low stock alert",
    html: layout("Low stock alert", lines.map(p).join(""), { label: "Open inventory", url }),
  }),
};

// Notifications shouldn't break the action that triggered them.
export async function sendMailSafe(to: string, mail: { subject: string; html: string }) {
  try {
    await sendMail(to, mail.subject, mail.html);
  } catch (err) {
    console.error("Email failed:", mail.subject, err);
  }
}
