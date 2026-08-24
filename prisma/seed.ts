/**
 * Dados de demonstração.
 *
 * Cria um casal com três meses de lançamentos realistas para que dê para ver
 * o app funcionando de verdade — gráficos com forma, orçamentos apertando,
 * um acerto de contas com número em aberto — sem precisar digitar nada.
 *
 * Uso: npm run db:seed
 * NUNCA rode isto num banco de produção: o script apaga tudo antes.
 */

import { PrismaClient } from '@prisma/client';
import { hash } from '@node-rs/argon2';
import { DEFAULT_CATEGORIES } from '../src/lib/presets';
import { computeShares } from '../src/lib/split';

const db = new PrismaClient();

const ARGON2 = { algorithm: 2, memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;
const DEMO_PASSWORD = 'demo-financeiro-2026';

/** Meia-noite UTC de um dia — mesma convenção de src/lib/date.ts. */
function utc(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

function reais(value: number): number {
  return Math.round(value * 100);
}

/** Variação determinística, para o seed dar sempre o mesmo resultado. */
function jitter(base: number, seed: number, spread = 0.25): number {
  const wave = Math.sin(seed * 12.9898) * 43758.5453;
  const factor = 1 + ((wave - Math.floor(wave)) - 0.5) * 2 * spread;
  return Math.round(base * factor);
}

async function main() {
  console.log('Limpando o banco…');
  // Ordem importa: filhos antes dos pais (o SQLite respeita as FKs).
  await db.transactionShare.deleteMany();
  await db.settlementLine.deleteMany();
  await db.transaction.deleteMany();
  await db.settlement.deleteMany();
  await db.goalContribution.deleteMany();
  await db.goal.deleteMany();
  await db.budget.deleteMany();
  await db.recurrence.deleteMany();
  await db.account.deleteMany();
  await db.category.deleteMany();
  await db.invite.deleteMany();
  await db.membership.deleteMany();
  await db.space.deleteMany();
  await db.session.deleteMany();
  await db.auditLog.deleteMany();
  await db.loginAttempt.deleteMany();
  await db.user.deleteMany();

  const passwordHash = await hash(DEMO_PASSWORD, ARGON2);

  console.log('Criando as duas contas…');
  const kaleo = await db.user.create({
    data: {
      name: 'Kaleo',
      email: 'kaleo@exemplo.com',
      passwordHash,
      avatarColor: '#10b981',
    },
  });

  const ana = await db.user.create({
    data: {
      name: 'Ana',
      email: 'ana@exemplo.com',
      passwordHash,
      avatarColor: '#8b5cf6',
    },
  });

  // ---------------------------------------------------------- espaços pessoais
  for (const user of [kaleo, ana]) {
    const personal = await db.space.create({
      data: { name: 'Meu dinheiro', type: 'PERSONAL', currency: 'BRL' },
    });

    await db.membership.create({
      data: {
        userId: user.id,
        spaceId: personal.id,
        role: 'OWNER',
        displayName: user.name,
        color: user.avatarColor,
      },
    });

    await db.category.createMany({
      data: DEFAULT_CATEGORIES.map((c, index) => ({
        spaceId: personal.id,
        name: c.name,
        kind: c.kind,
        color: c.color,
        icon: c.icon,
        isDefault: true,
        sortOrder: index,
      })),
    });

    await db.account.create({
      data: {
        spaceId: personal.id,
        name: 'Conta corrente',
        type: 'CHECKING',
        color: '#0ea5e9',
        icon: 'landmark',
        openingBalanceCents: reais(1200),
      },
    });
  }

  // --------------------------------------------------------- espaço do casal
  console.log('Criando o espaço compartilhado…');
  const casa = await db.space.create({
    data: { name: 'Nossa casa', type: 'SHARED', currency: 'BRL' },
  });

  const mKaleo = await db.membership.create({
    data: {
      userId: kaleo.id,
      spaceId: casa.id,
      role: 'OWNER',
      displayName: 'Kaleo',
      color: '#10b981',
      monthlyIncomeCents: reais(6500),
    },
  });

  const mAna = await db.membership.create({
    data: {
      userId: ana.id,
      spaceId: casa.id,
      role: 'MEMBER',
      displayName: 'Ana',
      color: '#8b5cf6',
      monthlyIncomeCents: reais(4500),
    },
  });

  await db.user.update({ where: { id: kaleo.id }, data: { lastSpaceId: casa.id } });
  await db.user.update({ where: { id: ana.id }, data: { lastSpaceId: casa.id } });

  await db.category.createMany({
    data: DEFAULT_CATEGORIES.map((c, index) => ({
      spaceId: casa.id,
      name: c.name,
      kind: c.kind,
      color: c.color,
      icon: c.icon,
      isDefault: true,
      sortOrder: index,
    })),
  });

  const categories = await db.category.findMany({ where: { spaceId: casa.id } });
  const categoryByName = new Map(categories.map((c) => [c.name, c]));
  const cat = (name: string) => categoryByName.get(name)!.id;

  const contaConjunta = await db.account.create({
    data: {
      spaceId: casa.id,
      name: 'Conta conjunta',
      type: 'CHECKING',
      color: '#0ea5e9',
      icon: 'landmark',
      openingBalanceCents: reais(3500),
      sortOrder: 0,
    },
  });

  const cartaoKaleo = await db.account.create({
    data: {
      spaceId: casa.id,
      name: 'Cartão do Kaleo',
      type: 'CREDIT_CARD',
      color: '#10b981',
      icon: 'credit-card',
      ownerMembershipId: mKaleo.id,
      creditLimitCents: reais(8000),
      statementDay: 20,
      dueDay: 28,
      sortOrder: 1,
    },
  });

  const cartaoAna = await db.account.create({
    data: {
      spaceId: casa.id,
      name: 'Cartão da Ana',
      type: 'CREDIT_CARD',
      color: '#8b5cf6',
      icon: 'credit-card',
      ownerMembershipId: mAna.id,
      creditLimitCents: reais(6000),
      statementDay: 15,
      dueDay: 25,
      sortOrder: 2,
    },
  });

  const dinheiro = await db.account.create({
    data: {
      spaceId: casa.id,
      name: 'Dinheiro',
      type: 'CASH',
      color: '#22c55e',
      icon: 'banknote',
      openingBalanceCents: reais(300),
      sortOrder: 3,
    },
  });

  const members = [
    { membershipId: mKaleo.id, monthlyIncomeCents: reais(6500) },
    { membershipId: mAna.id, monthlyIncomeCents: reais(4500) },
  ];

  /** Cria um lançamento já com os shares calculados. */
  async function lancar(params: {
    type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
    amountCents: number;
    date: Date;
    description: string;
    accountId: string;
    toAccountId?: string;
    categoryId?: string;
    paidBy: string;
    splitMode?: 'OWNER' | 'EQUAL' | 'INCOME_RATIO';
  }) {
    const splitMode = params.splitMode ?? 'EQUAL';

    const transaction = await db.transaction.create({
      data: {
        spaceId: casa.id,
        type: params.type,
        amountCents: params.amountCents,
        date: params.date,
        description: params.description,
        accountId: params.accountId,
        toAccountId: params.toAccountId ?? null,
        categoryId: params.categoryId ?? null,
        paidByMembershipId: params.paidBy,
        splitMode: params.type === 'EXPENSE' ? splitMode : 'OWNER',
      },
    });

    if (params.type === 'EXPENSE') {
      const shares = computeShares({
        amountCents: params.amountCents,
        mode: splitMode,
        members,
        paidByMembershipId: params.paidBy,
      });

      await db.transactionShare.createMany({
        data: shares.map((s) => ({
          transactionId: transaction.id,
          membershipId: s.membershipId,
          amountCents: s.amountCents,
        })),
      });
    }
  }

  console.log('Gerando três meses de lançamentos…');
  const hoje = new Date();
  const meses = [2, 1, 0].map((back) => {
    const d = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - back, 1));
    return { ano: d.getUTCFullYear(), mes: d.getUTCMonth() + 1 };
  });

  let seed = 1;

  for (const { ano, mes } of meses) {
    // --- receitas
    await lancar({
      type: 'INCOME',
      amountCents: reais(6500),
      date: utc(ano, mes, 5),
      description: 'Salário do Kaleo',
      accountId: contaConjunta.id,
      categoryId: cat('Salário'),
      paidBy: mKaleo.id,
    });

    await lancar({
      type: 'INCOME',
      amountCents: reais(4500),
      date: utc(ano, mes, 5),
      description: 'Salário da Ana',
      accountId: contaConjunta.id,
      categoryId: cat('Salário'),
      paidBy: mAna.id,
    });

    // --- fixas do casal (proporcional à renda: quem ganha mais paga mais)
    await lancar({
      type: 'EXPENSE',
      amountCents: reais(2200),
      date: utc(ano, mes, 10),
      description: 'Aluguel',
      accountId: contaConjunta.id,
      categoryId: cat('Moradia'),
      paidBy: mKaleo.id,
      splitMode: 'INCOME_RATIO',
    });

    await lancar({
      type: 'EXPENSE',
      amountCents: jitter(reais(280), seed++),
      date: utc(ano, mes, 12),
      description: 'Luz e água',
      accountId: contaConjunta.id,
      categoryId: cat('Contas de casa'),
      paidBy: mAna.id,
      splitMode: 'EQUAL',
    });

    await lancar({
      type: 'EXPENSE',
      amountCents: reais(120),
      date: utc(ano, mes, 15),
      description: 'Internet',
      accountId: contaConjunta.id,
      categoryId: cat('Internet e telefone'),
      paidBy: mKaleo.id,
      splitMode: 'EQUAL',
    });

    // --- mercado, várias vezes no mês
    for (const dia of [3, 11, 19, 26]) {
      await lancar({
        type: 'EXPENSE',
        amountCents: jitter(reais(320), seed++),
        date: utc(ano, mes, dia),
        description: 'Mercado',
        accountId: dia % 2 === 0 ? cartaoKaleo.id : cartaoAna.id,
        categoryId: cat('Mercado'),
        paidBy: dia % 2 === 0 ? mKaleo.id : mAna.id,
        splitMode: 'EQUAL',
      });
    }

    // --- restaurante e lazer
    for (const dia of [7, 14, 21, 28]) {
      await lancar({
        type: 'EXPENSE',
        amountCents: jitter(reais(95), seed++, 0.45),
        date: utc(ano, mes, dia),
        description: dia % 3 === 0 ? 'Jantar fora' : 'Delivery',
        accountId: dia % 3 === 0 ? cartaoAna.id : cartaoKaleo.id,
        categoryId: cat('Restaurante e delivery'),
        paidBy: dia % 3 === 0 ? mAna.id : mKaleo.id,
        splitMode: 'EQUAL',
      });
    }

    await lancar({
      type: 'EXPENSE',
      amountCents: jitter(reais(180), seed++, 0.5),
      date: utc(ano, mes, 17),
      description: 'Cinema e passeio',
      accountId: cartaoKaleo.id,
      categoryId: cat('Lazer'),
      paidBy: mKaleo.id,
      splitMode: 'EQUAL',
    });

    // --- transporte
    await lancar({
      type: 'EXPENSE',
      amountCents: jitter(reais(240), seed++),
      date: utc(ano, mes, 8),
      description: 'Combustível',
      accountId: cartaoKaleo.id,
      categoryId: cat('Transporte'),
      paidBy: mKaleo.id,
      splitMode: 'EQUAL',
    });

    // --- assinaturas
    await lancar({
      type: 'EXPENSE',
      amountCents: reais(89.9),
      date: utc(ano, mes, 6),
      description: 'Streaming e assinaturas',
      accountId: cartaoAna.id,
      categoryId: cat('Assinaturas'),
      paidBy: mAna.id,
      splitMode: 'EQUAL',
    });

    // --- gastos individuais (não geram dívida entre eles)
    await lancar({
      type: 'EXPENSE',
      amountCents: jitter(reais(150), seed++, 0.6),
      date: utc(ano, mes, 22),
      description: 'Roupas',
      accountId: cartaoAna.id,
      categoryId: cat('Compras'),
      paidBy: mAna.id,
      splitMode: 'OWNER',
    });

    await lancar({
      type: 'EXPENSE',
      amountCents: jitter(reais(130), seed++, 0.6),
      date: utc(ano, mes, 24),
      description: 'Academia',
      accountId: cartaoKaleo.id,
      categoryId: cat('Saúde'),
      paidBy: mKaleo.id,
      splitMode: 'OWNER',
    });

    // --- saque para dinheiro vivo
    await lancar({
      type: 'TRANSFER',
      amountCents: reais(200),
      date: utc(ano, mes, 9),
      description: 'Saque',
      accountId: contaConjunta.id,
      toAccountId: dinheiro.id,
      paidBy: mKaleo.id,
    });
  }

  // ------------------------------------------------------------- orçamentos
  console.log('Definindo orçamentos…');
  const mesAtual = `${hoje.getUTCFullYear()}-${String(hoje.getUTCMonth() + 1).padStart(2, '0')}`;

  const limites: Array<[string, number]> = [
    ['Mercado', 1500],
    ['Restaurante e delivery', 400],
    ['Lazer', 300],
    ['Transporte', 400],
    ['Compras', 300],
  ];

  for (const [nome, valor] of limites) {
    await db.budget.create({
      data: {
        spaceId: casa.id,
        categoryId: cat(nome),
        month: mesAtual,
        limitCents: reais(valor),
      },
    });
  }

  // ------------------------------------------------------------------ metas
  console.log('Criando metas…');
  const viagem = await db.goal.create({
    data: {
      spaceId: casa.id,
      name: 'Viagem de fim de ano',
      targetCents: reais(8000),
      targetDate: utc(hoje.getUTCFullYear(), 12, 15),
      color: '#0891b2',
      icon: 'plane',
    },
  });

  for (let i = 0; i < 3; i++) {
    await db.goalContribution.create({
      data: {
        goalId: viagem.id,
        membershipId: i % 2 === 0 ? mKaleo.id : mAna.id,
        amountCents: reais(600),
        date: utc(meses[i]!.ano, meses[i]!.mes, 6),
      },
    });
  }

  await db.goal.create({
    data: {
      spaceId: casa.id,
      name: 'Reserva de emergência',
      targetCents: reais(20000),
      color: '#10b981',
      icon: 'shield',
    },
  });

  // ----------------------------------------------------------- recorrências
  console.log('Cadastrando recorrências…');
  const proximoMes = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() + 1, 10));

  await db.recurrence.create({
    data: {
      spaceId: casa.id,
      type: 'EXPENSE',
      amountCents: reais(2200),
      description: 'Aluguel',
      accountId: contaConjunta.id,
      categoryId: cat('Moradia'),
      paidByMembershipId: mKaleo.id,
      splitMode: 'INCOME_RATIO',
      frequency: 'MONTHLY',
      nextRunAt: proximoMes,
    },
  });

  await db.recurrence.create({
    data: {
      spaceId: casa.id,
      type: 'EXPENSE',
      amountCents: reais(89.9),
      description: 'Streaming e assinaturas',
      accountId: cartaoAna.id,
      categoryId: cat('Assinaturas'),
      paidByMembershipId: mAna.id,
      splitMode: 'EQUAL',
      frequency: 'MONTHLY',
      nextRunAt: new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() + 1, 6)),
    },
  });

  const total = await db.transaction.count({ where: { spaceId: casa.id } });

  console.log('');
  console.log('✓ Pronto.');
  console.log(`  ${total} lançamentos no espaço "Nossa casa".`);
  console.log('');
  console.log('  Entre com qualquer uma das contas:');
  console.log(`    kaleo@exemplo.com  ·  senha: ${DEMO_PASSWORD}`);
  console.log(`    ana@exemplo.com    ·  senha: ${DEMO_PASSWORD}`);
  console.log('');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
