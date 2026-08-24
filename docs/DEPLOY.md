# Colocar no ar

Enquanto o app roda só na sua máquina, dá para usar em `localhost:3000`. Para
acessar do celular fora de casa — e para sua parceira acessar do aparelho dela —
ele precisa estar num servidor.

## Antes de tudo

```env
# .env de produção
NODE_ENV=production
DATABASE_URL="file:/dados/financeiro.db"
AUTH_SECRET="<gere um novo, diferente do de desenvolvimento>"
SESSION_DAYS=30
DISABLE_SIGNUP=true          # depois que todo mundo já tem conta
APP_URL="https://financeiro.seudominio.com"
```

Gere o segredo com:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

> **HTTPS é obrigatório em produção.** O cookie de sessão é marcado `secure`
> quando `NODE_ENV=production`, então sem HTTPS o login simplesmente não
> persiste. Qualquer proxy com Let's Encrypt resolve (Caddy faz sozinho).

## Opção 1 — Docker (recomendado)

```bash
docker compose up -d --build
```

O `docker-compose.yml` monta `./dados` como volume, então o banco sobrevive a
recriações do contêiner.

Primeira vez:

```bash
docker compose exec app npx prisma migrate deploy
```

## Opção 2 — VPS com Node

Num servidor pequeno (1 vCPU, 1 GB já basta):

```bash
git clone https://github.com/akivayovkaleo/ControleFinanceiro.git
cd ControleFinanceiro
npm ci
npm run db:deploy
npm run build
```

Mantenha rodando com systemd:

```ini
# /etc/systemd/system/financeiro.service
[Unit]
Description=Controle Financeiro
After=network.target

[Service]
Type=simple
User=financeiro
WorkingDirectory=/opt/ControleFinanceiro
EnvironmentFile=/opt/ControleFinanceiro/.env
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now financeiro
```

E um proxy reverso com HTTPS automático:

```
# /etc/caddy/Caddyfile
financeiro.seudominio.com {
    reverse_proxy localhost:3000
}
```

## Opção 3 — Rede doméstica

Se vocês só usam em casa, não precisa expor à internet:

```bash
npm run build
npm start -- --hostname 0.0.0.0
```

Acesse pelo IP da máquina (`http://192.168.0.10:3000`) de qualquer aparelho do
Wi-Fi.

> Sem HTTPS o cookie `secure` não funciona. Para este caso, rode com
> `NODE_ENV=development` **ou** use um certificado local (mkcert). Uma rede
> doméstica é razoavelmente segura, mas o tráfego não é criptografado.

## Instalar no celular

O app é uma PWA. No celular, abra o endereço no navegador e use
**"Adicionar à tela de início"**. Ele passa a abrir em tela cheia, com ícone
próprio, como um app nativo.

## Backup

Todos os dados estão num arquivo. Um backup diário resolve:

```bash
#!/bin/bash
# /opt/backup-financeiro.sh
DESTINO=/backups
mkdir -p "$DESTINO"
sqlite3 /dados/financeiro.db ".backup '$DESTINO/financeiro-$(date +%F).db'"
find "$DESTINO" -name 'financeiro-*.db' -mtime +30 -delete
```

```cron
0 3 * * * /opt/backup-financeiro.sh
```

> Use `sqlite3 .backup` em vez de `cp`: ele é seguro com o app rodando. Um `cp`
> durante uma escrita pode copiar um arquivo inconsistente.

Guarde uma cópia **fora do servidor**. Backup no mesmo disco não protege de nada.

## Migrar para PostgreSQL

Faz sentido se você for hospedar em plataforma serverless (Vercel, Railway) ou
se um dia mais gente usar a instância.

1. Troque o provider em `prisma/schema.prisma`:

   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

2. Aponte o `DATABASE_URL` para o Postgres:

   ```env
   DATABASE_URL="postgresql://usuario:senha@host:5432/financeiro"
   ```

3. Recrie as migrations (as antigas são específicas de SQLite):

   ```bash
   rm -rf prisma/migrations
   npx prisma migrate dev --name inicial
   ```

4. Migre os dados existentes, se houver. Para o volume de um casal, exportar em
   CSV e reimportar funciona; para algo maior, use `pgloader`.

O código da aplicação **não muda** — o schema foi escrito sem recursos
exclusivos do SQLite.

> Uma ressalva já tratada no código: o SQLite no Prisma não suporta
> `mode: 'insensitive'` em buscas de texto, então a busca do extrato usa
> `contains` puro. No Postgres você pode adicionar `mode: 'insensitive'` em
> `src/app/(app)/lancamentos/page.tsx` para busca acentuada e case-insensitive
> mais robusta.

## Atualizar

```bash
git pull
npm ci
npm run db:deploy    # aplica migrations novas
npm run build
sudo systemctl restart financeiro
```

Faça backup antes de atualizar.

## Checklist de produção

- [ ] `AUTH_SECRET` novo, diferente do de desenvolvimento
- [ ] HTTPS funcionando
- [ ] `DISABLE_SIGNUP=true` depois que todo mundo tem conta
- [ ] Backup automático rodando, com cópia fora do servidor
- [ ] Teste de restauração feito ao menos uma vez
- [ ] `.env` fora do controle de versão (já está no `.gitignore`)
