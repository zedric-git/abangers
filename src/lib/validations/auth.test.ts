import { describe, expect, it } from "vitest";
import { loginSchema, signUpSchema } from "./auth";

// Example unit tests for a Zod schema. Copy this pattern when adding a
// schema to src/lib/validations/: one valid case, then one case per rule.

const validSignUp = {
  fullName: "Maria Santos",
  email: "maria@example.com",
  password: "password123",
  confirmPassword: "password123",
  role: "landlord",
};

describe("signUpSchema", () => {
  it("accepts a valid sign-up", () => {
    expect(signUpSchema.safeParse(validSignUp).success).toBe(true);
  });

  it("rejects mismatched passwords on the confirmPassword field", () => {
    const result = signUpSchema.safeParse({
      ...validSignUp,
      confirmPassword: "different123",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(["confirmPassword"]);
  });

  it("rejects passwords shorter than 8 characters", () => {
    const result = signUpSchema.safeParse({
      ...validSignUp,
      password: "short",
      confirmPassword: "short",
    });
    expect(result.success).toBe(false);
  });

  it("only allows the roles in the profiles.role CHECK constraint", () => {
    const result = signUpSchema.safeParse({ ...validSignUp, role: "admin" });
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("rejects an empty password", () => {
    const result = loginSchema.safeParse({
      email: "maria@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });
});
