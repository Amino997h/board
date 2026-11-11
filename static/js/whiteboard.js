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
      // خلفية بيضاء ناصعة مثل سبورة حقيقية
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

  // توزيع المشاهد المتتالية أفقياً بمسافات كافية وبسيطة
  computeSentencesLayout(sentences) {
    let currentX = 250;
    const stepX = 550;

    sentences.forEach((s, idx) => {
      s._x = currentX;
      s._y = 300;
      s._centerX = currentX + 120;
      s._centerY = 300;
      this.itemsMap[idx] = s;
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

  // رسم سكتشات بسيطة جداً بقلم أسود نقي (Hand-drawn Ink Sketches)
  drawDoodleSketch(ctx, type, x, y, progress = 1) {
    ctx.save();
    ctx.strokeStyle = '#18181b'; // أسود قلم فلوماستر
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const cx = x + 70;
    const cy = y - 40;

    if (type === 'gear' || type === 'gears') {
      // ترس بسيط
      const r = 36;
      ctx.beginPath();
      ctx.arc(cx, cy, r * progress, 0, Math.PI * 2);
      ctx.stroke();
      if (progress > 0.5) {
        ctx.beginPath();
        ctx.arc(cx, cy, 12, 0, Math.PI * 2);
        ctx.stroke();
        // أسنان الترس
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI) / 3;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * (r - 2), cy + Math.sin(a) * (r - 2));
          ctx.lineTo(cx + Math.cos(a) * (r + 10), cy + Math.sin(a) * (r + 10));
          ctx.stroke();
        }
      }
    } else if (type === 'piston' || type === 'engine_piston') {
      // مكبس وأسطوانة
      ctx.beginPath();
      ctx.rect(cx - 28, cy - 35, 56, 45); // المكبس
      ctx.stroke();
      if (progress > 0.4) {
        ctx.beginPath();
        ctx.moveTo(cx, cy + 10);
        ctx.lineTo(cx, cy + 50); // ذراع التوصيل
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy + 50, 8, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (type === 'wheel' || type === 'wheel_moving') {
      // عجلة وإطار
      const r = 38;
      ctx.beginPath();
      ctx.arc(cx, cy, r * progress, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.stroke();
      if (progress > 0.6) {
        // خطوط الحركة خلف العجلة
        ctx.beginPath();
        ctx.moveTo(cx - 50, cy + 30);
        ctx.lineTo(cx - 75, cy + 30);
        ctx.moveTo(cx - 45, cy + 15);
        ctx.lineTo(cx - 65, cy + 15);
        ctx.stroke();
      }
    } else if (type === 'fire') {
      // شعلة نار بسيطة
      ctx.beginPath();
      ctx.moveTo(cx, cy + 35);
      ctx.quadraticCurveTo(cx - 30, cy + 15, cx - 15, cy - 10);
      ctx.quadraticCurveTo(cx - 20, cy - 35, cx, cy - 45);
      ctx.quadraticCurveTo(cx + 20, cy - 25, cx + 15, cy - 5);
      ctx.quadraticCurveTo(cx + 30, cy + 15, cx, cy + 35);
      ctx.stroke();
    } else {
      // أيقونة عامة دائرية مع خطوط
      ctx.beginPath();
      ctx.arc(cx, cy, 34 * progress, 0, Math.PI * 2);
      ctx.stroke();
      if (progress > 0.5) {
        ctx.beginPath();
        ctx.moveTo(cx - 15, cy);
        ctx.lineTo(cx + 15, cy);
        ctx.moveTo(cx, cy - 15);
        ctx.lineTo(cx, cy + 15);
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

  // رسم الجملة الحالية: رسمة سكتش بالقلم الأسود + كتابة نص الجملة تحته حرفاً بحرف + صورة واقعية
  drawSentenceAnimated(sentence, index, onFinish) {
    this.focusOn(sentence._centerX, sentence._y + 50);

    let sketchProg = 0;
    let textCharIdx = 0;
    let tick = 0;
    let imgOpacity = 0;
    let imgObj = null;

    if (sentence.image_url) {
      imgObj = new Image();
      imgObj.crossOrigin = "anonymous";
      imgObj.src = sentence.image_url;
    }

    const anim = {
      update: (ctx) => {
        tick++;
        const x = sentence._x;
        const y = sentence._y;
        const text = sentence.sentence_text || '';
        const label = sentence.doodle_label || '';

        // 1. رسم السكتش البسيط بالقلم الأسود
        sketchProg = Math.min(1, sketchProg + 0.035);
        this.drawDoodleSketch(ctx, sentence.doodle_type, x, y, sketchProg);

        // 2. كتابة عنوان السكتش بالقلم الأسود
        if (sketchProg >= 0.7) {
          ctx.save();
          ctx.fillStyle = '#18181b';
          ctx.font = 'bold 16px Cairo, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(label, x + 70, y + 40);

          // 3. كتابة نص الجملة التي تقال في الصوت حرفاً بحرف
          if (tick % 2 === 0 && textCharIdx < text.length) {
            textCharIdx++;
          }

          ctx.font = '14px Cairo, sans-serif';
          const maxTextW = 320;
          const currentText = text.substring(0, textCharIdx);
          const lines = this.wrapText(ctx, currentText, maxTextW);

          ctx.fillStyle = '#27272a';
          ctx.textAlign = 'right';
          lines.forEach((l, lIdx) => {
            const prefix = lIdx === 0 ? "💬 " : "    ";
            ctx.fillText(prefix + l, x + 200, y + 75 + lIdx * 22);
          });

          // 4. ظهور الصورة التوضيحية بجانب السكتش
          if (imgObj && imgObj.complete && imgOpacity < 1) {
            imgOpacity = Math.min(1, imgOpacity + 0.03);
          }
          if (imgObj && imgObj.complete && imgOpacity > 0) {
            ctx.globalAlpha = imgOpacity;
            const imgW = 140;
            const imgH = 120;
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#e4e4e7';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(x + 180, y - 100, imgW, imgH, 10);
            ctx.fill();
            ctx.stroke();

            ctx.clip();
            ctx.drawImage(imgObj, x + 185, y - 95, imgW - 10, imgH - 10);
            ctx.globalAlpha = 1.0;
          }
          ctx.restore();
        }

        if (sketchProg >= 1 && textCharIdx >= text.length && (!imgObj || imgOpacity >= 0.9)) {
          this.drawnObjects.push({
            render: (c) => this.renderStaticSentence(c, sentence, imgObj)
          });

          // رسم السهم إلى الجملة التالية إن وجد
          if (sentence.arrow_to_next) {
            this.drawNextArrow(sentence._x + 340, sentence._y, sentence._x + 500, sentence._y, sentence.arrow_to_next);
          }

          if (onFinish) onFinish();
          return false;
        }
        return true;
      }
    };
    this.activeAnimations.push(anim);
  }

  // رسم السهم الممتد بالقلم الأسود نحو الجملة التالية
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

  renderStaticSentence(ctx, s, imgObj) {
    const x = s._x;
    const y = s._y;
    this.drawDoodleSketch(ctx, s.doodle_type, x, y, 1);

    ctx.save();
    ctx.fillStyle = '#18181b';
    ctx.font = 'bold 16px Cairo, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(s.doodle_label || '', x + 70, y + 40);

    ctx.font = '14px Cairo, sans-serif';
    const lines = this.wrapText(ctx, s.sentence_text || '', 320);
    ctx.fillStyle = '#27272a';
    ctx.textAlign = 'right';
    lines.forEach((l, lIdx) => {
      const prefix = lIdx === 0 ? "💬 " : "    ";
      ctx.fillText(prefix + l, x + 200, y + 75 + lIdx * 22);
    });

    if (imgObj && imgObj.complete) {
      const imgW = 140;
      const imgH = 120;
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#e4e4e7';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(x + 180, y - 100, imgW, imgH, 10);
      ctx.fill();
      ctx.stroke();

      ctx.drawImage(imgObj, x + 185, y - 95, imgW - 10, imgH - 10);
    }
    ctx.restore();
  }
}
