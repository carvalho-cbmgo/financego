create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key,
  email text unique,
  full_name text,
  created_at timestamptz not null default now()
);

create table if not exists financial_items (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  connector_name text,
  institution_name text,
  status text default 'created',
  last_sync_at timestamptz,
  next_sync_at timestamptz default now(),
  last_error text,
  sync_priority integer not null default 5,
  sync_enabled boolean not null default true,
  webhook_dirty boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  financial_item_id uuid references financial_items(id) on delete cascade,
  type text,
  subtype text,
  name text,
  currency_code text default 'BRL',
  balance numeric(14,2),
  credit_limit numeric(14,2),
  institution_name text,
  last_balance_at timestamptz,
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  account_id uuid references accounts(id) on delete cascade,
  description text,
  merchant text,
  amount numeric(14,2) not null,
  currency_code text default 'BRL',
  posted_at timestamptz,
  status text,
  type text,
  source_category text,
  app_category text,
  app_subcategory text,
  is_transfer boolean default false,
  is_ignored boolean default false,
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists credit_card_bills (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  account_id uuid references accounts(id) on delete cascade,
  due_date date,
  close_date date,
  total_amount numeric(14,2),
  minimum_amount numeric(14,2),
  status text,
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists budgets (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  month_ref text not null,
  category text not null,
  planned_amount numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(profile_id, month_ref, category)
);

create table if not exists financial_goals (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  name text not null,
  target_amount numeric(14,2) not null,
  current_amount numeric(14,2) not null default 0,
  target_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sync_runs (
  id uuid primary key default gen_random_uuid(),
  financial_item_id uuid references financial_items(id) on delete cascade,
  mode text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text default 'running',
  synced_accounts integer default 0,
  synced_transactions integer default 0,
  message text
);

create table if not exists sync_logs (
  id uuid primary key default gen_random_uuid(),
  financial_item_id uuid references financial_items(id) on delete cascade,
  level text not null,
  message text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_financial_items_next_sync on financial_items(sync_enabled, next_sync_at);
create index if not exists idx_transactions_profile_posted on transactions(profile_id, posted_at desc);
create index if not exists idx_budgets_profile_month on budgets(profile_id, month_ref);
create index if not exists idx_goals_profile on financial_goals(profile_id);

create or replace function touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_financial_items_updated_at on financial_items;
create trigger trg_financial_items_updated_at before update on financial_items for each row execute function touch_updated_at();

drop trigger if exists trg_accounts_updated_at on accounts;
create trigger trg_accounts_updated_at before update on accounts for each row execute function touch_updated_at();

drop trigger if exists trg_transactions_updated_at on transactions;
create trigger trg_transactions_updated_at before update on transactions for each row execute function touch_updated_at();

drop trigger if exists trg_credit_card_bills_updated_at on credit_card_bills;
create trigger trg_credit_card_bills_updated_at before update on credit_card_bills for each row execute function touch_updated_at();

drop trigger if exists trg_budgets_updated_at on budgets;
create trigger trg_budgets_updated_at before update on budgets for each row execute function touch_updated_at();

drop trigger if exists trg_goals_updated_at on financial_goals;
create trigger trg_goals_updated_at before update on financial_goals for each row execute function touch_updated_at();


-- v5: ingestão por notificações bancárias recebidas no celular
create table if not exists notification_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  package_name text,
  app_name text,
  title text,
  text text,
  big_text text,
  raw jsonb,
  parsed boolean not null default false,
  parsed_transaction_id uuid references transactions(id) on delete set null,
  ignored_reason text,
  received_at timestamptz not null default now()
);

create index if not exists idx_notification_events_profile_received
on notification_events(profile_id, received_at desc);


-- v6: inteligência local, deduplicação, parcelas, backup e sync offline
alter table transactions add column if not exists dedupe_hash text;
alter table transactions add column if not exists confidence_score numeric(5,2);
alter table transactions add column if not exists installment_current integer;
alter table transactions add column if not exists installment_total integer;
alter table transactions add column if not exists installment_group_key text;
alter table transactions add column if not exists source_device_id text;
alter table transactions add column if not exists source_notification_id text;

drop index if exists idx_transactions_dedupe_hash;
alter table transactions drop constraint if exists transactions_profile_dedupe_hash_key;
alter table transactions add constraint transactions_profile_dedupe_hash_key unique (profile_id, dedupe_hash);

create table if not exists backup_runs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  status text not null default 'running',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  storage_path text,
  total_transactions integer default 0,
  total_accounts integer default 0,
  message text
);

create table if not exists sync_devices (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  device_name text,
  platform text default 'android',
  device_public_id text unique,
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists offline_sync_batches (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  device_public_id text,
  received_at timestamptz not null default now(),
  total_items integer default 0,
  processed_items integer default 0,
  duplicate_items integer default 0,
  failed_items integer default 0,
  raw jsonb
);

create index if not exists idx_backup_runs_profile_started on backup_runs(profile_id, started_at desc);
create index if not exists idx_offline_sync_batches_profile_received on offline_sync_batches(profile_id, received_at desc);


-- v7: importação de faturas e exportações estruturadas
create table if not exists statement_imports (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  bank_key text not null,
  source_type text not null, -- csv | ofx | pdf_text | manual_text
  file_name text,
  raw_text text,
  raw_json jsonb,
  status text not null default 'processing',
  total_detected integer default 0,
  total_imported integer default 0,
  total_duplicates integer default 0,
  error_message text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

alter table transactions add column if not exists statement_import_id uuid references statement_imports(id) on delete set null;
alter table transactions add column if not exists bank_key text;

create index if not exists idx_statement_imports_profile_created on statement_imports(profile_id, created_at desc);
create index if not exists idx_transactions_statement_import on transactions(statement_import_id);


-- v10: reconhecimento de estornos
alter table transactions add column if not exists is_refund boolean not null default false;
alter table transactions add column if not exists refund_status text default 'none'; -- none | refund | refunded | partial_refund
alter table transactions add column if not exists refund_of_transaction_id uuid references transactions(id) on delete set null;
alter table transactions add column if not exists refund_match_key text;
alter table transactions add column if not exists refund_detected_at timestamptz;

create index if not exists idx_transactions_refund_status on transactions(profile_id, refund_status);
create index if not exists idx_transactions_refund_match_key on transactions(profile_id, refund_match_key);

-- v11: device tokens
alter table sync_devices add column if not exists token_hash text;
alter table sync_devices add column if not exists enabled boolean not null default true;
create unique index if not exists idx_sync_devices_token_hash on sync_devices(token_hash);

-- v11: RLS por usuário
alter table profiles enable row level security;
alter table financial_items enable row level security;
alter table accounts enable row level security;
alter table transactions enable row level security;
alter table credit_card_bills enable row level security;
alter table budgets enable row level security;
alter table financial_goals enable row level security;
alter table notification_events enable row level security;
alter table statement_imports enable row level security;
alter table backup_runs enable row level security;
alter table sync_devices enable row level security;
alter table offline_sync_batches enable row level security;

drop policy if exists "profiles_select_own" on profiles;
create policy "profiles_select_own" on profiles for select using (id = auth.uid());
drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own" on profiles for update using (id = auth.uid());

drop policy if exists "financial_items_own" on financial_items;
create policy "financial_items_own" on financial_items for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
drop policy if exists "accounts_own" on accounts;
create policy "accounts_own" on accounts for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
drop policy if exists "transactions_own" on transactions;
create policy "transactions_own" on transactions for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
drop policy if exists "credit_card_bills_own" on credit_card_bills;
create policy "credit_card_bills_own" on credit_card_bills for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
drop policy if exists "budgets_own" on budgets;
create policy "budgets_own" on budgets for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
drop policy if exists "financial_goals_own" on financial_goals;
create policy "financial_goals_own" on financial_goals for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
drop policy if exists "notification_events_own" on notification_events;
create policy "notification_events_own" on notification_events for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
drop policy if exists "statement_imports_own" on statement_imports;
create policy "statement_imports_own" on statement_imports for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
drop policy if exists "backup_runs_own" on backup_runs;
create policy "backup_runs_own" on backup_runs for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
drop policy if exists "sync_devices_own" on sync_devices;
create policy "sync_devices_own" on sync_devices for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- v11: auditoria
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete set null,
  action text not null,
  resource text,
  metadata jsonb,
  created_at timestamptz not null default now()
);
alter table audit_logs enable row level security;
drop policy if exists "audit_logs_own_select" on audit_logs;
create policy "audit_logs_own_select" on audit_logs for select using (profile_id = auth.uid());
create index if not exists idx_audit_logs_profile_created on audit_logs(profile_id, created_at desc);

-- v18: contas por banco/tipo e consolidacao de transacoes
alter table transactions add column if not exists is_consolidated boolean not null default true;
alter table statement_imports add column if not exists account_id uuid references accounts(id) on delete set null;

create index if not exists idx_accounts_profile_bank on accounts(profile_id, institution_name);
create index if not exists idx_transactions_profile_account_posted on transactions(profile_id, account_id, posted_at desc);
create index if not exists idx_transactions_profile_consolidated on transactions(profile_id, is_consolidated, posted_at desc);

-- v19: cadastro separado de bancos e vinculo de contas
create table if not exists banks (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  name text not null,
  code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(profile_id, name)
);

alter table banks enable row level security;
drop policy if exists "banks_own" on banks;
create policy "banks_own" on banks for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

alter table accounts add column if not exists bank_id uuid references banks(id) on delete set null;
create index if not exists idx_accounts_profile_bank_id on accounts(profile_id, bank_id);
create index if not exists idx_banks_profile_name on banks(profile_id, name);

drop trigger if exists trg_banks_updated_at on banks;
create trigger trg_banks_updated_at before update on banks for each row execute function touch_updated_at();

insert into banks (profile_id, name)
select distinct a.profile_id, coalesce(nullif(trim(a.institution_name), ''), 'BANCO NAO INFORMADO')
from accounts a
where a.profile_id is not null
on conflict (profile_id, name) do nothing;

update accounts a
set bank_id = b.id
from banks b
where a.profile_id = b.profile_id
  and coalesce(nullif(trim(a.institution_name), ''), 'BANCO NAO INFORMADO') = b.name
  and a.bank_id is null;

-- v20: catalogo de categorias com hierarquia pai/filho
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  name text not null,
  parent_id uuid references categories(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(profile_id, name)
);

create index if not exists idx_categories_profile_name on categories(profile_id, name);
create index if not exists idx_categories_profile_parent on categories(profile_id, parent_id);

alter table categories enable row level security;
drop policy if exists "categories_own" on categories;
create policy "categories_own" on categories for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

drop trigger if exists trg_categories_updated_at on categories;
create trigger trg_categories_updated_at before update on categories for each row execute function touch_updated_at();
