-- Seed data: Insert first admin user
-- Senha temporária: admin123 (hash bcrypt)

INSERT INTO public.admin_users (
  email,
  password_hash,
  full_name,
  role,
  is_active
) VALUES (
  'admin@cliniva.com.br',
  '$2b$10$SsY7Hd4f3lKqR6Nz9mJ0ZOxLt2V8wQpK1aB3cD4eF5gH6iJ7kL8',
  'Admin Cliniva',
  'super_admin',
  true
)
ON CONFLICT (email) DO NOTHING;
