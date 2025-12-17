# Architect Zero | Toolkit

O Architect Zero é um projeto focado em entregar ferramentas de engenharia de alta performance com soberania de dados. Este Toolkit é o primeiro módulo, criado para resolver manipulação de imagem sem intermediários ou processamento em nuvem.

---

## 🛠️ Detalhes da Engenharia

Priorizamos a execução direta no hardware do usuário:

- **Vanilla JS**: Zero frameworks. Manipulação de pixels pura via Canvas API para garantir velocidade e leveza.
- **Custom ZIP Engine**: Implementamos uma classe de ZIP minimalista dentro do `utils.js` para evitar dependências externas pesadas e manter o bundle minúsculo.
- **Memory Management**: O sistema monitora o consumo de recursos, aplicando uma trava de segurança de 50MB em dispositivos móveis para garantir a estabilidade do navegador.

---

## 🚀 O que o Toolkit faz hoje (Fase 2)

- **Conversão Local**: Suporte bidirecional para WebP, PNG e JPEG sem uploads.
- **Compressão Dinâmica**: Controle total de qualidade JPEG com estatísticas de economia de bytes em tempo real.
- **Resizer Inteligente**: Redimensionamento em lote que preserva a proporção das imagens automaticamente.

---

## 🗺️ Roadmap de Evolução

Atualmente estamos na **Fase 2 (Imagens)**. O plano de engenharia já prevê a **Fase 3 (Integração com PDFs)** e a **Fase 4 (Processamento de vídeo via WASM/ffmpeg)**.

---

## 🛡️ Privacidade e Transparência

Suas imagens nunca saem do seu navegador. Utilizamos apenas o Cloudflare Insights para telemetria anônima de tráfego, garantindo que possamos otimizar a infraestrutura conforme o uso cresce.

---

© 2025 Architect Zero
