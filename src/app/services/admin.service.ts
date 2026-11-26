import { Injectable } from '@angular/core';

const HASH_PIN = '682fa1d152807c31977aedd34a99aff7986e6478ead3084bd9fc08ddeb270234';
const CLAVE = 'navinside.admin.v1';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private activoInterno = false;

  constructor() {
    try {
      this.activoInterno = localStorage.getItem(CLAVE) === HASH_PIN;
    } catch {
      this.activoInterno = false;
    }
  }

  get activo(): boolean {
    return this.activoInterno;
  }

  async activar(pin: string): Promise<boolean> {
    const hash = await sha256(`navinside:${pin.trim()}`);
    if (hash !== HASH_PIN) return false;
    this.activoInterno = true;
    try {
      localStorage.setItem(CLAVE, HASH_PIN);
    } catch {
    }
    return true;
  }

  desactivar(): void {
    this.activoInterno = false;
    try {
      localStorage.removeItem(CLAVE);
    } catch {
    }
  }
}

async function sha256(texto: string): Promise<string> {
  const datos = new TextEncoder().encode(texto);
  const resumen = await crypto.subtle.digest('SHA-256', datos);
  return [...new Uint8Array(resumen)].map(b => b.toString(16).padStart(2, '0')).join('');
}
