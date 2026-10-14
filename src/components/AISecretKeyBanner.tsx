import React, { useState, useEffect } from 'react';
import {
  fetchKeyStatus,
  saveApiKeyToSecret,
  clearCustomApiKey,
  testGeminiApiKey,
  subscribeKeyStatus,
  AIKeyStatus,
  GeminiModelId,
  setSelectedModel
} from '../services/aiSettings';
import {
  KeyRound, ShieldCheck, Check, X, RefreshCw, AlertCircle,
  Eye, EyeOff, Save, Trash2, Sparkles, ChevronDown, ChevronUp
} from 'lucide-react';

interface AISecretKeyBannerProps {
  defaultOpen?: boolean;
}

export const AISecretKeyBanner: React.FC<AISecretKeyBannerProps> = ({ defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [keyStatus, setKeyStatus] = useState<AIKeyStatus>({
    hasKey: false,
    source: 'none',
    maskedKey: '',
    model: 'gemini-3.8-flash'
  });
  const [inputKey, setInputKey] = useState('');
  const [showRawKey, setShowRawKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  useEffect(() => {
    const unsub = subscribeKeyStatus((status) => {
      setKeyStatus(status);
    });
    fetchKeyStatus();
    return unsub;
  }, []);

  const handleSaveKey = async () => {
    if (!inputKey.trim()) {
      setFeedback({ type: 'error', message: '请输入有效的 Gemini API Key。' });
      return;
    }
    setSaving(true);
    setFeedback(null);
    try {
      const ok = await saveApiKeyToSecret(inputKey.trim(), keyStatus.model);
      if (ok) {
        setFeedback({
          type: 'success',
          message: 'API Key 已成功安全保存到系统 Secret (/data/secret_config.json)！下次使用无需再次输入。'
        });
        setInputKey('');
      } else {
        setFeedback({ type: 'error', message: '保存到本地存储成功，但写入磁盘配置失败。已在当前浏览器生效。' });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e?.message || '保存失败。' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestKey = async () => {
    setTesting(true);
    setFeedback(null);
    try {
      const keyToTest = inputKey.trim() || undefined;
      const res = await testGeminiApiKey(keyToTest, keyStatus.model);
      if (res.ok) {
        setFeedback({
          type: 'success',
          message: `API Key 连通测试成功！模型响应: ${res.model || keyStatus.model}。${inputKey.trim() ? '已自动永久保存至 Secret。' : ''}`
        });
        if (inputKey.trim()) setInputKey('');
      } else {
        setFeedback({
          type: 'error',
          message: res.message || 'API Key 验证失败，请确认是否在 aistudio.google.com 启用了有效配额。'
        });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e?.message || '测试连接网络异常。' });
    } finally {
      setTesting(false);
    }
  };

  const handleClearKey = async () => {
    if (!confirm('确定要清除已保存的 API Key Secret 吗？清除后需重新配置。')) return;
    await clearCustomApiKey();
    setInputKey('');
    setFeedback({ type: 'info', message: '已从系统 Secret 与本地存储中清除 API Key。' });
  };

  const handleModelChange = (model: GeminiModelId) => {
    setSelectedModel(model);
    setFeedback({ type: 'info', message: `已切换默认分析模型为: ${model}` });
  };

  return (
    <div className="rounded-2xl border border-purple-200/90 bg-linear-to-r from-purple-50/70 via-indigo-50/40 to-white shadow-2xs overflow-hidden transition-all">
      {/* Banner Summary Header */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="p-3.5 sm:px-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-purple-100/40 select-none transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
          <div className="p-1.5 rounded-xl bg-purple-600 text-white shrink-0">
            <KeyRound className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs sm:text-sm text-slate-900">
                Gemini API Key Secret 配置 (永久免重复输入)
              </span>
              {keyStatus.hasKey ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Secret 已持久化 ({keyStatus.maskedKey || '已就绪'})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 font-mono">
                  <AlertCircle className="w-3 h-3 text-amber-600" />
                  未保存 Secret
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 truncate max-w-xl">
              保存后自动写入磁盘配置文件，后续单品/记录/Junction/全局诊断均自动使用，绝不需反复手动输入。
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-purple-700 font-bold hidden sm:inline">
            {isOpen ? '收起配置' : '配置/查看 Secret'}
          </span>
          <div className="p-1 rounded-lg text-purple-700 hover:bg-purple-200/60 transition-colors">
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </div>

      {/* Expanded Controls Panel */}
      {isOpen && (
        <div className="p-4 sm:p-5 border-t border-purple-200/70 bg-white/95 space-y-4">
          {feedback && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center justify-between gap-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : feedback.type === 'error'
                  ? 'bg-rose-50 border border-rose-200 text-rose-800'
                  : 'bg-purple-50 border border-purple-200 text-purple-800'
              }`}
            >
              <div className="flex items-center gap-2">
                {feedback.type === 'success' ? (
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : feedback.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                ) : (
                  <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                )}
                <span>{feedback.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Input Key Field */}
            <div className="md:col-span-2 space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                Gemini API Key Secret:
              </label>
              <div className="relative flex items-center">
                <input
                  type={showRawKey ? 'text' : 'password'}
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  placeholder={keyStatus.hasKey ? `当前已保存 Secret: ${keyStatus.maskedKey} (输入新 Key 以替换)` : '请输入 AI Studio API Key (AIzaSy...)'}
                  className="w-full px-3.5 py-2.5 pr-20 rounded-xl border border-slate-300 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500 bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowRawKey(!showRawKey)}
                  className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title={showRawKey ? '隐藏' : '显示明文'}
                >
                  {showRawKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                <span>
                  还没有 API Key？可前往{' '}
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-purple-600 underline font-semibold hover:text-purple-800"
                  >
                    Google AI Studio
                  </a>{' '}
                  免费申请。
                </span>
                {keyStatus.hasKey && (
                  <button
                    type="button"
                    onClick={handleClearKey}
                    className="text-rose-600 hover:text-rose-700 font-semibold cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    清除已存 Secret
                  </button>
                )}
              </div>
            </div>

            {/* Model Selection */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                推荐 AI 模型 (Model):
              </label>
              <select
                value={keyStatus.model}
                onChange={(e) => handleModelChange(e.target.value as GeminiModelId)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-purple-500 bg-white cursor-pointer"
              >
                <option value="gemini-3.8-flash">gemini-3.8-flash (Standard · 高度推理 · 推荐)</option>
                <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Lite · 极速节省配额)</option>
              </select>
              <p className="text-[10px] text-slate-400 font-mono">
                模型选择同样自动持久化存储。
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              <span>数据存储路径: <code>/data/secret_config.json</code>，安全不随代码提交。</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestKey}
                disabled={testing}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                <span>{testing ? '验证连接中...' : '测试连通性'}</span>
              </button>

              <button
                type="button"
                onClick={handleSaveKey}
                disabled={saving || !inputKey.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition-all cursor-pointer disabled:opacity-40"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? '保存中...' : '永久保存到 Secret'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
