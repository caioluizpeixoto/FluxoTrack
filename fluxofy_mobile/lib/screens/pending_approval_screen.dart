import 'package:flutter/material.dart';
import '../constants.dart';
import '../services/supabase_service.dart';
import 'main_navigation_screen.dart';
import 'login_screen.dart';

class PendingApprovalScreen extends StatefulWidget {
  const PendingApprovalScreen({super.key});

  @override
  State<PendingApprovalScreen> createState() => _PendingApprovalScreenState();
}

class _PendingApprovalScreenState extends State<PendingApprovalScreen> {
  bool isChecking = false;

  Future<void> _checkApproval() async {
    setState(() => isChecking = true);
    final email = SupabaseService.currentEmail;
    if (email == null) {
      _logout();
      return;
    }

    final status = await SupabaseService.checkUserStatus(email);
    setState(() => isChecking = false);

    if (!mounted) return;

    if (status == 'approved' || email == AppConfig.mainAdminEmail) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Cadastro aprovado! Redirecionando...'),
          backgroundColor: AppColors.emerald,
        ),
      );
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const MainNavigationScreen()),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Seu cadastro continua aguardando aprovação do administrador.'),
          backgroundColor: AppColors.amber,
        ),
      );
    }
  }

  Future<void> _logout() async {
    await SupabaseService.signOut();
    if (!mounted) return;
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (_) => const LoginScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    final userEmail = SupabaseService.currentEmail ?? 'Seu e-mail';

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Clock Icon
                Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    color: AppColors.amber.withOpacity(0.15),
                    shape: BoxShape.circle,
                    border: Border.all(color: AppColors.amber.withOpacity(0.3)),
                  ),
                  child: const Icon(Icons.access_time_rounded, color: AppColors.amber, size: 40),
                ),
                const SizedBox(height: 24),
                const Text(
                  'Cadastro em Análise',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textMain,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Seu cadastro foi realizado com sucesso, mas o acesso precisa ser liberado pelo administrador.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 13, color: AppColors.textMuted),
                ),
                const SizedBox(height: 32),

                // Details Card
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: AppColors.cardBg,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppColors.cardBorder),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppColors.amber.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.amber.withOpacity(0.2)),
                        ),
                        child: const Row(
                          children: [
                            Icon(Icons.shield, color: AppColors.amber, size: 20),
                            SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                'Solicitação enviada para análise do administrador.',
                                style: TextStyle(fontSize: 12, color: AppColors.amber),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'E-mail cadastrado:',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.textMuted),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        userEmail,
                        style: const TextStyle(fontSize: 14, fontFamily: 'monospace', color: AppColors.primary),
                      ),
                      const SizedBox(height: 24),

                      // Botão Verificar Status
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: ElevatedButton.icon(
                          onPressed: isChecking ? null : _checkApproval,
                          icon: isChecking
                              ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black))
                              : const Icon(Icons.refresh, color: Colors.black, size: 20),
                          label: const Text(
                            'Verificar se fui aprovado',
                            style: TextStyle(fontWeight: FontWeight.bold, color: Colors.black),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Botão Sair
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: OutlinedButton.icon(
                          onPressed: _logout,
                          icon: const Icon(Icons.logout, color: AppColors.textMuted, size: 18),
                          label: const Text(
                            'Sair / Entrar com outra conta',
                            style: TextStyle(color: AppColors.textMain, fontSize: 13),
                          ),
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: AppColors.cardBorder),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
