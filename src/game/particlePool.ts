export interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

const MAX_PARTICLES = 256;

export class ParticlePool {
  public readonly pool: Particle[];
  private cursor = 0;

  constructor() {
    this.pool = Array.from({ length: MAX_PARTICLES }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 1,
      size: 2,
      color: '#FFD43B',
    }));
  }

  public spawnBurst(
    x: number,
    y: number,
    count: number,
    color: string,
    speed = 2.4,
    size = 3.5,
    life = 0.45
  ): void {
    for (let i = 0; i < count; i++) {
      const p = this.pool[this.cursor];
      this.cursor = (this.cursor + 1) % MAX_PARTICLES;

      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const mag = speed * (0.45 + Math.random() * 0.75);

      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * mag;
      p.vy = Math.sin(angle) * mag;
      p.life = life * (0.7 + Math.random() * 0.4);
      p.maxLife = p.life;
      p.size = size * (0.75 + Math.random() * 0.4);
      p.color = color;
    }
  }

  public update(dt: number): void {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.pool[i];
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.92;
      p.vy *= 0.92;
    }
  }

  public clear(): void {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.pool[i].active = false;
    }
  }
}
