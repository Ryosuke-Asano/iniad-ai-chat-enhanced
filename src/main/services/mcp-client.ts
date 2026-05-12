/**
 * McpClient - INIAD-MOOCs-MCP サーバとの通信クライアント
 *
 * 役割 C (C01/C02/C05): MCP stdio 通信・ツール呼び出し・エラー分類
 *
 * 機能:
 * - @rarandeyo/iniad-moocs-mcp を子プロセスとして自動起動・管理
 * - MOOCs 資料検索（コース・講義・スライドの取得とキーワードフィルタリング）
 * - 検索結果キャッシュ（TTL 5分）
 * - エラー分類（接続失敗・タイムアウト・認証エラー等）
 * - 接続状態管理（connected / disconnected / connecting）
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { createRequire } from "module";
import path from "path";
import { z } from "zod";

import { AppError } from "../../shared/types/errors";

import { randomUUID } from "crypto";
import type {
  CourseSummary,
  LectureLink,
  SearchResult,
  SlideLink,
} from "../../shared/types/search";
import type { McpStatus } from "../../shared/types/settings";

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

/** MCP ツール呼び出しタイムアウト（Playwright のページロードを考慮） */
const TOOL_TIMEOUT_MS = 30_000;

/** MCP 接続タイムアウト */
const CONNECT_TIMEOUT_MS = 15_000;

/** 検索結果キャッシュの TTL（ミリ秒） */
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ──────────────────────────────────────────────
// McpClient
// ──────────────────────────────────────────────

/**
 * MCP クライアント
 *
 * INIAD-MOOCs-MCP サーバを stdio で起動し、ツール呼び出しを通じて
 * MOOCs の講義資料を検索する。
 *
 * @example
 * ```ts
 * const mcpClient = new McpClient();
 * await mcpClient.connect("s1F10XXXXXX", "password");
 * const { success, results } = await mcpClient.searchMoocs("Python");
 * await mcpClient.disconnect();
 * ```
 */
export class McpClient {
  private status: McpStatus = "disconnected";
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private currentSessionId: string | null = null;
  private cache = new Map<string, Map<string, { data: SearchResult[]; expiresAt: number }>>();

  // ── 接続状態 ──────────────────────────────

  /**
   * 現在の接続状態を取得する
   */
  getStatus(): McpStatus {
    return this.status;
  }

  // ── 接続・切断 ────────────────────────────

  /**
   * MCP サーバに接続する
   *
   * @rarandeyo/iniad-moocs-mcp を子プロセスとして stdio で起動し、
   * MCP クライアントを初期化する。
   *
   * @param username - INIAD MOOCs ユーザー名（学籍番号）
   * @param password - INIAD MOOCs パスワード
   * @throws {AppError} 接続に失敗した場合
   */
  async connect(username: string, password: string): Promise<void> {
    if (this.status === "connected" || this.status === "connecting") {
      await this.disconnect();
    }

    this.status = "connecting";

    try {
      // セッションIDを生成
      this.currentSessionId = randomUUID();

      // MCP サーバの CLI エントリポイントを解決
      // cli.js は "exports" に含まれていないため、package.json 経由でパスを解決
      const require = createRequire(__filename);
      const pkgDir = path.dirname(require.resolve("@rarandeyo/iniad-moocs-mcp/package.json"));
      const cliPath = path.join(pkgDir, "cli.js");

      // stdio トランスポートで子プロセス起動
      this.transport = new StdioClientTransport({
        command: "node",
        args: [cliPath, "--headless"],
        env: {
          ...process.env,
          INIAD_USERNAME: username,
          INIAD_PASSWORD: password,
        },
      });

      this.client = new Client({ name: "iniad-ai-chat", version: "1.0.0" }, { capabilities: {} });

      // 接続（SDK connect には timeout option がないため Promise.race で制御）
      await Promise.race([
        this.client.connect(this.transport),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Connection timed out after ${CONNECT_TIMEOUT_MS / 1000}s`)),
            CONNECT_TIMEOUT_MS
          )
        ),
      ]);

      this.status = "connected";
    } catch (error) {
      this.status = "disconnected";
      await this.cleanupResources();

      if (error instanceof AppError) {
        throw error;
      }

      const message = error instanceof Error ? error.message : String(error);

      // エラー分類
      if (message.includes("timed out") || message.includes("ETIMEDOUT")) {
        throw new AppError("MCP_TIMEOUT", `MCP connection timed out: ${message}`);
      }
      if (
        message.includes("ENOENT") ||
        message.includes("spawn") ||
        message.includes("module not found")
      ) {
        throw new AppError("MCP_CONNECTION_FAILED", `MCP server failed to start: ${message}`);
      }

      throw new AppError("MCP_CONNECTION_FAILED", `MCP connection failed: ${message}`);
    }
  }

  /**
   * MCP サーバから切断する
   */
  async disconnect(): Promise<void> {
    // セッションのキャッシュをクリア
    if (this.currentSessionId) {
      this.cache.delete(this.currentSessionId);
    }

    await this.cleanupResources();
    this.status = "disconnected";
    this.currentSessionId = null;
  }

  // ── MOOCs 検索 ────────────────────────────

  /**
   * MOOCs 資料を検索する
   *
   * MCP ツールを呼び出してコース・講義・スライドの情報を取得し、
   * クエリ文字列でタイトルをフィルタリングして返す。
   * 結果はキャッシュされる（TTL 5分）。
   *
   * @param query - 検索キーワード
   * @returns 検索結果と成功/失敗のフラグ
   */
  async searchMoocs(
    query: string
  ): Promise<{ success: boolean; results: SearchResult[]; error?: string }> {
    if (this.status !== "connected" || !this.client) {
      return {
        success: false,
        results: [],
        error: "MCP client is not connected",
      };
    }

    // 空白のみのクエリを拒否（matchesQuery が全マッチ、computeRelevance が NaN になるのを防止）
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return { success: true, results: [] };
    }

    // キャッシュチェック
    const cacheKey = query.toLowerCase().trim();
    let sessionCache = this.currentSessionId ? this.cache.get(this.currentSessionId) : undefined;
    const cached = sessionCache?.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return { success: true, results: cached.data };
    }

    try {
      // 1. コース一覧取得
      const courses = await this.fetchCourses();

      // 2. 講義リンク取得
      const lectures = await this.fetchLectureLinks();

      // 3. スライドリンク取得
      const slides = await this.fetchSlideLinks();

      // 4. クエリでフィルタリングして SearchResult[] に変換
      const normalizedQuery = trimmedQuery.toLowerCase();
      const results: SearchResult[] = [];

      // コースをフィルタリング
      for (const course of courses) {
        if (this.matchesQuery(course.title, normalizedQuery)) {
          results.push({
            title: course.title,
            url: course.url,
            snippet: course.description ?? `INIAD MOOCs コース: ${course.title}`,
            source: "moocs",
            relevanceScore: this.computeRelevance(course.title, normalizedQuery),
          });
        }
      }

      // 講義リンクをフィルタリング
      for (const lecture of lectures) {
        if (this.matchesQuery(lecture.title, normalizedQuery)) {
          results.push({
            title: lecture.title,
            url: lecture.url,
            snippet: `INIAD MOOCs 講義: ${lecture.title}`,
            source: "moocs",
            relevanceScore: this.computeRelevance(lecture.title, normalizedQuery),
          });
        }
      }

      // スライドリンクをフィルタリング
      for (const slide of slides) {
        if (this.matchesQuery(slide.title, normalizedQuery)) {
          results.push({
            title: slide.title,
            url: slide.url,
            snippet: `INIAD MOOCs スライド: ${slide.title}`,
            source: "moocs",
            relevanceScore: this.computeRelevance(slide.title, normalizedQuery),
          });
        }
      }

      // 関連度スコアで降順ソート
      results.sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0));

      // キャッシュに保存
      if (!sessionCache) {
        sessionCache = new Map();
        this.cache.set(this.currentSessionId!, sessionCache);
      }
      sessionCache.set(cacheKey, {
        data: results,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });

      return { success: true, results };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (message.includes("timed out") || message.includes("ETIMEDOUT")) {
        return {
          success: false,
          results: [],
          error: `MCP tool call timed out: ${message}`,
        };
      }

      return {
        success: false,
        results: [],
        error: `MOOCs search failed: ${message}`,
      };
    }
  }

  // ── ツール呼び出しヘルパー ──────────────────

  /**
   * MCP ツールを安全に呼び出す
   *
   * まず client.callTool() を試行し、SDK の厳格なバリデーションに
   * 失敗した場合は client.request() にフォールバックする。
   * iniad-moocs-mcp v0.0.4 は古い SDK でビルドされているため、
   * 新しい SDK のスキーマ検証を通らない場合がある。
   */
  private async callToolSafe(toolName: string, args?: Record<string, unknown>): Promise<unknown> {
    if (!this.client) {
      throw new Error("MCP client is not initialized");
    }

    try {
      // 標準 callTool を試行（SDK ネイティブ timeout）
      const result = await this.client.callTool({ name: toolName, arguments: args }, undefined, {
        timeout: TOOL_TIMEOUT_MS,
      });
      return result;
    } catch (callToolError) {
      // バリデーションエラーの場合、client.request() でフォールバック
      const errMsg = callToolError instanceof Error ? callToolError.message : "";

      if (
        errMsg.includes("validation") ||
        errMsg.includes("parse") ||
        errMsg.includes("schema") ||
        errMsg.includes("safeParse")
      ) {
        // 緩いスキーマでリトライ
        const result = await this.client.request(
          {
            method: "tools/call",
            params: { name: toolName, arguments: args ?? {} },
          },
          z.any(),
          { timeout: TOOL_TIMEOUT_MS }
        );
        return result;
      }

      // バリデーション以外のエラーはそのまま投げる
      throw callToolError;
    }
  }

  /**
   * コース一覧を取得する
   */
  private async fetchCourses(): Promise<CourseSummary[]> {
    // セッションのキャッシュを初期化
    if (this.currentSessionId && !this.cache.has(this.currentSessionId)) {
      this.cache.set(this.currentSessionId, new Map());
    }

    const result = (await this.callToolSafe("listCourses")) as {
      content?: Array<{ type: string; text?: string }>;
    };

    return this.parseToolResult<CourseSummary>(result, "listCourses");
  }

  /**
   * 講義リンク一覧を取得する
   */
  private async fetchLectureLinks(): Promise<LectureLink[]> {
    const result = (await this.callToolSafe("listLectureLinks")) as {
      content?: Array<{ type: string; text?: string }>;
    };

    return this.parseToolResult<LectureLink>(result, "listLectureLinks");
  }

  /**
   * スライドリンク一覧を取得する
   */
  private async fetchSlideLinks(): Promise<SlideLink[]> {
    const result = (await this.callToolSafe("listSlideLinks")) as {
      content?: Array<{ type: string; text?: string }>;
    };

    return this.parseToolResult<SlideLink>(result, "listSlideLinks");
  }

  /**
   * MCP ツールの結果をパースする
   *
   * MCP ツールの戻り値は `content` 配列に格納される。
   * text タイプのコンテンツを JSON としてパースして返す。
   */
  private parseToolResult<T>(result: unknown, _toolName: string): T[] {
    if (!result || typeof result !== "object") {
      return [];
    }

    const typedResult = result as {
      content?: Array<{ type: string; text?: string }>;
    };

    if (!typedResult.content || !Array.isArray(typedResult.content)) {
      return [];
    }

    for (const item of typedResult.content) {
      if (item.type === "text" && item.text) {
        try {
          const parsed = JSON.parse(item.text);
          if (Array.isArray(parsed)) {
            return parsed as T[];
          }
          // オブジェクトの場合は配列にラップ
          return [parsed] as T[];
        } catch {
          // JSON パース失敗 → テキストとして扱う
          return [];
        }
      }
    }

    return [];
  }

  // ── テキストマッチング ──────────────────────

  /**
   * タイトルがクエリにマッチするか判定する
   */
  private matchesQuery(title: string, normalizedQuery: string): boolean {
    const normalizedTitle = title.toLowerCase();
    // クエリをスペース/記号で分割し、すべてのトークンがタイトルに含まれるか
    const tokens = normalizedQuery.split(/[\s\-_.]+/).filter((t) => t.length > 0);
    return tokens.every((token) => normalizedTitle.includes(token));
  }

  /**
   * クエリとの関連度スコアを計算する（0〜1）
   */
  private computeRelevance(title: string, normalizedQuery: string): number {
    const lower = title.toLowerCase();
    const tokens = normalizedQuery.split(/[\s\-_.]+/).filter((t) => t.length > 0);

    let matched = 0;
    for (const token of tokens) {
      if (lower.includes(token)) {
        matched++;
      }
    }

    // 完全一致ボーナス
    const bonus = lower === normalizedQuery ? 0.1 : 0;
    return Math.min(1, matched / tokens.length + bonus);
  }

  // ── クリーンアップ ──────────────────────────

  /**
   * リソースをクリーンアップする
   */
  private async cleanupResources(): Promise<void> {
    try {
      await this.client?.close();
    } catch {
      // クリーンアップエラーは無視
    }

    try {
      this.transport?.close?.();
    } catch {
      // クリーンアップエラーは無視
    }

    this.client = null;
    this.transport = null;
  }

  /**
   * 期限切れのキャッシュエントリを削除する
   */
  cleanupCache(): void {
    const now = Date.now();
    for (const [sessionId, sessionCache] of this.cache) {
      for (const [key, entry] of sessionCache) {
        if (entry.expiresAt <= now) {
          sessionCache.delete(key);
        }
      }
      // セッションキャッシュが空になったらセッション自体を削除
      if (sessionCache.size === 0) {
        this.cache.delete(sessionId);
      }
    }
  }
}
