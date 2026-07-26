import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../constants.dart';
import '../services/supabase_service.dart';

class ResumoDashboardScreen extends StatefulWidget {
  const ResumoDashboardScreen({super.key});

  @override
  State<ResumoDashboardScreen> createState() => _ResumoDashboardScreenState();
}

class _ResumoDashboardScreenState extends State<ResumoDashboardScreen> {
  bool isLoading = true;
  String selectedPeriod = 'Hoje';
  String selectedAccount = 'Todas';
  String selectedPlatform = 'Qualquer';
  String selectedProduct = 'Qualquer';

  Map<String, dynamic> metrics = {
    'faturamentoLiquido': 0.0,
    'faturamentoPendente': 0.0,
    'lucro': 0.0,
    'roi': 0.0,
    'roas': 0.0,
    'vendasAprovadas': 0,
    'vendasPendentes': 0,
  };

  List<String> productOptions = ['Todos os Produtos'];
  List<String> adAccountOptions = ['Todas'];

  @override
  void initState() {
    super.initState();
    _loadInitialData();
  }

  Future<void> _loadInitialData() async {
    final prods = await SupabaseService.fetchProductsList();
    final accs = await SupabaseService.fetchMetaAdAccounts();
    setState(() {
      productOptions = prods;
      adAccountOptions = accs;
      
      if (selectedProduct == 'Qualquer' && prods.isNotEmpty) {
        selectedProduct = prods.first;
      }
      if (selectedAccount == 'Todas' && accs.isNotEmpty) {
        selectedAccount = accs.first;
      }
    });
    await _loadMetrics();
  }

  Future<void> _loadMetrics() async {
    setState(() => isLoading = true);
    final data = await SupabaseService.fetchDashboardMetrics(
      period: selectedPeriod,
      platform: selectedPlatform,
      product: selectedProduct,
    );
    setState(() {
      metrics = data;
      isLoading = false;
    });
  }

  Widget _buildDropdownFilter(String label, String value, List<String> options, ValueChanged<String?> onChanged) {
    final safeValue = options.contains(value) ? value : options.first;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
        const SizedBox(height: 4),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.05),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: AppColors.cardBorder),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: safeValue,
              isExpanded: true,
              dropdownColor: AppColors.cardBg,
              style: const TextStyle(fontSize: 13, color: Colors.white),
              onChanged: onChanged,
              items: options.map((opt) {
                return DropdownMenuItem<String>(
                  value: opt,
                  child: Text(opt, style: const TextStyle(color: Colors.white)),
                );
              }).toList(),
            ),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final currencyFormatter = NumberFormat.currency(locale: 'pt_BR', symbol: 'R\$');
    final double faturamentoLiquido = metrics['faturamentoLiquido'] ?? 0.0;
    final double faturamentoPendente = metrics['faturamentoPendente'] ?? 0.0;
    final double lucro = metrics['lucro'] ?? 0.0;
    final double roi = metrics['roi'] ?? 0.0;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.cardBg,
        elevation: 0,
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: AppColors.primary.withOpacity(0.2),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.bolt, color: AppColors.primary, size: 20),
            ),
            const SizedBox(width: 8),
            const Text('FluxoFy', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Colors.white)),
            const Spacer(),
            const Text('Principal', style: TextStyle(fontSize: 13, color: AppColors.textMuted)),
          ],
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _loadMetrics,
        color: AppColors.primary,
        backgroundColor: AppColors.cardBg,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header com Título Resumo e Botão Atualizar (Igual UTMify)
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Resumo', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white)),
                      const SizedBox(height: 2),
                      const Text('Atualizado agora mesmo', style: TextStyle(fontSize: 11, color: AppColors.textMuted)),
                    ],
                  ),
                  ElevatedButton(
                    onPressed: isLoading ? null : _loadMetrics,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blue.shade600,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    ),
                    child: isLoading
                        ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Text('Atualizar', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 13)),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Card de Filtros (Estilo UTMify)
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.cardBg,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.cardBorder),
                ),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: _buildDropdownFilter(
                            'Período de visualização',
                            selectedPeriod,
                            ['Hoje', 'Ontem', 'Últimos 7 dias', 'Mês Atual', 'Máximo'],
                            (val) {
                              if (val != null) {
                                setState(() => selectedPeriod = val);
                                _loadMetrics();
                              }
                            },
                          ),
                        ),
                        Expanded(
                          child: _buildDropdownFilter(
                            'Conta de anúncio',
                            selectedAccount,
                            adAccountOptions,
                            (val) {
                              if (val != null) {
                                setState(() => selectedAccount = val);
                                _loadMetrics();
                              }
                            },
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: _buildDropdownFilter(
                            'Plataformas',
                            selectedPlatform,
                            ['Qualquer', 'Meta Ads', 'Google Ads', 'TikTok Ads'],
                            (val) => setState(() => selectedPlatform = val!),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _buildDropdownFilter(
                            'Produto',
                            selectedProduct,
                            productOptions,
                            (val) {
                              if (val != null) {
                                setState(() => selectedProduct = val);
                                _loadMetrics();
                              }
                            },
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Metric Card: Faturamento Bruto (Real)
              _buildMetricCard(
                title: 'Faturamento Bruto (Real)',
                value: currencyFormatter.format(faturamentoLiquido),
                subtitle: '${metrics['vendasAprovadas'] ?? 0} Vendas',
                valueColor: AppColors.emerald,
              ),
              const SizedBox(height: 12),

              // Metric Card: Faturamento Pendente
              _buildMetricCard(
                title: 'Faturamento Pendente',
                value: currencyFormatter.format(faturamentoPendente),
                subtitle: '${metrics['vendasPendentes'] ?? 0} Compras Pendentes',
                valueColor: AppColors.amber,
              ),
              const SizedBox(height: 12),

              // Metric Card: Gasto Ads
              _buildMetricCard(
                title: 'Gasto Ads',
                value: currencyFormatter.format(metrics['gastoAds'] ?? 0.0),
                valueColor: Colors.white,
              ),
              const SizedBox(height: 12),

              // Metric Card: Lucro Líquido
              _buildMetricCard(
                title: 'Lucro Líquido',
                value: currencyFormatter.format(lucro),
                valueColor: lucro < 0 ? AppColors.red : AppColors.emerald,
              ),
              const SizedBox(height: 12),

              // ROI and ROAS Row
              Row(
                children: [
                  Expanded(
                    child: _buildMetricCard(
                      title: 'ROI',
                      value: roi.toStringAsFixed(2),
                      valueColor: Colors.white,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildMetricCard(
                      title: 'ROAS',
                      value: '${(metrics['roas'] ?? 0.0).toStringAsFixed(2)}x',
                      valueColor: Colors.white,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMetricCard({
    required String title,
    required String value,
    String? subtitle,
    required Color valueColor,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontSize: 13, color: AppColors.textMuted)),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
              fontSize: 26,
              fontWeight: FontWeight.bold,
              color: valueColor,
            ),
          ),
          if (subtitle != null) ...[
            const SizedBox(height: 6),
            Text(subtitle, style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
          ],
        ],
      ),
    );
  }
}
