# Design

O que decide a aparência do app e por quê. Se você vai mexer no visual, os
tokens são a fonte da verdade — não escreva cor literal em componente.

## Tipografia

**Inter**, servida pelo próprio domínio via `next/font` (nenhuma requisição sai
para o Google em produção; a CSP fica fechada em `font-src 'self'`).

Ela foi escolhida pelos números, não pelas letras:

- tem versão **tabular** de verdade, então uma coluna de valores alinha;
- o zero cortado (`ss03`) não se confunde com "O" num extrato;
- o "1" tem serifa de base e não vira "l".

Num app onde a pessoa lê colunas de dinheiro, isso não é detalhe.

Escala do dinheiro (`money-sm` → `money-xl`): quanto maior o corpo, mais
negativo o tracking. Em tamanho grande o espaçamento padrão faz o número
parecer esparramado.

O componente `<Money>` separa símbolo, parte inteira e centavos, e dá pesos
diferentes a cada um. O olho procura a ordem de grandeza primeiro — "R$" e
",90" são contexto, não informação.

## Cor

### A marca não é a receita

O erro mais grave da primeira versão: `--brand` e `--income` eram **a mesma
cor**. Botão primário, menu ativo e "entrou dinheiro" liam igual.

Hoje:

| Papel | Cor | Onde aparece |
|---|---|---|
| `--brand` | índigo | Só na interface: botões, menu ativo, links. **Nunca dentro de um gráfico.** |
| `--income` | verde | Só significa "entrou". |
| `--expense` | vermelho-rosado | Só significa "saiu". |
| `--transfer` | azul | Só significa "moveu entre contas". |
| `--warning` | âmbar | Só significa "atenção". |

As semânticas são **reservadas**: nunca viram "mais uma cor de série" num
gráfico. Todas passam 4,5:1 de contraste sobre a superfície, porque viram
texto de valor monetário.

### Paleta categórica

Oito matizes (`--cat-1` … `--cat-8`) para colorir categorias. Validadas com o
script de contraste e daltonismo:

- pior par vizinho: **ΔE 11,7** para protanopia/deuteranopia (alvo ≥ 8)
- pior par vizinho: **ΔE 19,2** para visão normal (piso ≥ 15)
- todas ≥ 3:1 de contraste
- **os mesmos valores passam nos dois temas**

A paleta anterior tinha `#eab308` e `#f59e0b` lado a lado — ΔE 5,3, ou seja,
a mesma cor para qualquer olho. Duas fatias vizinhas do gráfico ficavam
indistinguíveis.

A ordem é fixa e os presets reservam as oito validadas para as categorias de
maior uso. Uma nona categoria não ganha um matiz inventado: o gráfico mostra as
oito maiores e agrupa o resto em "outras".

> Para revalidar depois de mexer: rode o validador da skill `dataviz` com a
> lista de hex nos modos claro e escuro. Se qualquer verificação reprovar,
> a paleta não sobe.

## Gráficos

- **Sem animação de entrada.** A animação padrão do Recharts leva ~1,5 s
  partindo do zero, deixando o gráfico vazio no primeiro segundo. Num painel
  financeiro isso é o oposto do que se quer.
- **Legenda sempre que houver duas séries.** Sem ela, a identidade de cada
  linha depende só da cor — e ~8% dos homens não distinguem verde de vermelho,
  que é exatamente o par usado no gráfico de evolução.
- **Anel na cor da superfície entre as fatias da rosca.** O vão de 2px é o que
  impede duas cores vizinhas de virarem uma mancha só.
- **Eixos discretos**, sem grade. O dado é o protagonista.
- A lista de categorias embaixo da rosca **é** a legenda dela: nome, cor e
  valor exato. Melhor que uma caixa de legenda, porque também traz o número.

## Superfície e profundidade

Sombras em **duas camadas**: uma curta e quase opaca para o contato com a
superfície, outra longa e suave para a projeção. Uma sombra só, grande e
difusa, parece borrão.

O botão primário carrega sombra **na cor da marca**, não cinza. Sombra cinza
sob um botão colorido parece sujeira; na cor dele, parece luz.

`.surface-sheen` põe um degradê de 2% no topo dos cartões. Se der para "ver o
degradê", está forte demais.

## Sinais redundantes

Cor nunca é o único sinal:

- despesa mostra **−** explícito, além do vermelho;
- item ativo do menu tem **barra à esquerda**, além do fundo colorido;
- variação no cartão de indicador tem **seta**, além da cor;
- categorias no gráfico têm **nome e valor** na lista ao lado.

## O tema da vila

A vila (`/vila`) tem paleta própria, por época, no namespace `--era-*`. Ela é
separada de propósito:

- a vila **nunca** empresta `--brand` nem as semânticas (`--income`,
  `--expense`, `--transfer`, `--warning`) — essas continuam significando só
  estado, e só na interface;
- as cinco paletas de época são escuras nos dois temas do app. O mapa é um
  **tabuleiro**, não superfície de leitura. Por isso `data-era` fica no
  container do mapa, nunca no `<html>`;
- as cores dentro do catálogo de estruturas (`badgeColor`, `pixelMatrixColor`
  em `lib/village/catalog.ts`) são **dado**, não token: são a paleta provisória
  no lugar dos sprites em pixel art. Saem de lá quando os PNGs chegarem.

## Regras para mexer aqui

1. **Nunca escreva cor literal num componente.** Use um token. Se falta um,
   adicione em `globals.css` e mapeie em `tailwind.config.ts`.
2. **A cor de marca não entra em gráfico.** Ela é da interface.
3. **Mudou a paleta categórica? Revalide.** O script é a autoridade, não o olho.
4. **Todo texto de valor precisa de `tabular`.** Sem isso a coluna serrilha.
5. **Tema escuro não é o claro invertido.** Os cinzas ganham fundo azulado e as
   semânticas são clareadas para manter contraste.
6. **A vila fica no namespace dela.** Token de época é `--era-*` e só vale
   dentro do mapa.
