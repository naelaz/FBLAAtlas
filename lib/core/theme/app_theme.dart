import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  static const Color _ink = Color(0xFF13313D);
  static const Color _mist = Color(0xFFF4F8F7);
  static const Color _foam = Color(0xFFECF7F3);
  static const Color _signal = Color(0xFFE96A1C);
  static const Color _mint = Color(0xFF58B89C);

  static ThemeData build({required bool highContrast}) {
    final scheme = ColorScheme(
      brightness: Brightness.light,
      primary: highContrast ? Colors.black : _ink,
      onPrimary: Colors.white,
      secondary: highContrast ? Colors.black : _signal,
      onSecondary: Colors.white,
      error: Colors.red.shade700,
      onError: Colors.white,
      surface: Colors.white,
      onSurface: highContrast ? Colors.black : _ink,
    );

    final base = ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: _mist,
      inputDecorationTheme: InputDecorationTheme(
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
      ),
    );

    return base.copyWith(
      textTheme: GoogleFonts.spaceGroteskTextTheme(base.textTheme).apply(
        bodyColor: scheme.onSurface,
        displayColor: scheme.onSurface,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: scheme.onSurface,
        titleTextStyle: GoogleFonts.spaceGrotesk(
          color: scheme.onSurface,
          fontWeight: FontWeight.w700,
          fontSize: 20,
        ),
      ),
      chipTheme: base.chipTheme.copyWith(
        backgroundColor: _foam,
        selectedColor: _mint.withOpacity(0.24),
      ),
    );
  }
}
