# n8n-nodes-apiyi

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![n8n Community Node](https://img.shields.io/badge/n8n-community--node-orange)](https://docs.n8n.io/integrations/community-nodes/)

**n8n community nodes for [APIYI](https://apiyi.com) — unified AI API platform.**  
Chat with Claude, GPT, Gemini, DeepSeek. Generate images and videos. Create embeddings. Run batch jobs.

---

## Nodes

| Node | Description |
|------|-------------|
| **APIYI Chat** | Chat completions — Claude, GPT-4o, Gemini, DeepSeek, Kimi |
| **APIYI Image** | Image generation — DALL-E 3, Flux, GPT-Image-1 |
| **APIYI Video** | Video generation with auto-polling — Sora, Kling, SeeDance |
| **APIYI Batch** | Batch API — create, get, list, cancel jobs |
| **APIYI Embedding** | Text embeddings — text-embedding-3-small/large |

## Installation

In n8n: **Settings → Community Nodes → Install** → enter `n8n-nodes-apiyi`

Or via CLI:
```bash
npm install n8n-nodes-apiyi
```

## Setup

1. Get your API key at [apiyi.com/dashboard](https://apiyi.com/dashboard)
2. In n8n: **Credentials → New → APIYI API**
3. Enter your API key and base URL (`https://api.apiyi.com/v1`)

## Example Workflows

Importable JSON workflow files are in the [`examples/`](./examples/) folder. Import them in n8n: **Workflows → Import from File**.

### 1. AI Content Pipeline (Chat + Image) — [`01_content_pipeline.json`](./examples/01_content_pipeline.json)
```
Manual Trigger → Set Topic → APIYI Chat (Claude Sonnet) → APIYI Image (DALL-E 3) → Output
```
Generates a 150-word article intro + matching illustration for any topic. Output includes `article_text` and `image_url`.

### 2. Video Generation + Telegram Delivery — [`02_video_generation_telegram.json`](./examples/02_video_generation_telegram.json)
```
Schedule Trigger (daily) → Set Params → APIYI Video (Kling 1.6 Pro, auto-poll) → Telegram
```
Generates a cinematic AI video every day and sends it to Telegram. The Video node auto-polls until completion — no manual status checking.

### 3. Semantic Search (RAG) with Embeddings — [`03_semantic_search_embeddings.json`](./examples/03_semantic_search_embeddings.json)
```
Webhook → APIYI Embedding (text-embedding-3-small) → Supabase pgvector search → APIYI Chat (RAG answer) → Response
```
Full RAG pipeline in 4 nodes: embed user query → vector similarity search → Claude generates grounded answer from context.

---

# n8n-nodes-apiyi（中文说明）

**基于 [APIYI](https://apiyi.com) 的 n8n 社区节点包——统一 AI API 平台。**

## 支持的节点

| 节点 | 功能说明 |
|------|---------|
| **APIYI Chat** | 对话补全 — Claude / GPT-4o / Gemini / DeepSeek / Kimi |
| **APIYI Image** | 图像生成 — DALL-E 3、Flux、GPT-Image-1 |
| **APIYI Video** | 视频生成（自动轮询）— Sora、Kling、SeeDance |
| **APIYI Batch** | 批处理任务 — 创建/查询/列出/取消 |
| **APIYI Embedding** | 文本向量化 — text-embedding-3-small/large |

## 安装方法

在 n8n 中：**设置 → 社区节点 → 安装** → 输入 `n8n-nodes-apiyi`

## 配置

1. 前往 [apiyi.com/dashboard](https://apiyi.com/dashboard) 获取 API 密钥
2. 在 n8n 中：**凭证 → 新建 → APIYI API**
3. 填入 API 密钥和 Base URL（`https://api.apiyi.com/v1`）

## License

MIT © [Ramiz Fiziev](https://github.com/fer-fer-code)
