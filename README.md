# Architect Zero | Toolkit

---

## 🇺🇸 English

Architect Zero is a project focused on delivering high-performance engineering tools with absolute data sovereignty. This Toolkit is the first module, designed to handle image manipulation without intermediaries or cloud processing.

### 🛠️ Engineering Details

We prioritize direct execution on the user's hardware:

- **Vanilla JS**: Zero frameworks. Pure pixel manipulation via the Canvas API for speed and a lightweight footprint.
- **Custom ZIP Engine**: A minimalist ZIP class implemented within `utils.js` to avoid heavy external dependencies.
- **Memory Management**: The system monitors resource consumption, enforcing a 50MB safety cap on mobile devices to ensure browser stability.

### 🚀 Current Features (Phase 2)

- **Local Conversions**: Bi-directional support for WebP, PNG, and JPEG.
- **Dynamic Compression**: JPEG quality control with real-time byte savings metrics.
- **Smart Resizer**: Batch resizing that automatically preserves image aspect ratios.

### 🗺️ Evolution Roadmap

The project is currently in **Phase 2 (Images)**. The engineering roadmap already defines **Phase 3 (PDF Integration)** and **Phase 4 (Video processing via WASM/ffmpeg)**.

### 🛡️ Privacy & Transparency

Your images never leave your browser. Cloudflare Insights is used solely for anonymous traffic telemetry to optimize infrastructure as usage scales.

---

## 🇧🇷 Português

O Architect Zero é um projeto focado em entregar ferramentas de engenharia de alta performance com soberania total de dados. Este Toolkit é o primeiro módulo, criado para resolver manipulação de imagem sem intermediários ou processamento em nuvem.

### 🛠️ Detalhes da Engenharia

Priorizamos a execução direta no hardware do usuário:

- **Vanilla JS**: Zero frameworks. Manipulação de pixels pura via Canvas API para garantir velocidade e leveza.
- **Custom ZIP Engine**: Implementamos uma classe de ZIP minimalista dentro do `utils.js` para evitar dependências externas pesadas.
- **Memory Management**: O sistema monitora o consumo de recursos, aplicando uma trava de segurança de 50MB em dispositivos móveis para garantir a estabilidade do navegador.

### 🚀 O que o Toolkit faz hoje (Fase 2)

- **Conversão Local**: Suporte bidirecional para WebP, PNG e JPEG sem uploads.
- **Compressão Dinâmica**: Controle total de qualidade JPEG com estatísticas de economia de bytes em tempo real.
- **Resizer Inteligente**: Redimensionamento em lote que preserva a proporção das imagens automaticamente.

### 🗺️ Roadmap de Evolução

Atualmente na **Fase 2 (Imagens)**. O plano de engenharia já prevê a **Fase 3 (Integração com PDFs)** e a **Fase 4 (Processamento de vídeo via WASM/ffmpeg)**.

### 🛡️ Privacidade e Transparência

Suas imagens nunca saem do seu navegador. Utilizamos apenas o Cloudflare Insights para telemetria anônima de tráfego, garantindo que possamos otimizar a infraestrutura conforme o uso cresce.

---

© 2025 Architect Zero
