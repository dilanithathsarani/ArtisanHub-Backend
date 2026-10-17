import nodemailer from "nodemailer";

const sendEmail = async ({ to, subject, html, text }) => {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (!emailUser || !emailPass) {
    console.warn(
      "\n⚠️ EMAIL_USER or EMAIL_PASS not configured in .env. Email cannot be dispatched over SMTP.\n"
    );
    // Return false so caller knows SMTP was skipped
    return false;
  }

  const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || "gmail",
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: Number(process.env.EMAIL_PORT) === 465,
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_FROM || `"ArtisanHub" <${emailUser}>`,
    to,
    subject,
    text,
    html,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log("Email sent successfully: %s", info.messageId);
  return true;
};

export default sendEmail;
