import 'package:flutter/material.dart';
import '../constants.dart';
import '../models/authorized_user_model.dart';
import '../services/supabase_service.dart';

class AdminPanelScreen extends StatefulWidget {
  const AdminPanelScreen({super.key});

  @override
  State<AdminPanelScreen> createState() => _AdminPanelScreenState();
}

class _AdminPanelScreenState extends State<AdminPanelScreen> {
  List<AuthorizedUser> users = [];
  bool isLoading = true;
  final TextEditingController _inviteEmailController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadUsers();
  }

  Future<void> _loadUsers() async {
    setState(() => isLoading = true);
    final list = await SupabaseService.fetchUsers();
    setState(() {
      users = list;
      isLoading = false;
    });
  }

  Future<void> _approveUser(AuthorizedUser user) async {
    final success = await SupabaseService.approveUser(user.id, user.email);
    if (success) {
      _showToast('Acesso de ${user.email} liberado com sucesso!');
      _loadUsers();
    } else {
      _showToast('Erro ao aprovar usuário.');
    }
  }

  Future<void> _rejectUser(AuthorizedUser user) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.cardBg,
        title: const Text('Rejeitar Solicitação', style: TextStyle(color: Colors.white)),
        content: Text('Deseja remover a solicitação de ${user.email}?', style: const TextStyle(color: AppColors.textMuted)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.red),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Rejeitar', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirm == true) {
      final success = await SupabaseService.rejectUser(user.id);
      if (success) {
        _showToast('Solicitação removida.');
        _loadUsers();
      }
    }
  }

  Future<void> _inviteEmail() async {
    final email = _inviteEmailController.text.trim();
    if (email.isEmpty) return;

    final success = await SupabaseService.inviteUser(email);
    if (success) {
      _showToast('E-mail $email pré-aprovado com sucesso!');
      _inviteEmailController.clear();
      _loadUsers();
    } else {
      _showToast('Erro ao pré-aprovar e-mail.');
    }
  }

  void _showToast(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg, style: const TextStyle(color: Colors.white)),
        backgroundColor: AppColors.cardBg,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final pendingList = users.where((u) => u.status == 'pending').toList();
    final approvedList = users.where((u) => u.status == 'approved' || u.email.toLowerCase().trim() == AppConfig.mainAdminEmail).toList();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.cardBg,
        title: const Text('Aprovação de Usuários', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: AppColors.primary),
            onPressed: _loadUsers,
          ),
        ],
      ),
      body: isLoading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Seção: Pendentes
                  Card(
                    color: AppColors.amber.withOpacity(0.05),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                      side: BorderSide(color: AppColors.amber.withOpacity(0.3)),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.access_time_filled, color: AppColors.amber, size: 20),
                              const SizedBox(width: 8),
                              Text(
                                'Solicitações Pendentes (${pendingList.length})',
                                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.amber),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          if (pendingList.isEmpty)
                            const Padding(
                              padding: EdgeInsets.symmetric(vertical: 12),
                              child: Text('Nenhuma solicitação pendente.', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
                            )
                          else
                            ListView.separated(
                              shrinkWrap: true,
                              physics: const NeverScrollableScrollPhysics(),
                              itemCount: pendingList.length,
                              separatorBuilder: (_, __) => const SizedBox(height: 8),
                              itemBuilder: (ctx, i) {
                                final u = pendingList[i];
                                return Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withOpacity(0.05),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(u.email, style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                                      const SizedBox(height: 8),
                                      Row(
                                        children: [
                                          Expanded(
                                            child: ElevatedButton.icon(
                                              onPressed: () => _approveUser(u),
                                              icon: const Icon(Icons.check, size: 16, color: Colors.white),
                                              label: const Text('Aprovar Acesso', style: TextStyle(fontSize: 12, color: Colors.white)),
                                              style: ElevatedButton.styleFrom(
                                                backgroundColor: AppColors.emerald,
                                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                              ),
                                            ),
                                          ),
                                          const SizedBox(width: 8),
                                          ElevatedButton.icon(
                                            onPressed: () => _rejectUser(u),
                                            icon: const Icon(Icons.close, size: 16, color: Colors.white),
                                            label: const Text('Rejeitar', style: TextStyle(fontSize: 12, color: Colors.white)),
                                            style: ElevatedButton.styleFrom(
                                              backgroundColor: AppColors.red,
                                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                            ),
                                          ),
                                        ],
                                      )
                                    ],
                                  ),
                                );
                              },
                            ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Seção: Pré-Aprovar E-mail
                  Card(
                    color: AppColors.cardBg,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                      side: const BorderSide(color: AppColors.cardBorder),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Pré-Aprovar E-mail', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
                          const SizedBox(height: 4),
                          const Text('Autorize previamente um e-mail para acesso imediato.', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Expanded(
                                child: TextField(
                                  controller: _inviteEmailController,
                                  style: const TextStyle(color: Colors.white),
                                  decoration: InputDecoration(
                                    hintText: 'email@exemplo.com',
                                    hintStyle: TextStyle(color: AppColors.textMuted.withOpacity(0.5)),
                                    filled: true,
                                    fillColor: Colors.white.withOpacity(0.05),
                                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              ElevatedButton(
                                onPressed: _inviteEmail,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppColors.primary,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                ),
                                child: const Text('Pré-Aprovar', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.black)),
                              ),
                            ],
                          )
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Seção: Usuários Aprovados
                  Card(
                    color: AppColors.cardBg,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                      side: const BorderSide(color: AppColors.cardBorder),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Usuários Aprovados (Ativos)', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
                          const SizedBox(height: 12),
                          ListView.separated(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            itemCount: approvedList.length,
                            separatorBuilder: (_, __) => const Divider(color: AppColors.cardBorder),
                            itemBuilder: (ctx, i) {
                              final u = approvedList[i];
                              final isMainAdmin = u.email.toLowerCase().trim() == AppConfig.mainAdminEmail;
                              return ListTile(
                                contentPadding: EdgeInsets.zero,
                                title: Row(
                                  children: [
                                    Expanded(child: Text(u.email, style: const TextStyle(fontSize: 13, color: Colors.white, fontWeight: FontWeight.w600))),
                                    if (isMainAdmin)
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: AppColors.primary.withOpacity(0.2),
                                          borderRadius: BorderRadius.circular(12),
                                        ),
                                        child: const Text('Admin', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.primary)),
                                      ),
                                  ],
                                ),
                                subtitle: const Text('Status: Aprovado', style: TextStyle(fontSize: 11, color: AppColors.emerald)),
                                trailing: isMainAdmin
                                    ? null
                                    : IconButton(
                                        icon: const Icon(Icons.delete_outline, color: AppColors.red, size: 20),
                                        onPressed: () => _rejectUser(u),
                                      ),
                              );
                            },
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}
