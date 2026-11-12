import { registerUser } from "./registerUser";
import { userRepository } from "../users/userRepository";
import { RegistrationError } from "./errors";

const validInput = {
  email: "new.user@example.com",
  username: "new_user",
  password: "s3cret-pass",
};

beforeEach(() => {
  userRepository.reset();
});

describe("registerUser", () => {
  it("registers a user with valid data", () => {
    const user = registerUser(validInput);

    expect(user).toMatchObject({ email: "new.user@example.com" });
    expect(userRepository.findByEmail("new.user@example.com")).toBeDefined();
  });

  it("rejects an invalid email", () => {
    expect(() => registerUser({ ...validInput, email: "not-an-email" })).toThrow(
      "Please check the highlighted fields",
    );
  });

  it("rejects a password shorter than 8 characters", () => {
    expect(() => registerUser({ ...validInput, password: "short" })).toThrow(
      "Please check the highlighted fields",
    );
  });

  it("rejects an email that is already registered", () => {
    expect(() => registerUser({ ...validInput, email: "John@Example.com" })).toThrow(
      "Email already registered",
    );
  });

  describe("username", () => {
    function captureError(username: string): RegistrationError {
      try {
        registerUser({ ...validInput, username });
      } catch (e) {
        return e as RegistrationError;
      }
      throw new Error("expected registerUser to throw");
    }

    it.each(["abc", "a".repeat(20), "New_User_42"])("accepts %p", (username) => {
      expect(registerUser({ ...validInput, username }).username).toBe(username);
    });

    it.each(["ab", "a".repeat(21), ""])("rejects length of %p", (username) => {
      const error = captureError(username);
      expect(error.code).toBe("INVALID_INPUT");
      expect(error.message).toBe("Please check the highlighted fields");
      expect(error.fields.username).toContain("must be between 3 and 20 characters");
    });

    it.each(["new-user", "new user", "юзер_1", "user!"])("rejects characters in %p", (username) => {
      const error = captureError(username);
      expect(error.code).toBe("INVALID_INPUT");
      expect(error.fields.username).toContain("may contain only Latin letters, digits and _");
    });

    it.each(["John_Doe", "john_doe", "JOHN_DOE", "  john_doe  "])(
      "rejects taken username %p regardless of case",
      (username) => {
        const error = captureError(username);
        expect(error.code).toBe("USERNAME_TAKEN");
        expect(error.message).toBe("Username already taken");
      },
    );

    it("keeps the original case and trims surrounding spaces", () => {
      const user = registerUser({ ...validInput, username: "  New_User  " });
      expect(user.username).toBe("New_User");
      expect(userRepository.findByUsername("new_user")).toBeDefined();
    });
  });
});
