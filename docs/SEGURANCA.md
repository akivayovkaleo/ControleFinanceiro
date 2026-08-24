# Segurança

## O que estamos protegendo

Dados financeiros de duas pessoas: quanto ganham, onde gastam, quanto têm.
Não é dado de vida ou morte, mas é íntimo — e num espaço compartilhado há a
camada extra de "o que meu parceiro pode ver do que é só meu".

## Modelo de ameaças

| Ameaça | O que fizemos |
|---|---|
| Alguém adivinha a senha por força bruta | Argon2id (caro de calcular) + limite de 8 tentativas em 15 min, depois bloqueio |
| Vazamento do banco | Senhas com hash Argon2id; tokens de sessão e códigos de convite guardados só como SHA-256; IPs só como hash |
| XSS rouba a sessão | Cookie `httpOnly` (fora do alcance de JS) + CSP restritiva |
| CSRF | Cookie `SameSite=Lax` + checagem de `Origin` no middleware para todo método que muda estado |
| Descobrir quais e-mails têm conta | Login sempre responde a mesma mensagem, e gasta o mesmo tempo mesmo quando o e-mail não existe |
| Ver dados de outro espaço | Toda consulta filtrada por `spaceId`, validado contra a tabela `Membership` |
| Sessão roubada continua válida | Sessões vivem no banco; apagar a linha desloga na hora. Trocar a senha derruba as outras |
| Estranho se cadastra na sua instância | `DISABLE_SIGNUP=true` e/ou `ALLOWED_EMAILS` |
| Clickjacking | `X-Frame-Options: DENY` + `frame-ancestors 'none'` |

## Senhas

**Argon2id**, com o perfil recomendado pelo [OWASP Password Storage Cheat
Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html):
`m=19456 KiB, t=2, p=1`. Resistente a GPU e a ataques de canal lateral.

Política: **mínimo de 10 caracteres**, mais uma lista curta de senhas
notoriamente óbvias.

Não exigimos símbolo/maiúscula/número. O [NIST SP
800-63B](https://pages.nist.gov/800-63-3/sp800-63b.html) mostra que regras de
composição produzem `Senha123!` — previsível — enquanto o comprimento é o que
realmente aumenta o custo do ataque. O medidor de força na tela é orientação
visual; quem decide é o schema no servidor.

## Sessões

Duas camadas, de propósito:

1. **Cookie** — carrega um JWT assinado (HS256) com o id da sessão, concatenado
   a um token opaco de 32 bytes. O JWT deixa o middleware descartar cookies
   forjados ou expirados na borda, sem tocar no banco.
2. **Tabela `Session`** — é ela que manda. Guarda apenas o **SHA-256** do token
   opaco; o token em claro só existe no cookie do usuário.

Por que as duas: um JWT puro continuaria válido até expirar, mesmo depois de
"sair de todos os dispositivos". Uma sessão só no banco custaria uma consulta
para cada requisição, inclusive as de cookie lixo.

Atributos do cookie:

```
httpOnly   JS não alcança → XSS não rouba a sessão
secure     só HTTPS (em produção)
sameSite   Lax → bloqueia CSRF cross-site sem quebrar links de entrada
expires    SESSION_DAYS (padrão 30)
```

Comparação de hashes com `timingSafeEqual`, para não vazar informação pelo
relógio.

## Autorização

**A regra de ouro do projeto:** nenhum dado financeiro é lido ou escrito sem
passar por `requireSpace(spaceId)`, que responde a uma única pergunta — *este
usuário é membro deste espaço?*

Em updates e deletes usamos `updateMany`/`deleteMany` com `spaceId` no `where`,
em vez de `update`/`delete` por id:

```ts
// ✅ o filtro de autorização vai junto na query
await db.transaction.updateMany({ where: { id, spaceId }, data });

// ❌ depende de uma verificação separada não ter sido esquecida
await db.transaction.update({ where: { id }, data });
```

Um id de espaço inexistente e um id de espaço alheio devolvem **a mesma
mensagem** — não revelamos que o recurso existe.

### O middleware NÃO é a fronteira de segurança

Ele roda no Edge, sem acesso ao banco. Só sabe se existe um cookie com
assinatura válida. Serve para evitar carregar uma página inteira antes de
redirecionar.

Quem decide acesso de verdade é `requireUser()` / `requireSpace()` no servidor,
consultando a tabela de sessões. Um cookie válido de uma sessão já revogada
passa pelo middleware e é barrado ali.

## Proteção contra CSRF

Duas camadas:

1. `SameSite=Lax` no cookie — o navegador não envia o cookie em requisições
   cross-site que mudam estado.
2. Checagem de `Origin` no middleware para `POST`/`PUT`/`PATCH`/`DELETE`. Origem
   diferente do host → 403.

Server Actions do Next já fazem verificação de origem própria; isto é defesa em
profundidade.

## Cabeçalhos

Aplicados a toda resposta (`next.config.ts`):

```
Content-Security-Policy      default-src 'self'; frame-ancestors 'none'; object-src 'none'; …
X-Frame-Options              DENY
X-Content-Type-Options       nosniff
Referrer-Policy              strict-origin-when-cross-origin
Permissions-Policy           camera=(), microphone=(), geolocation=()
```

`X-Powered-By` é removido (`poweredByHeader: false`).

**Sobre `script-src 'unsafe-inline'`:** o App Router injeta scripts inline de
hidratação. Eliminá-lo exigiria nonce por requisição, o que força toda página a
ser dinâmica. Para um app self-hosted sem conteúdo de terceiros, o ganho não
compensa o custo — mas está registrado aqui como um débito conhecido.

## Convites

O código tem 12 caracteres de um alfabeto de 26 símbolos sem ambiguidade
(sem `0/O`, `1/I/L`, `U`), gerado com `crypto.randomInt` — ~56 bits de entropia.

O banco guarda apenas o **SHA-256**. O código em claro aparece uma única vez na
tela de quem convidou. Um vazamento do banco não entrega acesso a espaço nenhum.

Convites expiram em **7 dias**, servem **uma vez** e podem ser cancelados. O uso
é fechado por `updateMany` com `acceptedAt: null` no `where`, dentro de uma
transação — dois usos simultâneos não conseguem entrar os dois.

## Validação de entrada

Nada chega ao banco sem passar por um schema Zod (`src/lib/validation/`).
`FormData` é sempre `string | File`; a validação é o único ponto onde isso vira
um tipo confiável.

Além do formato, as actions confirmam **pertencimento**: a conta, a categoria e
a pessoa informadas num lançamento precisam ser daquele espaço. Sem isso, alguém
poderia enviar o id de uma conta alheia num formulário adulterado.

## Erros

`runAction` traduz exceções conhecidas em mensagem para o usuário e esconde as
desconhecidas atrás de "algo deu errado", logando o original no servidor. A
mensagem crua de uma exceção pode conter caminho de arquivo, SQL ou nome de
coluna.

A fronteira de erro global (`app/error.tsx`) mostra só o `digest`, que permite
cruzar o que a pessoa viu com o log sem expor nada.

## Auditoria

A tabela `AuditLog` registra quem fez o quê e quando. Importa num espaço
compartilhado, onde duas pessoas mexem nos mesmos números: quando alguém
pergunta "quem apagou o lançamento do aluguel?", a resposta existe.

IPs são gravados apenas como hash.

## Privacidade

- Nenhuma requisição sai da sua instalação. Sem analytics, sem CDN, sem fontes
  externas.
- `robots.txt` bloqueia tudo e as páginas trazem `noindex`.
- A renda declarada de cada membro serve só ao cálculo da divisão proporcional e
  não aparece em relatório nenhum.

## O que NÃO temos

Registrado honestamente:

- **Sem 2FA.** Para o público-alvo (uma ou duas pessoas numa instalação
  caseira), o custo de implementar e recuperar acesso supera o ganho. Se a
  instância for pública, considere colocar atrás de um proxy com autenticação.
- **Sem criptografia dos dados em repouso.** O SQLite é um arquivo comum. Se o
  disco for uma preocupação, use criptografia de disco (LUKS, FileVault).
- **Sem rate limit global.** Só o login é limitado. Um atacante autenticado pode
  fazer muitas requisições.
- **Sem recuperação de senha por e-mail.** É intencional (ver
  `docs/DECISOES.md`), mas significa que perder a senha exige acesso ao
  servidor.

## Se achar uma falha

Este é um projeto pessoal. Abra uma issue descrevendo o problema — ou, se for
sério, mande direto para o dono do repositório antes de publicar.
