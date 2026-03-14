# Loopback UX Flow

---

## コアループ

目標サイクルを単位とした二重ループ構造。

```mermaid
flowchart TD
    A[目標設定] --> B[中間ふりかえり\n調整・確認]
    B --> B
    B --> C[最終ふりかえり\n評価・締め]
    C --> A
```

---

## ふりかえりの種類

ふりかえりは「いつやるか」ではなく「何のためか」で分類する。
粒度（頻度）は人によって異なる。

| | 中間ふりかえり | 最終ふりかえり |
|---|---|---|
| 目的 | 調整・確認 | 評価・締め |
| タイミング | 目標サイクルの途中（粒度は人による） | 目標サイクルの終わり |
| 目標との紐づけ | 任意（複数目標をまたいでも、無関係でもよい） | 特定の目標に必須 |
| Claudeの問いかけ | 「今どこにいるか」 | 「どうだったか・次に何を活かすか」 |
| 次のアクション | また中間ふりかえりへ | 次の目標設定へ |

---

## ユーザーシナリオ

### 中間ふりかえり

```mermaid
sequenceDiagram
    actor User
    participant Claude as Claude Code
    participant Loopback as MCP Server
    participant DB as SQLite

    User->>Claude: 「振り返りたい」
    Claude->>Loopback: 目標・過去の中間ふりかえりを参照
    Loopback->>DB: クエリ
    DB-->>Claude: コンテキスト返却
    Claude->>User: 「今どこにいるか」を問いかけ
    User->>Claude: 対話・調整
    Claude->>Loopback: 中間ふりかえりを保存
```

### 最終ふりかえり

```mermaid
sequenceDiagram
    actor User
    participant Claude as Claude Code
    participant Loopback as MCP Server
    participant DB as SQLite

    User->>Claude: 「今期を締めたい」
    Claude->>Loopback: 目標・全中間ふりかえりを参照
    Loopback->>DB: クエリ
    DB-->>Claude: コンテキスト返却
    Claude->>User: 「どうだったか・次に活かすことは」を問いかけ
    User->>Claude: 対話・自己評価
    Claude->>Loopback: 最終ふりかえりを保存
    Note over User,DB: このログが次の目標設定のインプットになる
```

---

## システム構成

```mermaid
graph TB
    subgraph User["ユーザー"]
        U[人]
    end
    subgraph Claude["Claude"]
        CC[Claude Code / Desktop App]
    end
    subgraph Loopback["Loopback（ローカル）"]
        MCP[MCP Server\nSSE]
        API[REST API]
        DB[(SQLite)]
        WUI[Web UI]
    end

    U <-->|対話| CC
    CC <-->|MCP SSE| MCP
    MCP --- API
    API --- DB
    U -->|閲覧のみ| WUI
    WUI --- API
```
