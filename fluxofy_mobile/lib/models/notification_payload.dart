class NotificationPayload {
  final String screen;
  final String? chatId;
  final String? orderId;

  NotificationPayload({
    required this.screen,
    this.chatId,
    this.orderId,
  });

  factory NotificationPayload.fromJson(Map<String, dynamic> json) {
    return NotificationPayload(
      screen: json['screen']?.toString() ?? 'home',
      chatId: json['chatId']?.toString(),
      orderId: json['orderId']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'screen': screen,
      if (chatId != null) 'chatId': chatId,
      if (orderId != null) 'orderId': orderId,
    };
  }
}
