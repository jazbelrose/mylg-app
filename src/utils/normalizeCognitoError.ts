interface CognitoError {
  name: string;
  message?: string;
}

export default function normalizeCognitoError(error: Partial<CognitoError> | null | undefined): string {
  if (!error) return 'An unknown error occurred';
  const map: Record<string, string> = {
    UserNotFoundException: 'User does not exist.',
    NotAuthorizedException: 'Incorrect username or password.',
    PasswordResetRequiredException: 'Password reset required.',
    NetworkError: 'Network error. Please try again.',
  };
  return map[error.name ?? ''] || error.message || error.name || 'An unknown error occurred';
}