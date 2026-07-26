class AuthorizedUser {
  final String id;
  final String email;
  final String role;
  final String status;
  final String? createdAt;

  AuthorizedUser({
    required this.id,
    required this.email,
    required this.role,
    required this.status,
    this.createdAt,
  });

  factory AuthorizedUser.fromJson(Map<String, dynamic> json) {
    return AuthorizedUser(
      id: json['id']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      role: json['role']?.toString() ?? 'Viewer',
      status: json['status']?.toString() ?? 'pending',
      createdAt: json['created_at']?.toString(),
    );
  }

  bool get isApproved => status == 'approved' || email.toLowerCase().trim() == 'caioluispeixotos@gmail.com';
  bool get isAdmin => role == 'Admin' || email.toLowerCase().trim() == 'caioluispeixotos@gmail.com';
}
