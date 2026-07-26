import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../constants.dart';
import '../services/supabase_service.dart';
import '../services/sound_service.dart';
import '../services/notification_service.dart';

class EventosScreen extends StatefulWidget {
  const EventosScreen({super.key});

  @override
  State<EventosScreen> createState() => _EventosScreenState();
}

class _EventosScreenState extends State<EventosScreen> {
  List<Map<String, dynamic>> liveEvents = [];
  bool isLoading = true;
  String filterStatus = 'Todos';

  @override
  void initState() {
    super.initState();
    _loadEvents();
  }

  Future<void> _loadEvents() async {
    setState(() => isLoading = true);
    final events = await SupabaseService.fetchLiveEvents();
    setState(() {
      liveEvents = events;
      isLoading = false;
    });
  }

  Future<void> _testNotification() async {
    await NotificationService.showSaleNotification(
      productName: 'Glokad',
      value: 56.91,
      isApproved: true,
    );
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('🔔 Notificação enviada para a barra superior e som ativado!'),
        backgroundColor: AppColors.emerald,
        duration: Duration(seconds: 2),
      ),
    );
  }

  String _formatTimeAgo(String? dateTimeStr) {
    if (dateTimeStr == null) return 'agora';
    final dt = DateTime.tryParse(dateTimeStr);
    if (dt == null) return 'agora';
    final diff = DateTime.now().difference(dt.toLocal());
    if (diff.inSeconds < 60) return 'agora';
    if (diff.inMinutes < 60) return 'há ${diff.inMinutes}m';
    if (diff.inHours < 24) return 'há ${diff.inHours}h';
    return 'há ${diff.inDays}d';
  }

  @override
  Widget build(BuildContext context) {
    final currencyFormatter = NumberFormat.currency(locale: 'pt_BR', symbol: 'R\$');
    final filtered = liveEvents.where((e) {
      final status = (e['status'] ?? 'approved').toString().toLowerCase();
      if (filterStatus == 'Aprovadas') return status == 'approved';
      if (filterStatus == 'Pendentes') return status == 'pending' || status == 'generated';
      return true;
    }).toList();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.cardBg,
        elevation: 0,
        title: const Text('Vendas', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Colors.white)),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: AppColors.primary),
            onPressed: _loadEvents,
          ),
        ],
      ),
      body: Column(
        children: [
          // Barra de Teste de Notificação & Filtros
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            color: AppColors.cardBg,
            child: Column(
              children: [
                SizedBox(
                  width: double.infinity,
                  height: 44,
                  child: ElevatedButton.icon(
                    onPressed: _testNotification,
                    icon: const Icon(Icons.notifications_active, size: 18, color: Colors.black),
                    label: const Text(
                      'Disparar Notificação Teste (Estilo da Foto)',
                      style: TextStyle(fontSize: 12, color: Colors.black, fontWeight: FontWeight.bold),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                Row(
                  children: ['Todos', 'Aprovadas', 'Pendentes'].map((st) {
                    final isSel = filterStatus == st;
                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: FilterChip(
                        label: Text(st),
                        selected: isSel,
                        selectedColor: Colors.blue.shade600,
                        backgroundColor: Colors.white.withOpacity(0.05),
                        labelStyle: TextStyle(
                          color: isSel ? Colors.white : AppColors.textMuted,
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                        ),
                        onSelected: (_) => setState(() => filterStatus = st),
                      ),
                    );
                  }).toList(),
                ),
              ],
            ),
          ),

          // Events Feed List (Estilo exato da Foto Enviada pelo Usuário)
          Expanded(
            child: isLoading
                ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
                : filtered.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.notifications_none, size: 48, color: AppColors.textMuted.withOpacity(0.5)),
                            const SizedBox(height: 12),
                            const Text('Nenhum evento de venda registrado ainda.', style: TextStyle(color: AppColors.textMuted)),
                          ],
                        ),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: filtered.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (ctx, i) {
                          final ev = filtered[i];
                          final val = double.tryParse(ev['event_value']?.toString() ?? '0') ?? 0.0;
                          final isApproved = (ev['status']?.toString() ?? 'approved') == 'approved';
                          final productName = (ev['product_name'] ?? ev['campaign_name'] ?? 'Glokad').toString();
                          
                          final customerName = ev['customer_name']?.toString() ?? 'Cliente anônimo';
                          final customerEmail = ev['customer_email']?.toString() ?? 'Sem email';
                          
                          final dtStr = ev['created_at']?.toString();
                          final dt = dtStr != null ? DateTime.tryParse(dtStr)?.toLocal() : null;
                          final formattedDate = dt != null ? DateFormat('dd/MM/yyyy HH:mm').format(dt) : 'Data desconhecida';

                          return Container(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                            decoration: BoxDecoration(
                              color: AppColors.cardBg,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(
                                color: isApproved ? AppColors.emerald.withOpacity(0.4) : AppColors.amber.withOpacity(0.3),
                              ),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Expanded(
                                      child: Text(
                                        '${isApproved ? "Venda aprovada!" : "Venda pendente!"} | $productName',
                                        style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 14,
                                          color: Colors.white,
                                        ),
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      formattedDate,
                                      style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  customerName,
                                  style: const TextStyle(fontSize: 13, color: Colors.white, fontWeight: FontWeight.w600),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  customerEmail,
                                  style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  'Valor: ${currencyFormatter.format(val)}',
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: isApproved ? AppColors.emerald : AppColors.amber,
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}
