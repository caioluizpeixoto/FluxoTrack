import 'package:flutter/material.dart';
import '../constants.dart';
import '../services/supabase_service.dart';
import 'main_navigation_screen.dart';
import 'pending_approval_screen.dart';
import '../services/notification_service.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  bool isLoginMode = true;
  bool isPasswordVisible = false;
  bool isConfirmPasswordVisible = false;
  bool isLoading = false;

  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _confirmPasswordController = TextEditingController();

  Future<void> _handleAuth() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text.trim();

    if (email.isEmpty || password.isEmpty) {
      _showSnackBar('Por favor, preencha todos os campos.');
      return;
    }

    if (!isLoginMode && password != _confirmPasswordController.text.trim()) {
      _showSnackBar('As senhas não coincidem.');
      return;
    }

    setState(() => isLoading = true);

    try {
      if (isLoginMode) {
        // Modo Login
        final response = await SupabaseService.signInWithPassword(
          email: email,
          password: password,
        );

        if (response.user != null) {
          NotificationService.login(response.user!.id);
          final status = await SupabaseService.checkUserStatus(email);
          if (!mounted) return;

          if (status == 'approved' || email == AppConfig.mainAdminEmail) {
            Navigator.pushReplacement(
              context,
              MaterialPageRoute(builder: (_) => const MainNavigationScreen()),
            );
          } else {
            Navigator.pushReplacement(
              context,
              MaterialPageRoute(builder: (_) => const PendingApprovalScreen()),
            );
          }
        }
      } else {
        // Modo Cadastro
        final response = await SupabaseService.signUp(
          email: email,
          password: password,
        );

        if (!mounted) return;

        if (response.user != null) {
          NotificationService.login(response.user!.id);
          
          if (!mounted) return;
          if (email == AppConfig.mainAdminEmail) {
            _showSnackBar('Conta de Administrador registrada!');
            Navigator.pushReplacement(
              context,
              MaterialPageRoute(builder: (_) => const MainNavigationScreen()),
            );
          } else {
            _showSnackBar('Cadastro efetuado! Aguarde a aprovação do administrador.');
            Navigator.pushReplacement(
              context,
              MaterialPageRoute(builder: (_) => const PendingApprovalScreen()),
            );
          }
        }
      }
    } catch (e) {
      final errStr = e.toString();
      if (errStr.contains('over_email_send_rate_limit') || errStr.contains('rate limit')) {
        _showSnackBar('Limite temporário de envio de e-mails atingido no Supabase. Aguarde 1 a 2 minutos para tentar novamente ou desative a confirmação de e-mail no painel do Supabase.');
      } else if (errStr.contains('Invalid login credentials')) {
        _showSnackBar('E-mail ou senha incorretos.');
      } else {
        _showSnackBar('Erro: ${errStr.replaceAll('Exception:', '').replaceAll('AuthApiException(message:', '').replaceAll(')', '')}');
      }
    } finally {
      if (mounted) setState(() => isLoading = false);
    }
  }

  Future<void> _handleForgotPassword() async {
    final email = _emailController.text.trim();
    if (email.isEmpty) {
      _showSnackBar('Digite seu e-mail no campo acima antes de redefinir a senha.');
      return;
    }

    try {
      await SupabaseService.resetPassword(email);
      _showSnackBar('E-mail de redefinição enviado para $email. Verifique também a pasta de Spam.');
    } catch (e) {
      _showSnackBar('Erro ao solicitar redefinição: ${e.toString()}');
    }
  }

  void _showSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message, style: const TextStyle(color: Colors.white)),
        backgroundColor: AppColors.cardBg,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Logo & Header
                Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppColors.primary.withOpacity(0.3)),
                  ),
                  child: const Icon(Icons.bolt, color: AppColors.primary, size: 36),
                ),
                const SizedBox(height: 16),
                const Text(
                  'FluxoFy',
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textMain,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  isLoginMode
                      ? 'Acesse sua conta para continuar'
                      : 'Crie seu acesso. Novos cadastros requerem aprovação.',
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 13, color: AppColors.textMuted),
                ),
                const SizedBox(height: 32),

                // Alternador de Abas (Entrar / Cadastrar-se)
                Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: AppColors.cardBg,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppColors.cardBorder),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: GestureDetector(
                          onTap: () => setState(() => isLoginMode = true),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            decoration: BoxDecoration(
                              color: isLoginMode ? AppColors.primary : Colors.transparent,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              'Entrar',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 13,
                                color: isLoginMode ? Colors.black : AppColors.textMuted,
                              ),
                            ),
                          ),
                        ),
                      ),
                      Expanded(
                        child: GestureDetector(
                          onTap: () => setState(() => isLoginMode = false),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            decoration: BoxDecoration(
                              color: !isLoginMode ? AppColors.primary : Colors.transparent,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              'Cadastrar-se',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 13,
                                color: !isLoginMode ? Colors.black : AppColors.textMuted,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // Botão Continuar com Google
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: OutlinedButton.icon(
                    onPressed: isLoading ? null : () async {
                      setState(() => isLoading = true);
                      try {
                        await SupabaseService.signInWithGoogle();
                      } catch (e) {
                        _showSnackBar('Erro ao conectar com Google: $e');
                      } finally {
                        if (mounted) setState(() => isLoading = false);
                      }
                    },
                    icon: const Icon(Icons.g_mobiledata, color: Colors.white, size: 28),
                    label: const Text(
                      'Continuar com o Google',
                      style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 14),
                    ),
                    style: OutlinedButton.styleFrom(
                      backgroundColor: Colors.white.withOpacity(0.05),
                      side: const BorderSide(color: AppColors.cardBorder),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                const Row(
                  children: [
                    Expanded(child: Divider(color: AppColors.cardBorder)),
                    Padding(
                      padding: EdgeInsets.symmetric(horizontal: 12),
                      child: Text('ou use seu e-mail', style: TextStyle(fontSize: 11, color: AppColors.textMuted)),
                    ),
                    Expanded(child: Divider(color: AppColors.cardBorder)),
                  ],
                ),
                const SizedBox(height: 16),

                // Formulário de Login / Cadastro
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: AppColors.cardBg,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppColors.cardBorder),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // E-mail Input
                      const Text(
                        'E-mail',
                        style: TextStyle(fontSize: 12, color: AppColors.textMuted),
                      ),
                      const SizedBox(height: 6),
                      TextField(
                        controller: _emailController,
                        keyboardType: TextInputType.emailAddress,
                        style: const TextStyle(color: AppColors.textMain),
                        decoration: InputDecoration(
                          hintText: 'seu@email.com',
                          hintStyle: TextStyle(color: AppColors.textMuted.withOpacity(0.5)),
                          filled: true,
                          fillColor: Colors.white.withOpacity(0.05),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide(color: AppColors.cardBorder),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Senha Input com Ícone do Olho
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Senha',
                            style: TextStyle(fontSize: 12, color: AppColors.textMuted),
                          ),
                          if (isLoginMode)
                            GestureDetector(
                              onTap: _handleForgotPassword,
                              child: const Text(
                                'Esqueci minha senha',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.primary,
                                ),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      TextField(
                        controller: _passwordController,
                        obscureText: !isPasswordVisible,
                        style: const TextStyle(color: AppColors.textMain),
                        decoration: InputDecoration(
                          hintText: '••••••••',
                          hintStyle: TextStyle(color: AppColors.textMuted.withOpacity(0.5)),
                          filled: true,
                          fillColor: Colors.white.withOpacity(0.05),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                          suffixIcon: IconButton(
                            icon: Icon(
                              isPasswordVisible ? Icons.visibility_off : Icons.visibility,
                              color: AppColors.textMuted,
                              size: 20,
                            ),
                            onPressed: () => setState(() => isPasswordVisible = !isPasswordVisible),
                          ),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide(color: AppColors.cardBorder),
                          ),
                        ),
                      ),

                      // Confirmar Senha (apenas no modo Cadastro)
                      if (!isLoginMode) ...[
                        const SizedBox(height: 16),
                        const Text(
                          'Confirmar Senha',
                          style: TextStyle(fontSize: 12, color: AppColors.textMuted),
                        ),
                        const SizedBox(height: 6),
                        TextField(
                          controller: _confirmPasswordController,
                          obscureText: !isConfirmPasswordVisible,
                          style: const TextStyle(color: AppColors.textMain),
                          decoration: InputDecoration(
                            hintText: '••••••••',
                            hintStyle: TextStyle(color: AppColors.textMuted.withOpacity(0.5)),
                            filled: true,
                            fillColor: Colors.white.withOpacity(0.05),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                            suffixIcon: IconButton(
                              icon: Icon(
                                isConfirmPasswordVisible ? Icons.visibility_off : Icons.visibility,
                                color: AppColors.textMuted,
                                size: 20,
                              ),
                              onPressed: () => setState(() => isConfirmPasswordVisible = !isConfirmPasswordVisible),
                            ),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide(color: AppColors.cardBorder),
                            ),
                          ),
                        ),
                      ],
                      const SizedBox(height: 24),

                      // Botão Submit
                      SizedBox(
                        width: double.infinity,
                        height: 50,
                        child: ElevatedButton(
                          onPressed: isLoading ? null : _handleAuth,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          child: isLoading
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black),
                                )
                              : Text(
                                  isLoginMode ? 'Entrar' : 'Criar Conta e Solicitar Acesso',
                                  style: const TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.black,
                                  ),
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
