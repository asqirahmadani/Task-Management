import validator from "validator";
import xss from "xss";

// ==========================================
// INPUT VALIDATION FUNCTIONS
// ==========================================

/**
 * Validate email format
 */
export const validateEmail = (email) => {
  if (!email || typeof email !== "string") {
    throw new Error("Email is required");
  }

  if (!validator.isEmail(email)) {
    throw new Error("Invalid email format");
  }

  // Additional checks
  if (email.length > 255) {
    throw new Error("Email is too long (max 255 characters)");
  }

  return email.toLowerCase().trim();
};

/**
 * Validate password strength
 */
export const validatePassword = (password) => {
  if (!password || typeof password !== "string") {
    throw new Error("Password is required");
  }

  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters long");
  }

  if (password.length > 128) {
    throw new Error("Password is too long (max 128 characters)");
  }

  // Check password strength
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const strengthScore = [
    hasUpperCase,
    hasLowerCase,
    hasNumbers,
    hasSpecialChar,
  ].filter(Boolean).length;

  if (strengthScore < 3) {
    throw new Error(
      "Password must contain at least 3 of: uppercase, lowercase, numbers, special characters"
    );
  }

  return password;
};

/**
 * Validate and sanitize text input
 */
export const validateText = (
  text,
  fieldName = "Text",
  minLength = 1,
  maxLength = 1000
) => {
  if (!text || typeof text !== "string") {
    throw new Error(`${fieldName} is required`);
  }

  // Trim whitespace
  text = text.trim();

  // Check length
  if (text.length < minLength) {
    throw new Error(`${fieldName} must be at least ${minLength} characters`);
  }

  if (text.length > maxLength) {
    throw new Error(`${fieldName} is too long (max ${maxLength} characters)`);
  }

  // Sanitize XSS
  text = xss(text, {
    whiteList: {}, // No HTML tags allowed
    stripIgnoreTag: true,
    stripIgnoreTagBody: ["script"],
  });

  return text;
};

/**
 * Validate UUID format
 */
export const validateUUID = (id, fieldName = "ID") => {
  if (!id || typeof id !== "string") {
    throw new Error(`${fieldName} is required`);
  }

  if (!validator.isUUID(id)) {
    throw new Error(`Invalid ${fieldName} format`);
  }

  return id;
};

/**
 * Validate enum value
 */
export const validateEnum = (value, allowedValues, fieldName = "Value") => {
  if (!value) {
    throw new Error(`${fieldName} is required`);
  }

  if (!allowedValues.includes(value)) {
    throw new Error(
      `Invalid ${fieldName}. Allowed values: ${allowedValues.join(", ")}`
    );
  }

  return value;
};

/**
 * Validate pagination input
 */
export const validatePagination = (pagination) => {
  if (!pagination) {
    return { page: 1, limit: 20 };
  }

  const page = parseInt(pagination.page) || 1;
  const limit = parseInt(pagination.limit) || 20;

  if (page < 1) {
    throw new Error("Page must be >= 1");
  }

  if (limit < 1 || limit > 100) {
    throw new Error("Limit must be between 1 and 100");
  }

  return { page, limit };
};

/**
 * Sanitize HTML content (for rich text)
 */
export const sanitizeHTML = (html) => {
  if (!html) return "";

  // Allow safe HTML tags
  return xss(html, {
    whiteList: {
      p: [],
      br: [],
      strong: [],
      em: [],
      u: [],
      a: ["href", "title", "target"],
      ul: [],
      ol: [],
      li: [],
      h1: [],
      h2: [],
      h3: [],
      h4: [],
      h5: [],
      h6: [],
      blockquote: [],
      code: [],
      pre: [],
    },
    stripIgnoreTag: true,
    stripIgnoreTagBody: ["script", "style"],
  });
};

/**
 * Validate task input
 */
export const validateTaskInput = (input) => {
  const validated = {};

  if (input.title !== undefined) {
    validated.title = validateText(input.title, "Title", 3, 200);
  }

  if (input.description !== undefined) {
    // Allow null for description
    validated.description = input.description
      ? validateText(input.description, "Description", 0, 5000)
      : null;
  }

  if (input.status !== undefined) {
    validated.status = validateEnum(
      input.status,
      ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
      "Status"
    );
  }

  if (input.priority !== undefined) {
    validated.priority = validateEnum(
      input.priority,
      ["LOW", "MEDIUM", "HIGH", "URGENT"],
      "Priority"
    );
  }

  if (input.assigned_to !== undefined) {
    validated.assigned_to = validateUUID(input.assigned_to, "Assigned To");
  }

  return validated;
};

/**
 * Validate comment input
 */
export const validateCommentInput = (input) => {
  const validated = {};

  if (input.task_id !== undefined) {
    validated.task_id = validateUUID(input.task_id, "Task ID");
  }

  if (input.text !== undefined) {
    validated.text = validateText(input.text, "Comment", 1, 2000);
  }

  return validated;
};

/**
 * Validate user input
 */
export const validateUserInput = (input) => {
  const validated = {};

  if (input.name !== undefined) {
    validated.name = validateText(input.name, "Name", 2, 100);
  }

  if (input.email !== undefined) {
    validated.email = validateEmail(input.email);
  }

  if (input.password !== undefined) {
    validated.password = validatePassword(input.password);
  }

  return validated;
};

export const extractOperationName = (query, providedName) => {
  if (!query) return providedName || "Anonymous";

  try {
    const cleanQuery = query
      .replace(/#[^\n]*/g, "")
      .replace(/\s+/g, " ")
      .trim();

    const fieldMatch = cleanQuery.match(
      /(?:query|mutation|subscription)?\s*(?:\w+)?\s*\{\s*(\w+)/i
    );

    if (fieldMatch && fieldMatch[1]) {
      const fieldName = fieldMatch[1];
      if (
        !["query", "mutation", "subscription", "__schema", "__type"].includes(
          fieldName.toLowerCase()
        )
      ) {
        return fieldName;
      }
    }

    const opMatch = cleanQuery.match(
      /(?:query|mutation|subscription)\s+(\w+)/i
    );

    if (opMatch && opMatch[1]) {
      return opMatch[1];
    }
  } catch (error) {
    console.warn("Failed to extract operation name:", error.message);
  }

  return providedName || "Anonymous";
};
