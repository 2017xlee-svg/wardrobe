const FIELD_ALIASES: Record<string, string> = {
  'hot at noon': 'noAircondHotFeeling',
  hotatnoon: 'noAircondHotFeeling',
  'when without aircond: hot feeling': 'noAircondHotFeeling',
  whenwithoutaircondhotfeeling: 'noAircondHotFeeling',
  sidebreastok: 'sideBreastGatherBra',
  'side breast ok': 'sideBreastGatherBra',
  'side breast ok: with 聚拢 bra': 'sideBreastGatherBra',
  'side breast ok: With 聚拢bra': 'sideBreastGatherBra',
  sidebreastokwithgatherbra: 'sideBreastGatherBra',
  sidebreastgatherbra: 'sideBreastGatherBra',
  'sit breast ok': 'sitBreastGatherBra',
  'sit breast ok: With 聚拢bra': 'sitBreastGatherBra',
  'sit breast ok: with 聚拢bra': 'sitBreastGatherBra',
  'stand breast': 'sitBreastGatherBra',
  'stand breast ok': 'sitBreastGatherBra',
  standbreast: 'sitBreastGatherBra',
  standbreastok: 'sitBreastGatherBra',
  sitbreastokwithgatherbra: 'sitBreastGatherBra',
  sitbreastgatherbra: 'sitBreastGatherBra',
  wet: 'Dryness',
  'wet reason': 'Dryness reason',
  wetreason: 'Dryness reason'
};

const normalizeAliasKey = (key: string): string =>
  key.trim().toLowerCase().replace(/[\s_:-]/g, '');

export function canonicalGarmentFieldKey(key: string): string {
  const normalizedKey = normalizeAliasKey(key);
  const normalizedAlias = Object.entries(FIELD_ALIASES).find(
    ([alias]) => normalizeAliasKey(alias) === normalizedKey
  )?.[1];
  return FIELD_ALIASES[key] || normalizedAlias || key;
}

export function canonicalizeFieldExplanations(
  explanations: Record<string, string>
): Record<string, string> {
  const result = { ...explanations };
  for (const [key, value] of Object.entries(explanations)) {
    const canonicalKey = canonicalGarmentFieldKey(key);
    if (canonicalKey === key) continue;
    if (value && !result[canonicalKey]) result[canonicalKey] = value;
    delete result[key];
  }
  return result;
}

const STANDARD_CANONICAL_FIELDS = new Set([
  'noAircondHotFeeling',
  'sideBreastGatherBra',
  'sitBreastGatherBra',
  'Dryness',
  'Dryness reason'
]);

export function migrateGarmentFieldAliases<T extends Record<string, any>>(garment: T): T {
  const result: Record<string, any> = { ...garment };
  const customFields = {
    ...(garment.extraAttributes || {}),
    ...(garment.customFields || {})
  };
  const topLevelEntries = Object.entries(garment);
  const customEntries = Object.entries(customFields);

  for (const canonicalKey of STANDARD_CANONICAL_FIELDS) {
    const topLevelValue = result[canonicalKey];
    const directValue =
      topLevelValue !== undefined && topLevelValue !== null && String(topLevelValue).trim()
        ? topLevelValue
        : customFields[canonicalKey];
    if (directValue !== undefined && directValue !== null && String(directValue).trim()) {
      result[canonicalKey] = directValue;
    } else {
      const aliasValue = [...topLevelEntries, ...customEntries].find(([key, value]) =>
        canonicalGarmentFieldKey(key) === canonicalKey &&
        key !== canonicalKey &&
        value !== undefined && value !== null && String(value).trim()
      )?.[1];
      if (aliasValue !== undefined) result[canonicalKey] = aliasValue;
    }

    topLevelEntries.forEach(([key]) => {
      if (key !== canonicalKey && canonicalGarmentFieldKey(key) === canonicalKey) delete result[key];
    });
    customEntries.forEach(([key]) => {
      if (canonicalGarmentFieldKey(key) === canonicalKey) delete customFields[key];
    });
    delete customFields[canonicalKey];
  }

  const explanations = canonicalizeFieldExplanations({
    ...(garment.fieldExplanations || {}),
    ...(garment.customFields?._fieldExplanations || {}),
    ...(garment.extraAttributes?._fieldExplanations || {})
  });
  result.fieldExplanations = explanations;
  if (Object.keys(customFields).length || garment.customFields || garment.extraAttributes) {
    customFields._fieldExplanations = explanations;
    result.customFields = customFields;
    result.extraAttributes = customFields;
  }
  return result as T;
}

export function canonicalizeReportPresetFields<T extends Record<string, any>>(preset: T): T {
  const normalizeFields = (fields: unknown) =>
    Array.isArray(fields)
      ? Array.from(new Set(fields.map((field: unknown) =>
          typeof field === 'string' ? canonicalGarmentFieldKey(field.trim()) : ''
        ).filter(Boolean)))
      : fields;
  return {
    ...preset,
    groupTiers: normalizeFields(preset.groupTiers),
    visibleFields: normalizeFields(preset.visibleFields)
  };
}
