# Traduções pt-BR

Páginas traduzidas ficam em `docusaurus-plugin-content-docs/current/`, com o
mesmo caminho que têm em `docs/`.

**Use rotas absolutas nos links** (`/docs/core/capabilities`), nunca relativas
(`./core/capabilities.md`). Um link relativo resolve dentro desta pasta, que só
contém o que já foi traduzido — então ele quebra o build assim que apontar para
uma página ainda em inglês.

Uma página sem tradução cai no inglês em vez de dar 404, então cobertura parcial
é esperada.
