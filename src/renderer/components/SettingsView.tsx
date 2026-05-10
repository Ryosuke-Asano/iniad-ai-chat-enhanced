import React, { useState, useEffect, useCallback } from "react";
import type { AppSettings } from "../../shared/types";
import { DEFAULT_SETTINGS } from "../../shared/types";

/** バリデーションエラーの型 */
interface ValidationErrors {
  apiKey?: string;
  baseURL?: string;
  model?: string;
  moocsUsername?: string;
  moocsPassword?: string;
}

/** 接続テスト結果 */
interface TestResult {
  status: "idle" | "testing" | "success" | "error";
  message?: string;
}

interface SettingsViewProps {
  /** 設定画面を閉じてチャット画面に戻る */
  onClose: () => void;
}

/** 利用可能なモデル一覧 */
const AVAILABLE_MODELS = [
  { value: "gpt-5.4-nano", label: "GPT-5.4 Nano (高速・低コスト)" },
  { value: "gpt-5.4-mini", label: "GPT-5.4 Mini (バランス)" },
  { value: "gpt-5.4", label: "GPT-5.4 (高性能)" },
];

/** APIキー・パスワードをマスク表示する */
function maskSecret(value: string): string {
  if (!value || value.length <= 4) return "●●●●●●●●";
  return "●".repeat(value.length - 4) + value.slice(-4);
}

/** URLバリデーション */
function isValidURL(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onClose }) => {
  // ── State ──
  const [settings, setSettings] = useState<AppSettings>({ ...DEFAULT_SETTINGS });
  const [editedFields, setEditedFields] = useState<Set<keyof AppSettings>>(new Set());
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [showApiKey, setShowApiKey] = useState(false);
  const [showMoocsPassword, setShowMoocsPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [apiTestResult, setApiTestResult] = useState<TestResult>({ status: "idle" });
  const [mcpTestResult, setMcpTestResult] = useState<TestResult>({ status: "idle" });

  // ── 初期読み込み ──
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Main プロセスの IPC ハンドラが未登録の場合はスキップ
        if (window.electronAPI?.getSettings) {
          const loaded = await window.electronAPI.getSettings();
          setSettings(loaded);
        }
      } catch {
        // IPC ハンドラ未登録時のエラーは無視（モック動作）
      }
    };
    loadSettings();
  }, []);

  // ── バリデーション ──
  const validate = useCallback((current: AppSettings): ValidationErrors => {
    const errs: ValidationErrors = {};

    // APIキー: 編集済みかつ空の場合のみエラー
    if (editedFields.has("apiKey") && !current.apiKey.trim()) {
      errs.apiKey = "APIキーは必須です";
    }

    // ベースURL
    if (current.baseURL && !isValidURL(current.baseURL)) {
      errs.baseURL = "有効なURL形式で入力してください";
    }

    // モデル
    if (!current.model.trim()) {
      errs.model = "モデルを選択してください";
    }

    // MOOCsユーザー名・パスワードはペア入力
    const hasUsername = current.moocsUsername.trim().length > 0;
    const hasPassword = editedFields.has("moocsPassword")
      ? current.moocsPassword.trim().length > 0
      : current.moocsPassword.length > 0; // マスク値でも存在判定

    if (hasUsername && !hasPassword) {
      errs.moocsPassword = "パスワードも入力してください";
    }
    if (!hasUsername && hasPassword && editedFields.has("moocsPassword")) {
      errs.moocsUsername = "ユーザー名も入力してください";
    }

    return errs;
  }, [editedFields]);

  // リアルタイムバリデーション
  useEffect(() => {
    const newErrors = validate(settings);
    setErrors(newErrors);
  }, [settings, validate]);

  // ── フィールド更新 ──
  const updateField = (field: keyof AppSettings, value: string) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
    setEditedFields((prev) => new Set(prev).add(field));
    setSaveMessage(null);
  };

  // ── 保存 ──
  const handleSave = async () => {
    const validationErrors = validate(settings);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setSaveMessage({ type: "error", text: "入力内容にエラーがあります" });
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      // 編集されたフィールドのみ送信
      const partial: Partial<AppSettings> = {};
      for (const field of editedFields) {
        partial[field] = settings[field];
      }

      if (window.electronAPI?.saveSettings) {
        await window.electronAPI.saveSettings(partial);
      }

      setSaveMessage({ type: "success", text: "設定を保存しました" });
      setEditedFields(new Set());

      // 3秒後にメッセージをクリア
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (e) {
      setSaveMessage({
        type: "error",
        text: `保存に失敗しました: ${e instanceof Error ? e.message : String(e)}`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // ── 接続テスト ──
  const handleTestApi = async () => {
    setApiTestResult({ status: "testing" });
    try {
      if (window.electronAPI?.testApiConnection) {
        const result = await window.electronAPI.testApiConnection();
        setApiTestResult({
          status: result.success ? "success" : "error",
          message: result.success ? "接続成功" : result.error || "接続失敗",
        });
      } else {
        // モック動作
        setApiTestResult({ status: "success", message: "接続成功（モック）" });
      }
    } catch (e) {
      setApiTestResult({
        status: "error",
        message: e instanceof Error ? e.message : "テスト失敗",
      });
    }
  };

  const handleTestMcp = async () => {
    setMcpTestResult({ status: "testing" });
    try {
      if (window.electronAPI?.testMcpConnection) {
        const result = await window.electronAPI.testMcpConnection();
        setMcpTestResult({
          status: result.success ? "success" : "error",
          message: result.success ? "接続成功" : result.error || "接続失敗",
        });
      } else {
        // モック動作
        setMcpTestResult({ status: "success", message: "接続成功（モック）" });
      }
    } catch (e) {
      setMcpTestResult({
        status: "error",
        message: e instanceof Error ? e.message : "テスト失敗",
      });
    }
  };

  // ── 表示ヘルパー ──
  const getSecretDisplayValue = (
    field: "apiKey" | "moocsPassword",
    showRaw: boolean
  ): string => {
    const value = settings[field];
    if (!value) return "";
    if (editedFields.has(field)) return value; // 編集中は常に平文
    return showRaw ? value : maskSecret(value);
  };

  const renderTestButton = (
    label: string,
    result: TestResult,
    onTest: () => void
  ) => (
    <div className="settings-test-row">
      <button
        type="button"
        className="settings-test-button"
        onClick={onTest}
        disabled={result.status === "testing"}
      >
        {result.status === "testing" ? "テスト中..." : label}
      </button>
      {result.status !== "idle" && (
        <span
          className={`settings-test-result ${result.status}`}
        >
          {result.status === "testing" && "⏳"}
          {result.status === "success" && "✅"}
          {result.status === "error" && "❌"}
          {result.message && ` ${result.message}`}
        </span>
      )}
    </div>
  );

  return (
    <div className="settings-view" id="settings-view">
      <div className="settings-header">
        <h2>⚙ 設定</h2>
        <button
          type="button"
          className="settings-close-button"
          onClick={onClose}
          aria-label="設定を閉じる"
        >
          ✕
        </button>
      </div>

      <div className="settings-content">
        {/* ── API設定セクション ── */}
        <section className="settings-section" id="settings-api">
          <h3 className="settings-section-title">
            <span className="settings-section-icon">🔑</span>
            API設定
          </h3>

          <div className="settings-field">
            <label className="settings-label" htmlFor="settings-apiKey">
              APIキー
            </label>
            <div className="settings-input-group">
              <input
                id="settings-apiKey"
                type={showApiKey || editedFields.has("apiKey") ? "text" : "password"}
                className={`settings-input ${errors.apiKey ? "error" : ""}`}
                value={getSecretDisplayValue("apiKey", showApiKey)}
                onChange={(e) => updateField("apiKey", e.target.value)}
                placeholder="sk-..."
                autoComplete="off"
              />
              <button
                type="button"
                className="settings-toggle-visibility"
                onMouseDown={() => setShowApiKey(true)}
                onMouseUp={() => setShowApiKey(false)}
                onMouseLeave={() => setShowApiKey(false)}
                aria-label="長押しでAPIキーを表示"
                title="長押しで表示"
              >
                {showApiKey ? "🙈" : "👁"}
              </button>
            </div>
            {errors.apiKey && (
              <span className="settings-error">{errors.apiKey}</span>
            )}
            <span className="settings-hint">※ INIAD Slack「GPT-4o mini」で取得可能</span>
          </div>

          <div className="settings-field">
            <label className="settings-label" htmlFor="settings-baseURL">
              APIベースURL
            </label>
            <input
              id="settings-baseURL"
              type="text"
              className={`settings-input ${errors.baseURL ? "error" : ""}`}
              value={settings.baseURL}
              onChange={(e) => updateField("baseURL", e.target.value)}
              placeholder="https://api.openai.iniad.org/api/v1"
            />
            {errors.baseURL && (
              <span className="settings-error">{errors.baseURL}</span>
            )}
          </div>

          {renderTestButton("API接続テスト", apiTestResult, handleTestApi)}
        </section>

        {/* ── モデル設定セクション ── */}
        <section className="settings-section" id="settings-model">
          <h3 className="settings-section-title">
            <span className="settings-section-icon">🤖</span>
            モデル設定
          </h3>

          <div className="settings-field">
            <label className="settings-label" htmlFor="settings-model-select">
              使用モデル
            </label>
            <select
              id="settings-model-select"
              className={`settings-input settings-select ${errors.model ? "error" : ""}`}
              value={settings.model}
              onChange={(e) => updateField("model", e.target.value)}
            >
              {AVAILABLE_MODELS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            {errors.model && (
              <span className="settings-error">{errors.model}</span>
            )}
          </div>
        </section>

        {/* ── MOOCs認証セクション ── */}
        <section className="settings-section" id="settings-moocs">
          <h3 className="settings-section-title">
            <span className="settings-section-icon">🎓</span>
            INIAD MOOCs 認証
          </h3>
          <p className="settings-section-description">
            MOOCs資料の検索に使用します。学籍番号とパスワードを入力してください。
          </p>

          <div className="settings-field">
            <label className="settings-label" htmlFor="settings-moocsUsername">
              ユーザー名（学籍番号）
            </label>
            <input
              id="settings-moocsUsername"
              type="text"
              className={`settings-input ${errors.moocsUsername ? "error" : ""}`}
              value={settings.moocsUsername}
              onChange={(e) => updateField("moocsUsername", e.target.value)}
              placeholder="s1F10XXXXXX"
              autoComplete="off"
            />
            {errors.moocsUsername && (
              <span className="settings-error">{errors.moocsUsername}</span>
            )}
          </div>

          <div className="settings-field">
            <label className="settings-label" htmlFor="settings-moocsPassword">
              パスワード
            </label>
            <div className="settings-input-group">
              <input
                id="settings-moocsPassword"
                type={showMoocsPassword || editedFields.has("moocsPassword") ? "text" : "password"}
                className={`settings-input ${errors.moocsPassword ? "error" : ""}`}
                value={getSecretDisplayValue("moocsPassword", showMoocsPassword)}
                onChange={(e) => updateField("moocsPassword", e.target.value)}
                placeholder="パスワード"
                autoComplete="off"
              />
              <button
                type="button"
                className="settings-toggle-visibility"
                onMouseDown={() => setShowMoocsPassword(true)}
                onMouseUp={() => setShowMoocsPassword(false)}
                onMouseLeave={() => setShowMoocsPassword(false)}
                aria-label="長押しでパスワードを表示"
                title="長押しで表示"
              >
                {showMoocsPassword ? "🙈" : "👁"}
              </button>
            </div>
            {errors.moocsPassword && (
              <span className="settings-error">{errors.moocsPassword}</span>
            )}
          </div>

          {renderTestButton("MCP接続テスト", mcpTestResult, handleTestMcp)}
        </section>
      </div>

      {/* ── フッター（保存・キャンセル） ── */}
      <div className="settings-footer">
        {saveMessage && (
          <span className={`settings-save-message ${saveMessage.type}`}>
            {saveMessage.type === "success" ? "✅" : "⚠️"} {saveMessage.text}
          </span>
        )}
        <div className="settings-footer-buttons">
          <button
            type="button"
            className="settings-button-cancel"
            onClick={onClose}
          >
            キャンセル
          </button>
          <button
            type="button"
            className="settings-button-save"
            onClick={handleSave}
            disabled={isSaving || Object.keys(errors).length > 0}
          >
            {isSaving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
};
