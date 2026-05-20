import { createClient } from "@supabase/supabase-js";

const PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function envError(name: string) {
  return (
    `Variavel de ambiente ausente: ${name}. ` +
    `Crie o arquivo .env.local com as chaves do Supabase antes de executar a aplicacao.`
  );
}

function requirePublicEnv(name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY") {
  const value = name === "NEXT_PUBLIC_SUPABASE_URL" ? PUBLIC_SUPABASE_URL : PUBLIC_SUPABASE_ANON_KEY;

  if (!value) {
    throw new Error(envError(name));
  }

  return value;
}

function requireServerEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(envError(name));
  }

  return value;
}

let browserClient: any = null;
let adminClient: any = null;

function getBrowserClient() {
  if (!browserClient) {
    browserClient = createClient(
      requirePublicEnv("NEXT_PUBLIC_SUPABASE_URL"),
      requirePublicEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    );
  }

  return browserClient;
}

function getAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("supabaseAdmin não pode ser usado no browser.");
  }

  if (!adminClient) {
    adminClient = createClient(
      requirePublicEnv("NEXT_PUBLIC_SUPABASE_URL"),
      requireServerEnv("SUPABASE_SERVICE_ROLE_KEY"),
      {
        auth: { persistSession: false },
      }
    );
  }

  return adminClient;
}

// Proxies mantem compatibilidade com os arquivos existentes,
// mas impedem que o Supabase seja inicializado durante o import/build.
export const supabaseBrowser: any = new Proxy(
  {},
  {
    get(_target, prop) {
      const client = getBrowserClient();
      const value = client[prop as keyof typeof client];
      return typeof value === "function" ? value.bind(client) : value;
    },
  }
);

export const supabaseAdmin: any = new Proxy(
  {},
  {
    get(_target, prop) {
      const client = getAdminClient();
      const value = client[prop as keyof typeof client];
      return typeof value === "function" ? value.bind(client) : value;
    },
  }
);
