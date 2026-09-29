import { ciqualNumber, ciqualRows, parseCsv, toSql } from '../ciqual';

const HEADER =
  'alim_code;alim_nom_fr;alim_nom_eng;Energy, Regulation EU No 1169/2011 (kcal/100g);Protein (g/100g);Carbohydrate (g/100g);Fat (g/100g);Fibres (g/100g)';

describe('CIQUAL import', () => {
  it('reads numbers the way the table writes them', () => {
    expect(ciqualNumber('12,5')).toBe(12.5);
    expect(ciqualNumber('< 0,5')).toBe(0.25);
    expect(ciqualNumber('traces')).toBe(0);
    expect(ciqualNumber('-')).toBe(0);
    expect(ciqualNumber('n/a')).toBeNull();
  });

  it('parses quoted cells and picks the columns by name', () => {
    const csv = [
      HEADER,
      '13000;"Pomme, crue";"Apple, raw";53;0,3;11,6;0,2;1,4',
      '99999;Sans nom;;10;1;1;1;1',
      '12001;Emmental;Emmental cheese;n/a;28;0,5;30;0',
    ].join('\r\n');
    const { rows, skipped } = ciqualRows(csv);
    expect(skipped).toBe(2);
    expect(rows).toEqual([
      {
        source: 'ciqual',
        code: '13000',
        name_en: 'Apple, raw',
        name_local: 'Pomme, crue',
        local_lang: 'fr',
        kcal: 53,
        protein_g: 0.3,
        carbs_g: 11.6,
        fat_g: 0.2,
        fiber_g: 1.4,
      },
    ]);
    expect(parseCsv('a,"b ""c""",d\n1,2,3')).toEqual([
      ['a', 'b "c"', 'd'],
      ['1', '2', '3'],
    ]);
  });

  it('writes safe upsert SQL', () => {
    const sql = toSql([
      {
        source: 'ciqual',
        code: '1',
        name_en: "Farmer's cheese",
        name_local: null,
        local_lang: 'fr',
        kcal: 100,
        protein_g: 1,
        carbs_g: 2,
        fat_g: 3,
        fiber_g: 0,
      },
    ]);
    expect(sql).toContain("'Farmer''s cheese', null, 'fr', 100, 1, 2, 3, 0");
    expect(sql).toContain('on conflict (source, code) do update');
  });
});
