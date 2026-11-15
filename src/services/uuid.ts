export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const KNOWN_SUBJECT_UUIDS: Record<string, string> = {
  'sub-arabic': '782537e8-0db9-47b7-9296-60d7a21f146e',
  'arabic': '782537e8-0db9-47b7-9296-60d7a21f146e',
  'sub-math': '52f516bd-80b0-4294-9b92-56caf8d76ddb',
  'mathematics': '52f516bd-80b0-4294-9b92-56caf8d76ddb',
  'math': '52f516bd-80b0-4294-9b92-56caf8d76ddb',
  'sub-math-en': '52f516bd-80b0-4294-9b92-56caf8d76ddb',
  'sub-english': '3d5b8afd-03f1-4389-8fae-477b14b0b630',
  'english': '3d5b8afd-03f1-4389-8fae-477b14b0b630',
  'sub-science': 'b0d3c943-541f-42be-915f-ea47a2782f7c',
  'science': 'b0d3c943-541f-42be-915f-ea47a2782f7c',
  'sub-social': '380e2983-5bff-4865-ae4c-82f044c9cfb0',
  'social-studies': '380e2983-5bff-4865-ae4c-82f044c9cfb0',
  'social': '380e2983-5bff-4865-ae4c-82f044c9cfb0',
  'sub-religion': '2df71d70-c4a0-402b-b190-2624f32808e1',
  'islamic-studies': '2df71d70-c4a0-402b-b190-2624f32808e1',
  'religion': '2df71d70-c4a0-402b-b190-2624f32808e1',
  'sub-computer': '97225f15-9565-42f6-a06e-a69d2fb8b1ac',
  'computer-it': '97225f15-9565-42f6-a06e-a69d2fb8b1ac',
  'computer': '97225f15-9565-42f6-a06e-a69d2fb8b1ac',
  'sub-art': '2935bf69-8442-4e99-82e0-bfdcee4c8cda',
  'art-education': '2935bf69-8442-4e99-82e0-bfdcee4c8cda',
  'art': '2935bf69-8442-4e99-82e0-bfdcee4c8cda',
};

export function isValidUUID(id: unknown): boolean {
  return typeof id === 'string' && UUID_REGEX.test(id);
}

export function toDeterministicUUID(val: string): string {
  if (typeof val === 'string' && UUID_REGEX.test(val)) return val;
  const known = KNOWN_SUBJECT_UUIDS[val];
  if (known) return known;

  let h1 = 0xdeadbeef, h2 = 0x41c64e6d, h3 = 0x9e3779b9, h4 = 0x5bd1e995;
  for (let i = 0; i < val.length; i++) {
    const ch = val.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
    h3 = Math.imul(h3 ^ ch, 2246822507);
    h4 = Math.imul(h4 ^ ch, 3266489909);
  }
  const hex = [h1, h2, h3, h4].map((n) => (n >>> 0).toString(16).padStart(8, '0')).join('');
  return (
    hex.slice(0, 8) +
    '-' +
    hex.slice(8, 12) +
    '-4' +
    hex.slice(13, 16) +
    '-a' +
    hex.slice(17, 20) +
    '-' +
    hex.slice(20, 32)
  );
}

export function ensureUUID(id?: string | null): string {
  if (!id) {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
  if (typeof id === 'string' && UUID_REGEX.test(id)) return id;
  const known = KNOWN_SUBJECT_UUIDS[id];
  if (known) return known;
  return toDeterministicUUID(id);
}

export function normalizeUUIDOrNull(id?: string | null): string | null {
  if (!id || typeof id !== 'string' || id.trim() === '') return null;
  return ensureUUID(id.trim());
}
