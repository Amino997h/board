class DoodleWhiteboard {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    
    this.camera = { x: 0, y: 0, targetX: 0, targetY: 0 };
    this.liveFocus = { x: 0, y: 0 };
    
    this.isUserDragging = false;
    this.dragStart = { x: 0, y: 0 };
    this.dragCameraStart = { x: 0, y: 0 };
    this.userInteracting = false;

    this.drawnObjects = [];
    this.activeAnimations = [];
    this.itemsMap = {};

    this.setupInteractions();
    this.startLoop();
    this.clear();
  }

  clear() {
    this.drawnObjects = [];
    this.activeAnimations = [];
    this.itemsMap = {};
    this.camera = { x: 0, y: 0, targetX: 0, targetY: 0 };
    this.liveFocus = { x: 0, y: 0 };
    this.userInteracting = false;
  }

  setupInteractions() {
    this.canvas.addEventListener('mousedown', (e) => {
      this.isUserDragging = true;
      this.userInteracting = true;
      this.dragStart = { x: e.clientX, y: e.clientY };
      this.dragCameraStart = { x: this.camera.x, y: this.camera.y };
      this.canvas.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isUserDragging) return;
      const dx = e.clientX - this.dragStart.x;
      const dy = e.clientY - this.dragStart.y;
      this.camera.x = this.dragCameraStart.x - dx;
      this.camera.y = this.dragCameraStart.y - dy;
      this.camera.targetX = this.camera.x;
      this.camera.targetY = this.camera.y;
    });

    window.addEventListener('mouseup', () => {
      if (this.isUserDragging) {
        this.isUserDragging = false;
        this.canvas.style.cursor = 'grab';
        setTimeout(() => {
          this.userInteracting = false;
          this.snapBackToLive();
        }, 150);
      }
    });

    this.canvas.style.cursor = 'grab';
  }

  startLoop() {
    const render = () => {
      if (!this.isUserDragging) {
        this.camera.x += (this.camera.targetX - this.camera.x) * 0.08;
        this.camera.y += (this.camera.targetY - this.camera.y) * 0.08;
      }

      this.ctx.save();
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      this.ctx.translate(-this.camera.x, -this.camera.y);
      this.drawInfiniteGrid();

      this.drawnObjects.forEach(obj => obj.render(this.ctx));
      this.activeAnimations = this.activeAnimations.filter(anim => anim.update(this.ctx));

      this.ctx.restore();
      requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
  }

  drawInfiniteGrid() {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 1;

    const startX = Math.floor(this.camera.x / 40) * 40 - 200;
    const endX = startX + this.canvas.width + 400;
    const startY = Math.floor(this.camera.y / 40) * 40 - 200;
    const endY = startY + this.canvas.height + 400;

    for (let x = startX; x < endX; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
      ctx.stroke();
    }
    for (let y = startY; y < endY; y += 40) {
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  focusOn(worldX, worldY) {
    this.liveFocus = { x: worldX, y: worldY };
    if (!this.userInteracting) {
      this.camera.targetX = worldX - this.canvas.width / 2;
      this.camera.targetY = worldY - this.canvas.height / 2;
    }
  }

  snapBackToLive() {
    if (this.liveFocus.x !== 0 || this.liveFocus.y !== 0) {
      this.camera.targetX = this.liveFocus.x - this.canvas.width / 2;
      this.camera.targetY = this.liveFocus.y - this.canvas.height / 2;
    }
  }

  computeScenesLayout(scenes) {
    let currentX = 250;
    const stepX = 580;

    scenes.forEach((sc, idx) => {
      sc._x = currentX;
      sc._y = 300;
      sc._centerX = currentX + 130;
      sc._centerY = 300;
      this.itemsMap[idx] = sc;
      currentX += stepX;
    });
  }

  wrapText(ctx, text, maxWidth) {
    if (!text) return [];
    const words = text.split(' ');
    const lines = [];
    let curLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const w = ctx.measureText(curLine + " " + word).width;
      if (w < maxWidth) {
        curLine += " " + word;
      } else {
        lines.push(curLine);
        curLine = word;
      }
    }
    lines.push(curLine);
    return lines;
  }

  // رسم سكتشات هندسية واضحة ونظيفة بدون أي صلبان نهائياً
  drawCleanDoodle(ctx, sketchType, x, y, progress = 1) {
    ctx.save();
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const cx = x + 75;
    const cy = y - 45;
    const type = (sketchType || '').toLowerCase();

    if (type.includes('tank') || type.includes('tread') || type.includes('armor')) {
      // سكتش دبابة / جنزير مدرعة
      ctx.beginPath();
      ctx.roundRect(cx - 50, cy + 5, 100, 30, 15);
      ctx.stroke();
      // عجلات الجنزير
      for (let i = -30; i <= 30; i += 20) {
        ctx.beginPath();
        ctx.arc(cx + i, cy + 20, 8, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (progress > 0.4) {
        // برج الدبابة
        ctx.beginPath();
        ctx.arc(cx, cy + 5, 25, Math.PI, 0);
        ctx.stroke();
        // المدفع
        ctx.beginPath();
        ctx.moveTo(cx + 25, cy - 8);
        ctx.lineTo(cx + 70, cy - 8);
        ctx.stroke();
      }
    } else if (type.includes('gun') || type.includes('barrel') || type.includes('missile')) {
      // مدفع أو صاروخ
      ctx.beginPath();
      ctx.moveTo(cx - 40, cy);
      ctx.lineTo(cx + 40, cy);
      ctx.moveTo(cx - 40, cy + 16);
      ctx.lineTo(cx + 40, cy + 16);
      ctx.stroke();
      if (progress > 0.5) {
        // رأس المدفع / الصاروخ
        ctx.beginPath();
        ctx.moveTo(cx + 40, cy - 6);
        ctx.lineTo(cx + 60, cy + 8);
        ctx.lineTo(cx + 40, cy + 22);
        ctx.closePath();
        ctx.stroke();
      }
    } else if (type.includes('gear')) {
      // ترس ميكانيكي مسنن
      const r = 36;
      ctx.beginPath();
      ctx.arc(cx, cy, r * progress, 0, Math.PI * 2);
      ctx.stroke();
      if (progress > 0.4) {
        ctx.beginPath();
        ctx.arc(cx, cy, 14, 0, Math.PI * 2);
        ctx.stroke();
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI) / 3;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
          ctx.lineTo(cx + Math.cos(a) * (r + 10), cy + Math.sin(a) * (r + 10));
          ctx.stroke();
        }
      }
    } else if (type.includes('piston') || type.includes('engine')) {
      // مكبس ومحرك
      ctx.beginPath();
      ctx.rect(cx - 26, cy - 35, 52, 45);
      ctx.stroke();
      if (progress > 0.4) {
        ctx.beginPath();
        ctx.moveTo(cx, cy + 10);
        ctx.lineTo(cx, cy + 48);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy + 48, 8, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (type.includes('wheel')) {
      // عجلة
      ctx.beginPath();
      ctx.arc(cx, cy, 38 * progress, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, 15, 0, Math.PI * 2);
      ctx.stroke();
    } else if (type.includes('fire')) {
      // شعلة طاقة
      ctx.beginPath();
      ctx.moveTo(cx, cy + 30);
      ctx.quadraticCurveTo(cx - 25, cy + 10, cx - 10, cy - 10);
      ctx.quadraticCurveTo(cx - 15, cy - 35, cx, cy - 45);
      ctx.quadraticCurveTo(cx + 15, cy - 25, cx + 10, cy - 5);
      ctx.quadraticCurveTo(cx + 25, cy + 10, cx, cy + 30);
      ctx.stroke();
    } else {
      // سكتش بطاقة توضيحية بقلم أسود ناعم ومفتوح بدون أي صلبان
      ctx.beginPath();
      ctx.roundRect(cx - 45, cy - 35, 90, 70, 10);
      ctx.stroke();
      if (progress > 0.5) {
        ctx.beginPath();
        ctx.moveTo(cx - 25, cy - 10);
        ctx.lineTo(cx + 25, cy - 10);
        ctx.moveTo(cx - 25, cy + 10);
        ctx.lineTo(cx + 15, cy + 10);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  drawTitleAnimated(text) {
    let charIndex = 0;
    let tick = 0;

    const anim = {
      update: (ctx) => {
        tick++;
        if (tick % 2 === 0 && charIndex < text.length) charIndex++;
        const sub = text.substring(0, charIndex);

        ctx.save();
        ctx.fillStyle = '#18181b';
        ctx.font = 'bold 24px Cairo, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText("✍️ " + sub, 600, 60);

        ctx.strokeStyle = '#18181b';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        const lineLen = Math.min((charIndex / text.length) * 550, 550);
        ctx.moveTo(600 - lineLen / 2, 85);
        ctx.lineTo(600 + lineLen / 2, 85);
        ctx.stroke();
        ctx.restore();

        if (charIndex >= text.length && tick > text.length * 2 + 10) {
          this.drawnObjects.push({
            render: (c) => {
              c.save();
              c.fillStyle = '#18181b';
              c.font = 'bold 24px Cairo, sans-serif';
              c.textAlign = 'center';
              c.fillText("✍️ " + text, 600, 60);
              c.strokeStyle = '#18181b';
              c.lineWidth = 2.5;
              c.beginPath();
              c.moveTo(325, 85);
              c.lineTo(875, 85);
              c.stroke();
              c.restore();
            }
          });
          return false;
        }
        return true;
      }
    };
    this.activeAnimations.push(anim);
  }

  drawSceneAnimated(scene, onFinish) {
    this.focusOn(scene._centerX, scene._y + 50);

    let sketchProg = 0;
    let textCharIdx = 0;
    let tick = 0;
    let imgOpacity = 0;
    let imgObj = null;

    if (scene.image_url) {
      imgObj = new Image();
      imgObj.crossOrigin = "anonymous";
      imgObj.src = scene.image_url;
    }

    const anim = {
      update: (ctx) => {
        tick++;
        const x = scene._x;
        const y = scene._y;
        const text = scene.narration || '';
        const label = scene.label || '';
        const sketch = scene.sketch || scene.doodle_type || 'box';

        // 1. رسم السكتش الأسود
        sketchProg = Math.min(1, sketchProg + 0.035);
        this.drawCleanDoodle(ctx, sketch, x, y, sketchProg);

        // 2. كتابة العنوان التوضيحي
        if (sketchProg >= 0.7) {
          ctx.save();
          ctx.fillStyle = '#18181b';
          ctx.font = 'bold 16px Cairo, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(label, x + 75, y + 42);

          // 3. كتابة نص الشرح المباشر حرفاً بحرف
          if (tick % 2 === 0 && textCharIdx < text.length) {
            textCharIdx++;
          }

          ctx.font = '14px Cairo, sans-serif';
          const maxTextW = 330;
          const currentText = text.substring(0, textCharIdx);
          const lines = this.wrapText(ctx, currentText, maxTextW);

          ctx.fillStyle = '#27272a';
          ctx.textAlign = 'right';
          lines.forEach((l, lIdx) => {
            const prefix = lIdx === 0 ? "🎙️ " : "    ";
            ctx.fillText(prefix + l, x + 210, y + 78 + lIdx * 22);
          });

          // 4. ظهور الصورة التوضيحية
          if (imgObj && imgObj.complete && imgOpacity < 1) {
            imgOpacity = Math.min(1, imgOpacity + 0.03);
          }
          if (imgObj && imgObj.complete && imgOpacity > 0) {
            ctx.globalAlpha = imgOpacity;
            const imgW = 145;
            const imgH = 125;
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#e4e4e7';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(x + 190, y - 105, imgW, imgH, 10);
            ctx.fill();
            ctx.stroke();

            ctx.clip();
            ctx.drawImage(imgObj, x + 195, y - 100, imgW - 10, imgH - 10);
            ctx.globalAlpha = 1.0;
          }
          ctx.restore();
        }

        if (sketchProg >= 1 && textCharIdx >= text.length && (!imgObj || imgOpacity >= 0.9)) {
          this.drawnObjects.push({
            render: (c) => this.renderStaticScene(c, scene, imgObj)
          });

          // رسم السهم إلى المشهد التالي
          const arrowLabel = scene.arrow_text || scene.arrow_to_next;
          if (arrowLabel) {
            this.drawNextArrow(scene._x + 360, scene._y, scene._x + 530, scene._y, arrowLabel);
          }

          if (onFinish) onFinish();
          return false;
        }
        return true;
      }
    };
    this.activeAnimations.push(anim);
  }

  drawNextArrow(startX, startY, endX, endY, label) {
    let progress = 0;
    const anim = {
      update: (ctx) => {
        progress = Math.min(1, progress + 0.04);
        const curX = startX + (endX - startX) * progress;
        const curY = startY + (endY - startY) * progress;

        ctx.save();
        ctx.strokeStyle = '#18181b';
        ctx.fillStyle = '#18181b';
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(curX, curY);
        ctx.stroke();

        if (progress >= 0.95) {
          const angle = Math.atan2(endY - startY, endX - startX);
          const headLen = 12;
          ctx.beginPath();
          ctx.moveTo(endX, endY);
          ctx.lineTo(endX - headLen * Math.cos(angle - Math.PI / 6), endY - headLen * Math.sin(angle - Math.PI / 6));
          ctx.lineTo(endX - headLen * Math.cos(angle + Math.PI / 6), endY - headLen * Math.sin(angle + Math.PI / 6));
          ctx.closePath();
          ctx.fill();

          if (label) {
            ctx.fillStyle = '#52525b';
            ctx.font = 'bold 12px Cairo, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(label, (startX + endX) / 2, startY - 12);
          }
        }
        ctx.restore();

        if (progress >= 1) {
          this.drawnObjects.push({
            render: (c) => {
              c.save();
              c.strokeStyle = '#18181b';
              c.fillStyle = '#18181b';
              c.lineWidth = 3.5;
              c.lineCap = 'round';
              c.beginPath();
              c.moveTo(startX, startY);
              c.lineTo(endX, endY);
              c.stroke();

              const angle = Math.atan2(endY - startY, endX - startX);
              const headLen = 12;
              c.beginPath();
              c.moveTo(endX, endY);
              c.lineTo(endX - headLen * Math.cos(angle - Math.PI / 6), endY - headLen * Math.sin(angle - Math.PI / 6));
              c.lineTo(endX - headLen * Math.cos(angle + Math.PI / 6), endY - headLen * Math.sin(angle + Math.PI / 6));
              c.closePath();
              c.fill();

              if (label) {
                c.fillStyle = '#52525b';
                c.font = 'bold 12px Cairo, sans-serif';
                c.textAlign = 'center';
                c.fillText(label, (startX + endX) / 2, startY - 12);
              }
              c.restore();
            }
          });
          return false;
        }
        return true;
      }
    };
    this.activeAnimations.push(anim);
  }

  renderStaticScene(ctx, sc, imgObj) {
    const x = sc._x;
    const y = sc._y;
    const sketch = sc.sketch || sc.doodle_type || 'box';
    this.drawCleanDoodle(ctx, sketch, x, y, 1);

    ctx.save();
    ctx.fillStyle = '#18181b';
    ctx.font = 'bold 16px Cairo, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(sc.label || '', x + 75, y + 42);

    ctx.font = '14px Cairo, sans-serif';
    const lines = this.wrapText(ctx, sc.narration || '', 330);
    ctx.fillStyle = '#27272a';
    ctx.textAlign = 'right';
    lines.forEach((l, lIdx) => {
      const prefix = lIdx === 0 ? "🎙️ " : "    ";
      ctx.fillText(prefix + l, x + 210, y + 78 + lIdx * 22);
    });

    if (imgObj && imgObj.complete) {
      const imgW = 145;
      const imgH = 125;
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#e4e4e7';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(x + 190, y - 105, imgW, imgH, 10);
      ctx.fill();
      ctx.stroke();

      ctx.drawImage(imgObj, x + 195, y - 100, imgW - 10, imgH - 10);
    }
    ctx.restore();
  }
}
