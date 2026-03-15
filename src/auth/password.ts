export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');

  const encoder = new TextEncoder();
  let hash: Uint8Array = encoder.encode(password + saltHex);

  for (let i = 0; i < 1000; i++) {
    hash = new Uint8Array(await crypto.subtle.digest('SHA-256', hash));
  }

  const hashHex = Array.from(hash).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${saltHex}$${hashHex}`;
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  if (hashedPassword.includes('$')) {
    // New format: salt$hash
    const [saltHex, expectedHash] = hashedPassword.split('$');

    const encoder = new TextEncoder();
    let hash: Uint8Array = encoder.encode(password + saltHex);

    for (let i = 0; i < 1000; i++) {
      hash = new Uint8Array(await crypto.subtle.digest('SHA-256', hash));
    }

    const computedHash = Array.from(hash).map(b => b.toString(16).padStart(2, '0')).join('');
    return computedHash === expectedHash;
  } else {
    // Legacy format: plain SHA-256 (backward compatibility)
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const computedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return computedHash === hashedPassword;
  }
}
