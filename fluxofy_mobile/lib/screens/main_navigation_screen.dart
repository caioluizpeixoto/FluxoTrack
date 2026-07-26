import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../services/notification_service.dart';
import '../constants.dart';
import '../services/supabase_service.dart';
import 'admin_panel_screen.dart';
import 'campanhas_screen.dart';
import 'eventos_screen.dart';
import 'resumo_dashboard_screen.dart';

class MainNavigationScreen extends StatefulWidget {
  const MainNavigationScreen({super.key});

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  int _currentIndex = 0;
  RealtimeChannel? _eventsSubscription;

  @override
  void initState() {
    super.initState();
    _setupRealtimeNotifications();
  }

  void _setupRealtimeNotifications() {
    final client = Supabase.instance.client;
    
    _eventsSubscription = client
        .channel('public:product_events')
        .onPostgresChanges(
            event: PostgresChangeEvent.insert,
            schema: 'public',
            table: 'product_events',
            callback: (payload) {
              final record = payload.newRecord;
              if (record.isNotEmpty) {
                final val = double.tryParse(record['event_value']?.toString() ?? '0') ?? 0.0;
                final isApproved = (record['status']?.toString() ?? 'approved') == 'approved';
                final pName = record['product_name'] ?? record['campaign_name'] ?? 'Glokad';
                
                NotificationService.showSaleNotification(
                  productName: pName.toString(),
                  value: val,
                  isApproved: isApproved,
                );
              }
            })
        .subscribe();
  }

  @override
  void dispose() {
    _eventsSubscription?.unsubscribe();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isAdmin = SupabaseService.isMainAdmin;

    final pages = [
      const ResumoDashboardScreen(),
      const CampanhasScreen(),
      const EventosScreen(),
      if (isAdmin) const AdminPanelScreen(),
    ];

    return Scaffold(
      backgroundColor: AppColors.background,
      body: IndexedStack(
        index: _currentIndex,
        children: pages,
      ),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: AppColors.cardBg,
          border: Border(top: BorderSide(color: AppColors.cardBorder, width: 1)),
        ),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: (index) => setState(() => _currentIndex = index),
          backgroundColor: AppColors.cardBg,
          selectedItemColor: Colors.blue.shade400,
          unselectedItemColor: AppColors.textMuted,
          type: BottomNavigationBarType.fixed,
          selectedFontSize: 11,
          unselectedFontSize: 11,
          items: [
            const BottomNavigationBarItem(
              icon: Icon(Icons.dashboard_outlined),
              activeIcon: Icon(Icons.dashboard, color: Colors.blue),
              label: 'Resumo',
            ),
            const BottomNavigationBarItem(
              icon: Icon(Icons.folder_outlined),
              activeIcon: Icon(Icons.folder, color: Colors.blue),
              label: 'Campanhas',
            ),
            const BottomNavigationBarItem(
              icon: Icon(Icons.point_of_sale_outlined),
              activeIcon: Icon(Icons.point_of_sale, color: Colors.blue),
              label: 'Vendas',
            ),
            if (isAdmin)
              const BottomNavigationBarItem(
                icon: Icon(Icons.shield_outlined),
                activeIcon: Icon(Icons.shield, color: Colors.blue),
                label: 'Admin',
              ),
          ],
        ),
      ),
    );
  }
}
