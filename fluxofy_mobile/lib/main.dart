import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'constants.dart';
import 'screens/home_dashboard_screen.dart';
import 'screens/main_navigation_screen.dart';
import 'screens/login_screen.dart';
import 'screens/pending_approval_screen.dart';
import 'services/supabase_service.dart';
import 'services/notification_service.dart';
import 'routes/notification_router.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Supabase.initialize(
    url: AppConfig.supabaseUrl,
    anonKey: AppConfig.supabaseAnonKey,
  );

  await NotificationService.initialize();

  runApp(const FluxofyApp());
}

class FluxofyApp extends StatelessWidget {
  const FluxofyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'FluxoFy',
      debugShowCheckedModeBanner: false,
      navigatorKey: NotificationRouter.navigatorKey,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: AppColors.background,
        primaryColor: AppColors.primary,
        textTheme: GoogleFonts.interTextTheme(ThemeData.dark().textTheme),
      ),
      home: const AuthGate(),
    );
  }
}


class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  bool isLoading = true;
  Widget? targetScreen;

  @override
  void initState() {
    super.initState();
    _checkInitialState();
  }

  Future<void> _checkInitialState() async {
    final user = SupabaseService.currentUser;

    if (user == null || user.email == null) {
      setState(() {
        targetScreen = const LoginScreen();
        isLoading = false;
      });
      return;
    }

    NotificationService.login(user.id);

    final email = user.email!;
    final status = await SupabaseService.checkUserStatus(email);

    if (status == 'approved' || email.toLowerCase().trim() == AppConfig.mainAdminEmail) {
      setState(() {
        targetScreen = const MainNavigationScreen();
        isLoading = false;
      });
    } else {
      setState(() {
        targetScreen = const PendingApprovalScreen();
        isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return const Scaffold(
        backgroundColor: AppColors.background,
        body: Center(
          child: CircularProgressIndicator(color: AppColors.primary),
        ),
      );
    }
    return targetScreen ?? const LoginScreen();
  }
}
