import nodemailer from "nodemailer";

const sendEmail = async ({ to, subject, html, text }) => {
  const emailUser = (process.env.EMAIL_USER || "").trim().replace(/["']/g, "");
  const emailPass = (process.env.EMAIL_PASS || "").replace(/\s+/g, "").replace(/["']/g, "");

  if (!emailUser || !emailPass) {
    console.warn(
      "\n⚠️ EMAIL_USER or EMAIL_PASS not configured in .env. Email cannot be dispatched over SMTP.\n"
    );
    return false;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });

  const mailOptions = {
    from: `"ArtisanHub" <${emailUser}>`,
    to,
    subject,
    text,
    html,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log("Email sent successfully! Message ID: %s", info.messageId);
  return true;
};

export default sendEmail;
