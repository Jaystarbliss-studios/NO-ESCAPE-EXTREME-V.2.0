import { COSMETIC_CATALOG } from './chapters';
import { ParticlePool } from './particlePool';
import { computeLightConePolygon } from './pathfinding';
import {
  DecoyInstance,
  EnemyEntity,
  GeneratedMaze,
  PlayerEntity,
  PowerUpType,
  TileType,
} from './types';

export const POWERUP_VISUAL_CONFIG: Record<
  PowerUpType,
  {
    name: string;
    simpleName: string;
    keySlot: string;
    primaryColor: string;
    sideColor: string;
    glowColor: string;
    description: string;
  }
> = {
  shield: {
    name: 'Aegis Shield',
    simpleName: 'Shield',
    keySlot: '1',
    primaryColor: '#FFD43B',
    sideColor: '#9E7B08',
    glowColor: 'rgba(255, 212, 59, 0.35)',
    description: 'Blocks 1 Hit',
  },
  speed: {
    name: 'Overdrive Speed',
    simpleName: 'Speed Boost',
    keySlot: '2',
    primaryColor: '#FF7A00',
    sideColor: '#9A4400',
    glowColor: 'rgba(255, 122, 0, 0.35)',
    description: '+45% Speed (8s)',
  },
  freeze: {
    name: 'Cryo Freeze Blast',
    simpleName: 'Freeze Blast',
    keySlot: '3',
    primaryColor: '#38BDF8',
    sideColor: '#0369A1',
    glowColor: 'rgba(56, 189, 248, 0.38)',
    description: 'Freeze Enemies (6s)',
  },
  scanner: {
    name: 'Sector Radar Scanner',
    simpleName: 'Night Scanner',
    keySlot: '4',
    primaryColor: '#22C55E',
    sideColor: '#15803D',
    glowColor: 'rgba(34, 197, 94, 0.35)',
    description: 'Night Only · Full Map',
  },
  decoy: {
    name: 'Holo-Lure Decoy',
    simpleName: 'Holo Decoy',
    keySlot: '5',
    primaryColor: '#F43F5E',
    sideColor: '#9F1239',
    glowColor: 'rgba(244, 63, 94, 0.35)',
    description: 'Lure Enemies (9s)',
  },
  night_vision: {
    name: 'Night-Optic Visor',
    simpleName: 'Night Vision',
    keySlot: '6',
    primaryColor: '#A855F7',
    sideColor: '#6B21A8',
    glowColor: 'rgba(168, 85, 247, 0.38)',
    description: '2x Torch Sight (14s)',
  },
};

export interface RenderContextState {
  maze: GeneratedMaze;
  player: PlayerEntity;
  decoys: DecoyInstance[];
  particles: ParticlePool;
  nightFactor: number; // 0 = full day, 1 = full night (smoothly interpolated over transitionDuration)
  isTransitioningToNight: boolean;
  timeUntilTransition: number;
  effectiveVisionTiles: number;
  scannerActive: boolean;
  cameraX: number;
  cameraY: number;
  shakeOffsetX: number;
  shakeOffsetY: number;
  elapsedTime: number;
  equippedSkinId: string;
  equippedTrailId: string;
  isTitleCameraTour: boolean;
  playerAutoPath?: { x: number; y: number }[];
}

export class MazeRenderer {
  private fogCanvas: HTMLCanvasElement | null = null;
  private fogCtx: CanvasRenderingContext2D | null = null;

  private ensureFogCanvas(width: number, height: number): CanvasRenderingContext2D | null {
    if (typeof document === 'undefined') return null;
    if (!this.fogCanvas) {
      this.fogCanvas = document.createElement('canvas');
      this.fogCtx = this.fogCanvas.getContext('2d');
    }
    if (this.fogCanvas.width !== width || this.fogCanvas.height !== height) {
      this.fogCanvas.width = width;
      this.fogCanvas.height = height;
    }
    return this.fogCtx;
  }

  public render(
    ctx: CanvasRenderingContext2D,
    viewportW: number,
    viewportH: number,
    state: RenderContextState
  ): void {
    const {
      maze,
      player,
      decoys,
      particles,
      nightFactor,
      timeUntilTransition,
      effectiveVisionTiles,
      scannerActive,
      cameraX,
      cameraY,
      shakeOffsetX,
      shakeOffsetY,
      elapsedTime,
      equippedSkinId,
      isTitleCameraTour,
    } = state;

    // Responsive tile size calculation for both mobile phones and desktop monitors
    const minDim = Math.min(viewportW, viewportH);
    const isMobileViewport = viewportW < 640;
    const tileSize = isMobileViewport
      ? Math.max(26, Math.min(42, Math.floor(minDim / 11.8)))
      : Math.max(38, Math.min(64, Math.floor(minDim / 11.5)));

    ctx.save();
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, viewportW, viewportH);

    // Center maze when it fits comfortably in the viewport; otherwise follow camera clamped to maze bounds
    const mazePxW = maze.width * tileSize;
    const mazePxH = maze.height * tileSize;
    const rawOffsetX = viewportW / 2 - cameraX * tileSize;
    const rawOffsetY = viewportH / 2 - cameraY * tileSize;

    const padX = isMobileViewport ? 16 : 64;
    const padTop = isMobileViewport ? 44 : 72;
    const padBottom = isMobileViewport ? 62 : 84;

    let baseOffsetX: number;
    if (!isTitleCameraTour && mazePxW <= viewportW - padX * 2) {
      baseOffsetX = (viewportW - mazePxW) / 2;
    } else if (!isTitleCameraTour) {
      const minOx = viewportW - mazePxW - padX;
      const maxOx = padX;
      baseOffsetX = Math.max(minOx, Math.min(maxOx, rawOffsetX));
    } else {
      baseOffsetX = rawOffsetX;
    }

    let baseOffsetY: number;
    if (!isTitleCameraTour && mazePxH <= viewportH - (padTop + padBottom)) {
      baseOffsetY = (viewportH - mazePxH) / 2;
    } else if (!isTitleCameraTour) {
      const minOy = viewportH - mazePxH - padBottom;
      const maxOy = padTop;
      baseOffsetY = Math.max(minOy, Math.min(maxOy, rawOffsetY));
    } else {
      baseOffsetY = rawOffsetY;
    }

    const offsetX = Math.floor(baseOffsetX + shakeOffsetX);
    const offsetY = Math.floor(baseOffsetY + shakeOffsetY);

    ctx.translate(offsetX, offsetY);

    // Determine visible tile bounds for frustum culling
    const minTileX = Math.max(0, Math.floor(-offsetX / tileSize) - 1);
    const maxTileX = Math.min(maze.width - 1, Math.ceil((viewportW - offsetX) / tileSize) + 1);
    const minTileY = Math.max(0, Math.floor(-offsetY / tileSize) - 1);
    const maxTileY = Math.min(maze.height - 1, Math.ceil((viewportH - offsetY) / tileSize) + 1);

    const isNight = nightFactor >= 0.5;
    const shiftWarning = timeUntilTransition <= 4.0;
    const effectiveNightFactor = scannerActive ? 0.1 : nightFactor;
    const visibilityRadiusTiles = scannerActive ? 999 : effectiveVisionTiles;

    const unlockedDoors = new Set<string>();
    for (const d of maze.doors) {
      if (d.unlocked) unlockedDoors.add(`${d.x},${d.y}`);
    }

    // 1. Render Floor & Wall Grid with subtle 2.5D depth
    for (let y = minTileY; y <= maxTileY; y++) {
      for (let x = minTileX; x <= maxTileX; x++) {
        const tile = maze.grid[y][x];
        const px = x * tileSize;
        const py = y * tileSize;

        if (tile === 'wall') {
          this.drawWallTile(ctx, px, py, tileSize, x, y);
        } else {
          // High-clarity dark slate floor pathway
          ctx.fillStyle = (x + y) % 2 === 0 ? '#161616' : '#131313';
          ctx.fillRect(px, py, tileSize, tileSize);

          // Cast subtle 2.5D ambient shadow from northern wall onto floor tile
          if (y > 0 && maze.grid[y - 1][x] === 'wall') {
            const wallShadow = ctx.createLinearGradient(px, py, px, py + tileSize * 0.28);
            wallShadow.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
            wallShadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = wallShadow;
            ctx.fillRect(px, py, tileSize, tileSize * 0.28);
          }

          // Subtle floor grid detail
          ctx.strokeStyle = 'rgba(255, 247, 230, 0.04)';
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 0.5, py + 0.5, tileSize - 1, tileSize - 1);

          if (tile === 'mystery_floor') {
            ctx.fillStyle = 'rgba(255, 212, 59, 0.14)';
            ctx.fillRect(px + 2, py + 2, tileSize - 4, tileSize - 4);
            ctx.strokeStyle = 'rgba(255, 212, 59, 0.5)';
            ctx.strokeRect(px + 4, py + 4, tileSize - 8, tileSize - 8);
          } else if (tile === 'start') {
            ctx.strokeStyle = 'rgba(255, 212, 59, 0.45)';
            ctx.lineWidth = 2;
            ctx.strokeRect(px + 6, py + 6, tileSize - 12, tileSize - 12);
          } else if (tile === 'shifting_day_open' || tile === 'shifting_night_open') {
            const currentlySolid =
              (tile === 'shifting_day_open' && isNight) ||
              (tile === 'shifting_night_open' && !isNight);
            this.drawShiftingTile(ctx, px, py, tileSize, currentlySolid, shiftWarning, elapsedTime);
          }
        }
      }
    }

    // Render Auto-Path Line if active
    if (state.playerAutoPath && state.playerAutoPath.length > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(player.x * tileSize, player.y * tileSize);
      for (const pt of state.playerAutoPath) {
        ctx.lineTo((pt.x + 0.5) * tileSize, (pt.y + 0.5) * tileSize);
      }
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = 'rgba(255, 212, 59, 0.82)';
      ctx.setLineDash([8, 6]);
      ctx.stroke();
      ctx.restore();
    }

    // 2. Render Checkpoint (with 2.5D pedestal)
    if (maze.checkpoint) {
      const cp = maze.checkpoint;
      const cx = (cp.x + 0.5) * tileSize;
      const cy = (cp.y + 0.5) * tileSize;
      ctx.save();
      // 3D base rim
      ctx.beginPath();
      ctx.arc(cx, cy + 3, tileSize * 0.34, 0, Math.PI * 2);
      ctx.fillStyle = '#0B0B0B';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx, cy, tileSize * 0.34, 0, Math.PI * 2);
      ctx.fillStyle = cp.activated ? 'rgba(255, 212, 59, 0.24)' : 'rgba(255, 247, 230, 0.08)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = cp.activated ? '#FFD43B' : '#999999';
      ctx.stroke();

      // Inner 3D floating crystal diamond
      ctx.translate(cx, cy - 2);
      ctx.rotate(elapsedTime * (cp.activated ? 2.0 : 0.5));
      ctx.fillStyle = cp.activated ? '#9E7B08' : '#444444';
      ctx.fillRect(-5, -3, 10, 10);
      ctx.fillStyle = cp.activated ? '#FFD43B' : '#999999';
      ctx.fillRect(-5, -5, 10, 10);
      ctx.restore();
    }

    // 3. Render Boss Switches (with 2.5D button depth)
    for (const sw of maze.bossSwitches) {
      const sx = (sw.x + 0.5) * tileSize;
      const sy = (sw.y + 0.5) * tileSize;
      ctx.save();
      // 3D socket base
      ctx.fillStyle = '#0D0D0D';
      ctx.beginPath();
      ctx.arc(sx, sy + 3, tileSize * 0.36, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = sw.activated ? 'rgba(255, 212, 59, 0.22)' : 'rgba(229, 43, 43, 0.22)';
      ctx.beginPath();
      ctx.arc(sx, sy, tileSize * 0.36, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = sw.activated ? '#FFD43B' : '#E52B2B';
      ctx.stroke();

      // 3D plunger cap
      const capOffset = sw.activated ? 1 : -2;
      ctx.fillStyle = sw.activated ? '#9E7B08' : '#7F1111';
      ctx.beginPath();
      ctx.arc(sx, sy + 2.5, tileSize * 0.17, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = sw.activated ? '#FFD43B' : '#E52B2B';
      ctx.beginPath();
      ctx.arc(sx, sy + capOffset, tileSize * 0.17, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 4. Render Locked Doors (with 2.5D heavy gate bevel)
    for (const door of maze.doors) {
      if (door.unlocked) continue;
      const dx = door.x * tileSize;
      const dy = door.y * tileSize;
      const bevel = Math.max(5, Math.floor(tileSize * 0.15));
      ctx.save();
      // 3D bottom extrusion
      ctx.fillStyle = '#140808';
      ctx.fillRect(dx + 2, dy + 2, tileSize - 4, tileSize - 3);
      // Top face
      ctx.fillStyle = '#331515';
      ctx.fillRect(dx + 2, dy + 2, tileSize - 4, tileSize - bevel - 2);
      ctx.strokeStyle = door.color || '#E52B2B';
      ctx.lineWidth = 3;
      ctx.strokeRect(dx + 3, dy + 3, tileSize - 6, tileSize - bevel - 4);

      // Cross bars
      ctx.beginPath();
      ctx.moveTo(dx + 6, dy + 6);
      ctx.lineTo(dx + tileSize - 6, dy + tileSize - bevel - 4);
      ctx.moveTo(dx + tileSize - 6, dy + 6);
      ctx.lineTo(dx + 6, dy + tileSize - bevel - 4);
      ctx.stroke();

      // Center 3D lock emblem
      ctx.fillStyle = '#9E7B08';
      ctx.beginPath();
      ctx.arc(dx + tileSize / 2, dy + (tileSize - bevel) / 2 + 2.5, tileSize * 0.16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFD43B';
      ctx.beginPath();
      ctx.arc(dx + tileSize / 2, dy + (tileSize - bevel) / 2, tileSize * 0.16, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 5. Render Exit Portal
    this.drawExitGate(ctx, maze, tileSize, elapsedTime);

    // 6. Render Environmental Hazards
    for (const h of maze.hazards) {
      if (h.nightOnly && !isNight) {
        // Subtle dormant rune during daytime
        const hx = (h.x + 0.5) * tileSize;
        const hy = (h.y + 0.5) * tileSize;
        ctx.strokeStyle = 'rgba(229, 43, 43, 0.2)';
        ctx.strokeRect(hx - tileSize * 0.25, hy - tileSize * 0.25, tileSize * 0.5, tileSize * 0.5);
        continue;
      }
      this.drawHazard(ctx, h, tileSize, elapsedTime);
    }

    // 7. Render Teleportation Portals (Normal & Golden)
    for (const portal of maze.portals) {
      if (!portal.active) continue;
      this.drawPortalNode(ctx, portal.entry.x, portal.entry.y, portal.category, tileSize, elapsedTime);
      this.drawPortalNode(ctx, portal.exit.x, portal.exit.y, portal.category, tileSize, elapsedTime + 1.5);
    }

    // 8. Render Coins, Keys, and Power-Ups with 2.5D floating elevation & ground shadows
    for (const coin of maze.coins) {
      if (coin.collected) continue;
      const cx = (coin.x + 0.5) * tileSize;
      const hover = Math.sin(elapsedTime * 4.5 + coin.x) * 2.2;
      const cy = (coin.y + 0.5) * tileSize + hover;
      const pulse = Math.sin(elapsedTime * 5 + coin.x) * 0.12 + 0.88;
      ctx.save();
      // Ground drop shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
      ctx.beginPath();
      ctx.ellipse(cx, (coin.y + 0.5) * tileSize + tileSize * 0.18, tileSize * 0.15, tileSize * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.translate(cx, cy);
      if (coin.isRareTreasure) {
        const r = tileSize * 0.24;
        // 3D lower gem facet
        ctx.save();
        ctx.translate(0, 3.5);
        ctx.rotate(elapsedTime * 2);
        ctx.fillStyle = '#9E7B08';
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.lineTo(r, 0);
        ctx.lineTo(0, r);
        ctx.lineTo(-r, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        ctx.rotate(elapsedTime * 2);
        ctx.fillStyle = '#FFD43B';
        ctx.strokeStyle = '#FFF7E6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.lineTo(r, 0);
        ctx.lineTo(0, r);
        ctx.lineTo(-r, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        // 3D coin edge thickness
        ctx.fillStyle = '#9A6B00';
        ctx.beginPath();
        ctx.ellipse(0, 3, tileSize * 0.15 * pulse, tileSize * 0.17, 0, 0, Math.PI * 2);
        ctx.fill();

        // Top coin face
        ctx.fillStyle = '#FFB800';
        ctx.beginPath();
        ctx.ellipse(0, 0, tileSize * 0.15 * pulse, tileSize * 0.17, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FFD43B';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Specular glint
        ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.beginPath();
        ctx.ellipse(-tileSize * 0.04 * pulse, -tileSize * 0.05, tileSize * 0.04 * pulse, tileSize * 0.05, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    for (const key of maze.keys) {
      if (key.collected) continue;
      const kx = (key.x + 0.5) * tileSize;
      const baseKy = (key.y + 0.5) * tileSize;
      const ky = baseKy + Math.sin(elapsedTime * 4) * 3;
      ctx.save();
      // Ground drop shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.beginPath();
      ctx.ellipse(kx, baseKy + tileSize * 0.22, tileSize * 0.22, tileSize * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.translate(kx, ky);
      // 3D metallic underside
      ctx.fillStyle = '#7A5905';
      ctx.beginPath();
      ctx.arc(-4, 3.5, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(2, 1.5, 10, 4);
      ctx.fillRect(8, 5.5, 3, 4);

      // Top key body
      ctx.fillStyle = key.color;
      ctx.strokeStyle = '#171717';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(-4, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillRect(2, -2, 10, 4);
      ctx.fillRect(8, 2, 3, 4);

      // Key top highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.beginPath();
      ctx.arc(-5.5, -2, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const pu of maze.powerUps) {
      if (pu.collected) continue;
      this.drawPowerUpPickup(ctx, pu.x, pu.y, pu.type, tileSize, elapsedTime);
    }

    // 9. Render Decoys (with 2.5D emitter pedestal)
    for (const decoy of decoys) {
      const dx = decoy.x * tileSize;
      const dy = decoy.y * tileSize;
      ctx.save();
      ctx.strokeStyle = '#F43F5E';
      ctx.lineWidth = 2;
      const ringR = ((elapsedTime * 1.8) % 1) * tileSize * 1.4;
      ctx.globalAlpha = 1 - ((elapsedTime * 1.8) % 1);
      ctx.beginPath();
      ctx.arc(dx, dy, ringR, 0, Math.PI * 2);
      ctx.stroke();

      // Ground shadow
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.ellipse(dx, dy + tileSize * 0.18, tileSize * 0.25, tileSize * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();

      // 3D base cylinder
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#9F1239';
      ctx.beginPath();
      ctx.arc(dx, dy + 4, tileSize * 0.24, 0, Math.PI * 2);
      ctx.fill();

      // Top hologram emitter
      ctx.fillStyle = '#FFD43B';
      ctx.beginPath();
      ctx.arc(dx, dy, tileSize * 0.24, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 10. Render Enemies (Strict Night Visibility Enforcement + Wall-Occluded Scanning Cones)
    for (const enemy of maze.enemies) {
      const distToPlayerTiles = Math.hypot(enemy.x - player.x, enemy.y - player.y);
      if (
        !isTitleCameraTour &&
        effectiveNightFactor > 0.35 &&
        !scannerActive &&
        distToPlayerTiles > visibilityRadiusTiles + 0.65
      ) {
        continue;
      }
      this.drawEnemy(ctx, enemy, tileSize, elapsedTime, isNight, maze.grid, unlockedDoors);
    }

    // 11. Render Player (hidden during Title Screen camera tour)
    if (!isTitleCameraTour) {
      this.drawPlayer(ctx, player, tileSize, elapsedTime, equippedSkinId);
    }

    // 12. Render Pooled Particles
    for (let i = 0; i < particles.pool.length; i++) {
      const pt = particles.pool[i];
      if (!pt.active) continue;
      const alpha = Math.max(0, Math.min(1, pt.life / pt.maxLife));
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(pt.x * tileSize, pt.y * tileSize, pt.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.restore();

    // 13. Apply True Nighttime Fog-of-War & Dynamic Torch Illumination
    if (!isTitleCameraTour && effectiveNightFactor > 0.01) {
      this.applyNightFogOfWar(
        ctx,
        viewportW,
        viewportH,
        player.x * tileSize + offsetX,
        player.y * tileSize + offsetY,
        visibilityRadiusTiles * tileSize,
        effectiveNightFactor,
        decoys.map((d) => ({ x: d.x * tileSize + offsetX, y: d.y * tileSize + offsetY }))
      );
    }

    // 14. Render Compact Perimeter Minimap Radar (Desktop only so mobile screens stay completely open)
    if (!isTitleCameraTour && viewportW >= 768) {
      this.drawMinimap(
        ctx,
        viewportW,
        viewportH,
        maze,
        player,
        isNight && !scannerActive,
        visibilityRadiusTiles
      );
    }
  }

  private drawMinimap(
    ctx: CanvasRenderingContext2D,
    viewportW: number,
    viewportH: number,
    maze: GeneratedMaze,
    player: PlayerEntity,
    restrictToVision: boolean,
    visionRadiusTiles: number
  ): void {
    const maxBox = 92;
    const cell = Math.max(2, Math.floor(maxBox / Math.max(maze.width, maze.height)));
    const mapW = maze.width * cell;
    const mapH = maze.height * cell;
    const x0 = viewportW - mapW - 14;
    const y0 = viewportH - mapH - 14;

    ctx.save();
    ctx.fillStyle = 'rgba(23, 23, 23, 0.92)';
    ctx.strokeStyle = 'rgba(255, 247, 230, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.fillRect(x0 - 4, y0 - 4, mapW + 8, mapH + 8);
    ctx.strokeRect(x0 - 4, y0 - 4, mapW + 8, mapH + 8);

    for (let y = 0; y < maze.height; y++) {
      for (let x = 0; x < maze.width; x++) {
        if (restrictToVision) {
          const d = Math.hypot(x + 0.5 - player.x, y + 0.5 - player.y);
          if (d > visionRadiusTiles + 1.2) continue;
        }
        const t = maze.grid[y][x];
        if (t === 'wall') {
          ctx.fillStyle = '#383838';
        } else if (t === 'exit') {
          ctx.fillStyle = '#FFD43B';
        } else if (t === 'locked_door') {
          ctx.fillStyle = '#E52B2B';
        } else {
          ctx.fillStyle = '#141414';
        }
        ctx.fillRect(x0 + x * cell, y0 + y * cell, cell, cell);
      }
    }

    // Player dot on minimap
    ctx.fillStyle = '#FFD43B';
    ctx.beginPath();
    ctx.arc(x0 + player.x * cell, y0 + player.y * cell, Math.max(2.5, cell * 0.6), 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawWallTile(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    tileSize: number,
    gx: number,
    gy: number
  ): void {
    const bevel = Math.max(6, Math.floor(tileSize * 0.2));
    // Base wall shadow block
    ctx.fillStyle = '#0B0B0B';
    ctx.fillRect(px, py, tileSize, tileSize);

    // Top structural stone face with subtle 3D vertical gradient
    const topGrad = ctx.createLinearGradient(px, py + 1, px, py + tileSize - bevel);
    if ((gx + gy) % 3 === 0) {
      topGrad.addColorStop(0, '#3A3A3A');
      topGrad.addColorStop(1, '#2D2D2D');
    } else {
      topGrad.addColorStop(0, '#333333');
      topGrad.addColorStop(1, '#262626');
    }
    ctx.fillStyle = topGrad;
    ctx.fillRect(px + 1, py + 1, tileSize - 2, tileSize - bevel);

    // Inner stone bevel outline
    ctx.strokeStyle = 'rgba(255, 247, 230, 0.09)';
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 2.5, py + 2.5, tileSize - 5, tileSize - bevel - 3);

    // Subtle crimson/amber top rim highlight
    ctx.fillStyle = (gx + gy) % 5 === 0 ? 'rgba(255, 212, 59, 0.25)' : 'rgba(229, 43, 43, 0.28)';
    ctx.fillRect(px + 2, py + 1, tileSize - 4, 2);

    // Extruded 3D front cliff face (south side of wall block)
    const frontGrad = ctx.createLinearGradient(px, py + tileSize - bevel, px, py + tileSize);
    frontGrad.addColorStop(0, '#222222');
    frontGrad.addColorStop(1, '#141414');
    ctx.fillStyle = frontGrad;
    ctx.fillRect(px + 1, py + tileSize - bevel, tileSize - 2, bevel - 1);

    // Chiseled ridge line between top roof and front 3D face
    ctx.fillStyle = 'rgba(255, 247, 230, 0.12)';
    ctx.fillRect(px + 1, py + tileSize - bevel, tileSize - 2, 1.5);
  }

  private drawShiftingTile(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    tileSize: number,
    currentlySolid: boolean,
    shiftWarning: boolean,
    elapsedTime: number
  ): void {
    ctx.save();
    if (currentlySolid) {
      const bevel = Math.max(5, Math.floor(tileSize * 0.16));
      ctx.fillStyle = '#1E0D0D';
      ctx.fillRect(px + 2, py + 2, tileSize - 4, tileSize - 4);
      ctx.fillStyle = '#381919';
      ctx.fillRect(px + 2, py + 2, tileSize - 4, tileSize - bevel - 2);
      ctx.strokeStyle = shiftWarning && Math.floor(elapsedTime * 8) % 2 === 0 ? '#FFD43B' : '#E52B2B';
      ctx.lineWidth = 2;
      ctx.strokeRect(px + 4, py + 4, tileSize - 8, tileSize - bevel - 4);
    } else {
      ctx.strokeStyle = shiftWarning ? '#E52B2B' : 'rgba(255, 184, 0, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(px + 5, py + 5, tileSize - 10, tileSize - 10);
    }
    ctx.restore();
  }

  private drawExitGate(
    ctx: CanvasRenderingContext2D,
    maze: GeneratedMaze,
    tileSize: number,
    elapsedTime: number
  ): void {
    const ex = (maze.exit.x + 0.5) * tileSize;
    const ey = (maze.exit.y + 0.5) * tileSize;
    const anyLocked = maze.doors.some((d) => !d.unlocked);

    ctx.save();
    ctx.translate(ex, ey);

    const ringRadius = tileSize * 0.42;
    // 3D base dais under exit portal
    ctx.beginPath();
    ctx.arc(0, 4, ringRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#090909';
    ctx.fill();

    // Outer glow ring
    ctx.beginPath();
    ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
    ctx.fillStyle = anyLocked ? 'rgba(229, 43, 43, 0.18)' : 'rgba(255, 212, 59, 0.28)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = anyLocked ? '#E52B2B' : '#FFD43B';
    ctx.stroke();

    // Rotating inner chevrons
    ctx.rotate(elapsedTime * (anyLocked ? 0.8 : 2.5));
    ctx.strokeStyle = anyLocked ? '#B81717' : '#FFF7E6';
    ctx.lineWidth = 2;
    ctx.strokeRect(-tileSize * 0.2, -tileSize * 0.2, tileSize * 0.4, tileSize * 0.4);

    ctx.restore();
  }

  private drawHazard(
    ctx: CanvasRenderingContext2D,
    h: GeneratedMaze['hazards'][0],
    tileSize: number,
    elapsedTime: number
  ): void {
    const cx = (h.x + 0.5) * tileSize;
    const cy = (h.y + 0.5) * tileSize;
    ctx.save();
    ctx.translate(cx, cy);

    if (h.type === 'spikes') {
      ctx.fillStyle = '#141414';
      ctx.fillRect(-tileSize * 0.36, -tileSize * 0.36, tileSize * 0.72, tileSize * 0.72);
      const positions = [
        [-0.2, -0.2],
        [0.2, -0.2],
        [-0.2, 0.2],
        [0.2, 0.2],
        [0, 0],
      ];
      for (const [ox, oy] of positions) {
        const sx = ox * tileSize;
        const sy = oy * tileSize;
        if (h.state === 'active') {
          // 3D raised spike cone
          ctx.fillStyle = '#7F1111';
          ctx.beginPath();
          ctx.arc(sx, sy + 2, tileSize * 0.085, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#E52B2B';
          ctx.beginPath();
          ctx.moveTo(sx, sy - tileSize * 0.12);
          ctx.lineTo(sx + tileSize * 0.08, sy + 2);
          ctx.lineTo(sx - tileSize * 0.08, sy + 2);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(sx, sy, tileSize * 0.08, 0, Math.PI * 2);
          ctx.fillStyle = h.state === 'windup' ? '#FFD43B' : '#3A3A3A';
          ctx.fill();
        }
      }
    } else if (h.type === 'fire_corridor' || h.type === 'laser_barrier') {
      if (h.state === 'active') {
        ctx.fillStyle = 'rgba(229, 43, 43, 0.45)';
        ctx.fillRect(-tileSize * 0.42, -tileSize * 0.42, tileSize * 0.84, tileSize * 0.84);
        ctx.strokeStyle = '#FFD43B';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-tileSize * 0.4, 0);
        ctx.lineTo(tileSize * 0.4, 0);
        ctx.moveTo(0, -tileSize * 0.4);
        ctx.lineTo(0, tileSize * 0.4);
        ctx.stroke();
      } else if (h.state === 'windup') {
        ctx.strokeStyle = '#FFB800';
        ctx.lineWidth = 2;
        ctx.strokeRect(-tileSize * 0.32, -tileSize * 0.32, tileSize * 0.64, tileSize * 0.64);
      } else {
        ctx.strokeStyle = 'rgba(229, 43, 43, 0.25)';
        ctx.strokeRect(-tileSize * 0.25, -tileSize * 0.25, tileSize * 0.5, tileSize * 0.5);
      }
    } else if (h.type === 'collapsing_tile') {
      ctx.strokeStyle = h.state === 'active' ? '#E52B2B' : '#999999';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-tileSize * 0.38, -tileSize * 0.38, tileSize * 0.76, tileSize * 0.76);
      if (h.state === 'active') {
        ctx.fillStyle = '#090909';
        ctx.fillRect(-tileSize * 0.34, -tileSize * 0.34, tileSize * 0.68, tileSize * 0.68);
      }
    } else if (h.type === 'night_stalk_trap') {
      const pulse = Math.sin(elapsedTime * 10) * 0.2 + 0.8;
      ctx.strokeStyle = h.state === 'active' ? '#E52B2B' : '#FFD43B';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, tileSize * 0.32 * pulse, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawPortalNode(
    ctx: CanvasRenderingContext2D,
    gx: number,
    gy: number,
    category: 'normal' | 'golden',
    tileSize: number,
    elapsedTime: number
  ): void {
    const px = (gx + 0.5) * tileSize;
    const py = (gy + 0.5) * tileSize;
    ctx.save();
    ctx.translate(px, py);

    const isGolden = category === 'golden';
    // 3D pedestal shadow ring
    ctx.fillStyle = 'rgba(0, 0, 0, 0.52)';
    ctx.beginPath();
    ctx.ellipse(0, 4, tileSize * 0.32, tileSize * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.rotate(elapsedTime * 2.2);
    ctx.strokeStyle = isGolden ? '#FFD43B' : '#38BDF8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, tileSize * 0.32, tileSize * 0.2, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.rotate(-elapsedTime * 4.0);
    ctx.strokeStyle = isGolden ? '#FFF7E6' : '#E52B2B';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(0, 0, tileSize * 0.2, tileSize * 0.32, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = isGolden ? 'rgba(255, 212, 59, 0.38)' : 'rgba(56, 189, 248, 0.28)';
    ctx.beginPath();
    ctx.arc(0, 0, tileSize * 0.14, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawPowerUpPickup(
    ctx: CanvasRenderingContext2D,
    gx: number,
    gy: number,
    type: PowerUpType,
    tileSize: number,
    elapsedTime: number
  ): void {
    const vis = POWERUP_VISUAL_CONFIG[type];
    const px = (gx + 0.5) * tileSize;
    const basePy = (gy + 0.5) * tileSize;
    const hover = Math.sin(elapsedTime * 3.5 + gx) * 2.8;
    const py = basePy + hover - 2;
    const r = tileSize * 0.29;

    ctx.save();
    // 1. Ground drop shadow ellipse on floor
    ctx.fillStyle = 'rgba(0, 0, 0, 0.52)';
    ctx.beginPath();
    ctx.ellipse(px, basePy + tileSize * 0.23, r * 0.85, r * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(px, py);

    // 2. Soft color-coded aura pulse
    ctx.fillStyle = vis.glowColor;
    ctx.beginPath();
    ctx.arc(0, 1, r * 1.24, 0, Math.PI * 2);
    ctx.fill();

    // 3. 3D Extruded hexagonal lower pedestal (+4.5px down)
    ctx.fillStyle = vis.sideColor;
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i;
      const vx = Math.cos(a) * r;
      const vy = Math.sin(a) * r + 4.5;
      if (i === 0) ctx.moveTo(vx, vy);
      else ctx.lineTo(vx, vy);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 4. Top hexagonal badge face with signature color rim
    ctx.fillStyle = '#1D1D1D';
    ctx.strokeStyle = vis.primaryColor;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i;
      const vx = Math.cos(a) * r;
      const vy = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(vx, vy);
      else ctx.lineTo(vx, vy);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 5. Top 3D specular bevel highlight inside hexagon
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-r * 0.45, -r * 0.72);
    ctx.lineTo(r * 0.45, -r * 0.72);
    ctx.stroke();

    // 6. Distinct custom vector icon per power-up (no cryptic 2-letter text codes)
    const ir = r * 0.56;
    ctx.fillStyle = vis.primaryColor;
    ctx.strokeStyle = vis.primaryColor;
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (type === 'shield') {
      // Crest shield emblem
      ctx.beginPath();
      ctx.moveTo(0, -ir);
      ctx.lineTo(ir * 0.85, -ir * 0.55);
      ctx.lineTo(ir * 0.7, ir * 0.35);
      ctx.lineTo(0, ir);
      ctx.lineTo(-ir * 0.7, ir * 0.35);
      ctx.lineTo(-ir * 0.85, -ir * 0.55);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#FFF7E6';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    } else if (type === 'speed') {
      // High-voltage lightning bolt
      ctx.beginPath();
      ctx.moveTo(ir * 0.2, -ir);
      ctx.lineTo(-ir * 0.65, ir * 0.08);
      ctx.lineTo(ir * 0.05, ir * 0.08);
      ctx.lineTo(-ir * 0.25, ir);
      ctx.lineTo(ir * 0.65, -ir * 0.12);
      ctx.lineTo(-ir * 0.05, -ir * 0.12);
      ctx.closePath();
      ctx.fill();
    } else if (type === 'freeze') {
      // 6-axis cryo snowflake crystal
      for (let i = 0; i < 3; i++) {
        const a = (Math.PI / 3) * i;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * -ir, Math.sin(a) * -ir);
        ctx.lineTo(Math.cos(a) * ir, Math.sin(a) * ir);
        ctx.stroke();
      }
      ctx.fillStyle = '#FFF7E6';
      ctx.beginPath();
      ctx.arc(0, 0, ir * 0.28, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'scanner') {
      // Radar dish concentric sweep
      ctx.beginPath();
      ctx.arc(0, 0, ir * 0.85, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, ir * 0.32, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(ir * 0.75, -ir * 0.55);
      ctx.stroke();
    } else if (type === 'decoy') {
      // Hologram twin beacon figure
      ctx.beginPath();
      ctx.arc(0, -ir * 0.42, ir * 0.34, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-ir * 0.68, ir * 0.82);
      ctx.quadraticCurveTo(0, -ir * 0.05, ir * 0.68, ir * 0.82);
      ctx.closePath();
      ctx.fill();
    } else if (type === 'night_vision') {
      // Illuminated night-optic eye
      ctx.beginPath();
      ctx.moveTo(-ir, 0);
      ctx.quadraticCurveTo(0, -ir * 0.85, ir, 0);
      ctx.quadraticCurveTo(0, ir * 0.85, -ir, 0);
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = '#FFD43B';
      ctx.beginPath();
      ctx.arc(0, 0, ir * 0.36, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private traceEnemySilhouette(
    ctx: CanvasRenderingContext2D,
    enemy: EnemyEntity,
    baseR: number,
    elapsedTime: number
  ): void {
    ctx.beginPath();
    if (enemy.type === 'wanderer') {
      ctx.arc(0, 0, baseR, 0, Math.PI * 2);
    } else if (enemy.type === 'hunter') {
      ctx.save();
      ctx.rotate(enemy.facingAngle);
      ctx.moveTo(baseR * 1.2, 0);
      ctx.lineTo(-baseR * 0.9, -baseR * 0.85);
      ctx.lineTo(-baseR * 0.5, 0);
      ctx.lineTo(-baseR * 0.9, baseR * 0.85);
      ctx.closePath();
      ctx.restore();
    } else if (enemy.type === 'shadow') {
      const spikes = 8;
      for (let i = 0; i < spikes * 2; i++) {
        const rad = i % 2 === 0 ? baseR * 1.1 : baseR * 0.65;
        const a = (i * Math.PI) / spikes + elapsedTime * 3;
        const vx = Math.cos(a) * rad;
        const vy = Math.sin(a) * rad;
        if (i === 0) ctx.moveTo(vx, vy);
        else ctx.lineTo(vx, vy);
      }
      ctx.closePath();
    } else {
      const sides = 8;
      for (let i = 0; i < sides; i++) {
        const a = (i * Math.PI * 2) / sides + elapsedTime * 0.8;
        const vx = Math.cos(a) * baseR;
        const vy = Math.sin(a) * baseR;
        if (i === 0) ctx.moveTo(vx, vy);
        else ctx.lineTo(vx, vy);
      }
      ctx.closePath();
    }
  }

  private drawEnemy(
    ctx: CanvasRenderingContext2D,
    enemy: EnemyEntity,
    tileSize: number,
    elapsedTime: number,
    isNight: boolean,
    grid: TileType[][],
    unlockedDoors: Set<string>
  ): void {
    const ex = enemy.x * tileSize;
    const ey = enemy.y * tileSize;

    ctx.save();
    ctx.translate(ex, ey);

    // Territory ring for Guardian
    if (enemy.type === 'guardian') {
      ctx.strokeStyle = 'rgba(229, 43, 43, 0.14)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(
        (enemy.homePos.x + 0.5 - enemy.x) * tileSize,
        (enemy.homePos.y + 0.5 - enemy.y) * tileSize,
        enemy.territoryRadius * tileSize,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    }

    // Wall-Occluded Scanning Light Cone for Hunter, Boss, and Guardian
    if (
      (enemy.type === 'hunter' || enemy.type === 'boss' || enemy.type === 'guardian') &&
      enemy.state !== 'frozen'
    ) {
      const coneRangeTiles = Math.min(3.5, enemy.detectionRange * 0.72);
      const coneHalfAngle = 0.45;
      const polyPoints = computeLightConePolygon(
        grid,
        enemy.x,
        enemy.y,
        enemy.facingAngle,
        coneHalfAngle,
        coneRangeTiles,
        isNight,
        unlockedDoors,
        24
      );

      if (polyPoints.length >= 3) {
        ctx.save();
        const isAlert = enemy.state === 'chase' || enemy.state === 'alert_windup';
        const maxPx = coneRangeTiles * tileSize;
        const coneGrad = ctx.createRadialGradient(0, 0, tileSize * 0.12, 0, 0, maxPx);
        if (isAlert) {
          coneGrad.addColorStop(0, 'rgba(229, 43, 43, 0.34)');
          coneGrad.addColorStop(0.7, 'rgba(229, 43, 43, 0.16)');
          coneGrad.addColorStop(1, 'rgba(229, 43, 43, 0.03)');
        } else {
          coneGrad.addColorStop(0, 'rgba(255, 212, 59, 0.24)');
          coneGrad.addColorStop(0.7, 'rgba(255, 184, 0, 0.11)');
          coneGrad.addColorStop(1, 'rgba(255, 184, 0, 0.02)');
        }

        ctx.fillStyle = coneGrad;
        ctx.beginPath();
        for (let i = 0; i < polyPoints.length; i++) {
          const rx = (polyPoints[i].x - enemy.x) * tileSize;
          const ry = (polyPoints[i].y - enemy.y) * tileSize;
          if (i === 0) ctx.moveTo(rx, ry);
          else ctx.lineTo(rx, ry);
        }
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = isAlert ? 'rgba(229, 43, 43, 0.28)' : 'rgba(255, 212, 59, 0.16)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }
    }

    const baseR = enemy.type === 'boss' ? tileSize * 0.44 : tileSize * 0.31;
    const depthOffset = enemy.type === 'boss' ? 6 : 4.5;

    // 1. 2.5D Ground drop shadow ellipse
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.ellipse(0, depthOffset + baseR * 0.35, baseR * 0.95, baseR * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.scale(enemy.scaleX, enemy.scaleY);

    let topFill = '#B81717';
    let sideFill = '#570909';
    let rimStroke = '#FFB800';

    if (enemy.state === 'frozen') {
      topFill = '#38BDF8';
      sideFill = '#0369A1';
      rimStroke = '#FFF7E6';
    } else if (enemy.type === 'wanderer') {
      topFill = '#B81717';
      sideFill = '#5C0A0A';
      rimStroke = '#FFB800';
    } else if (enemy.type === 'hunter') {
      topFill = '#E52B2B';
      sideFill = '#7A1010';
      rimStroke = '#FFF7E6';
    } else if (enemy.type === 'shadow') {
      ctx.globalAlpha = isNight ? 0.92 : 0.48;
      topFill = '#1F1F1F';
      sideFill = '#090909';
      rimStroke = '#E52B2B';
    } else if (enemy.type === 'guardian') {
      topFill = '#8F1111';
      sideFill = '#470606';
      rimStroke = '#FFD43B';
    } else {
      // Boss
      topFill = '#E52B2B';
      sideFill = '#6E0C0C';
      rimStroke = '#FFD43B';
    }

    // 2. 3D Extruded lower side body (+depthOffset vertical thickness)
    ctx.save();
    ctx.translate(0, depthOffset);
    ctx.fillStyle = sideFill;
    ctx.strokeStyle = '#0D0D0D';
    ctx.lineWidth = enemy.type === 'boss' ? 3 : 2;
    this.traceEnemySilhouette(ctx, enemy, baseR, elapsedTime);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 3. Elevated top body face
    ctx.fillStyle = topFill;
    ctx.strokeStyle = rimStroke;
    ctx.lineWidth = enemy.type === 'boss' ? 3.5 : 2;
    this.traceEnemySilhouette(ctx, enemy, baseR, elapsedTime);
    ctx.fill();
    ctx.stroke();

    // 4. Subtle 3D top crown specular highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.beginPath();
    ctx.ellipse(0, -baseR * 0.38, baseR * 0.48, baseR * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // 5. 3D Glowing Eye / Core detail with specular lens glint
    const eyeX = Math.cos(enemy.facingAngle) * (baseR * 0.35);
    const eyeY = Math.sin(enemy.facingAngle) * (baseR * 0.35);
    ctx.fillStyle = '#171717';
    ctx.beginPath();
    ctx.arc(eyeX, eyeY + 1.5, baseR * 0.25, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = enemy.state === 'chase' ? '#FFD43B' : '#FFF7E6';
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, baseR * 0.22, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(eyeX - baseR * 0.06, eyeY - baseR * 0.06, baseR * 0.07, 0, Math.PI * 2);
    ctx.fill();

    // Alert / Pursuit telegraph indicator above enemy
    if (enemy.state === 'alert_windup' || enemy.state === 'chase') {
      ctx.fillStyle = enemy.state === 'alert_windup' ? '#FFD43B' : '#E52B2B';
      ctx.font = `800 ${Math.floor(tileSize * 0.36)}px "Barlow Condensed", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('!', 0, -baseR - 6);
    }

    ctx.restore();
  }

  private drawPlayer(
    ctx: CanvasRenderingContext2D,
    player: PlayerEntity,
    tileSize: number,
    elapsedTime: number,
    equippedSkinId: string
  ): void {
    const px = player.x * tileSize;
    const py = player.y * tileSize;

    const skin =
      COSMETIC_CATALOG.find((c) => c.id === equippedSkinId) || COSMETIC_CATALOG[0];

    ctx.save();
    ctx.translate(px, py);

    // Invulnerability blink on recent damage
    if (player.invulnerableTimer > 0 && Math.floor(elapsedTime * 16) % 2 === 0) {
      ctx.globalAlpha = 0.45;
    }

    // Protective Shield 3D dome bubble
    if (player.shieldActive) {
      ctx.strokeStyle = '#FFD43B';
      ctx.fillStyle = 'rgba(255, 212, 59, 0.16)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, tileSize * 0.44, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 3D dome specular arc
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, tileSize * 0.38, -Math.PI * 0.78, -Math.PI * 0.22);
      ctx.stroke();
    }

    const r = tileSize * 0.31;
    const depthOffset = 4.8;

    // 1. 2.5D Ground drop shadow ellipse
    ctx.fillStyle = 'rgba(0, 0, 0, 0.58)';
    ctx.beginPath();
    ctx.ellipse(0, depthOffset + r * 0.32, r * 0.96, r * 0.46, 0, 0, Math.PI * 2);
    ctx.fill();

    // Subtle walk gait bob synced to distance traveled
    const bob = Math.sin(player.walkDistance * 5) * 0.05;
    ctx.scale(player.scaleX + bob, player.scaleY - bob);

    // 2. 3D Extruded lower body base (+depthOffset vertical thickness)
    ctx.save();
    ctx.translate(0, depthOffset);
    ctx.fillStyle = '#6E1010';
    ctx.strokeStyle = '#0D0D0D';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    if (skin.shape === 'vanguard' || skin.shape === 'sentinel') {
      ctx.rotate(player.facingAngle);
      ctx.roundRect(-r, -r * 0.85, r * 2, r * 1.7, 6);
    } else {
      ctx.arc(0, 0, r, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 3. Elevated top player body
    ctx.save();
    ctx.fillStyle = skin.primaryColor;
    ctx.strokeStyle = '#171717';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    if (skin.shape === 'vanguard' || skin.shape === 'sentinel') {
      ctx.rotate(player.facingAngle);
      ctx.roundRect(-r, -r * 0.85, r * 2, r * 1.7, 6);
    } else {
      ctx.arc(0, 0, r, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 4. 3D Top crown specular highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.36, r * 0.52, r * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    // 5. Raised 3D Directional visor with lens glint
    const vx = Math.cos(player.facingAngle) * (r * 0.38);
    const vy = Math.sin(player.facingAngle) * (r * 0.38);
    ctx.fillStyle = '#171717';
    ctx.beginPath();
    ctx.arc(vx, vy + 1.8, r * 0.36, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = skin.secondaryColor;
    ctx.beginPath();
    ctx.arc(vx, vy, r * 0.34, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.beginPath();
    ctx.arc(vx - r * 0.09, vy - r * 0.09, r * 0.11, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private applyNightFogOfWar(
    ctx: CanvasRenderingContext2D,
    viewportW: number,
    viewportH: number,
    playerScreenX: number,
    playerScreenY: number,
    visionRadiusPx: number,
    nightFactor: number,
    secondaryLights: { x: number; y: number }[]
  ): void {
    const fogCtx = this.ensureFogCanvas(viewportW, viewportH);
    if (!fogCtx || !this.fogCanvas) return;

    fogCtx.save();
    fogCtx.clearRect(0, 0, viewportW, viewportH);

    // Fill darkness layer proportional to nightFactor (up to 0.96 opacity at peak night)
    const darkAlpha = Math.min(0.96, nightFactor * 0.96);
    fogCtx.fillStyle = `rgba(10, 10, 12, ${darkAlpha})`;
    fogCtx.fillRect(0, 0, viewportW, viewportH);

    // Punch out smooth circular light source around player using destination-out
    fogCtx.globalCompositeOperation = 'destination-out';

    const innerR = Math.max(16, visionRadiusPx * 0.42);
    const outerR = Math.max(48, visionRadiusPx * 1.15);

    const grad = fogCtx.createRadialGradient(
      playerScreenX,
      playerScreenY,
      innerR,
      playerScreenX,
      playerScreenY,
      outerR
    );
    grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
    grad.addColorStop(0.7, 'rgba(0, 0, 0, 0.88)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    fogCtx.fillStyle = grad;
    fogCtx.beginPath();
    fogCtx.arc(playerScreenX, playerScreenY, outerR, 0, Math.PI * 2);
    fogCtx.fill();

    // Punch out secondary light around active decoys
    for (const light of secondaryLights) {
      const dGrad = fogCtx.createRadialGradient(
        light.x,
        light.y,
        8,
        light.x,
        light.y,
        visionRadiusPx * 0.65
      );
      dGrad.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
      dGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      fogCtx.fillStyle = dGrad;
      fogCtx.beginPath();
      fogCtx.arc(light.x, light.y, visionRadiusPx * 0.65, 0, Math.PI * 2);
      fogCtx.fill();
    }

    fogCtx.restore();

    // Composite fog-of-war canvas over main viewport
    ctx.drawImage(this.fogCanvas, 0, 0);

    // Subtle warm torch rim glow around player during night
    ctx.save();
    const torchGlow = ctx.createRadialGradient(
      playerScreenX,
      playerScreenY,
      innerR * 0.2,
      playerScreenX,
      playerScreenY,
      outerR
    );
    torchGlow.addColorStop(0, `rgba(255, 212, 59, ${0.11 * nightFactor})`);
    torchGlow.addColorStop(0.6, `rgba(229, 43, 43, ${0.05 * nightFactor})`);
    torchGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = torchGlow;
    ctx.beginPath();
    ctx.arc(playerScreenX, playerScreenY, outerR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
