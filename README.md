# CONTESTE.INFO

Portal diário de **inscrições abertas** nas áreas de **Cultura, Educação, Esportes e Trabalho**.
Site 100% estático (HTML + CSS + JS puro, sem frameworks), hospedado no **GitHub Pages**.

- Domínio: https://conteste.info
- Repositório: https://github.com/andrewturquetti/conteste

## Princípios do projeto

1. **Sem imagens** e sem requisições externas (sem Google Fonts). Máxima leveza.
2. **Por dia**: cada oportunidade tem uma `published_date`; o visitante vê o que está
   aberto hoje e pode filtrar por dia e por categoria.
3. **Só fontes oficiais**: todo item tem link direto para a fonte oficial e nível de
   confiabilidade (`reliability_level`).
4. **Ética e legalidade**: nada de raspar buscadores violando termos de uso; não se
   reproduz texto integral de terceiros; aviso legal fixo no rodapé.

## Estrutura

```
index.html               Home: resumo por categoria + navegação por dia
cultura.html             Lista completa de Cultura (filtros + paginação)
educacao.html            Lista completa de Educação
esportes.html            Lista completa de Esportes
trabalho.html            Lista completa de Trabalho
css/style.css            Tema preto e branco (system fonts)
js/main.js               Busca, filtros, navegação por dia e render dos cards
data/oportunidades.json  Base acumulativa (fonte única de conteúdo do site)
data/lotes/              Lotes de novas oportunidades curadas (entrada)
scripts/atualizar_portal.py     Migra schema, mescla lote, expira prazos, gera sitemap
scripts/validar_oportunidades.py Valida o JSON
scripts/gerar-conteudo-diario.py Relatório (newsletter) + legendas + fila social
relatorios/              Relatório diário em markdown
publicacoes/             Legendas por oportunidade (Instagram/Twitter/LinkedIn)
social-media/queue/      Fila de publicações estruturada
```

## Fluxo de atualização (sob demanda)

Quando o responsável pedir "atualize o site", a curadoria é feita (busca por
"inscrições abertas" e correlatos, priorizando fontes oficiais) e gravada como um
**lote** em `data/lotes/AAAA-MM-DD.json`. Em seguida:

```powershell
python scripts/atualizar_portal.py --batch data/lotes/AAAA-MM-DD.json
python scripts/validar_oportunidades.py
python scripts/gerar-conteudo-diario.py
git add -A
git commit -m "content: novas oportunidades AAAA-MM-DD"
git push
```

O `git push` na branch `main` publica o site automaticamente (GitHub Pages).

### Manutenção sem novas oportunidades

```powershell
python scripts/atualizar_portal.py   # expira prazos vencidos e regenera o sitemap
```

## Schema de uma oportunidade

Campos obrigatórios: `id`, `category` (cultura|educacao|esportes|trabalho), `title`,
`short_description`, `official_link`, `source_name`, `status`
(open|closed|continuous|coming_soon|extended), `published_date`.

Campos opcionais relevantes: `deadline`, `deadline_date`, `location`, `state`,
`city`, `is_free`, `tags`, `reliability_level` (A–D).

> O campo `image_url` foi **removido**: o site não usa imagens.
