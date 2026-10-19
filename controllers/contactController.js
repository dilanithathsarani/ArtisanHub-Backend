
import ContactMessage from "../models/ContactMessage.js";

export const createContactMessage = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (
      !name?.trim() ||
      !email?.trim() ||
      !subject?.trim() ||
      !message?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      });
    }

    if (
      name.trim().length > 100 ||
      normalizedEmail.length > 254 ||
      subject.trim().length > 150 ||
      message.trim().length > 3000
    ) {
      return res.status(400).json({
        success: false,
        message: "One or more fields exceed the allowed length.",
      });
    }

    const contactMessage = await ContactMessage.create({
      name: name.trim(),
      email: normalizedEmail,
      subject: subject.trim(),
      message: message.trim(),
    });

    return res.status(201).json({
      success: true,
      message: "Your message has been submitted successfully.",
      data: {
        id: contactMessage._id,
        status: contactMessage.status,
      },
    });
  } catch (error) {
    console.error("Create contact message error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to submit your message. Please try again later.",
    });
  }
};
