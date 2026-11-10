class InfiniteWhiteboard {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    
    // إعدادات الكاميرا والتفاعل اليدوي
    this.camera = { x: 0, y: 0, targetX: 0, targetY: 0 };
    this.liveFocus = { x: 0, y: 0 }; // موضع العنصر المباشر الذي يشرحه الأستاذ الآن
    
    this.isUserDragging = false;
    this.dragStart = { x: 0, y: 0 };
    this.dragCameraStart = { x: 0, y: 0 };
    this.userInteracting = false;

    this.drawnObjects = [];
    this.activeAnimations = [];
    this.elementsMap = {};

    this.setupInteractions();
    this.startLoop();
    this.clear();
  }

  clear() {
    this.drawnObjects = [];
    this.activeAnimations = [];
    this.elementsMap = {};
    this.camera = { x: 0, y: 0, targetX: 0, targetY: 0 };
    this.liveFocus = { x: 0, y: 0 };
    this.userInteracting = false;
  }

  // إعداد سحب وإفلات الفأرة للتنقل الحر بالسبورة
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
      
      // تحريك الكاميرا فوراً مع يد المستخدم
      this.camera.x = this.dragCameraStart.x - dx;
      this.camera.y = this.dragCameraStart.y - dy;
      this.camera.targetX = this.camera.x;
      this.camera.targetY = this.camera.y;
    });

    window.addEventListener('mouseup', () => {
      if (this.isUserDragging) {
        this.isUserDragging = false;
        this.canvas.style.cursor = 'grab';
        
        // عند إفلات الفأرة: العودة الذكية والناعمة للعنصر المباشر الحالي!
        setTimeout(() => {
          this.userInteracting = false;
          this.snapBackToLive();
        }, 150);
      }
    });

    this.canvas.style.cursor = 'grab';
  }

  // حلقة الرسم والتحريك المستمرة (60 FPS)
  startLoop() {
    const render = () => {
      // إذا لم يكن المستخدم يسحب الكاميرا بيده، تتحرك الكاميرا بنعومة نحو الهدف
      if (!this.isUserDragging) {
        this.camera.x += (this.camera.targetX - this.camera.x) * 0.07;
        this.camera.y += (this.camera.targetY - this.camera.y) * 0.07;
      }

      this.ctx.save();
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      // تطبيق إزاحة الكاميرا
      this.ctx.translate(-this.camera.x, -this.camera.y);

      // رسم شبكة السبورة اللانهائية
      this.drawInfiniteGrid();

      // رسم العناصر الثابتة السابقة
      this.drawnObjects.forEach(obj => obj.render(this.ctx));

      // رسم وتحديث الأنيميشن الحي اللحظي
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

  // تركيز الكاميرا على موضع العنصر المباشر
  focusOn(worldX, worldY) {
    this.liveFocus = { x: worldX, y: worldY };
    if (!this.userInteracting) {
      this.camera.targetX = worldX - this.canvas.width / 2 + 100;
      this.camera.targetY = worldY - this.canvas.height / 2 + 80;
    }
  }

  // العودة السلسة الفورية لموضع الشرح اللحظي بعد إفلات الفأرة
  snapBackToLive() {
    if (this.liveFocus.x !== 0 || this.liveFocus.y !== 0) {
      this.camera.targetX = this.liveFocus.x - this.canvas.width / 2 + 100;
      this.camera.targetY = this.liveFocus.y - this.canvas.height / 2 + 80;
    }
  }

  computeInfiniteLayout(elements) {
    const spacing = 520;
    const startX = 250;
    const startY = 300;

    elements.forEach((elem, idx) => {
      elem._x = startX + idx * spacing;
      elem._y = startY;
      elem._width = 300;
      elem._height = 100;
      elem._centerX = elem._x + elem._width / 2;
      elem._centerY = elem._y + elem._height / 2;

      this.elementsMap[elem.id || `elem_${idx}`] = elem;
    });
  }

  // دالة تقسيم النص التلقائي الذكي لمنع خروج النص خارج الصندوق نهائياً
  wrapText(ctx, text, maxWidth) {
    if (!text) return [];
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + " " + word).width;
      if (width < maxWidth) {
        currentLine += " " + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
    return lines;
  }

  // 1. أنيميشن العنوان
  drawTitleAnimated(text) {
    let charIndex = 0;
    let tick = 0;

    const anim = {
      update: (ctx) => {
        tick++;
        // إبطاء الكتابة لتكون واقعية وطبيعية (حرف كل 2 إطارات)
        if (tick % 2 === 0 && charIndex < text.length) {
          charIndex++;
        }
        const currentSub = text.substring(0, charIndex);

        ctx.save();
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 22px Cairo, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText("✍️ " + currentSub, 600, 60);

        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        const lineLen = Math.min((charIndex / text.length) * 600, 600);
        ctx.moveTo(600 - lineLen / 2, 85);
        ctx.lineTo(600 + lineLen / 2, 85);
        ctx.stroke();
        ctx.restore();

        if (charIndex >= text.length && tick > text.length * 2 + 10) {
          this.drawnObjects.push({
            render: (c) => {
              c.save();
              c.fillStyle = '#0f172a';
              c.font = 'bold 22px Cairo, sans-serif';
              c.textAlign = 'center';
              c.fillText("✍️ " + text, 600, 60);
              c.strokeStyle = '#cbd5e1';
              c.lineWidth = 2.5;
              c.beginPath();
              c.moveTo(300, 85);
              c.lineTo(900, 85);
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

  // 2. أنيميشن رسم المكون (رسم الأضلاع + كتابة متأنية ومحكمة داخل الحدود + صورة)
  drawElementAnimated(elem) {
    this.focusOn(elem._centerX, elem._centerY);

    let drawProgress = 0;
    let labelCharIndex = 0;
    let descCharIndex = 0;
    let tick = 0;
    let imgOpacity = 0;
    let imgObj = null;

    if (elem.image_url) {
      imgObj = new Image();
      imgObj.crossOrigin = "anonymous";
      imgObj.src = elem.image_url;
    }

    const anim = {
      update: (ctx) => {
        tick++;
        const { _x: x, _y: y, _width: w, _height: h, label, subtitle, color = '#2563eb' } = elem;

        // المرحلة 1: رسم أضلاع المربع بالقلم بنعومة
        drawProgress = Math.min(1, drawProgress + 0.035);
        const perimeter = 2 * (w + h);
        const currentLen = drawProgress * perimeter;

        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 3.5;
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(x, y);
        let rem = currentLen;

        if (rem > 0) { const s = Math.min(rem, w); ctx.lineTo(x + s, y); rem -= s; }
        if (rem > 0) { const s = Math.min(rem, h); ctx.lineTo(x + w, y + s); rem -= s; }
        if (rem > 0) { const s = Math.min(rem, w); ctx.lineTo(x + w - s, y + h); rem -= s; }
        if (rem > 0) { const s = Math.min(rem, h); ctx.lineTo(x, y + h - s); rem -= s; }
        ctx.stroke();

        // المرحلة 2: كتابة عنوان المكون حرفاً بحرف
        if (drawProgress >= 0.7) {
          if (tick % 2 === 0 && labelCharIndex < (label || '').length) {
            labelCharIndex++;
          }

          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 16px Cairo, sans-serif';
          ctx.textAlign = 'center';
          const subLabel = (label || '').substring(0, labelCharIndex);
          ctx.fillText(subLabel, x + w / 2, y + h / 2 + 6);

          // كتابة نص الوظيفة داخل بطاقة محكمة بحجم الخط لمنع أي خروج
          if (subtitle && labelCharIndex >= (label || '').length * 0.8) {
            if (tick % 2 === 0 && descCharIndex < subtitle.length) {
              descCharIndex++;
            }

            ctx.font = 'bold 12px Cairo, sans-serif';
            const fullLines = this.wrapText(ctx, subtitle, w - 30);
            const cardHeight = Math.max(80, fullLines.length * 22 + 25);

            ctx.fillStyle = '#f8fafc';
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(x, y + h + 15, w, cardHeight, 10);
            ctx.fill();
            ctx.stroke();

            // رسم الأسطر الحالية وفق تقدم الكتابة
            const currentDesc = subtitle.substring(0, descCharIndex);
            const activeLines = this.wrapText(ctx, currentDesc, w - 30);

            ctx.fillStyle = '#334155';
            ctx.textAlign = 'right';
            activeLines.forEach((line, lineIdx) => {
              const prefix = lineIdx === 0 ? "📌 " : "    ";
              ctx.fillText(prefix + line, x + w - 12, y + h + 40 + lineIdx * 20);
            });
          }

          // المرحلة 3: ظهور الصورة بسلاسة
          if (imgObj && imgObj.complete && imgOpacity < 1) {
            imgOpacity = Math.min(1, imgOpacity + 0.025);
          }
          if (imgObj && imgObj.complete && imgOpacity > 0) {
            ctx.globalAlpha = imgOpacity;
            const imgH = 140;
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = 'rgba(0,0,0,0.06)';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.roundRect(x + 20, y - imgH - 20, w - 40, imgH, 12);
            ctx.fill();

            ctx.clip();
            ctx.drawImage(imgObj, x + 25, y - imgH - 15, w - 50, imgH - 10);
            ctx.globalAlpha = 1.0;
          }
        }
        ctx.restore();

        if (drawProgress >= 1 && labelCharIndex >= (label || '').length && (!subtitle || descCharIndex >= subtitle.length) && imgOpacity >= 0.9) {
          this.drawnObjects.push({
            render: (c) => this.renderStaticElement(c, elem, imgObj)
          });
          return false;
        }
        return true;
      }
    };
    this.activeAnimations.push(anim);
  }

  // 3. أنيميشن السهم الممتد
  drawConnectionAnimated(conn) {
    const fromElem = this.elementsMap[conn.from];
    const toElem = this.elementsMap[conn.to];
    if (!fromElem || !toElem) return;

    const startX = fromElem._centerX + fromElem._width / 2;
    const startY = fromElem._centerY;
    const endX = toElem._centerX - toElem._width / 2;
    const endY = toElem._centerY;

    let progress = 0;
    const anim = {
      update: (ctx) => {
        progress = Math.min(1, progress + 0.025);

        const currentX = startX + (endX - startX) * progress;
        const currentY = startY + (endY - startY) * progress;

        ctx.save();
        ctx.strokeStyle = conn.color || '#f59e0b';
        ctx.fillStyle = conn.color || '#f59e0b';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(currentX, currentY);
        ctx.stroke();

        if (progress >= 0.95) {
          const angle = Math.atan2(endY - startY, endX - startX);
          const headLen = 14;
          ctx.beginPath();
          ctx.moveTo(endX, endY);
          ctx.lineTo(endX - headLen * Math.cos(angle - Math.PI / 6), endY - headLen * Math.sin(angle - Math.PI / 6));
          ctx.lineTo(endX - headLen * Math.cos(angle + Math.PI / 6), endY - headLen * Math.sin(angle + Math.PI / 6));
          ctx.closePath();
          ctx.fill();

          if (conn.label) {
            ctx.fillStyle = '#0f172a';
            ctx.font = 'bold 13px Cairo, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(conn.label, (startX + endX) / 2, (startY + endY) / 2 - 12);
          }
        }
        ctx.restore();

        if (progress >= 1) {
          this.drawnObjects.push({
            render: (c) => this.renderStaticConnection(c, startX, startY, endX, endY, conn)
          });
          return false;
        }
        return true;
      }
    };
    this.activeAnimations.push(anim);
  }

  renderStaticElement(ctx, elem, imgObj) {
    const { _x: x, _y: y, _width: w, _height: h, label, subtitle, color = '#2563eb' } = elem;
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = color;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 16px Cairo, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + w / 2, y + h / 2 + 6);

    if (subtitle) {
      ctx.font = 'bold 12px Cairo, sans-serif';
      const lines = this.wrapText(ctx, subtitle, w - 30);
      const cardHeight = Math.max(80, lines.length * 22 + 25);

      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(x, y + h + 15, w, cardHeight, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#334155';
      ctx.textAlign = 'right';
      lines.forEach((l, idx) => {
        const prefix = idx === 0 ? "📌 " : "    ";
        ctx.fillText(prefix + l, x + w - 12, y + h + 40 + idx * 20);
      });
    }

    if (imgObj && imgObj.complete) {
      const imgH = 140;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(x + 20, y - imgH - 20, w - 40, imgH, 12);
      ctx.fill();
      ctx.drawImage(imgObj, x + 25, y - imgH - 15, w - 50, imgH - 10);
    }
    ctx.restore();
  }

  renderStaticConnection(ctx, startX, startY, endX, endY, conn) {
    ctx.save();
    ctx.strokeStyle = conn.color || '#f59e0b';
    ctx.fillStyle = conn.color || '#f59e0b';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    const angle = Math.atan2(endY - startY, endX - startX);
    const headLen = 14;
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(endX - headLen * Math.cos(angle - Math.PI / 6), endY - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(endX - headLen * Math.cos(angle + Math.PI / 6), endY - headLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();

    if (conn.label) {
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 13px Cairo, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(conn.label, (startX + endX) / 2, (startY + endY) / 2 - 12);
    }
    ctx.restore();
  }
}
