import 'server-only';

/** Finds a brand by case-insensitive name in this workspace, or creates it. */
export async function ensureBrand(c: { sb: any; ws: { id: string } }, name: string): Promise<string> {
  const clean = name.trim().slice(0, 120);
  const { data: found, error } = await c.sb.from('brands').select('id,name').eq('workspace_id', c.ws.id);
  if (error) throw error;
  const hit = (found ?? []).find((b: any) => b.name.toLowerCase() === clean.toLowerCase());
  if (hit) return hit.id;
  const { data, error: e2 } = await c.sb.from('brands').insert({ workspace_id: c.ws.id, name: clean }).select('id').single();
  if (e2) throw e2;
  return data.id;
}
