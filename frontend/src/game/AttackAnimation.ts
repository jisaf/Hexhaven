/**
 * AttackAnimation Component (US2 - T107)
 *
 * PixiJS-based attack animations for combat.
 * Displays projectiles, slashes, and visual effects for attacks.
 */

import * as PIXI from 'pixi.js';
import { AxialCoordinates } from '../../../shared/types/entities';

export type AttackType = 'melee' | 'ranged' | 'magic';

interface AttackAnimationOptions {
  attackType: AttackType;
  fromPosition: PIXI.Point;
  toPosition: PIXI.Point;
  color?: number;
  damage?: number;
}

export class AttackAnimation {
  private container: PIXI.Container;
  private options: AttackAnimationOptions;

  constructor(container: PIXI.Container, options: AttackAnimationOptions) {
    this.container = container;
    this.options = options;
  }

  /**
   * Play the attack animation
   */
  public async play(): Promise<void> {
    switch (this.options.attackType) {
      case 'melee':
        return this.playMeleeAnimation();
      case 'ranged':
        return this.playRangedAnimation();
      case 'magic':
        return this.playMagicAnimation();
      default:
        return this.playMeleeAnimation();
    }
  }

  /**
   * Melee attack animation (slash effect)
   */
  private async playMeleeAnimation(): Promise<void> {
    return new Promise((resolve) => {
      const slash = new PIXI.Graphics();
      const color = this.options.color || 0xffffff;

      // Position at target
      slash.x = this.options.toPosition.x;
      slash.y = this.options.toPosition.y;

      this.container.addChild(slash);

      let time = 0;
      const duration = 0.4;

      const ticker = (delta: number) => {
        time += delta / 60;

        if (time < duration) {
          slash.clear();

          // Draw arc slash
          const progress = time / duration;
          const angle = Math.PI * progress;
          const radius = 40;
          const thickness = 8 * (1 - progress);

          slash.lineStyle(thickness, color, 1 - progress);
          slash.arc(0, 0, radius, -Math.PI / 4, -Math.PI / 4 + angle);

          // Rotation
          slash.rotation = progress * Math.PI / 4;
        } else {
          this.container.removeChild(slash);
          slash.destroy();
          PIXI.Ticker.shared.remove(ticker);
          resolve();
        }
      };

      PIXI.Ticker.shared.add(ticker);
    });
  }

  /**
   * Ranged attack animation (projectile)
   */
  private async playRangedAnimation(): Promise<void> {
    return new Promise((resolve) => {
      const projectile = new PIXI.Graphics();
      const color = this.options.color || 0xf39c12;

      // Draw projectile
      projectile.beginFill(color);
      projectile.drawCircle(0, 0, 8);
      projectile.endFill();

      // Add glow
      projectile.lineStyle(3, color, 0.5);
      projectile.drawCircle(0, 0, 12);

      projectile.x = this.options.fromPosition.x;
      projectile.y = this.options.fromPosition.y;

      this.container.addChild(projectile);

      // Create particle trail
      const trail: PIXI.Graphics[] = [];

      let time = 0;
      const duration = 0.5;

      const ticker = (delta: number) => {
        time += delta / 60;

        if (time < duration) {
          const progress = time / duration;

          // Move projectile
          projectile.x = PIXI.utils.lerp(
            this.options.fromPosition.x,
            this.options.toPosition.x,
            progress,
          );
          projectile.y = PIXI.utils.lerp(
            this.options.fromPosition.y,
            this.options.toPosition.y,
            progress,
          );

          // Add trail particle
          if (Math.random() > 0.5) {
            const particle = new PIXI.Graphics();
            particle.beginFill(color, 0.5);
            particle.drawCircle(0, 0, 4);
            particle.endFill();
            particle.x = projectile.x;
            particle.y = projectile.y;
            this.container.addChild(particle);
            trail.push(particle);
          }

          // Fade trail
          trail.forEach((p, idx) => {
            p.alpha *= 0.95;
            if (p.alpha < 0.1) {
              this.container.removeChild(p);
              p.destroy();
              trail.splice(idx, 1);
            }
          });
        } else {
          // Cleanup
          this.container.removeChild(projectile);
          projectile.destroy();
          trail.forEach((p) => {
            this.container.removeChild(p);
            p.destroy();
          });
          PIXI.Ticker.shared.remove(ticker);
          resolve();
        }
      };

      PIXI.Ticker.shared.add(ticker);
    });
  }

  /**
   * Magic attack animation (energy blast)
   */
  private async playMagicAnimation(): Promise<void> {
    return new Promise((resolve) => {
      const magic = new PIXI.Graphics();
      const color = this.options.color || 0x9b59b6;

      magic.x = this.options.fromPosition.x;
      magic.y = this.options.fromPosition.y;

      this.container.addChild(magic);

      // Create particles
      const particles: Array<{
        graphics: PIXI.Graphics;
        vx: number;
        vy: number;
        life: number;
      }> = [];

      for (let i = 0; i < 20; i++) {
        const particle = new PIXI.Graphics();
        particle.beginFill(color);
        particle.drawCircle(0, 0, Math.random() * 6 + 2);
        particle.endFill();

        const angle = (Math.PI * 2 * i) / 20;
        const speed = Math.random() * 3 + 2;

        this.container.addChild(particle);
        particles.push({
          graphics: particle,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1.0,
        });
      }

      let time = 0;
      const duration = 0.8;
      let blastPhase = false;

      const ticker = (delta: number) => {
        time += delta / 60;

        if (time < duration * 0.5 && !blastPhase) {
          // Charge phase - particles spiral inward
          particles.forEach((p) => {
            const dx = this.options.fromPosition.x - p.graphics.x;
            const dy = this.options.fromPosition.y - p.graphics.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 5) {
              p.graphics.x += (dx / dist) * 5;
              p.graphics.y += (dy / dist) * 5;
            }

            p.graphics.alpha = p.life;
          });
        } else if (!blastPhase) {
          // Blast phase - shoot to target
          blastPhase = true;

          particles.forEach((p) => {
            const dx = this.options.toPosition.x - this.options.fromPosition.x;
            const dy = this.options.toPosition.y - this.options.fromPosition.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            p.vx = (dx / dist) * 20 + (Math.random() - 0.5) * 5;
            p.vy = (dy / dist) * 20 + (Math.random() - 0.5) * 5;
          });
        }

        if (blastPhase) {
          // Move and fade particles
          particles.forEach((p, idx) => {
            p.graphics.x += p.vx;
            p.graphics.y += p.vy;
            p.life -= 0.02;
            p.graphics.alpha = p.life;

            if (p.life <= 0) {
              this.container.removeChild(p.graphics);
              p.graphics.destroy();
              particles.splice(idx, 1);
            }
          });
        }

        if (time >= duration) {
          // Cleanup
          particles.forEach((p) => {
            this.container.removeChild(p.graphics);
            p.graphics.destroy();
          });
          this.container.removeChild(magic);
          magic.destroy();
          PIXI.Ticker.shared.remove(ticker);
          resolve();
        }
      };

      PIXI.Ticker.shared.add(ticker);
    });
  }

  /**
   * Static helper to create and play an attack animation
   */
  public static async playAttack(
    container: PIXI.Container,
    options: AttackAnimationOptions,
  ): Promise<void> {
    const animation = new AttackAnimation(container, options);
    return animation.play();
  }

  /**
   * Create impact effect at a position
   */
  public static async playImpact(
    container: PIXI.Container,
    position: PIXI.Point,
    color: number = 0xffffff,
  ): Promise<void> {
    return new Promise((resolve) => {
      const impact = new PIXI.Graphics();
      impact.x = position.x;
      impact.y = position.y;

      container.addChild(impact);

      let time = 0;
      const duration = 0.3;

      const ticker = (delta: number) => {
        time += delta / 60;

        if (time < duration) {
          impact.clear();

          const progress = time / duration;
          const radius = 30 * progress;
          const alpha = 1 - progress;

          impact.lineStyle(5 * (1 - progress), color, alpha);
          impact.drawCircle(0, 0, radius);

          // Inner circle
          impact.lineStyle(3 * (1 - progress), 0xffffff, alpha * 0.5);
          impact.drawCircle(0, 0, radius * 0.7);
        } else {
          container.removeChild(impact);
          impact.destroy();
          PIXI.Ticker.shared.remove(ticker);
          resolve();
        }
      };

      PIXI.Ticker.shared.add(ticker);
    });
  }
}
