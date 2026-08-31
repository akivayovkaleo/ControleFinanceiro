/**
 * Catálogo visual da vila — épocas, categorias de prédio, tiers e estruturas.
 *
 * FONTE DA VERDADE do vocabulário da vila. Importe daqui; não duplique estas
 * listas. São 5 épocas × 7 categorias × 3 tiers = 105 estruturas.
 *
 * Esta camada é PURA PROJEÇÃO VISUAL: ela não conhece `Transaction`, `Account`
 * nem `Category`. O ledger continua sendo a verdade financeira; a vila só o
 * desenha. Quem faz a ponte entre os dois é `src/lib/village/projection.ts`.
 *
 * Trocar de época é 100% cosmético — nenhum número muda.
 *
 * ---------------------------------------------------------------------------
 * SOBRE AS CORES LITERAIS DESTE ARQUIVO
 * ---------------------------------------------------------------------------
 * A regra 5 do projeto (`CLAUDE.md`) proíbe cor literal em COMPONENTE. Aqui é
 * diferente: `badgeColor` e `pixelMatrixColor` são DADO do catálogo — a paleta
 * provisória que faz as vezes dos sprites em pixel art até os PNGs existirem.
 * Nenhuma delas é token de tema, nenhuma entra em gráfico, e nenhuma colide
 * com `--brand`/`--income`/`--expense`. Quando os sprites chegarem, estes dois
 * campos saem daqui junto com eles.
 */

/** Épocas disponíveis. Trocar de época é puramente cosmético. */
export const ERAS = ['antigo', 'greco_romano', 'medieval', 'moderno', 'futurista'] as const;

export type Era = (typeof ERAS)[number];

/** Rótulos de exibição das épocas (PT-BR). */
export const ERA_LABELS: Record<Era, string> = {
  antigo: 'Antigo / Tribal',
  greco_romano: 'Greco-Romano',
  medieval: 'Medieval',
  moderno: 'Contemporâneo',
  futurista: 'Cyberpunk / Futurista',
};

/**
 * Categorias de prédio da vila. São *buckets de projeção* — cada uma será
 * mapeada para categorias do ledger na Fase 2. `custom` cobre as categorias
 * criadas pelo próprio usuário. `hub` é especial: agrega o patrimônio da vila
 * e não tem valor próprio.
 */
export const BUILDING_CATEGORIES = [
  'locomocao',
  'casa',
  'investimentos',
  'hub',
  'estudos',
  'saude',
  'custom',
] as const;

export type BuildingCategory = (typeof BUILDING_CATEGORIES)[number];

/** Rótulos de exibição das categorias (PT-BR). */
export const CATEGORY_LABELS: Record<BuildingCategory, string> = {
  locomocao: 'Locomoção',
  casa: 'Casa',
  investimentos: 'Investimentos',
  hub: 'Hub Central',
  estudos: 'Estudos',
  saude: 'Saúde',
  custom: 'Personalizado',
};

/**
 * A categoria `hub` não representa um gasto/ativo próprio: ela agrega o
 * patrimônio da vila inteira.
 */
export const HUB_CATEGORY = 'hub' satisfies BuildingCategory;

/** Tiers que possuem definição visual no catálogo. */
export type CatalogTier = 1 | 2 | 3;

/** Tiers do catálogo, em ordem crescente. */
export const CATALOG_TIERS = [1, 2, 3] as const satisfies readonly CatalogTier[];

/**
 * Tier canônico de um prédio.
 * `0` = "em obras": o prédio existe no mapa mas ainda não atingiu o primeiro
 * nível, e portanto não tem estrutura no catálogo.
 */
export type Tier = 0 | CatalogTier;

/** O tier de prédio "em obras". */
export const TIER_UNDER_CONSTRUCTION = 0 satisfies Tier;

export interface StructureDef {
  name: string;
  description: string;
  icon: string;
  spriteId: string;
  badgeColor: string;
  // Representação matricial em Pixel Art SVG/CSS para prototipagem rápida antes dos PNGs
  pixelMatrixColor: string;
}

export interface BuildingItem {
  id: string;
  category: BuildingCategory;
  customName?: string;
  /** Valor acumulado em CENTAVOS (inteiro). Nunca reais em float. */
  valueCents: number;
  tileX: number;
  tileY: number;
}

/** `true` se o tier tem estrutura no catálogo (ou seja, não está em obras). */
export function isCatalogTier(tier: Tier): tier is CatalogTier {
  return tier !== TIER_UNDER_CONSTRUCTION;
}

/**
 * Resolve a estrutura visual de um prédio. Retorna `null` quando o prédio está
 * em obras (tier 0) — o renderizador desenha o canteiro nesse caso.
 */
export function getStructure(
  era: Era,
  category: BuildingCategory,
  tier: Tier,
): StructureDef | null {
  if (!isCatalogTier(tier)) return null;
  return STRUCTURE_CATALOG[era][category][tier];
}

/**
 * CATALOGO COMPLETO DE ESTRUTURAS (5 Épocas x 7 Categorias x 3 Tiers)
 */
export const STRUCTURE_CATALOG: Record<
  Era,
  Record<BuildingCategory, Record<CatalogTier, StructureDef>>
> = {
  // --------------------------------------------------------------------------
  // 1. ÉPOCA MEDIEVAL
  // --------------------------------------------------------------------------
  medieval: {
    locomocao: {
      1: { name: 'Mula de Carga', description: 'Carga leve e transporte básico de mercadorias', icon: '🫏', spriteId: 'med_loc_1', badgeColor: '#64748b', pixelMatrixColor: '#a3e635' },
      2: { name: 'Cavalo Alazão', description: 'Cavalo forte de cela para viagens rápidas', icon: '🐎', spriteId: 'med_loc_2', badgeColor: '#2563eb', pixelMatrixColor: '#3b82f6' },
      3: { name: 'Carruagem Real', description: 'Carruagem blindada ornamentada com o brasão da família', icon: '👑', spriteId: 'med_loc_3', badgeColor: '#c026d3', pixelMatrixColor: '#a855f7' }
    },
    casa: {
      1: { name: 'Cabana de Palha', description: 'Estrutura rústica de madeira com teto de sapê', icon: '🛖', spriteId: 'med_house_1', badgeColor: '#64748b', pixelMatrixColor: '#eab308' },
      2: { name: 'Sobrado Enxaimel', description: 'Casa confortável de tijolos e vigas aparentes', icon: '🏡', spriteId: 'med_house_2', badgeColor: '#2563eb', pixelMatrixColor: '#f97316' },
      3: { name: 'Castelo de Pedra', description: 'Fortaleza fortificada com torres, fosso e pontes', icon: '🏰', spriteId: 'med_house_3', badgeColor: '#c026d3', pixelMatrixColor: '#ec4899' }
    },
    investimentos: {
      1: { name: 'Baú de Moedas', description: 'Reserva guardada em moedas de bronze e prata', icon: '🪙', spriteId: 'med_inv_1', badgeColor: '#64748b', pixelMatrixColor: '#facc15' },
      2: { name: 'Guilda dos Ourives', description: 'Estabelecimento seguro para troca de metais preciosos', icon: '⚖️', spriteId: 'med_inv_2', badgeColor: '#2563eb', pixelMatrixColor: '#eab308' },
      3: { name: 'Banco Templário', description: 'Instituição financeira de pedra com guardas e cofre', icon: '🏛️', spriteId: 'med_inv_3', badgeColor: '#c026d3', pixelMatrixColor: '#fbbf24' }
    },
    hub: {
      1: { name: 'Tenda da Vila', description: 'Ponto de reunião dos anciãos do feudo', icon: '⛺', spriteId: 'med_hub_1', badgeColor: '#64748b', pixelMatrixColor: '#475569' },
      2: { name: 'Prefeitura da Vila', description: 'Centro administrativo do condado', icon: '🏢', spriteId: 'med_hub_2', badgeColor: '#2563eb', pixelMatrixColor: '#334155' },
      3: { name: 'Palácio Imperial', description: 'Cúpula central do feudo com salão de banquetes', icon: '🕌', spriteId: 'med_hub_3', badgeColor: '#c026d3', pixelMatrixColor: '#0284c7' }
    },
    estudos: {
      1: { name: 'Mesa de Pergaminhos', description: 'Local de leitura e cópia de manuscritos', icon: '📜', spriteId: 'med_est_1', badgeColor: '#64748b', pixelMatrixColor: '#d97706' },
      2: { name: 'Scriptorium da Vila', description: 'Escola com acervo de livros e mapas antigos', icon: '📚', spriteId: 'med_est_2', badgeColor: '#2563eb', pixelMatrixColor: '#b45309' },
      3: { name: 'Grande Monastério', description: 'Centro acadêmico e universidade de teologia e ciências', icon: '🎓', spriteId: 'med_est_3', badgeColor: '#c026d3', pixelMatrixColor: '#78350f' }
    },
    saude: {
      1: { name: 'Tenda da Boticária', description: 'Remédios de ervas e poções medicinais', icon: '🌿', spriteId: 'med_sau_1', badgeColor: '#64748b', pixelMatrixColor: '#16a34a' },
      2: { name: 'Casa do Cirurgião', description: 'Atendimento a enfermos e tratamentos avançados', icon: '🩺', spriteId: 'med_sau_2', badgeColor: '#2563eb', pixelMatrixColor: '#15803d' },
      3: { name: 'Hospital dos Cavaleiros', description: 'Santuário de cura com leitos e enfermaria completa', icon: '🏥', spriteId: 'med_sau_3', badgeColor: '#c026d3', pixelMatrixColor: '#22c55e' }
    },
    custom: {
      1: { name: 'Barraca de Feira', description: 'Comércio local diversificado', icon: '📦', spriteId: 'med_cust_1', badgeColor: '#64748b', pixelMatrixColor: '#873e23' },
      2: { name: 'Oficina de Ferreiro', description: 'Produção e venda de utilitários', icon: '🔨', spriteId: 'med_cust_2', badgeColor: '#2563eb', pixelMatrixColor: '#525252' },
      3: { name: 'Mercado Coberto', description: 'Grande centro comercial do feudo', icon: '🏪', spriteId: 'med_cust_3', badgeColor: '#c026d3', pixelMatrixColor: '#dc2626' }
    }
  },

  // --------------------------------------------------------------------------
  // 2. ÉPOCA ANTIGO / TRIBAL
  // --------------------------------------------------------------------------
  antigo: {
    locomocao: {
      1: { name: 'Mula de Carga', description: 'Transporte de carga em terreno arenoso', icon: '🫏', spriteId: 'ant_loc_1', badgeColor: '#64748b', pixelMatrixColor: '#d97706' },
      2: { name: 'Camelo de Selha', description: 'Caravana com transporte reforçado para o deserto', icon: '🐪', spriteId: 'ant_loc_2', badgeColor: '#2563eb', pixelMatrixColor: '#b45309' },
      3: { name: 'Elefante Real', description: 'Montaria de guerra vestida com mantas e adereços de ouro', icon: '🐘', spriteId: 'ant_loc_3', badgeColor: '#c026d3', pixelMatrixColor: '#78350f' }
    },
    casa: {
      1: { name: 'Oca de Palha', description: 'Cabana de palha e estacas de madeira', icon: '🛖', spriteId: 'ant_house_1', badgeColor: '#64748b', pixelMatrixColor: '#ca8a04' },
      2: { name: 'Casa de Argila', description: 'Construção de barro seco com estrutura reforçada', icon: '🧱', spriteId: 'ant_house_2', badgeColor: '#2563eb', pixelMatrixColor: '#a16207' },
      3: { name: 'Zigurate Doméstico', description: 'Palácio em degraus esculpido em pedra e tijolos reais', icon: '🏛️', spriteId: 'ant_house_3', badgeColor: '#c026d3', pixelMatrixColor: '#854d0e' }
    },
    investimentos: {
      1: { name: 'Baú de Cedro', description: 'Reserva em pepitas de cobre e moedas antigas', icon: '🪵', spriteId: 'ant_inv_1', badgeColor: '#64748b', pixelMatrixColor: '#854d0e' },
      2: { name: 'Armazém de Grãos', description: 'Silos cheios de mantimentos e barras de metal', icon: '🌾', spriteId: 'ant_inv_2', badgeColor: '#2563eb', pixelMatrixColor: '#ca8a04' },
      3: { name: 'Tesouro do Faraó', description: 'Câmara repleta de estátuas de ouro e joias preciosas', icon: '🥇', spriteId: 'ant_inv_3', badgeColor: '#c026d3', pixelMatrixColor: '#eab308' }
    },
    hub: {
      1: { name: 'Tenda Tribal', description: 'Ponto central de conselho da tribo', icon: '⛺', spriteId: 'ant_hub_1', badgeColor: '#64748b', pixelMatrixColor: '#78350f' },
      2: { name: 'Templo de Pedra', description: 'Santuário para decisões e registros', icon: '🏛️', spriteId: 'ant_hub_2', badgeColor: '#2563eb', pixelMatrixColor: '#9a3412' },
      3: { name: 'Grande Monólito', description: 'Monumento sagrado reluzente do império', icon: '🗿', spriteId: 'ant_hub_3', badgeColor: '#c026d3', pixelMatrixColor: '#c2410c' }
    },
    estudos: {
      1: { name: 'Placa de Argila', description: 'Inscrições cuneiformes e desenhos na terra', icon: '📜', spriteId: 'ant_est_1', badgeColor: '#64748b', pixelMatrixColor: '#9a3412' },
      2: { name: 'Tenda dos Sábios', description: 'Local de astronomia e contagem de épocas', icon: '📜', spriteId: 'ant_est_2', badgeColor: '#2563eb', pixelMatrixColor: '#c2410c' },
      3: { name: 'Biblioteca de Papiros', description: 'Acervo com os registros das grandes dinastias', icon: '🏛️', spriteId: 'ant_est_3', badgeColor: '#c026d3', pixelMatrixColor: '#ea580c' }
    },
    saude: {
      1: { name: 'Tenda do Xamã', description: 'Ervas e rituais de cura ancestral', icon: '🌿', spriteId: 'ant_sau_1', badgeColor: '#64748b', pixelMatrixColor: '#15803d' },
      2: { name: 'Casa dos Herbalistas', description: 'Preparação de unguentos medicinais', icon: '🍃', spriteId: 'ant_sau_2', badgeColor: '#2563eb', pixelMatrixColor: '#166534' },
      3: { name: 'Templo de Cura', description: 'Santuário com banhos termais e tratamento real', icon: '🏛️', spriteId: 'ant_sau_3', badgeColor: '#c026d3', pixelMatrixColor: '#14532d' }
    },
    custom: {
      1: { name: 'Barraca de Troca', description: 'Escambo simples de especiarias', icon: '📦', spriteId: 'ant_cust_1', badgeColor: '#64748b', pixelMatrixColor: '#a16207' },
      2: { name: 'Feira da Cidade', description: 'Comércio vibrante de tecidos e cerâmicas', icon: '🏺', spriteId: 'ant_cust_2', badgeColor: '#2563eb', pixelMatrixColor: '#ca8a04' },
      3: { name: 'Bazar Real', description: 'Mercado monumental abastecido por caravanas', icon: '🕌', spriteId: 'ant_cust_3', badgeColor: '#c026d3', pixelMatrixColor: '#eab308' }
    }
  },

  // --------------------------------------------------------------------------
  // 3. ÉPOCA GRECO-ROMANA
  // --------------------------------------------------------------------------
  greco_romano: {
    locomocao: {
      1: { name: 'Carroça de Madeira', description: 'Condução simples puxada a boi', icon: '🛞', spriteId: 'gr_loc_1', badgeColor: '#64748b', pixelMatrixColor: '#92400e' },
      2: { name: 'Cavalo de Corrida', description: 'Parelha de treino para arenas', icon: '🐎', spriteId: 'gr_loc_2', badgeColor: '#2563eb', pixelMatrixColor: '#b45309' },
      3: { name: 'Biga Dourada', description: 'Carro de combate e desfile ornamentado em ouro', icon: '🔱', spriteId: 'gr_loc_3', badgeColor: '#c026d3', pixelMatrixColor: '#eab308' }
    },
    casa: {
      1: { name: 'Insula Simples', description: 'Apartamento residencial de madeira e tijolo', icon: '🏚️', spriteId: 'gr_house_1', badgeColor: '#64748b', pixelMatrixColor: '#78350f' },
      2: { name: 'Domus de Pedra', description: 'Residência com átrio interno e mosaicos', icon: '🏡', spriteId: 'gr_house_2', badgeColor: '#2563eb', pixelMatrixColor: '#0284c7' },
      3: { name: 'Villa Romana', description: 'Palacete com colunas macedônicas e fontes termais', icon: '🏛️', spriteId: 'gr_house_3', badgeColor: '#c026d3', pixelMatrixColor: '#0369a1' }
    },
    investimentos: {
      1: { name: 'Mesa da Ágora', description: 'Mesa de moedas de prata e trocas diretas', icon: '⚖️', spriteId: 'gr_inv_1', badgeColor: '#64748b', pixelMatrixColor: '#94a3b8' },
      2: { name: 'Erarium Público', description: 'Cofre oficial de pedra com guardas pretorianos', icon: '🏛️', spriteId: 'gr_inv_2', badgeColor: '#2563eb', pixelMatrixColor: '#cbd5e1' },
      3: { name: 'Panteão de Ouro', description: 'Templo do tesouro com cúpula e colunas de mármore', icon: '🏛️', spriteId: 'gr_inv_3', badgeColor: '#c026d3', pixelMatrixColor: '#facc15' }
    },
    hub: {
      1: { name: 'Fórum de Madeira', description: 'Ponto de debate dos cidadãos', icon: '🏛️', spriteId: 'gr_hub_1', badgeColor: '#64748b', pixelMatrixColor: '#64748b' },
      2: { name: 'Senado da Província', description: 'Edifício em mármore para leis e finanças', icon: '🏛️', spriteId: 'gr_hub_2', badgeColor: '#2563eb', pixelMatrixColor: '#475569' },
      3: { name: 'Acrópole Imperial', description: 'O monumento supremo da cidade em mármore branco', icon: '🏛️', spriteId: 'gr_hub_3', badgeColor: '#c026d3', pixelMatrixColor: '#e2e8f0' }
    },
    estudos: {
      1: { name: 'Peristilo de Leitura', description: 'Pátio com rolos de papiro e poesia', icon: '📜', spriteId: 'gr_est_1', badgeColor: '#64748b', pixelMatrixColor: '#38bdf8' },
      2: { name: 'Liceu de Filosofia', description: 'Escola de retórica, matemática e lógica', icon: '🏛️', spriteId: 'gr_est_2', badgeColor: '#2563eb', pixelMatrixColor: '#0284c7' },
      3: { name: 'Academia de Platão', description: 'O maior centro do conhecimento da antiguidade clássica', icon: '🎓', spriteId: 'gr_est_3', badgeColor: '#c026d3', pixelMatrixColor: '#0369a1' }
    },
    saude: {
      1: { name: 'Altar de Asclépio', description: 'Oração e tratamentos com óleos essenciais', icon: '🕊️', spriteId: 'gr_sau_1', badgeColor: '#64748b', pixelMatrixColor: '#10b981' },
      2: { name: 'Termas Romanas', description: 'Banhos públicos e recuperação muscular', icon: '♨️', spriteId: 'gr_sau_2', badgeColor: '#2563eb', pixelMatrixColor: '#059669' },
      3: { name: 'Asclépion Monumental', description: 'Complexo hospitalar com médicos da corte', icon: '🏥', spriteId: 'gr_sau_3', badgeColor: '#c026d3', pixelMatrixColor: '#047857' }
    },
    custom: {
      1: { name: 'Bancada do Mercado', description: 'Comércio de azeites e vinhos', icon: '🏺', spriteId: 'gr_cust_1', badgeColor: '#64748b', pixelMatrixColor: '#b45309' },
      2: { name: 'Taberna da Via', description: 'Ponto de encontro e troca de insumos', icon: '🍷', spriteId: 'gr_cust_2', badgeColor: '#2563eb', pixelMatrixColor: '#9a3412' },
      3: { name: 'Emporium Marítimo', description: 'Grande armazém de bens importados', icon: '🏛️', spriteId: 'gr_cust_3', badgeColor: '#c026d3', pixelMatrixColor: '#c2410c' }
    }
  },

  // --------------------------------------------------------------------------
  // 4. ÉPOCA CONTEMPORÂNEA / MODERNA
  // --------------------------------------------------------------------------
  moderno: {
    locomocao: {
      1: { name: 'Bicicleta Urbana', description: 'Mobilidade leve para deslocamentos diários', icon: '🚲', spriteId: 'mod_loc_1', badgeColor: '#64748b', pixelMatrixColor: '#06b6d4' },
      2: { name: 'Hatch Compacto', description: 'Veículo econômico e prático', icon: '🚗', spriteId: 'mod_loc_2', badgeColor: '#2563eb', pixelMatrixColor: '#0284c7' },
      3: { name: 'SUV Esportivo', description: 'Carro de luxo importado com motor V8', icon: '🏎️', spriteId: 'mod_loc_3', badgeColor: '#c026d3', pixelMatrixColor: '#3b82f6' }
    },
    casa: {
      1: { name: 'Loft / Kitnet', description: 'Apartamento studio compacto e funcional', icon: '🏬', spriteId: 'mod_house_1', badgeColor: '#64748b', pixelMatrixColor: '#64748b' },
      2: { name: 'Casa de Bairro', description: 'Residência com garagem e quintal', icon: '🏠', spriteId: 'mod_house_2', badgeColor: '#2563eb', pixelMatrixColor: '#f97316' },
      3: { name: 'Mansão de Alto Padrão', description: 'Propriedade modernista com piscina e vidros reflexivos', icon: '🏰', spriteId: 'mod_house_3', badgeColor: '#c026d3', pixelMatrixColor: '#ec4899' }
    },
    investimentos: {
      1: { name: 'Cofre Pessoal', description: 'Reserva física e fundos de emergência', icon: '🔒', spriteId: 'mod_inv_1', badgeColor: '#64748b', pixelMatrixColor: '#94a3b8' },
      2: { name: 'Agência Bancária', description: 'Portfólio de ações e fundo multimercado', icon: '🏦', spriteId: 'mod_inv_2', badgeColor: '#2563eb', pixelMatrixColor: '#3b82f6' },
      3: { name: 'Torre da Bolsa', description: 'Prédio espelhado corporativo de investimentos globais', icon: '🏙️', spriteId: 'mod_inv_3', badgeColor: '#c026d3', pixelMatrixColor: '#38bdf8' }
    },
    hub: {
      1: { name: 'Escritório Inicial', description: 'Sala comercial de acompanhamento', icon: '🏢', spriteId: 'mod_hub_1', badgeColor: '#64748b', pixelMatrixColor: '#475569' },
      2: { name: 'Sede Financeira', description: 'Centro administrativo com equipe', icon: '🏢', spriteId: 'mod_hub_2', badgeColor: '#2563eb', pixelMatrixColor: '#1e293b' },
      3: { name: 'Arranha-Céu Headquarter', description: 'Complexo corporativo no centro financeiro', icon: '🏙️', spriteId: 'mod_hub_3', badgeColor: '#c026d3', pixelMatrixColor: '#0f172a' }
    },
    estudos: {
      1: { name: 'Escrivaninha com PC', description: 'Estudos online e cursos livres', icon: '💻', spriteId: 'mod_est_1', badgeColor: '#64748b', pixelMatrixColor: '#a855f7' },
      2: { name: 'Escola de Negócios', description: 'Especialização e cursos executivos', icon: '📚', spriteId: 'mod_est_2', badgeColor: '#2563eb', pixelMatrixColor: '#9333ea' },
      3: { name: 'Campus Universitário', description: 'Centro de doutorado e pesquisa avançada', icon: '🎓', spriteId: 'mod_est_3', badgeColor: '#c026d3', pixelMatrixColor: '#7e22ce' }
    },
    saude: {
      1: { name: 'Posto de Saúde', description: 'Consultas de rotina e prevenção', icon: '🩺', spriteId: 'mod_sau_1', badgeColor: '#64748b', pixelMatrixColor: '#22c55e' },
      2: { name: 'Clínica Integrada', description: 'Atendimento multidisciplinar e exames', icon: '🏥', spriteId: 'mod_sau_2', badgeColor: '#2563eb', pixelMatrixColor: '#16a34a' },
      3: { name: 'Hospital Geral de Ilha', description: 'Centro hospitalar completo com heliponto', icon: '🏥', spriteId: 'mod_sau_3', badgeColor: '#c026d3', pixelMatrixColor: '#15803d' }
    },
    custom: {
      1: { name: 'Quiosque de Bairro', description: 'Pequeno comércio ou serviço', icon: '🏪', spriteId: 'mod_cust_1', badgeColor: '#64748b', pixelMatrixColor: '#f59e0b' },
      2: { name: 'Loja Comercial', description: 'Ponto comercial estabelecido', icon: '🏬', spriteId: 'mod_cust_2', badgeColor: '#2563eb', pixelMatrixColor: '#d97706' },
      3: { name: 'Shopping Mall', description: 'Grande centro de compras e entretenimento', icon: '🏢', spriteId: 'mod_cust_3', badgeColor: '#c026d3', pixelMatrixColor: '#b45309' }
    }
  },

  // --------------------------------------------------------------------------
  // 5. ÉPOCA CYBERPUNK / FUTURISTA
  // --------------------------------------------------------------------------
  futurista: {
    locomocao: {
      1: { name: 'Hoverboard Maglev', description: 'Prancha gravitacional de transporte rápido', icon: '🛹', spriteId: 'fut_loc_1', badgeColor: '#64748b', pixelMatrixColor: '#22d3ee' },
      2: { name: 'Cyberbike Neon', description: 'Moto de tração magnética com luzes de neon', icon: '🏍️', spriteId: 'fut_loc_2', badgeColor: '#2563eb', pixelMatrixColor: '#06b6d4' },
      3: { name: 'Nave Hovercar Lux', description: 'Veículo voador autônomo de cabine estanque', icon: '🛸', spriteId: 'fut_loc_3', badgeColor: '#c026d3', pixelMatrixColor: '#f43f5e' }
    },
    casa: {
      1: { name: 'Cápsula Slum', description: 'Unidade habitacional em bloco vertical', icon: '📦', spriteId: 'fut_house_1', badgeColor: '#64748b', pixelMatrixColor: '#475569' },
      2: { name: 'Apto High-Rise', description: 'Residência com holografia e automação quântica', icon: '🏙️', spriteId: 'fut_house_2', badgeColor: '#2563eb', pixelMatrixColor: '#0284c7' },
      3: { name: 'Penthouse Megastrutura', description: 'Cobertura no topo da nuvem com vista da metrópole', icon: '🌆', spriteId: 'fut_house_3', badgeColor: '#c026d3', pixelMatrixColor: '#a855f7' }
    },
    investimentos: {
      1: { name: 'Node de Cripto', description: 'Hardware wallet dedicada a moedas quânticas', icon: '💻', spriteId: 'fut_inv_1', badgeColor: '#64748b', pixelMatrixColor: '#4ade80' },
      2: { name: 'Vault de Dados Quantum', description: 'Servidor seguro com criptografia neural', icon: '🖥️', spriteId: 'fut_inv_2', badgeColor: '#2563eb', pixelMatrixColor: '#22c55e' },
      3: { name: 'Cúpula Orbital', description: 'Estação espacial de ativos holográficos', icon: '🛰️', spriteId: 'fut_inv_3', badgeColor: '#c026d3', pixelMatrixColor: '#f43f5e' }
    },
    hub: {
      1: { name: 'Terminal do Setor', description: 'Central de monitoramento local', icon: '🖥️', spriteId: 'fut_hub_1', badgeColor: '#64748b', pixelMatrixColor: '#334155' },
      2: { name: 'Matriz de Dados', description: 'Servidor central do distrito financeiro', icon: '🏙️', spriteId: 'fut_hub_2', badgeColor: '#2563eb', pixelMatrixColor: '#0f172a' },
      3: { name: 'Cúpula Holográfica', description: 'O núcleo supremo interconectado da vila', icon: '🌐', spriteId: 'fut_hub_3', badgeColor: '#c026d3', pixelMatrixColor: '#ec4899' }
    },
    estudos: {
      1: { name: 'Chip Neural Reader', description: 'Download de conhecimento direto na sinapse', icon: '🧠', spriteId: 'fut_est_1', badgeColor: '#64748b', pixelMatrixColor: '#e879f9' },
      2: { name: 'Lab Holo-Simulação', description: 'Treinamento em realidade virtual imersiva', icon: '🥽', spriteId: 'fut_est_2', badgeColor: '#2563eb', pixelMatrixColor: '#d946ef' },
      3: { name: 'Megacentro P&D Quantum', description: 'Pesquisa em fusão nuclear e inteligência geral', icon: '⚛️', spriteId: 'fut_est_3', badgeColor: '#c026d3', pixelMatrixColor: '#c026d3' }
    },
    saude: {
      1: { name: 'Med-Pod de Bairro', description: 'Regeneração celular acelerada automatizada', icon: '🧬', spriteId: 'fut_sau_1', badgeColor: '#64748b', pixelMatrixColor: '#2dd4bf' },
      2: { name: 'Clínica de Biocibernética', description: 'Aprimoramento e manutenção orgânica', icon: '🏥', spriteId: 'fut_sau_2', badgeColor: '#2563eb', pixelMatrixColor: '#14b8a6' },
      3: { name: 'Hospital de Clonagem', description: 'Longevidade quântica e substituição genômica', icon: '🏥', spriteId: 'fut_sau_3', badgeColor: '#c026d3', pixelMatrixColor: '#0d9488' }
    },
    custom: {
      1: { name: 'Cyber Kiosk', description: 'Venda de suprimentos e implantes simples', icon: '🤖', spriteId: 'fut_cust_1', badgeColor: '#64748b', pixelMatrixColor: '#fbbf24' },
      2: { name: 'Oficina de Implantes', description: 'Manutenção de próteses e sintéticos', icon: '🦾', spriteId: 'fut_cust_2', badgeColor: '#2563eb', pixelMatrixColor: '#f59e0b' },
      3: { name: 'Emporium Neon', description: 'Mega galeria comercial futurista', icon: '🏬', spriteId: 'fut_cust_3', badgeColor: '#c026d3', pixelMatrixColor: '#d97706' }
    }
  }
};
