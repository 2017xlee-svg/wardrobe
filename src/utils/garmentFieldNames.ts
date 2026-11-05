const FIELD_ALIASES: Record<string, string> = {
  'hot at noon': 'when without aircond: hot feeling',
  hotatnoon: 'when without aircond: hot feeling',
  noaircondhotfeeling: 'when without aircond: hot feeling',
  whenwithoutaircondhotfeeling: 'when without aircond: hot feeling',
  whenwithoutaircondhot: 'when without aircond: hot feeling',
  withoutaircondhot: 'when without aircond: hot feeling',
  noaircondlegfeeling: 'when without aircond: leg feeling',
  whenwithoutaircondleg: 'when without aircond: leg feeling',
  aircondhotfeeling: 'when with aircond: hot feeling',
  aircondhot: 'when with aircond: hot feeling',
  whenwithaircondhot: 'when with aircond: hot feeling',
  aircondlegfeeling: 'when with aircond: leg feeling',
  aircondleg: 'when with aircond: leg feeling',
  whenwithaircondleg: 'when with aircond: leg feeling',
  fansleephotfeeling: 'when sleep under fan: hot feeling',
  fansleephot: 'when sleep under fan: hot feeling',
  whensleepunderfanhot: 'when sleep under fan: hot feeling',
  fansleeplegfeeling: 'when sleep under fan: leg feeling',
  fansleepleg: 'when sleep under fan: leg feeling',
  whensleepunderfanleg: 'when sleep under fan: leg feeling',
  sidebreastok: 'sideBreastGatherBra',
  'side breast ok': 'sideBreastGatherBra',
  'side breast ok: with 聚拢 bra': 'sideBreastGatherBra',
  'side breast ok: With 聚拢bra': 'sideBreastGatherBra',
  sidebreastokwithgatherbra: 'sideBreastGatherBra',
  sidebreastgatherbra: 'sideBreastGatherBra',
  sidebreastsideoutbra: 'side breast ok: with side out bra',
  sidebreastokwithsideoutbra: 'side breast ok: with side out bra',
  sidebreastokwithsideout: 'side breast ok: with side out bra',
  'sit breast ok': 'sitBreastGatherBra',
  'sit breast ok: With 聚拢bra': 'sitBreastGatherBra',
  'sit breast ok: with 聚拢bra': 'sitBreastGatherBra',
  sitbreastsideoutbra: 'sit breast ok: with side out bra',
  sitbreastokwithsideoutbra: 'sit breast ok: with side out bra',
  sitbreastokwithsideout: 'sit breast ok: with side out bra',
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
  'when without aircond: hot feeling',
  'when without aircond: leg feeling',
  'when with aircond: hot feeling',
  'when with aircond: leg feeling',
  'when sleep under fan: hot feeling',
  'when sleep under fan: leg feeling',
  'sideBreastGatherBra',
  'side breast ok: with side out bra',
  'sitBreastGatherBra',
  'sit breast ok: with side out bra',
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
    const candidates = [
      result[canonicalKey],
      ...topLevelEntries
        .filter(([key]) => key !== canonicalKey && canonicalGarmentFieldKey(key) === canonicalKey)
        .map(([, value]) => value),
      customFields[canonicalKey],
      ...customEntries
        .filter(([key]) => canonicalGarmentFieldKey(key) === canonicalKey)
        .map(([, value]) => value)
    ];
    const value = candidates.find(candidate =>
      candidate !== undefined && candidate !== null && String(candidate).trim()
    );
    if (value !== undefined) result[canonicalKey] = value;

    topLevelEntries.forEach(([key]) => {
      if (key !== canonicalKey && canonicalGarmentFieldKey(key) === canonicalKey) delete result[key];
    });
    customEntries.forEach(([key]) => {
      if (canonicalGarmentFieldKey(key) === canonicalKey) delete customFields[key];
    });
    delete customFields[canonicalKey];
  }

  const explanations = canonicalizeFieldExplanations({
    ...(garment.extraAttributes?._fieldExplanations || {}),
    ...(garment.customFields?._fieldExplanations || {}),
    ...(garment.fieldExplanations || {})
  });
  result.fieldExplanations = explanations;
  delete customFields._fieldExplanations;
  delete result.extraAttributes;
  if (Object.keys(customFields).length || garment.customFields || garment.extraAttributes) {
    result.customFields = customFields;
  } else {
    delete result.customFields;
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
