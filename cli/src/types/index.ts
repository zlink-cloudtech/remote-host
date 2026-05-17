export interface Ref {
  author: string;
  name: string;
  version?: string;
}

export function parseRef(raw: string): Ref {
  const atIndex = raw.indexOf("@");
  const refPart = atIndex === -1 ? raw : raw.slice(0, atIndex);
  const version = atIndex === -1 ? undefined : raw.slice(atIndex + 1);

  const parts = refPart.split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error(`Invalid ref: "${raw}". Expected: <author>/<name>[@version]`);
  }
  return { author: parts[0], name: parts[1], version };
}
