export default function normalizeCognitoError(error) {
  if (!error) return 'An unknown error occurred';
  const map = {
    UserNotFoundException: 'User does not exist.',
    NotAuthorizedException: 'Incorrect username or password.',
    PasswordResetRequiredException: 'Password reset required.',
    NetworkError: 'Network error. Please try again.',
  };
  return map[error.name] || error.message || error.name || 'An unknown error occurred';
}