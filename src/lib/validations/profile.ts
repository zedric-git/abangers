import { z } from "zod";

export const profileSetupSchema = z
  .object({
    full_name: z.string().min(1, "Full name is required"),
    email: z.string().email("Valid email is required"),
    contact_number: z
      .string()
      .regex(
        /^\d{11}$/,
        "Contact number must be exactly 11 digits (e.g. 09171234567)",
      ),
    facebook_url: z.string().optional(),
    instagram_url: z.string().optional(),
    x_url: z.string().optional(),
  })
  .refine(
    (data) =>
      Boolean(data.facebook_url?.trim()) ||
      Boolean(data.instagram_url?.trim()) ||
      Boolean(data.x_url?.trim()),
    {
      message:
        "Please provide at least one social media link (Facebook, Instagram, or X)",
      path: ["facebook_url"],
    },
  );

export type ProfileSetupInput = z.infer<typeof profileSetupSchema>;
