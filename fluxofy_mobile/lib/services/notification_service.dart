import 'package:onesignal_flutter/onesignal_flutter.dart';
import '../routes/notification_router.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:intl/intl.dart';

class NotificationService {
  static const String _appId = "d0cb1175-5db6-4640-87d2-a251bc30c84b";
  static final FlutterLocalNotificationsPlugin _notificationsPlugin = FlutterLocalNotificationsPlugin();
  static bool _initializedLocal = false;

  /// Inicializa o OneSignal e configura os listeners
  static Future<void> initialize() async {
    // Inicializar Local Notifications para fallback/foreground se necessário
    await _initLocalNotifications();

    // Inicializar OneSignal
    OneSignal.Debug.setLogLevel(OSLogLevel.verbose);
    OneSignal.initialize(_appId);

    // Requisitar permissões de notificação (Android 13+ e iOS)
    await OneSignal.Notifications.requestPermission(true);

    // Escutar cliques em notificações
    OneSignal.Notifications.addClickListener(_onNotificationClick);
    
    // Escutar notificações recebidas em foreground
    OneSignal.Notifications.addForegroundWillDisplayListener((event) {
      // event.preventDefault(); // Descomente para impedir que a nativa do OneSignal apareça
      // event.notification.display(); // Para forçar a exibição
    });
  }

  static Future<void> _initLocalNotifications() async {
    if (_initializedLocal) return;

    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );

    const initSettings = InitializationSettings(android: androidSettings, iOS: iosSettings);
    await _notificationsPlugin.initialize(initSettings);
    _initializedLocal = true;
  }

  /// Registra o usuário no OneSignal (External ID)
  static void login(String userId) {
    OneSignal.login(userId);
  }

  /// Remove o usuário do OneSignal (Logout)
  static void logout() {
    OneSignal.logout();
  }

  /// Adiciona Tags para segmentação
  static void addTag(String key, String value) {
    OneSignal.User.addTagWithKey(key, value);
  }

  /// Handler de clique na notificação
  static void _onNotificationClick(OSNotificationClickEvent event) {
    final additionalData = event.notification.additionalData;
    if (additionalData != null) {
      NotificationRouter.handleNotificationClick(additionalData);
    }
  }

  /// Dispara Notificação de Venda local (Fallback/Teste)
  static Future<void> showSaleNotification({
    required String productName,
    required double value,
    required bool isApproved,
    String? accountName,
  }) async {
    await _initLocalNotifications();

    final currencyFormatter = NumberFormat.currency(locale: 'pt_BR', symbol: 'R\$');
    final formattedValue = currencyFormatter.format(value);

    final statusText = isApproved ? 'Venda aprovada!' : 'Venda pendente!';
    final cleanProductName = productName.isNotEmpty ? productName : 'Produto';
    final title = '$statusText | $cleanProductName';
    final body = 'Valor: $formattedValue${accountName != null ? ' ($accountName)' : ''}';

    const androidDetails = AndroidNotificationDetails(
      'vendas_channel_id_v2',
      'Notificações de Vendas',
      channelDescription: 'Alertas em tempo real de vendas',
      importance: Importance.max,
      priority: Priority.high,
      showWhen: true,
      icon: '@mipmap/ic_launcher',
      sound: RawResourceAndroidNotificationSound('venda'),
      playSound: true,
    );

    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
      sound: 'venda.wav',
    );

    const notificationDetails = NotificationDetails(android: androidDetails, iOS: iosDetails);

    try {
      await _notificationsPlugin.show(
        DateTime.now().millisecondsSinceEpoch ~/ 1000,
        title,
        body,
        notificationDetails,
      );
    } catch (e) {
      print('Erro ao disparar notificação local: $e');
    }
  }
}
