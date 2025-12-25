/**
 * Centralized error handling utilities
 */

export interface ErrorResult {
  success: false;
  error: string;
  details?: any;
}

export interface SuccessResult<T> {
  success: true;
  data: T;
}

export type Result<T> = SuccessResult<T> | ErrorResult;

/**
 * Handle Supabase errors and return user-friendly messages
 */
export function handleSupabaseError(error: any): string {
  if (!error) return "An unknown error occurred.";

  // Supabase error structure
  if (error.message) {
    // Check for common error patterns
    if (error.message.includes("violates foreign key constraint")) {
      return "Cannot perform this action: Related data is missing.";
    }
    if (error.message.includes("violates unique constraint")) {
      return "This record already exists.";
    }
    if (error.message.includes("violates check constraint")) {
      return "Invalid data provided.";
    }
    if (error.message.includes("permission denied") || error.message.includes("RLS")) {
      return "You don't have permission to perform this action.";
    }
    if (error.message.includes("JWT")) {
      return "Authentication error. Please log in again.";
    }
    if (error.message.includes("network") || error.message.includes("fetch")) {
      return "Network error. Please check your connection.";
    }
    return error.message;
  }

  // Generic error
  if (typeof error === "string") {
    return error;
  }

  return "An unexpected error occurred. Please try again.";
}

/**
 * Wrap async operations with error handling
 */
export async function handleAsync<T>(
  operation: () => Promise<T>,
  errorMessage?: string
): Promise<Result<T>> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error: any) {
    console.error("Operation failed:", error);
    return {
      success: false,
      error: errorMessage || handleSupabaseError(error),
      details: error,
    };
  }
}

/**
 * Show user-friendly error alert
 */
export function showError(error: string | ErrorResult, title = "Error") {
  const message = typeof error === "string" ? error : error.error;
  alert(`${title}\n\n${message}`);
}

/**
 * Show success message
 */
export function showSuccess(message: string, title = "Success") {
  alert(`${title}\n\n${message}`);
}

