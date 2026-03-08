const emailPattern = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const namePattern = /^[A-Za-z][A-Za-z '\-]{1,59}$/;
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export function emailError(email: string): string | null {
  const value = email.trim();
  if (!value) {
    return 'Email is required.';
  }
  if (!emailPattern.test(value)) {
    return 'Enter a valid email address.';
  }
  return null;
}

export function nameError(name: string): string | null {
  const value = name.trim();
  if (!value) {
    return 'Name is required.';
  }
  if (!namePattern.test(value)) {
    return 'Use 2-60 letters and basic punctuation only.';
  }
  return null;
}

export function passwordError(password: string): string | null {
  if (!password) {
    return 'Password is required.';
  }
  if (!passwordPattern.test(password)) {
    return 'Use 8+ chars with upper, lower, and number.';
  }
  return null;
}

export function dateRangeError(startDate: Date, endDate: Date): string | null {
  if (endDate.getTime() < startDate.getTime()) {
    return 'End date must be after start date.';
  }
  return null;
}
