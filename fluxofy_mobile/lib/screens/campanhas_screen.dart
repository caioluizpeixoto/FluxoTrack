import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../constants.dart';
import '../services/supabase_service.dart';

class CampanhasScreen extends StatefulWidget {
  const CampanhasScreen({super.key});

  @override
  State<CampanhasScreen> createState() => _CampanhasScreenState();
}

class _CampanhasScreenState extends State<CampanhasScreen> with SingleTickerProviderStateMixin {
  late TabController _hierarchyTabController;
  bool isLoading = true;

  List<String> productList = ['Todos os Produtos'];
  String selectedProduct = 'Todos os Produtos';
  
  List<String> adAccountOptions = ['Todas'];
  String selectedAccount = 'Todas';
  
  String selectedPeriod = 'Hoje';
  bool showOnlyActive = false;
  String searchQuery = '';

  List<Map<String, dynamic>> campaigns = [];
  List<Map<String, dynamic>> adsets = [];
  List<Map<String, dynamic>> ads = [];

  @override
  void initState() {
    super.initState();
    _hierarchyTabController = TabController(length: 3, vsync: this);
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => isLoading = true);
    final prods = await SupabaseService.fetchProductsList();
    final accs = await SupabaseService.fetchMetaAdAccounts();
    
    final hier = await SupabaseService.fetchMetaHierarchy(
      selectedProduct: selectedProduct,
      selectedAccount: selectedAccount,
      period: selectedPeriod,
    );

    setState(() {
      productList = prods;
      adAccountOptions = accs;
      campaigns = hier['campaigns'] ?? [];
      adsets = hier['adsets'] ?? [];
      ads = hier['ads'] ?? [];
      isLoading = false;
    });
  }

  Future<void> _toggleEntityStatus(Map<String, dynamic> item) async {
    final newStatus = !(item['status'] as bool);
    setState(() {
      item['status'] = newStatus;
    });
    final type = item['type']?.toString() ?? 'campaign';
    await SupabaseService.toggleEntityStatus(item['id'].toString(), type, newStatus);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Status de "${item['name']}" alterado para ${newStatus ? 'ATIVO' : 'PAUSADO'}'),
        backgroundColor: newStatus ? AppColors.emerald : AppColors.amber,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  void _showBudgetDialog(Map<String, dynamic> item) {
    final currentBudget = double.tryParse(item['budget']?.toString() ?? '100.0') ?? 100.0;
    final controller = TextEditingController(text: currentBudget.toStringAsFixed(2));

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.cardBg,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            const Icon(Icons.attach_money, color: AppColors.primary),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                'Alterar Orçamento Diário',
                style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              item['name'].toString(),
              style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
            ),
            const SizedBox(height: 16),
            const Text('Novo Orçamento Diário (R\$):', style: TextStyle(color: Colors.white, fontSize: 12)),
            const SizedBox(height: 6),
            TextField(
              controller: controller,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
              decoration: InputDecoration(
                prefixText: 'R\$ ',
                prefixStyle: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold),
                filled: true,
                fillColor: Colors.white.withOpacity(0.05),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.primary)),
              ),
            ),
            const SizedBox(height: 12),
            // Botões de Atalho rápido
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                ActionChip(
                  label: const Text('+ R\$ 50'),
                  backgroundColor: Colors.white.withOpacity(0.08),
                  labelStyle: const TextStyle(color: Colors.white, fontSize: 11),
                  onPressed: () {
                    final val = (double.tryParse(controller.text) ?? currentBudget) + 50.0;
                    controller.text = val.toStringAsFixed(2);
                  },
                ),
                ActionChip(
                  label: const Text('+ R\$ 100'),
                  backgroundColor: Colors.white.withOpacity(0.08),
                  labelStyle: const TextStyle(color: Colors.white, fontSize: 11),
                  onPressed: () {
                    final val = (double.tryParse(controller.text) ?? currentBudget) + 100.0;
                    controller.text = val.toStringAsFixed(2);
                  },
                ),
                ActionChip(
                  label: const Text('+ 50%'),
                  backgroundColor: Colors.white.withOpacity(0.08),
                  labelStyle: const TextStyle(color: Colors.white, fontSize: 11),
                  onPressed: () {
                    final val = (double.tryParse(controller.text) ?? currentBudget) * 1.5;
                    controller.text = val.toStringAsFixed(2);
                  },
                ),
                ActionChip(
                  label: const Text('+ 100% (Dobrar)'),
                  backgroundColor: Colors.blue.shade900.withOpacity(0.5),
                  labelStyle: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                  onPressed: () {
                    final val = (double.tryParse(controller.text) ?? currentBudget) * 2.0;
                    controller.text = val.toStringAsFixed(2);
                  },
                ),
              ],
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancelar', style: TextStyle(color: AppColors.textMuted)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.emerald),
            onPressed: () async {
              final newVal = double.tryParse(controller.text) ?? currentBudget;
              setState(() {
                item['budget'] = newVal;
              });
              final type = item['type']?.toString() ?? 'campaign';
              await SupabaseService.updateEntityBudget(item['id'].toString(), type, newVal);
              if (mounted) Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Orçamento de "${item['name']}" atualizado para R\$ ${newVal.toStringAsFixed(2)}/dia!'),
                  backgroundColor: AppColors.emerald,
                ),
              );
            },
            child: const Text('Salvar Orçamento', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
          ),
        ],
      ),
    );
  }

  Widget _buildEntityList(List<Map<String, dynamic>> items, {required bool isAd}) {
    final currencyFormatter = NumberFormat.currency(locale: 'pt_BR', symbol: 'R\$');
    final filtered = items.where((it) {
      final nameMatches = it['name'].toString().toLowerCase().contains(searchQuery.toLowerCase());
      if (!nameMatches) return false;
      
      if (showOnlyActive) {
        final isActive = (it['status'] ?? true) as bool;
        if (!isActive) return false;
      }
      
      return true;
    }).toList();

    if (isLoading) {
      return const Center(child: CircularProgressIndicator(color: AppColors.primary));
    }

    if (filtered.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.layers_clear, size: 48, color: AppColors.textMuted.withOpacity(0.5)),
            const SizedBox(height: 12),
            const Text('Nenhum item encontrado para este produto.', style: TextStyle(color: AppColors.textMuted)),
          ],
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: filtered.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (ctx, i) {
        final item = filtered[i];
        final bool isActive = (item['status'] ?? true) as bool;
        final double faturamento = double.tryParse(item['faturamento']?.toString() ?? '0') ?? 0.0;
        final double gasto = double.tryParse(item['gasto']?.toString() ?? '0') ?? 0.0;
        final double lucro = double.tryParse(item['lucro']?.toString() ?? '0') ?? 0.0;
        final double roas = double.tryParse(item['roas']?.toString() ?? '0') ?? 0.0;
        final double cpa = double.tryParse(item['cpa']?.toString() ?? '0') ?? 0.0;
        final int vendas = int.tryParse(item['vendas']?.toString() ?? '0') ?? 0;
        final double? budget = item['budget'] != null ? double.tryParse(item['budget'].toString()) : null;

        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.cardBg,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isActive ? AppColors.emerald.withOpacity(0.3) : AppColors.cardBorder,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Linha Superior: Nome + Switch ON/OFF
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: (isActive ? AppColors.emerald : AppColors.amber).withOpacity(0.15),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      isActive ? Icons.play_arrow : Icons.pause,
                      color: isActive ? AppColors.emerald : AppColors.amber,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          item['name'].toString(),
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.white),
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: (isActive ? AppColors.emerald : AppColors.amber).withOpacity(0.2),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                isActive ? 'ATIVO' : 'PAUSADO',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  color: isActive ? AppColors.emerald : AppColors.amber,
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              'Produto: ${item['product'] ?? selectedProduct}',
                              style: const TextStyle(fontSize: 10, color: AppColors.textMuted),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  Switch(
                    value: isActive,
                    activeThumbColor: AppColors.emerald,
                    onChanged: (_) => _toggleEntityStatus(item),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Linha de Orçamento Diário + Botão Alterar Orçamento (Apenas para Campanhas e Conjuntos)
              if (!isAd && budget != null) ...[
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.03),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppColors.cardBorder),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.attach_money, color: AppColors.primary, size: 16),
                          const SizedBox(width: 4),
                          Text(
                            'Orçamento: ${currencyFormatter.format(budget)}/dia',
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                        ],
                      ),
                      TextButton.icon(
                        onPressed: () => _showBudgetDialog(item),
                        icon: const Icon(Icons.edit, size: 14, color: AppColors.primary),
                        label: const Text('Alterar Orçamento', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primary)),
                        style: TextButton.styleFrom(padding: EdgeInsets.zero),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
              ],

              // Grid de Métricas no Estilo do Web App
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        _buildMetricTile('Faturamento', currencyFormatter.format(faturamento), color: Colors.white),
                        _buildMetricTile('Gasto (Spend)', currencyFormatter.format(gasto), color: AppColors.amber),
                        _buildMetricTile('Lucro Líquido', currencyFormatter.format(lucro), color: AppColors.emerald),
                      ],
                    ),
                    const Divider(color: AppColors.cardBorder, height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        _buildMetricTile('ROAS', '${roas.toStringAsFixed(2)}x', color: AppColors.primary),
                        _buildMetricTile('CPA Médio', currencyFormatter.format(cpa), color: Colors.white),
                        _buildMetricTile('Vendas', '$vendas un', color: AppColors.emerald),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildMetricTile(String label, String value, {required Color color}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 10, color: AppColors.textMuted)),
        const SizedBox(height: 2),
        Text(value, style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: color)),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.cardBg,
        elevation: 0,
        title: const Text(
          'Meta Ads & Otimização',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Colors.white),
        ),
        bottom: TabBar(
          controller: _hierarchyTabController,
          indicatorColor: AppColors.primary,
          labelColor: AppColors.primary,
          unselectedLabelColor: AppColors.textMuted,
          labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
          tabs: const [
            Tab(text: '📁 Campanhas'),
            Tab(text: '📂 Conjuntos'),
            Tab(text: '📄 Anúncios'),
          ],
        ),
      ),
      body: Column(
        children: [
          // Barra de Filtro de Produto & Busca (Estilo Web)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            color: AppColors.cardBg,
            child: Column(
              children: [
                Row(
                  children: [
                    const Icon(Icons.shopping_bag_outlined, color: AppColors.primary, size: 18),
                    const SizedBox(width: 8),
                    const Text('Selecione o Produto:', style: TextStyle(fontSize: 12, color: AppColors.textMuted, fontWeight: FontWeight.bold)),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.05),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: AppColors.cardBorder),
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: selectedProduct,
                            isExpanded: true,
                            dropdownColor: AppColors.cardBg,
                            style: const TextStyle(fontSize: 13, color: Colors.white, fontWeight: FontWeight.bold),
                            onChanged: (val) {
                              if (val != null) {
                                setState(() => selectedProduct = val);
                                _loadData();
                              }
                            },
                            items: productList.map((p) {
                              return DropdownMenuItem<String>(
                                value: p,
                                child: Text(p, style: const TextStyle(color: Colors.white)),
                              );
                            }).toList(),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.05),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: AppColors.cardBorder),
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: selectedPeriod,
                            isExpanded: true,
                            dropdownColor: AppColors.cardBg,
                            style: const TextStyle(fontSize: 12, color: Colors.white, fontWeight: FontWeight.bold),
                            onChanged: (val) {
                              if (val != null) {
                                setState(() => selectedPeriod = val);
                                _loadData();
                              }
                            },
                            items: ['Hoje', 'Ontem', 'Mês Atual', 'Máximo'].map((p) {
                              return DropdownMenuItem<String>(
                                value: p,
                                child: Text(p, style: const TextStyle(color: Colors.white)),
                              );
                            }).toList(),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.05),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: AppColors.cardBorder),
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: selectedAccount,
                            isExpanded: true,
                            dropdownColor: AppColors.cardBg,
                            style: const TextStyle(fontSize: 12, color: Colors.white, fontWeight: FontWeight.bold),
                            onChanged: (val) {
                              if (val != null) {
                                setState(() => selectedAccount = val);
                                _loadData();
                              }
                            },
                            items: adAccountOptions.map((p) {
                              return DropdownMenuItem<String>(
                                value: p,
                                child: Text(p, style: const TextStyle(color: Colors.white), overflow: TextOverflow.ellipsis),
                              );
                            }).toList(),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                // Campo de Busca e Toggle Ativas
                Row(
                  children: [
                    Expanded(
                      flex: 2,
                      child: TextField(
                        onChanged: (v) => setState(() => searchQuery = v),
                        style: const TextStyle(color: Colors.white, fontSize: 13),
                        decoration: InputDecoration(
                          hintText: 'Buscar...',
                          hintStyle: const TextStyle(color: AppColors.textMuted, fontSize: 12),
                          prefixIcon: const Icon(Icons.search, color: AppColors.textMuted, size: 18),
                          filled: true,
                          fillColor: Colors.white.withOpacity(0.04),
                          contentPadding: const EdgeInsets.symmetric(vertical: 10),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                            borderSide: const BorderSide(color: AppColors.cardBorder),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      flex: 1,
                      child: GestureDetector(
                        onTap: () => setState(() => showOnlyActive = !showOnlyActive),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 13, horizontal: 8),
                          decoration: BoxDecoration(
                            color: showOnlyActive ? AppColors.emerald.withOpacity(0.2) : Colors.white.withOpacity(0.04),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: showOnlyActive ? AppColors.emerald : AppColors.cardBorder),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.check_circle_outline, color: showOnlyActive ? AppColors.emerald : AppColors.textMuted, size: 16),
                              const SizedBox(width: 4),
                              Text('Ativas', style: TextStyle(color: showOnlyActive ? AppColors.emerald : AppColors.textMuted, fontSize: 12, fontWeight: FontWeight.bold)),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Conteúdo das Abas de Hierarquia (Campanhas, Conjuntos, Anúncios)
          Expanded(
            child: TabBarView(
              controller: _hierarchyTabController,
              children: [
                _buildEntityList(campaigns, isAd: false),
                _buildEntityList(adsets, isAd: false),
                _buildEntityList(ads, isAd: true),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
