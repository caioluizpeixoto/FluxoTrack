import 'package:flutter/material.dart';
import '../models/notification_payload.dart';
import '../screens/main_navigation_screen.dart';

class NotificationRouter {
  static final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

  static void handleNotificationClick(Map<String, dynamic>? additionalData) {
    if (additionalData == null) return;

    final payload = NotificationPayload.fromJson(additionalData);
    final context = navigatorKey.currentContext;

    if (context == null) return;

    // Example routing logic based on payload.screen
    switch (payload.screen) {
      case 'vendas':
      case 'dashboard':
      case 'campanhas':
        // Navigate to main navigation screen (which handles tabs)
        Navigator.pushAndRemoveUntil(
          context,
          MaterialPageRoute(builder: (_) => const MainNavigationScreen()),
          (route) => false,
        );
        break;
      // Add other routes here as needed (e.g. chat, pedidos, perfil)
      default:
        // Default to main screen
        Navigator.pushAndRemoveUntil(
          context,
          MaterialPageRoute(builder: (_) => const MainNavigationScreen()),
          (route) => false,
        );
    }
  }
}
