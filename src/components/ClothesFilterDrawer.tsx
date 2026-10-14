import React, { useState, useMemo, useEffect } from 'react';
import { ClothesItem } from '../types';
import {
  X, Check, SlidersHorizontal, Settings2, RotateCcw, Search,
  Sparkles, Shirt, Droplets, Sun, CheckSquare, Square,
  Eye, EyeOff, Layers, Tag, Trash2, ArrowRight
} from 'lucide-react';

export interface ClothesFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  clothes: ClothesItem[];
  getStats: (clothesId: string) => {
    needWash: boolean;
    unwashedSeconds: number;
    unwashedHours: string;
    totalWears: number;
    totalDurationHours: number;
  };
  activeFilters: Record<string, string[]>;
  onChangeFilters: (filters: Record<string, string[]>) => void;
  onClearFilters: () => void;
  initialTab?: 'filters' | 'manage';
}

export interface FilterFieldDefinition {
  key: string;
  label: string;
  category: 'core' | 'comfort' | 'breast' | 'care' | 'details' | 'custom';
  icon: string;
  defaultVisible: boolean;
  description?: string;
}

// All available clothes filter dimensions
export const ALL_CLOTHES_FILTER_FIELDS: FilterFieldDefinition[] = [
  // Core
  { key: 'material', label: 'Material (材质)', category: 'core', icon: '🪶', defaultVisible: true, description: 'Lace, Chiffon, Plain thick, Soft chiffon...' },
  { key: 'Clothes Type', label: 'Clothes Type (种类)', category: 'core', icon: '👗', defaultVisible: true, description: 'Dress, Bra, Tshirt, Pant, Skirt...' },
  { key: 'thick clothes', label: 'Thickness (厚度)', category: 'core', icon: '🧵', defaultVisible: true, description: '01 not thick, 02 middle, 03 thick...' },
  { key: 'long dress', label: 'Dress Length (裙长)', category: 'core', icon: '📏', defaultVisible: true, description: 'Short dress, Long dress...' },
  { key: 'price', label: 'Price (价格)', category: 'core', icon: '💰', defaultVisible: false, description: 'Purchase price value' },
  
  // Comfort & Heat
  { key: 'Hot at noon', label: 'Hot at noon (中午体感)', category: 'comfort', icon: '☀️', defaultVisible: true, description: 'Not hot, Middle, Hot' },
  { key: 'diao dai', label: 'Diao dai (吊带受力)', category: 'comfort', icon: '🎗️', defaultVisible: true, description: 'Not diao dai, Diao dai, Wide diao dai' },
  { key: 'wet', label: 'Wet status (潮湿/排汗)', category: 'comfort', icon: '💧', defaultVisible: true, description: 'Dry, Little wet, Wet' },
  { key: 'wet reason', label: 'Drying reason (透气/晾晒原因)', category: 'comfort', icon: '💨', defaultVisible: false, description: 'Quick-drying, fabric notes' },
  
  // Breast & Fit
  { key: 'center chest', label: 'Center chest (正中胸骨)', category: 'breast', icon: '💖', defaultVisible: true, description: 'Center chest, No center chest, Side open' },
  { key: 'sit breast ok', label: 'Sit breast ok (坐姿胸型)', category: 'breast', icon: '💺', defaultVisible: true, description: 'Sit breast shape ok, Stand breast ugly...' },
  { key: 'side breast ok', label: 'Side breast ok (副乳包裹)', category: 'breast', icon: '🛡️', defaultVisible: true, description: 'Side breast shape ok, Side breast out...' },
  { key: 'beautiful', label: 'Appearance (美观评级)', category: 'breast', icon: '🌟', defaultVisible: true, description: 'Beautiful, Middle beautiful, Not so beautiful' },
  { key: 'beatiful reason', label: 'Appearance reason (美观原因)', category: 'breast', icon: '✨', defaultVisible: false, description: 'Cut, waistline, slimming silhouette' },

  // Laundry & Care
  { key: '_washStatus', label: 'Laundry Status (洗护状态)', category: 'care', icon: '🧺', defaultVisible: true, description: 'Need wash (in hamper) vs Clean' },
  { key: 'wash stated (from Full Wearing Report (new design) clothes list (linked))', label: 'Wash Stated Logs (洗涤记录状态)', category: 'care', icon: '🧼', defaultVisible: false, description: 'Linked wash stated history' },
  { key: 'Total Washed Count', label: 'Total Washed Count (累计清洗次数)', category: 'care', icon: '🔄', defaultVisible: false, description: 'Number of times washed' },
  { key: 'Tracked App Washes', label: 'Tracked App Washes (应用记录洗涤)', category: 'care', icon: '📱', defaultVisible: false, description: 'Washes tracked in app' },
  { key: 'wearing frequency(how many times legacy washed)', label: 'Wearing Frequency (穿戴频次)', category: 'care', icon: '📊', defaultVisible: false, description: 'Legacy wash/wear frequency' },
  { key: 'Last Washed', label: 'Last Washed Date (上次清洗日期)', category: 'care', icon: '📅', defaultVisible: false, description: 'Last wash date recorded' },
  { key: 'may throw', label: 'May throw (淘汰整理)', category: 'care', icon: '♻️', defaultVisible: false, description: 'May throw, No' },
  
  // Details & Notes
  { key: 'tags', label: 'Tags (标签)', category: 'details', icon: '🏷️', defaultVisible: true, description: 'User-defined tags' },
  { key: 'Pictures', label: 'Pictures (是否有图片)', category: 'details', icon: '🖼️', defaultVisible: false, description: 'Has pictures vs No pictures' },
  { key: 'Descriptions', label: 'Descriptions (设计细节)', category: 'details', icon: '📝', defaultVisible: false, description: 'Design notes & styling highlights' },
  { key: 'Descriptions 2', label: 'Descriptions 2 (补充备注)', category: 'details', icon: '📋', defaultVisible: false, description: 'Extra styling observations' },
  { key: 'last comment or action', label: 'Last comment (最新跟进)', category: 'details', icon: '💬', defaultVisible: false, description: 'Care reminders & wash verdicts' },
  { key: 'AI Clothes Analysis', label: 'AI Clothes Analysis (AI分析)', category: 'details', icon: '🤖', defaultVisible: false, description: 'Garment AI analysis summary' },
  { key: 'created', label: 'Created Date (录入时间)', category: 'details', icon: '⏱️', defaultVisible: false, description: 'Record creation date' }
];

const STORAGE_VISIBLE_FIELDS_KEY = 'wardrobe_filter_visible_fields_v1';

/**
 * Filters a clothes list based on active filter conditions.
 * Supports multi-select values per field (OR within field, AND across fields).
 */
export function filterClothesWithActiveFilters(
  clothesList: ClothesItem[],
  activeFilters: Record<string, string[]>,
  getStats: (clothesId: string) => { needWash: boolean }
): ClothesItem[] {
  const activeKeys = Object.keys(activeFilters).filter(k => (activeFilters[k] || []).length > 0);
  if (activeKeys.length === 0) return clothesList;

  return clothesList.filter(c => {
    return activeKeys.every(key => {
      const selectedVals = activeFilters[key];
      if (!selectedVals || selectedVals.length === 0) return true;

      if (key === '_washStatus') {
        const stats = getStats(c.id);
        const status = stats.needWash ? 'need wash' : 'clean / washed';
        return selectedVals.includes(status);
      }

      if (key === 'Pictures') {
        const hasPics = Array.isArray(c.Pictures) && c.Pictures.length > 0;
        const picVal = hasPics ? 'Has pictures' : 'No pictures';
        return selectedVals.includes(picVal);
      }

      if (key === 'tags') {
        if (!Array.isArray(c.tags) || c.tags.length === 0) return false;
        return c.tags.some(t => selectedVals.includes(String(t).trim()));
      }

      if (key.startsWith('custom_')) {
        const rawCustomKey = key.replace(/^custom_/, '');
        const val = c.customFields?.[rawCustomKey] ?? c.extraAttributes?.[rawCustomKey];
        if (val === undefined || val === null) return false;
        return selectedVals.includes(String(val).trim());
      }

      const val = (c as any)[key];
      if (Array.isArray(val)) {
        if (val.length === 0) return false;
        return val.some(v => selectedVals.includes(String(v).trim()));
      }

      if (val === undefined || val === null) return false;
      return selectedVals.includes(String(val).trim());
    });
  });
}

export const ClothesFilterDrawer: React.FC<ClothesFilterDrawerProps> = ({
  isOpen,
  onClose,
  clothes,
  getStats,
  activeFilters,
  onChangeFilters,
  onClearFilters,
  initialTab = 'filters'
}) => {
  // Drawer View Tab: 'filters' (regular filter view) vs 'manage' (checkboxes to show/hide fields)
  const [activeTab, setActiveTab] = useState<'filters' | 'manage'>(initialTab);
  const [fieldSearchQuery, setFieldSearchQuery] = useState('');
  const [valueSearchMap, setValueSearchMap] = useState<Record<string, string>>({});

  // Sync tab when initialTab changes or drawer opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Visible Fields Set (persisted in localStorage)
  const [visibleFieldKeys, setVisibleFieldKeys] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_VISIBLE_FIELDS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      // ignore
    }
    // Default visible
    return ALL_CLOTHES_FILTER_FIELDS.filter(f => f.defaultVisible).map(f => f.key);
  });

  // Save to localStorage when visible fields change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_VISIBLE_FIELDS_KEY, JSON.stringify(visibleFieldKeys));
    } catch (e) {
      // ignore
    }
  }, [visibleFieldKeys]);

  // Discover any dynamic fields present on clothes records (custom fields, extra attributes, or dynamic keys)
  const customFieldsMeta = useMemo(() => {
    const knownKeys = new Set(ALL_CLOTHES_FILTER_FIELDS.map(f => f.key));
    const internalKeys = new Set([
      'id', 'name', 'clothesType', 'materialProp', 'contentBlocks',
      'aiReports', 'fieldExplanations', 'unwash time rollup', 'customFields',
      'extraAttributes', 'Name'
    ]);

    const discoveredKeys = new Set<string>();

    clothes.forEach(c => {
      // 1. In customFields
      if (c.customFields && typeof c.customFields === 'object') {
        Object.keys(c.customFields).forEach(k => {
          if (!k.startsWith('_') && !k.endsWith('_explain')) {
            discoveredKeys.add(`custom_${k}`);
          }
        });
      }
      // 2. In extraAttributes
      if (c.extraAttributes && typeof c.extraAttributes === 'object') {
        Object.keys(c.extraAttributes).forEach(k => {
          if (!k.startsWith('_') && !k.endsWith('_explain')) {
            discoveredKeys.add(`custom_${k}`);
          }
        });
      }
      // 3. Any top-level keys not in known list and not internal
      Object.keys(c).forEach(k => {
        if (!knownKeys.has(k) && !internalKeys.has(k) && !k.startsWith('_')) {
          discoveredKeys.add(k);
        }
      });
    });

    return Array.from(discoveredKeys).map(k => {
      const isCustomPrefix = k.startsWith('custom_');
      const cleanName = isCustomPrefix ? k.replace(/^custom_/, '') : k;
      return {
        key: k,
        label: isCustomPrefix ? `Custom: ${cleanName}` : cleanName,
        category: 'custom' as const,
        icon: '⚙️',
        defaultVisible: true,
        description: `Field: ${cleanName}`
      };
    });
  }, [clothes]);

  // Combined full list of filter fields
  const allFieldDefinitions = useMemo(() => {
    return [...ALL_CLOTHES_FILTER_FIELDS, ...customFieldsMeta];
  }, [customFieldsMeta]);

  // Extract all unique values & counts per field directly from actual clothes dataset
  const fieldValuesData = useMemo(() => {
    const result: Record<string, Array<{ value: string; count: number }>> = {};

    allFieldDefinitions.forEach(f => {
      const counts = new Map<string, number>();

      if (f.key === '_washStatus') {
        let needWashCount = 0;
        let cleanCount = 0;
        clothes.forEach(c => {
          const stats = getStats(c.id);
          if (stats.needWash) {
            needWashCount++;
          } else {
            cleanCount++;
          }
        });
        if (needWashCount > 0) counts.set('need wash', needWashCount);
        if (cleanCount > 0) counts.set('clean / washed', cleanCount);
      } else if (f.key === 'Pictures') {
        let hasPic = 0;
        let noPic = 0;
        clothes.forEach(c => {
          if (Array.isArray(c.Pictures) && c.Pictures.length > 0) {
            hasPic++;
          } else {
            noPic++;
          }
        });
        if (hasPic > 0) counts.set('Has pictures', hasPic);
        if (noPic > 0) counts.set('No pictures', noPic);
      } else if (f.key === 'tags') {
        clothes.forEach(c => {
          if (Array.isArray(c.tags)) {
            c.tags.forEach(t => {
              const str = String(t).trim();
              if (str) counts.set(str, (counts.get(str) || 0) + 1);
            });
          }
        });
      } else if (f.key.startsWith('custom_')) {
        const rawCustomKey = f.key.replace(/^custom_/, '');
        clothes.forEach(c => {
          const val = c.customFields?.[rawCustomKey] ?? c.extraAttributes?.[rawCustomKey];
          if (val !== undefined && val !== null) {
            const str = String(val).trim();
            if (str && str !== 'No data' && str !== 'N/A' && str !== '??') {
              counts.set(str, (counts.get(str) || 0) + 1);
            }
          }
        });
      } else {
        const propKey = f.key;
        clothes.forEach(c => {
          const val = (c as any)[propKey];
          if (val !== undefined && val !== null) {
            if (Array.isArray(val)) {
              val.forEach(item => {
                const str = String(item).trim();
                if (str && str !== 'No data' && str !== 'N/A' && str !== '??') {
                  counts.set(str, (counts.get(str) || 0) + 1);
                }
              });
            } else {
              const str = String(val).trim();
              if (str && str !== 'No data' && str !== 'N/A' && str !== '??') {
                counts.set(str, (counts.get(str) || 0) + 1);
              }
            }
          }
        });
      }

      result[f.key] = Array.from(counts.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
    });

    return result;
  }, [allFieldDefinitions, clothes, getStats]);

  // Handle toggling field visibility
  const handleToggleFieldVisible = (fieldKey: string) => {
    setVisibleFieldKeys(prev => {
      if (prev.includes(fieldKey)) {
        // If removing, also clear active filters for this field
        if (activeFilters[fieldKey]) {
          const next = { ...activeFilters };
          delete next[fieldKey];
          onChangeFilters(next);
        }
        return prev.filter(k => k !== fieldKey);
      } else {
        return [...prev, fieldKey];
      }
    });
  };

  // Toggle value selection for a field
  const handleToggleValue = (fieldKey: string, val: string) => {
    const currentList = activeFilters[fieldKey] || [];
    const isSelected = currentList.includes(val);
    let nextList: string[];

    if (isSelected) {
      nextList = currentList.filter(v => v !== val);
    } else {
      nextList = [...currentList, val];
    }

    const nextFilters = { ...activeFilters };
    if (nextList.length > 0) {
      nextFilters[fieldKey] = nextList;
    } else {
      delete nextFilters[fieldKey];
    }
    onChangeFilters(nextFilters);
  };

  // Select all values for a field
  const handleSelectAllForField = (fieldKey: string) => {
    const allVals = (fieldValuesData[fieldKey] || []).map(v => v.value);
    if (allVals.length === 0) return;
    onChangeFilters({
      ...activeFilters,
      [fieldKey]: allVals
    });
  };

  // Clear a specific field's active filters
  const handleClearField = (fieldKey: string) => {
    if (!activeFilters[fieldKey]) return;
    const next = { ...activeFilters };
    delete next[fieldKey];
    onChangeFilters(next);
  };

  // Select / Reset all fields in Manage tab
  const handleSelectAllManageFields = () => {
    setVisibleFieldKeys(allFieldDefinitions.map(f => f.key));
  };

  const handleResetManageFieldsToDefault = () => {
    const defaultKeys = ALL_CLOTHES_FILTER_FIELDS.filter(f => f.defaultVisible).map(f => f.key);
    setVisibleFieldKeys(defaultKeys);
  };

  // Count of total active filters
  const totalActiveFilterCount = useMemo(() => {
    return Object.values(activeFilters).reduce((acc, list) => acc + list.length, 0);
  }, [activeFilters]);

  // Filter fields based on Manage tab search query
  const filteredManageFields = useMemo(() => {
    if (!fieldSearchQuery.trim()) return allFieldDefinitions;
    const q = fieldSearchQuery.toLowerCase().trim();
    return allFieldDefinitions.filter(f =>
      f.label.toLowerCase().includes(q) ||
      f.key.toLowerCase().includes(q) ||
      (f.description && f.description.toLowerCase().includes(q))
    );
  }, [allFieldDefinitions, fieldSearchQuery]);

  // List of fields to display in regular Filter view (only those ticked as visible)
  const visibleFilterFields = useMemo(() => {
    return allFieldDefinitions.filter(f => visibleFieldKeys.includes(f.key));
  }, [allFieldDefinitions, visibleFieldKeys]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
      />

      {/* Slide-out Drawer Panel */}
      <div className="relative w-full max-w-md sm:max-w-lg bg-white h-full shadow-2xl flex flex-col z-10 border-l border-slate-200">
        {/* Header Bar */}
        <div className="px-5 py-4 border-b border-slate-200 bg-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Clothes Filters</span>
                {totalActiveFilterCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-purple-600 text-white">
                    {totalActiveFilterCount} active
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                {visibleFilterFields.length} filter fields visible • Follows your wardrobe data
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {totalActiveFilterCount > 0 && (
              <button
                type="button"
                onClick={onClearFilters}
                className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 px-2.5 py-1 rounded-lg hover:bg-rose-50 border border-rose-200/60 transition-colors cursor-pointer"
                title="Clear all active filters"
              >
                Clear all
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher: Filters View vs Manage Visible Fields */}
        <div className="px-5 pt-3 pb-2 border-b border-slate-100 bg-slate-50/70 shrink-0 flex items-center justify-between gap-2">
          <div className="flex items-center p-1 rounded-xl bg-slate-200/70 text-xs font-bold w-full">
            <button
              type="button"
              onClick={() => setActiveTab('filters')}
              className={`flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'filters'
                  ? 'bg-white text-purple-900 shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-purple-600" />
              <span>Apply Filters ({visibleFilterFields.length} Fields)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('manage')}
              className={`flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'manage'
                  ? 'bg-white text-purple-900 shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Settings2 className="w-3.5 h-3.5 text-purple-600" />
              <span>Manage Filter Fields ({visibleFieldKeys.length}/{allFieldDefinitions.length})</span>
            </button>
          </div>
        </div>

        {/* TAB 1: FILTERS VIEW */}
        {activeTab === 'filters' ? (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {/* Quick Helper Banner */}
            <div className="p-3 rounded-2xl bg-purple-50/80 border border-purple-200/80 text-xs text-purple-900 flex items-start justify-between gap-2">
              <div className="space-y-0.5">
                <span className="font-bold flex items-center gap-1 text-[11px] uppercase font-mono tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  Data-Driven Wardrobe Filters
                </span>
                <p className="text-[11px] text-purple-950 font-normal leading-relaxed">
                  Every option is extracted from your actual clothes records (like lace, plain, and custom ratings). Untick unwanted fields in "Manage Filter Fields".
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('manage')}
                className="text-[11px] font-bold text-purple-700 underline shrink-0 mt-0.5 hover:text-purple-900 cursor-pointer"
              >
                ⚙️ 增减字段
              </button>
            </div>

            {/* List of Visible Fields with their Values */}
            {visibleFilterFields.length > 0 ? (
              <div className="space-y-4">
                {visibleFilterFields.map(f => {
                  const values = fieldValuesData[f.key] || [];
                  const activeForThis = activeFilters[f.key] || [];
                  const query = (valueSearchMap[f.key] || '').toLowerCase().trim();
                  const filteredValues = query
                    ? values.filter(v => v.value.toLowerCase().includes(query))
                    : values;

                  return (
                    <div
                      key={f.key}
                      className="p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 bg-white shadow-2xs space-y-2.5 transition-all"
                    >
                      {/* Field Header */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base leading-none shrink-0">{f.icon}</span>
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {f.label}
                          </span>
                          {activeForThis.length > 0 && (
                            <span className="px-1.5 py-0.2 rounded-md bg-purple-100 text-purple-800 text-[10px] font-bold font-mono">
                              {activeForThis.length} selected
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {activeForThis.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => handleClearField(f.key)}
                              className="text-[10px] font-semibold text-slate-500 hover:text-rose-600 px-1.5 py-0.5 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                              Clear
                            </button>
                          ) : (
                            values.length > 0 && (
                              <button
                                type="button"
                                onClick={() => handleSelectAllForField(f.key)}
                                className="text-[10px] font-semibold text-purple-600 hover:text-purple-800 px-1.5 py-0.5 rounded hover:bg-purple-50 transition-colors cursor-pointer"
                              >
                                Select all
                              </button>
                            )
                          )}
                        </div>
                      </div>

                      {/* Small search if field has > 5 distinct values */}
                      {values.length > 5 && (
                        <div className="relative">
                          <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder={`Filter ${values.length} ${f.label.toLowerCase()} values...`}
                            value={valueSearchMap[f.key] || ''}
                            onChange={(e) => {
                              setValueSearchMap({
                                ...valueSearchMap,
                                [f.key]: e.target.value
                              });
                            }}
                            className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-slate-200 text-[11px] bg-slate-50/60 focus:bg-white focus:outline-none focus:border-purple-400"
                          />
                        </div>
                      )}

                      {/* Values Pills / Checkboxes */}
                      {filteredValues.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
                          {filteredValues.map(v => {
                            const isSelected = activeForThis.includes(v.value);
                            return (
                              <button
                                key={v.value}
                                type="button"
                                onClick={() => handleToggleValue(f.key, v.value)}
                                className={`px-2.5 py-1 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer max-w-full text-left leading-normal ${
                                  isSelected
                                    ? 'bg-purple-600 text-white font-bold shadow-2xs ring-1 ring-purple-600'
                                    : 'bg-slate-100 hover:bg-purple-50 text-slate-700 hover:text-purple-900 border border-slate-200/80 hover:border-purple-200'
                                }`}
                              >
                                {isSelected ? (
                                  <Check className="w-3 h-3 shrink-0" />
                                ) : (
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                                )}
                                <span className="truncate max-w-[200px]" title={v.value}>
                                  {v.value}
                                </span>
                                <span className={`text-[10px] font-mono px-1 py-0.2 rounded-md ${
                                  isSelected ? 'bg-purple-700 text-purple-100' : 'bg-white/80 text-slate-500'
                                }`}>
                                  {v.count}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="py-2 text-center text-xs text-slate-400 italic">
                          {query ? 'No matching values' : 'No recorded data for this field yet'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center px-4 space-y-3">
                <div className="p-3 rounded-full bg-slate-100 text-slate-400 w-12 h-12 flex items-center justify-center mx-auto">
                  <EyeOff className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-700">No Filter Fields Enabled</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  You have unticked all fields from the clothes filter. Tap "Manage Filter Fields" below to select which attributes you want to filter.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('manage')}
                  className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition-colors shadow-xs"
                >
                  ⚙️ Manage Filter Fields
                </button>
              </div>
            )}
          </div>
        ) : (
          /* TAB 2: MANAGE VISIBLE FILTER FIELDS (Show / Hide Checklist) */
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {/* Explanatory Header */}
            <div className="p-3 rounded-2xl bg-slate-100 border border-slate-200 text-xs text-slate-700 space-y-1">
              <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                <Settings2 className="w-3.5 h-3.5 text-purple-600" />
                <span>Customize Visible Filter Fields</span>
              </span>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Untick any field to hide it from the clothes filter drawer. Your selection is automatically saved in your browser.
              </p>
            </div>

            {/* Quick Actions & Field Search */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search clothes fields (e.g. material, breast, wash)..."
                  value={fieldSearchQuery}
                  onChange={(e) => setFieldSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-4 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-[11px] font-mono font-medium text-slate-500">
                  {visibleFieldKeys.length} of {allFieldDefinitions.length} fields enabled
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllManageFields}
                    className="text-[11px] font-bold text-purple-600 hover:text-purple-800 transition-colors cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={handleResetManageFieldsToDefault}
                    className="text-[11px] font-medium text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  >
                    Reset Defaults
                  </button>
                </div>
              </div>
            </div>

            {/* Fields Checklist */}
            <div className="space-y-1.5 divide-y divide-slate-100">
              {filteredManageFields.map(f => {
                const isChecked = visibleFieldKeys.includes(f.key);
                const valuesCount = (fieldValuesData[f.key] || []).length;

                return (
                  <div
                    key={f.key}
                    onClick={() => handleToggleFieldVisible(f.key)}
                    className={`pt-2.5 pb-2 px-3 rounded-xl transition-all flex items-start gap-3 cursor-pointer select-none ${
                      isChecked
                        ? 'bg-purple-50/50 hover:bg-purple-50'
                        : 'hover:bg-slate-50 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div className="pt-0.5 shrink-0">
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-purple-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-300" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm leading-none shrink-0">{f.icon}</span>
                        <span className={`text-xs font-bold ${isChecked ? 'text-slate-900' : 'text-slate-500'}`}>
                          {f.label}
                        </span>
                        {valuesCount > 0 && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                            {valuesCount} data values
                          </span>
                        )}
                      </div>
                      {f.description && (
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                          {f.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer Bar */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-white flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            {totalActiveFilterCount > 0 ? (
              <span className="text-purple-900 font-bold">
                {totalActiveFilterCount} filter {totalActiveFilterCount === 1 ? 'condition' : 'conditions'} applied
              </span>
            ) : (
              <span>No filters active</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'manage' ? (
              <button
                type="button"
                onClick={() => setActiveTab('filters')}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <span>Back to Filters</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Done / View Results
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
