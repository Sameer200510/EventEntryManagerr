export const categorizeEmailError = (errorString) => {
  if (!errorString) return { type: "Unknown", message: "No error message provided.", category: "Unknown" };

  const lowerErr = errorString.toLowerCase();

  // Platform / Server Side Issues
  if (
    lowerErr.includes("rate limit") ||
    lowerErr.includes("too many requests") ||
    lowerErr.includes("quota")
  ) {
    return { type: "Rate Limit Exceeded", message: errorString, category: "Platform/Server Side" };
  }

  if (
    lowerErr.includes("smtp") ||
    lowerErr.includes("credentials") ||
    lowerErr.includes("authentication") ||
    lowerErr.includes("unauthorized") ||
    lowerErr.includes("login") ||
    lowerErr.includes("invalid api key")
  ) {
    return { type: "Authentication / Credentials", message: errorString, category: "Platform/Server Side" };
  }

  if (
    lowerErr.includes("etimedout") ||
    lowerErr.includes("econnrefused") ||
    lowerErr.includes("socket") ||
    lowerErr.includes("network")
  ) {
    return { type: "Network / Connection Timeout", message: errorString, category: "Platform/Server Side" };
  }

  // Recipient Side Issues
  if (
    lowerErr.includes("invalid address") ||
    lowerErr.includes("mailbox unavailable") ||
    lowerErr.includes("does not exist") ||
    lowerErr.includes("recipient rejected") ||
    lowerErr.includes("user unknown")
  ) {
    return { type: "Invalid Email Address", message: errorString, category: "Recipient Side" };
  }

  if (
    lowerErr.includes("bounced") ||
    lowerErr.includes("rejected") ||
    lowerErr.includes("blocked") ||
    lowerErr.includes("spam")
  ) {
    return { type: "Bounced / Rejected by Recipient", message: errorString, category: "Recipient Side" };
  }

  if (
    lowerErr.includes("domain not found") ||
    lowerErr.includes("dns") ||
    lowerErr.includes("mx record")
  ) {
    return { type: "Domain Issue", message: errorString, category: "Recipient Side" };
  }

  // Fallback
  return { type: "Other Error", message: errorString, category: "Uncategorized" };
};
