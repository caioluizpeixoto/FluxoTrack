import 'dart:convert';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:http/http.dart' as http;
import '../constants.dart';
import '../models/authorized_user_model.dart';
import 'notification_service.dart';

class SupabaseService {
  static final SupabaseClient _client = Supabase.instance.client;

  // Obter o usuário atualmente autenticado
  static User? get currentUser => _client.auth.currentUser;
  static String get currentEmail => currentUser?.email ?? '';
  static bool get isMainAdmin =>
      currentEmail.trim().toLowerCase() == AppConstants.adminEmail;

  // Login com E-mail e Senha
  static Future<AuthResponse> signInWithEmail(String email, String password) async {
    return await _client.auth.signInWithPassword(
      email: email.trim().toLowerCase(),
      password: password,
    );
  }

  static Future<AuthResponse> signInWithPassword({required String email, required String password}) async {
    return await signInWithEmail(email, password);
  }

  // Cadastro de Novo Usuário (E-mail e Senha)
  static Future<AuthResponse> signUpWithEmail(String email, String password) async {
    final res = await _client.auth.signUp(
      email: email.trim().toLowerCase(),
      password: password,
    );

    final cleanEmail = email.trim().toLowerCase();
    if (cleanEmail != AppConstants.adminEmail) {
      try {
        await _client.from('authorized_users').upsert({
          'email': cleanEmail,
          'role': 'Viewer',
          'status': 'pending',
        });
      } catch (e) {
        print('Nota: registro de autorização salvo: $e');
      }
    }

    return res;
  }

  static Future<AuthResponse> signUp({required String email, required String password}) async {
    return await signUpWithEmail(email, password);
  }

  // Redefinir Senha
  static Future<void> resetPassword(String email) async {
    await _client.auth.resetPasswordForEmail(email.trim().toLowerCase());
  }

  // Login com Google OAuth
  static Future<bool> signInWithGoogle() async {
    return await _client.auth.signInWithOAuth(
      OAuthProvider.google,
      redirectTo: 'io.supabase.fluxofy://login-callback/',
    );
  }

  // Deslogar do aplicativo
  static Future<void> signOut() async {
    NotificationService.logout();
    await _client.auth.signOut();
  }

  // Verificar o status de aprovação do usuário na tabela authorized_users
  static Future<String> checkUserApprovalStatus(String email) async {
    final cleanEmail = email.trim().toLowerCase();

    if (cleanEmail == AppConstants.adminEmail) {
      return 'approved';
    }

    try {
      final response = await _client
          .from('authorized_users')
          .select('status')
          .eq('email', cleanEmail)
          .maybeSingle();

      if (response != null && response['status'] != null) {
        return response['status'].toString();
      }
    } catch (e) {
      print('Erro ao verificar status do usuário: $e');
    }

    return 'pending';
  }

  static Future<String> checkUserStatus(String email) async {
    return await checkUserApprovalStatus(email);
  }

  // Buscar Lista de Produtos Disponíveis
  static Future<List<String>> fetchProductsList() async {
    try {
      final prods = await _client.from('products').select('name');
      final List list = prods as List;
      final names = list
          .map((p) => p['name']?.toString() ?? '')
          .where((n) => n.isNotEmpty)
          .toSet()
          .toList();
      if (names.isNotEmpty) {
        return ['Todos os Produtos', ...names];
      }
    } catch (_) {}
    return ['Todos os Produtos', 'Glokad', 'Curso de Tráfego Pago'];
  }

  // Buscar todos os eventos da tabela 'product_events'
  static Future<List<Map<String, dynamic>>> _fetchAllRawEvents() async {
    try {
      final prodEvents = await _client
          .from('product_events')
          .select('*')
          .order('created_at', ascending: false)
          .limit(50000);

      final List peList = prodEvents as List;
      if (peList.isNotEmpty) {
        return peList.map((e) => Map<String, dynamic>.from(e)).toList();
      }
    } catch (_) {}

    return [];
  }

  // Buscar produtos da tabela 'products'
  static Future<Map<String, String>> _fetchProductNamesMap() async {
    final Map<String, String> map = {};
    try {
      final prods = await _client.from('products').select('id, name');
      final List list = prods as List;
      for (var p in list) {
        if (p['id'] != null) {
          map[p['id'].toString()] = p['name']?.toString() ?? 'Produto';
        }
      }
    } catch (_) {}
    return map;
  }

  static bool _isDateInPeriod(DateTime dt, String period) {
    final now = DateTime.now();
    final localDt = dt.toLocal();

    if (period == 'Hoje') {
      return localDt.year == now.year &&
          localDt.month == now.month &&
          localDt.day == now.day;
    } else if (period == 'Ontem') {
      final yest = now.subtract(const Duration(days: 1));
      return localDt.year == yest.year &&
          localDt.month == yest.month &&
          localDt.day == yest.day;
    } else if (period == 'Últimos 7 dias') {
      final sevenDaysAgo = now.subtract(const Duration(days: 7));
      return localDt.isAfter(sevenDaysAgo);
    } else if (period == 'Mês Atual') {
      return localDt.year == now.year && localDt.month == now.month;
    }

    return true; // "Máximo" ou qualquer outro
  }

  // Buscar Métrica de Resumo (Faturamento Líquido, Lucro, ROI, ROAS, Vendas Aprovadas vs Pendentes)
  static Future<Map<String, dynamic>> fetchDashboardMetrics({
    String period = 'Hoje',
    String? platform,
    String? product = 'Todos os Produtos',
  }) async {
    try {
      final prodNameMap = await _fetchProductNamesMap();
      final evList = await _fetchAllRawEvents();

      double totalAprovado = 0.0;
      double totalPendente = 0.0;
      int aprovadasCount = 0;
      int pendentesCount = 0;
      
      String normalize(String s) => s.toLowerCase().replaceAll(RegExp(r'[áàâã]'), 'a').replaceAll(RegExp(r'[éèê]'), 'e').replaceAll(RegExp(r'[íìî]'), 'i').replaceAll(RegExp(r'[óòôõ]'), 'o').replaceAll(RegExp(r'[úùû]'), 'u');

      String? selectedProductId;
      if (product != null && product != 'Todos os Produtos' && product != 'Qualquer') {
        final pNorm = normalize(product);
        prodNameMap.forEach((k, v) {
          if (normalize(v) == pNorm) selectedProductId = k;
        });
      }

      for (var ev in evList) {
        // 1. Filtragem por Data / Período
        final createdStr = ev['created_at']?.toString();
        if (createdStr != null) {
          final dt = DateTime.tryParse(createdStr);
          if (dt != null && !_isDateInPeriod(dt, period)) {
            continue; // Fora do período selecionado
          }
        }

        // 2. Filtragem por Produto Robusta
        if (product != null && product != 'Qualquer' && product != 'Todos os Produtos') {
          final pId = ev['product_id']?.toString();
          
          if (selectedProductId != null && pId != null) {
            // Se temos IDs, comparamos os IDs diretamente
            if (pId != selectedProductId) continue;
          } else {
            // Fallback para nome (removendo acentos básicos para garantir o match Inglês == Ingles)
            final resolvedProdName = (pId != null && prodNameMap.containsKey(pId))
                ? prodNameMap[pId]
                : (ev['product_name'] ?? ev['campaign_name'] ?? ev['utm_campaign']);
                
            String normalize(String s) => s.toLowerCase().replaceAll(RegExp(r'[áàâã]'), 'a').replaceAll(RegExp(r'[éèê]'), 'e').replaceAll(RegExp(r'[íìî]'), 'i').replaceAll(RegExp(r'[óòôõ]'), 'o').replaceAll(RegExp(r'[úùû]'), 'u');

            if (resolvedProdName != null) {
              final rName = normalize(resolvedProdName.toString());
              final pName = normalize(product);
              if (!rName.contains(pName)) {
                continue; // Produto não corresponde
              }
            } else {
              continue; // Não achou nome pra comparar
            }
          }
        }

        final val = double.tryParse(ev['event_value']?.toString() ?? '0') ?? 0.0;
        final status = (ev['status']?.toString() ?? 'approved').toLowerCase();
        final type = (ev['event_type']?.toString() ?? 'purchase').toLowerCase();

        if (status == 'approved' || status == 'paid') {
          totalAprovado += val;
          aprovadasCount++;
        } else if (status == 'pending' || status == 'generated') {
          totalPendente += val;
          pendentesCount++;
        }
      }

      // --- Meta Ads Live Fetch ---
      double totalSpend = 0.0;
      final userId = currentUser?.id;
      
      if (userId != null) {
        // Encontrar as contas de anúncios
        List<String> accountIdsToFetch = [];
        if (selectedProductId != null) {
          final accLink = await _client.from('product_ad_accounts').select('ad_account_id').eq('product_id', selectedProductId!).maybeSingle();
          if (accLink != null && accLink['ad_account_id'] != null) {
            accountIdsToFetch.add(accLink['ad_account_id'].toString());
          }
        } else {
          // Todos os produtos -> pegar todas as contas vinculadas
          final accLinks = await _client.from('product_ad_accounts').select('ad_account_id').eq('user_id', userId);
          final List list = accLinks as List;
          for (var l in list) {
            if (l['ad_account_id'] != null) accountIdsToFetch.add(l['ad_account_id'].toString());
          }
          accountIdsToFetch = accountIdsToFetch.toSet().toList();
        }

        double fallbackAprovado = 0.0;
        int fallbackCount = 0;

        // Para cada conta, buscar no Vercel
        for (var accId in accountIdsToFetch) {
          // mapear datePreset
          String preset = 'maximum';
          if (period == 'Hoje') preset = 'today';
          if (period == 'Ontem') preset = 'yesterday';
          if (period == 'Últimos 7 dias') preset = 'last_7d';
          if (period == 'Mês Atual') preset = 'this_month';
          
          final insights = await fetchLiveMetaInsights(accId, preset, 'BRL');
          final camps = insights['campaigns'] as List?;
          if (camps != null) {
            for (var c in camps) {
              totalSpend += double.tryParse(c['spend']?.toString() ?? '0') ?? 0.0;
              fallbackAprovado += double.tryParse(c['revenue']?.toString() ?? c['purchase_value']?.toString() ?? '0') ?? 0.0;
              fallbackCount += int.tryParse(c['purchases']?.toString() ?? '0') ?? 0;
            }
          }
        }
        
        // Se não houver eventos no banco, usamos o rastreio do Meta Ads como o Web App
        if (aprovadasCount == 0 && fallbackAprovado > 0) {
           totalAprovado = fallbackAprovado;
           aprovadasCount = fallbackCount;
        }
      }

      final lucro = totalAprovado - totalSpend;
      final roi = totalSpend > 0 ? (lucro / totalSpend) : 0.0;
      final roas = totalSpend > 0 ? (totalAprovado / totalSpend) : 0.0;

      return {
        'faturamentoLiquido': totalAprovado,
        'faturamentoPendente': totalPendente,
        'lucro': lucro,
        'roi': roi,
        'roas': roas,
        'vendasAprovadas': aprovadasCount,
        'vendasPendentes': pendentesCount,
        'gastoAds': totalSpend,
      };
    } catch (e) {
      print('Erro ao calcular métricas do banco: $e');
    }

    return {
      'faturamentoLiquido': 0.0,
      'faturamentoPendente': 0.0,
      'lucro': 0.0,
      'roi': 0.0,
      'roas': 0.0,
      'vendasAprovadas': 0,
      'vendasPendentes': 0,
      'gastoAds': 0.0,
    };
  }

  static Future<double> fetchTotalRevenue() async {
    final metrics = await fetchDashboardMetrics();
    return (metrics['faturamentoLiquido'] ?? 0.0) as double;
  }

  // Buscar Contas de Anúncio Reais
  static Future<List<String>> fetchMetaAdAccounts() async {
    try {
      final userId = currentUser?.id;
      if (userId == null) return ['Todas'];
      final res = await _client.from('meta_ad_accounts').select('account_name').eq('user_id', userId);
      final List list = res as List;
      final names = list.map((a) => a['account_name']?.toString() ?? '').where((n) => n.isNotEmpty).toSet().toList();
      if (names.isNotEmpty) return ['Todas', ...names];
    } catch (e) {
      print('Erro ao buscar ad_accounts: $e');
    }
    return ['Todas'];
  }

  static Future<Map<String, dynamic>> fetchLiveMetaInsights(String accountId, String datePreset, String currency) async {
    try {
      final userId = currentUser?.id;
      if (userId == null) return {};

      final url = Uri.parse('https://fluxo-track.vercel.app/api/meta/insights');
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'userId': userId,
          'accountId': accountId,
          'level': 'all',
          'datePreset': datePreset,
          'targetCurrency': currency,
        }),
      );
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          return data['insights'] ?? {};
        }
      }
    } catch (e) {
      print('Erro ao buscar live insights: $e');
    }
    return {};
  }

  // Buscar Meta Ads em Hierarquia Real (Campanhas, Conjuntos de Anúncios, Anúncios)
  static Future<Map<String, List<Map<String, dynamic>>>> fetchMetaHierarchy({
    String selectedProduct = 'Todos os Produtos',
    String selectedAccount = 'Todas',
    String period = 'Hoje',
  }) async {
    try {
      final userId = currentUser?.id;
      if (userId == null) return {'campaigns': [], 'adsets': [], 'ads': []};
      
      // Determine account IDs
      List<String> accountIdsToFetch = [];
      String? productId;
      
      String normalize(String s) => s.toLowerCase().replaceAll(RegExp(r'[áàâã]'), 'a').replaceAll(RegExp(r'[éèê]'), 'e').replaceAll(RegExp(r'[íìî]'), 'i').replaceAll(RegExp(r'[óòôõ]'), 'o').replaceAll(RegExp(r'[úùû]'), 'u');

      if (selectedProduct != 'Todos os Produtos' && selectedProduct != 'Qualquer') {
        final prodNameMap = await _fetchProductNamesMap();
        final pNorm = normalize(selectedProduct);
        prodNameMap.forEach((k, v) {
          if (normalize(v) == pNorm) productId = k;
        });

        if (productId != null) {
          final accLink = await _client.from('product_ad_accounts').select('ad_account_id').eq('product_id', productId!).maybeSingle();
          if (accLink != null && accLink['ad_account_id'] != null) {
            accountIdsToFetch.add(accLink['ad_account_id'].toString());
          }
        }
      } else {
        final accLinks = await _client.from('product_ad_accounts').select('ad_account_id').eq('user_id', userId);
        final List list = accLinks as List;
        for (var l in list) {
          if (l['ad_account_id'] != null) accountIdsToFetch.add(l['ad_account_id'].toString());
        }
      }
      
      // Se selecionou uma conta específica, filtra a lista final de accountIdsToFetch
      if (selectedAccount != 'Todas' && selectedAccount != 'Qualquer') {
        final accRes = await _client.from('meta_ad_accounts').select('account_id').eq('account_name', selectedAccount).eq('user_id', userId).maybeSingle();
        if (accRes != null && accRes['account_id'] != null) {
           final specificId = accRes['account_id'].toString();
           // Se o produto foi selecionado e a conta dele for diferente da conta selecionada no dropdown, talvez dê array vazio (comportamento correto)
           if (accountIdsToFetch.isNotEmpty) {
             accountIdsToFetch = accountIdsToFetch.where((id) => id == specificId).toList();
           } else {
             accountIdsToFetch.add(specificId);
           }
        } else {
           accountIdsToFetch.clear(); // conta selecionada nao existe
        }
      }
      
      accountIdsToFetch = accountIdsToFetch.toSet().toList();

      List<Map<String, dynamic>> campaigns = [];
      List<Map<String, dynamic>> adsets = [];
      List<Map<String, dynamic>> ads = [];

      for (var accId in accountIdsToFetch) {
        String preset = 'maximum';
        if (period == 'Hoje') preset = 'today';
        if (period == 'Ontem') preset = 'yesterday';
        if (period == 'Últimos 7 dias') preset = 'last_7d';
        if (period == 'Mês Atual') preset = 'this_month';

        final insights = await fetchLiveMetaInsights(accId, preset, 'BRL');
        final cList = insights['campaigns'] as List? ?? [];
        final aList = insights['adsets'] as List? ?? [];
        final adList = insights['ads'] as List? ?? [];

        campaigns.addAll(cList.map((e) => Map<String, dynamic>.from(e)));
        adsets.addAll(aList.map((e) => Map<String, dynamic>.from(e)));
        ads.addAll(adList.map((e) => Map<String, dynamic>.from(e)));
      }

      // Format campaigns
      campaigns = campaigns.map((c) {
        final spend = double.tryParse(c['spend']?.toString() ?? '0') ?? 0.0;
        final revenue = double.tryParse(c['revenue']?.toString() ?? c['purchase_value']?.toString() ?? '0') ?? 0.0;
        final lucro = revenue - spend;
        final roas = double.tryParse(c['roas']?.toString() ?? '0') ?? 0.0;
        final clicks = int.tryParse(c['clicks']?.toString() ?? '0') ?? 0;
        final cpc = double.tryParse(c['cpc']?.toString() ?? '0') ?? 0.0;
        final vendas = int.tryParse(c['purchases']?.toString() ?? '0') ?? 0;
        final cpa = vendas > 0 ? spend / vendas : 0.0;

        return {
          'id': c['campaign_id']?.toString() ?? c['id']?.toString() ?? '',
          'type': 'campaign',
          'name': c['campaign_name']?.toString() ?? c['name']?.toString() ?? '',
          'status': (c['status']?.toString().toUpperCase() ?? 'ACTIVE') == 'ACTIVE',
          'budget': (double.tryParse(c['daily_budget']?.toString() ?? '0') ?? 0.0) / 100.0,
          'faturamento': revenue,
          'gasto': spend,
          'lucro': lucro,
          'roas': roas,
          'clicks': clicks,
          'cpc': cpc,
          'vendas': vendas,
          'cpa': cpa,
          'margin': revenue > 0 ? (lucro / revenue) * 100 : 0.0,
        };
      }).toList();

      // Format adsets
      adsets = adsets.map((a) {
        final spend = double.tryParse(a['spend']?.toString() ?? '0') ?? 0.0;
        final revenue = double.tryParse(a['purchase_value']?.toString() ?? '0') ?? 0.0;
        final vendas = int.tryParse(a['purchases']?.toString() ?? '0') ?? 0;
        return {
          'id': a['adset_id']?.toString() ?? a['id']?.toString() ?? '',
          'type': 'adset',
          'campaign_id': a['campaign_id']?.toString() ?? '',
          'name': a['adset_name']?.toString() ?? a['name']?.toString() ?? '',
          'status': (a['status']?.toString().toUpperCase() ?? 'ACTIVE') == 'ACTIVE',
          'budget': (double.tryParse(a['daily_budget']?.toString() ?? '0') ?? 0.0) / 100.0,
          'faturamento': revenue,
          'gasto': spend,
          'vendas': vendas,
          'roas': double.tryParse(a['roas']?.toString() ?? '0') ?? 0.0,
          'cpa': vendas > 0 ? spend / vendas : 0.0,
        };
      }).toList();

      // Format ads
      ads = ads.map((a) {
        final spend = double.tryParse(a['spend']?.toString() ?? '0') ?? 0.0;
        final revenue = double.tryParse(a['purchase_value']?.toString() ?? '0') ?? 0.0;
        final vendas = int.tryParse(a['purchases']?.toString() ?? '0') ?? 0;
        return {
          'id': a['ad_id']?.toString() ?? a['id']?.toString() ?? '',
          'type': 'ad',
          'adset_id': a['adset_id']?.toString() ?? '',
          'name': a['ad_name']?.toString() ?? a['name']?.toString() ?? '',
          'status': (a['status']?.toString().toUpperCase() ?? 'ACTIVE') == 'ACTIVE',
          'faturamento': revenue,
          'gasto': spend,
          'vendas': vendas,
          'roas': double.tryParse(a['roas']?.toString() ?? '0') ?? 0.0,
          'cpa': vendas > 0 ? spend / vendas : 0.0,
        };
      }).toList();

      if (productId != null) {
        final searchNorm = normalize(selectedProduct);
        campaigns = campaigns.where((c) => normalize(c['name'].toString()).contains(searchNorm)).toList();
        final campaignIds = campaigns.map((c) => c['id']).toSet();
        adsets = adsets.where((a) => campaignIds.contains(a['campaign_id']) || normalize(a['name'].toString()).contains(searchNorm)).toList();
        final adsetIds = adsets.map((a) => a['id']).toSet();
        ads = ads.where((ad) => adsetIds.contains(ad['adset_id']) || normalize(ad['name'].toString()).contains(searchNorm)).toList();
      }

      return {
        'campaigns': campaigns,
        'adsets': adsets,
        'ads': ads,
      };
    } catch (e) {
      print('Erro ao buscar dados Meta: $e');
      return {'campaigns': [], 'adsets': [], 'ads': []};
    }
  }

  // Buscar Campanhas / Regras para a tela estilo UTMify
  static Future<List<Map<String, dynamic>>> fetchCampaigns() async {
    final hier = await fetchMetaHierarchy();
    return hier['campaigns'] ?? [];
  }

  // Alternar status ON/OFF da campanha, conjunto ou anúncio
  static Future<void> toggleEntityStatus(String entityId, String type, bool newStatus) async {
    final statusStr = newStatus ? 'ACTIVE' : 'PAUSED';
    final userId = currentUser?.id;
    if (userId == null) return;
    
    try {
      final url = Uri.parse('https://fluxo-track.vercel.app/api/meta/manage');
      await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'userId': userId,
          'type': type,
          'id': entityId,
          'payload': {'status': statusStr},
        }),
      );
    } catch (e) {
      print('Erro ao alterar status: $e');
    }
  }

  // Atualizar Orçamento Diário de Campanha ou Conjunto
  static Future<void> updateEntityBudget(String entityId, String type, double newBudget) async {
    final userId = currentUser?.id;
    if (userId == null) return;

    try {
      final url = Uri.parse('https://fluxo-track.vercel.app/api/meta/manage');
      await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'userId': userId,
          'type': type,
          'id': entityId,
          'payload': {'daily_budget': newBudget},
        }),
      );
    } catch (e) {
      print('Erro ao alterar orçamento: $e');
    }
  }

  // Buscar Feed de Eventos de Vendas Ao Vivo (Aprovadas & Pendentes)
  static Future<List<Map<String, dynamic>>> fetchLiveEvents() async {
    try {
      final prodNameMap = await _fetchProductNamesMap();
      final evList = await _fetchAllRawEvents();
      if (evList.isNotEmpty) {
        return evList.map((e) {
          final map = Map<String, dynamic>.from(e);
          final pId = map['product_id']?.toString();
          if (pId != null && prodNameMap.containsKey(pId)) {
            map['product_name'] = prodNameMap[pId];
          } else if (map['product_name'] == null) {
            map['product_name'] = map['campaign_name'] ?? map['utm_campaign'] ?? 'Glokad';
          }
          
          if (map['raw_payload'] != null && map['raw_payload'] is Map) {
            final payload = map['raw_payload'] as Map<String, dynamic>;
            map['customer_name'] = payload['Customer']?['full_name'] ?? payload['customer']?['name'] ?? payload['buyer']?['name'] ?? payload['Customer']?['first_name'] ?? 'Cliente anônimo';
            map['customer_email'] = payload['Customer']?['email'] ?? payload['customer']?['email'] ?? payload['buyer']?['email'] ?? 'Sem email';
          }
          
          return map;
        }).toList();
      }
    } catch (e) {
      print('Erro ao buscar eventos: $e');
    }

    return [];
  }

  // Buscar usuários para o Painel Admin
  static Future<List<AuthorizedUser>> fetchUsers() async {
    try {
      final response = await _client
          .from('authorized_users')
          .select('*')
          .order('created_at', ascending: false);

      final List data = response as List;
      return data.map((json) => AuthorizedUser.fromJson(json)).toList();
    } catch (e) {
      print('Erro ao buscar usuários admin: $e');
      return [];
    }
  }

  // Aprovar Acesso do Usuário
  static Future<bool> approveUser(String id, String email) async {
    try {
      await _client
          .from('authorized_users')
          .update({'status': 'approved'}).eq('id', id);
      return true;
    } catch (e) {
      print('Erro ao aprovar usuário: $e');
      return false;
    }
  }

  // Rejeitar / Revogar Usuário
  static Future<bool> rejectUser(String id) async {
    try {
      await _client.from('authorized_users').delete().eq('id', id);
      return true;
    } catch (e) {
      print('Erro ao rejeitar usuário: $e');
      return false;
    }
  }

  // Pré-Aprovar E-mail
  static Future<bool> inviteUser(String email) async {
    try {
      await _client.from('authorized_users').upsert({
        'email': email.trim().toLowerCase(),
        'role': 'Viewer',
        'status': 'approved',
      });
      return true;
    } catch (e) {
      print('Erro ao pré-aprovar e-mail: $e');
      return false;
    }
  }
}
