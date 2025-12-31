-- Create notices table
-- First ensure is_admin exists on user_profiles for the policies to work
alter table public.user_profiles add column if not exists is_admin boolean default false;

create table if not exists public.notices (
    id uuid default gen_random_uuid() primary key,
    title text not null,
    description text,
    image_url text,
    type text check (type in ('news', 'exam', 'promo', 'update')) default 'news',
    action_url text,
    active boolean default true,
    priority int default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.notices enable row level security;

-- Policies
create policy "Allow public read access" on public.notices
    for select using (true);

create policy "Allow admin write access" on public.notices
    for all using ( auth.uid() in (select id from public.user_profiles where is_admin = true) )
    with check ( auth.uid() in (select id from public.user_profiles where is_admin = true) );

-- Insert sample data
insert into public.notices (title, description, type, priority, action_url)
values
    ('Novo Edital Publicado!', 'O edital para o CFS 2026 já está disponível. Confira as principais mudanças.', 'exam', 10, 'https://www.policiamilitar.mg.gov.br/'),
    ('Promoção de Assinatura', 'Assine o plano Semestral com 20% de desconto por tempo limitado!', 'promo', 5, '/subscription'),
    ('Atualização do App', 'Novas questões de Direito Penal Militar adicionadas.', 'update', 1, null);
