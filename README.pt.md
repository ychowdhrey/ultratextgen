🌍 Idiomas  
[English](README.md) | [Français](README.fr.md) | [Español](README.es.md) | [Português](README.pt.md) | [Deutsch](README.de.md) | [Русский](README.ru.md) | [العربية](README.ar.md) | [Polski](README.pl.md) | [Türkçe](README.tr.md)

# UltraTextGen

UltraTextGen é um gerador de texto Unicode rápido e limpo, feito para quem não quer perder tempo.

- Sem páginas pesadas.
- Sem carregamentos desnecessários.
- Sem distrações.

Digite o seu texto, copie e siga em frente.


## Por Que UltraTextGen

A maioria das ferramentas de texto estilizado é lenta, poluída e cheia de efeitos que você nunca vai usar.

UltraTextGen é o contrário.

Carrega instantaneamente  
Roda inteiramente no navegador  
Sem cadastros, sem pop-ups  
Nada entre você e o botão de copiar

Foi feito para economizar tempo, não para consumi-lo.


## O Que Ele Faz

**Texto estilizado que você cola em qualquer lugar.** O UltraTextGen converte
texto comum em estilos baseados em Unicode — 114 deles — que funcionam em redes
sociais e aplicativos de mensagens. A saída é texto de verdade, não uma imagem:
copia, cola e sobrevive onde quer que você coloque.

**Nomes decorados para jogos e perfis.** Uma camada de ornamentos compõe
molduras, coroas e divisores em volta de um nome, e um motor de regras por jogo
confere o resultado contra o limite de caracteres que o jogo realmente aplica —
antes de você gastar uma troca de nome.

**Saída visual e para impressão, quando os caracteres não dão conta.** Folhas de
prática em letra bolha e cursiva, páginas para colorir, texto curvado e em arco,
lettering para tatuagem. Tudo isso é gerado como SVG/PNG no seu navegador e é o
passo seguinte para o que copiar e colar não resolve — traçar, colorir,
imprimir — nunca a resposta padrão.

Tudo isso roda no cliente. Nada é gerado em servidor e nenhum arquivo de fonte é
baixado para que funcione.


## Para Quem É

Criadores atualizando bios e legendas  
Gestores de redes sociais testando variações  
Comunidades de Discord e de games  
Qualquer pessoa que queira destaque visual sem atrito

Se velocidade importa, esta ferramenta serve.


## Feito Para Velocidade

O UltraTextGen é propositalmente leve.

- Sem frameworks
- Sem bundlers
- Sem dependências no navegador
- Sem animações desnecessárias

Tudo foi projetado para carregar rápido e continuar responsivo mesmo em conexões lentas.


## Filosofia De Design

- Rápido antes de sofisticado
- Claro antes de esperto
- Útil antes de impressionante

Se algo não ajuda o usuário a avançar mais rápido, não entra no ar.


## Site No Ar

**Página inicial:** https://ultratextgen.com

### O que existe no site

Cada seção abaixo tem sua própria página de índice com busca e navegação
integradas — é o jeito mais rápido de encontrar algo. Os números são atualizados
semanalmente a partir do `sitemap.xml`.

<!-- START_PILLARS -->
| Seção | Páginas em inglês | Páginas localizadas |
|---|---:|---:|
| [Biblioteca](https://ultratextgen.com/library/) | 336 | 1.084 |
| [Símbolos](https://ultratextgen.com/symbol/) | 113 | 1.652 |
| [Respostas](https://ultratextgen.com/answers/) | 65 | 75 |
| [Casos de Uso](https://ultratextgen.com/usecase/) | 36 | 144 |
| [Guias](https://ultratextgen.com/guide/) | 32 | 90 |
| [Categorias](https://ultratextgen.com/category/) | 23 | 0 |
| [Atualizações](https://ultratextgen.com/updates/) | 11 | 56 |
| [Ferramentas Incorporáveis](https://ultratextgen.com/embed/) | 6 | 0 |

**4.576 URLs no total**, em 30 idiomas.
<!-- END_PILLARS -->


## Páginas De Plataformas

Páginas dedicadas a cada grande plataforma, para que os estilos apareçam exatamente como esperado.

<!-- START_PLATFORMS -->
### Plataformas de Redes Sociais
**Facebook:** https://ultratextgen.com/facebook/
**Instagram:** https://ultratextgen.com/instagram/
**LinkedIn:** https://ultratextgen.com/linkedin/
**Pinterest:** https://ultratextgen.com/pinterest/
**Snapchat:** https://ultratextgen.com/snapchat/
**TikTok:** https://ultratextgen.com/tiktok/
**X (Twitter):** https://ultratextgen.com/x/
**YouTube:** https://ultratextgen.com/youtube/

### Plataformas de Mensagens
**Discord:** https://ultratextgen.com/discord/
**Telegram:** https://ultratextgen.com/telegram/
**WhatsApp:** https://ultratextgen.com/whatsapp/
<!-- END_PLATFORMS -->


## Idiomas

A maior parte do site é localizada, não apenas a interface — cada idioma tem as
suas próprias páginas, escritas para aquele mercado em vez de traduzidas
automaticamente do inglês.

<!-- START_LOCALES -->
O site está disponível em 30 idiomas:

العربية (`ar`) · Bosanski (`bs`) · Čeština (`cs`) · Dansk (`da`) · Deutsch (`de`) · Español (`es`) · Suomi (`fi`) · Français (`fr`) · हिन्दी (`hi`) · Hrvatski (`hr`) · Magyar (`hu`) · Bahasa Indonesia (`id`) · Italiano (`it`) · 日本語 (`ja`) · 한국어 (`ko`) · Bahasa Melayu (`ms`) · Nederlands (`nl`) · Norsk (`no`) · Polski (`pl`) · Português (`pt`) · Română (`ro`) · Русский (`ru`) · Slovenčina (`sk`) · Српски (`sr`) · Svenska (`sv`) · ไทย (`th`) · Tagalog (`tl`) · Türkçe (`tr`) · Tiếng Việt (`vi`) · 繁體中文 (`zh-tw`)
<!-- END_LOCALES -->


## Ferramentas Incorporáveis

Versões leves e incorporáveis das ferramentas do UltraTextGen, para integração em páginas e plataformas externas.

<!-- START_EMBED -->
- https://ultratextgen.com/embed/bio-font-generator/
- https://ultratextgen.com/embed/character-counter/
- https://ultratextgen.com/embed/linkedin-headline-generator/
- https://ultratextgen.com/embed/name-checker/
- https://ultratextgen.com/embed/nickname-generator/
- https://ultratextgen.com/embed/zalgo-text-generator/
<!-- END_EMBED -->


## Estrutura Do Projeto

```
ultratextgen/
├── index.html               # Página inicial
├── style.css                # Folha de estilos global
├── script.js                # Lógica de interface — entrada, grade, cópia, ornamentos
├── styles.js                # Registro de estilos Unicode (114 estilos)
├── renderer.js              # Motor de renderização — despacha por style.type
├── header.js                # Injetor da navegação compartilhada
├── sitemap.xml              # Gerado automaticamente — nunca editar à mão
├── _redirects, _headers     # Configuração do Cloudflare Pages
├── _routes.json             # Roteamento de Pages Functions (só `/` invoca uma)
├── functions/               # Middleware do Cloudflare Pages
│
├── js/                      # Módulos de funcionalidade, um diretório cada
│   ├── flair/               #   pacotes de decoração de nomes
│   ├── gamename/            #   regras de nome por jogo + verificador
│   ├── counter/             #   contador de caracteres (com testes)
│   ├── printables/          #   motor de folhas para impressão
│   ├── curved/  tattoo/     #   modos de saída SVG/PNG
│   ├── vertical/  kaomoji/  #   …e mais uns 20
│
├── category/  usecase/      # Pilares de conteúdo (ver "O que existe no site")
├── guide/     answers/
├── library/   symbol/
├── updates/   embed/
│
├── <lang>/                  # 30 árvores localizadas do site (de/, es/, ja/, …)
│
├── discord/  instagram/     # Páginas de plataformas
├── linkedin/ tiktok/  …
│
├── data/                    # Registros e catálogos que o ferramental lê
├── docs/                    # Documentação técnica e de processos
└── scripts/                 # Scripts de build, validação e geração
```

`CLAUDE.md` na raiz do repositório é o guia técnico completo — regras de
conteúdo, fluxo de localização, verificações de validação e convenções.


## Stack Técnica

| Camada | Tecnologia |
|---|---|
| Frontend | HTML5, CSS3, JavaScript puro (ES6+) — sem frameworks, sem bundlers |
| Saída visual | Canvas/SVG nativos, renderizados no cliente |
| Ferramental de build | Node.js (sitemap, validadores), Python (geração de assets) |
| CI/CD | GitHub Actions |
| Hospedagem | Cloudflare Pages + Pages Functions |

O frontend não tem etapa de build. Node e Python são usados apenas em
ferramental que roda antes do deploy, nunca no navegador.


## Desenvolvimento

```bash
npm install            # Só ferramental de build — nada chega ao navegador

npx serve .            # Servir localmente; ou: python3 -m http.server 8080
npm run prebuild       # Regerar o sitemap.xml
npm run sync-readme    # Atualizar os blocos gerados deste arquivo
```

Não há etapa de build para o frontend — abra o `index.html` diretamente ou sirva
o diretório com qualquer servidor de arquivos estáticos.
