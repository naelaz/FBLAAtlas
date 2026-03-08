class ValidationService {
  static final RegExp _emailPattern = RegExp(
    r'^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$',
  );
  static final RegExp _namePattern = RegExp(r"^[A-Za-z][A-Za-z '\-]{1,59}$");
  static final RegExp _passwordPattern = RegExp(
    r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$',
  );

  bool isValidEmail(String email) => _emailPattern.hasMatch(email.trim());

  bool isValidName(String name) => _namePattern.hasMatch(name.trim());

  bool isValidPassword(String password) => _passwordPattern.hasMatch(password);

  bool isValidEventRange(DateTime startDate, DateTime endDate) {
    return !endDate.isBefore(startDate);
  }

  String? emailError(String email) {
    if (email.trim().isEmpty) {
      return 'Email is required.';
    }
    if (!isValidEmail(email)) {
      return 'Enter a valid email address.';
    }
    return null;
  }

  String? nameError(String name) {
    if (name.trim().isEmpty) {
      return 'Name is required.';
    }
    if (!isValidName(name)) {
      return 'Use 2-60 letters and standard punctuation only.';
    }
    return null;
  }

  String? passwordError(String password) {
    if (password.isEmpty) {
      return 'Password is required.';
    }
    if (!isValidPassword(password)) {
      return 'Use 8+ chars with upper, lower, and number.';
    }
    return null;
  }

  String? dateRangeError(DateTime startDate, DateTime endDate) {
    if (!isValidEventRange(startDate, endDate)) {
      return 'End date must be after start date.';
    }
    return null;
  }
}
