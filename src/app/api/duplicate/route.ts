import { NextRequest, NextResponse } from 'next/server';

interface Slot {
  id: number;
  name: string;
  position: number;
}

interface Lead {
  id: string;
  slot_id: number;
  phone: string;
  name: string;
  site: string;
}

let slotsStore: Slot[] = [
  { id: 1, name: 'Основная база ТМ 2026', position: 0 }
];

let leadsStore: Lead[] = [];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  if (action === 'get_slots') {
    const slotsWithCount = slotsStore.map((slot) => ({
      ...slot,
      total_leads: leadsStore.filter((l) => l.slot_id === slot.id).length
    }));
    return NextResponse.json({ success: true, slots: slotsWithCount });
  }

  if (action === 'get_leads') {
    const slotId = parseInt(searchParams.get('slot_id') || '0');
    const leads = leadsStore.filter((l) => l.slot_id === slotId);
    return NextResponse.json({ success: true, leads });
  }

  return NextResponse.json({ error: 'Action not found' }, { status: 400 });
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const action = formData.get('action') || new URL(req.url).searchParams.get('action');

    if (action === 'create_slot') {
      const name = (formData.get('name') as string || '').trim();
      if (!name) return NextResponse.json({ error: 'Имя не может быть пустым' }, { status: 400 });

      const newId = Date.now();
      slotsStore.push({ id: newId, name, position: slotsStore.length });
      return NextResponse.json({ success: true, slot_id: newId });
    }

    if (action === 'update_slot_name') {
      const slotId = parseInt(formData.get('slot_id') as string);
      const name = (formData.get('name') as string || '').trim();
      const slot = slotsStore.find((s) => s.id === slotId);
      if (slot) slot.name = name;
      return NextResponse.json({ success: true });
    }

    if (action === 'delete_slot') {
      const slotId = parseInt(formData.get('slot_id') as string);
      slotsStore = slotsStore.filter((s) => s.id !== slotId);
      leadsStore = leadsStore.filter((l) => l.slot_id !== slotId);
      return NextResponse.json({ success: true });
    }

    if (action === 'import_csv') {
      const slotId = parseInt(formData.get('slot_id') as string);
      const file = formData.get('file') as File;
      const colPhone = parseInt((formData.get('col_phone') as string) || '0');
      const colName = parseInt((formData.get('col_name') as string) || '-1');
      const colSite = parseInt((formData.get('col_site') as string) || '-1');

      if (!file) return NextResponse.json({ error: 'Файл не выгружен' }, { status: 400 });

      const text = await file.text();
      const lines = text.split(/[\r\n]+/).filter(Boolean);

      let inserted = 0;
      const duplicates: { phone: string; name: string; site: string }[] = [];

      const existingPhonesInSlot = new Set(
        leadsStore.filter((l) => l.slot_id === slotId).map((l) => l.phone)
      );

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(';').map((c) => c.replace(/^"|"$/g, '').trim());
        const phone = cols[colPhone] || '';
        const name = colName !== -1 ? cols[colName] || '—' : '—';
        const site = colSite !== -1 ? cols[colSite] || '—' : '—';

        if (!phone) continue;

        if (existingPhonesInSlot.has(phone)) {
          duplicates.push({ phone, name, site });
        } else {
          existingPhonesInSlot.add(phone);
          leadsStore.push({
            id: `lead_${slotId}_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}`,
            slot_id: slotId,
            phone,
            name,
            site
          });
          inserted++;
        }
      }

      return NextResponse.json({ success: true, inserted, duplicates });
    }

    if (action === 'update_cell') {
      const leadId = formData.get('lead_id') as string;
      const field = formData.get('field') as 'phone' | 'name' | 'site';
      const value = formData.get('value') as string;

      const lead = leadsStore.find((l) => l.id === leadId);
      if (lead && field) {
        lead[field] = value;
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}