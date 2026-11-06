import 'server-only';
import { dupKey, type ImportKind } from './csv';

/** Duplicate keys for what is already in the workspace (read under RLS with the caller's session). */
export async function existingKeys(c: { sb: any; ws: { id: string } }, kind: ImportKind): Promise<string[]> {
  const { data: brands, error: e1 } = await c.sb.from('brands').select('id,name').eq('workspace_id', c.ws.id);
  if (e1) throw e1;
  const name = new Map((brands ?? []).map((b: any) => [b.id, b.name]));
  if (kind === 'deals') {
    const { data, error } = await c.sb.from('deals').select('brand_id,campaign,fee_cents,started_on').eq('workspace_id', c.ws.id);
    if (error) throw error;
    return (data ?? []).map((d: any) => dupKey('deals', { brand: name.get(d.brand_id) ?? '', campaign: d.campaign, feeCents: Number(d.fee_cents), startedOn: d.started_on }));
  }
  const { data, error } = await c.sb.from('contacts').select('name,email,brand_id').eq('workspace_id', c.ws.id);
  if (error) throw error;
  return (data ?? []).map((x: any) => dupKey('contacts', { name: x.name, email: x.email, brand: x.brand_id ? name.get(x.brand_id) ?? '' : '' }));
}
